import { hostname } from 'node:os';

import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

import { toErrorMessage } from '../common/index.js';
import { InjectRedis } from '../redis/index.js';
import type { RedisClient } from '../redis/index.js';
import { parseServiceEvent } from './contracts/index.js';
import {
  buildEventStreamKey,
  DEFAULT_CONSUMER_BATCH_SIZE,
  DEFAULT_CONSUMER_BLOCK_MS,
  DEFAULT_CONSUMER_CLAIM_IDLE_MS,
  CONSUMER_ERROR_BACKOFF_MS,
  MESSAGING_CONSUMER_OPTIONS,
  STREAM_FIELDS,
  STREAM_START_ID,
  STREAM_NEW_MESSAGES_ID,
} from './messaging.constants.js';
import type {
  ConsumedEvent,
  EventBatchHandler,
  MessagingConsumerOptions,
  StreamEntry,
} from './messaging.interfaces.js';

@Injectable()
export class EventStreamConsumer implements OnApplicationShutdown {
  private readonly logger = new Logger(EventStreamConsumer.name);
  private readonly streamKey: string;
  private readonly consumerName: string;
  private reader?: RedisClient;
  private running?: Promise<void>;
  private stopped = false;

  constructor(
    @InjectRedis() private readonly redis: RedisClient,
    @Inject(MESSAGING_CONSUMER_OPTIONS) private readonly options: MessagingConsumerOptions,
  ) {
    this.streamKey = buildEventStreamKey(options.source);
    this.consumerName = options.consumer ?? `${hostname()}-${process.pid}`;
  }

  async start(handler: EventBatchHandler): Promise<void> {
    await this.ensureGroup();
    this.reader = this.redis.duplicate();
    this.reader.on('error', (error: Error) => this.logger.error(`Reader error: ${error.message}`));
    await this.reader.connect();
    this.running = this.loop(this.reader, handler);
    this.logger.log(`Consuming ${this.streamKey} as ${this.options.group}/${this.consumerName}`);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.reader?.isOpen) this.reader.destroy();
    await this.running?.catch(() => undefined);
  }

  private async ensureGroup(): Promise<void> {
    try {
      await this.redis.xGroupCreate(this.streamKey, this.options.group, STREAM_START_ID, {
        MKSTREAM: true,
      });
    } catch (error) {
      if (!toErrorMessage(error).includes('BUSYGROUP')) throw error;
    }
  }

  private async loop(reader: RedisClient, handler: EventBatchHandler): Promise<void> {
    while (!this.stopped) {
      try {
        const claimed = await this.claimStale();
        const entries = claimed.length > 0 ? claimed : await this.read(reader);
        if (entries.length > 0) await this.deliver(entries, handler);
      } catch (error) {
        if (this.stopped) return;
        this.logger.error(`Stream consumer failed: ${toErrorMessage(error)}`);
        await new Promise((resolve) => setTimeout(resolve, CONSUMER_ERROR_BACKOFF_MS));
      }
    }
  }

  private async read(reader: RedisClient): Promise<StreamEntry[]> {
    const reply: unknown = await reader.xReadGroup(
      this.options.group,
      this.consumerName,
      { key: this.streamKey, id: STREAM_NEW_MESSAGES_ID },
      {
        COUNT: this.options.batchSize ?? DEFAULT_CONSUMER_BATCH_SIZE,
        BLOCK: this.options.blockMs ?? DEFAULT_CONSUMER_BLOCK_MS,
      },
    );

    return toEntries(reply);
  }

  private async claimStale(): Promise<StreamEntry[]> {
    const reply: unknown = await this.redis.xAutoClaim(
      this.streamKey,
      this.options.group,
      this.consumerName,
      this.options.claimIdleMs ?? DEFAULT_CONSUMER_CLAIM_IDLE_MS,
      STREAM_START_ID,
      { COUNT: this.options.batchSize ?? DEFAULT_CONSUMER_BATCH_SIZE },
    );
    const messages = isRecord(reply) && Array.isArray(reply.messages) ? reply.messages : [];

    return messages.filter(isStreamMessage).map(toEntry);
  }

  private async deliver(entries: StreamEntry[], handler: EventBatchHandler): Promise<void> {
    const events: ConsumedEvent[] = [];

    for (const entry of entries) {
      const parsed = parseServiceEvent(entry.fields[STREAM_FIELDS.event]);
      if (parsed.event) events.push({ streamId: entry.id, event: parsed.event });
      else this.logger.warn(`Dropping stream entry ${entry.id}: ${parsed.error}`);
    }

    if (events.length > 0) await handler(events);

    await this.redis.xAck(
      this.streamKey,
      this.options.group,
      entries.map((entry) => entry.id),
    );
  }
}

interface RawStreamMessage {
  id: string;
  message: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStreamMessage = (value: unknown): value is RawStreamMessage =>
  isRecord(value) && typeof value.id === 'string' && isRecord(value.message);

const toEntry = ({ id, message }: RawStreamMessage): StreamEntry => ({ id, fields: message });

const toEntries = (reply: unknown): StreamEntry[] => {
  if (!Array.isArray(reply)) return [];

  return reply.flatMap((stream: unknown) =>
    isRecord(stream) && Array.isArray(stream.messages)
      ? stream.messages.filter(isStreamMessage).map(toEntry)
      : [],
  );
};
