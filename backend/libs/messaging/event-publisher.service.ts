import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { InjectRedis } from '../redis/index.js';
import type { RedisClient } from '../redis/index.js';
import type { EventPayloadMap, EventType, ServiceEventOf } from './contracts/index.js';
import {
  buildEventStreamKey,
  DEFAULT_STREAM_MAX_LEN,
  MESSAGING_OPTIONS,
  STREAM_FIELDS,
} from './messaging.constants.js';
import type { MessagingProducerOptions } from './messaging.interfaces.js';

@Injectable()
export class EventPublisher {
  private readonly streamKey: string;
  private readonly maxLen: number;

  constructor(
    @InjectRedis() private readonly redis: RedisClient,
    @Inject(MESSAGING_OPTIONS) private readonly options: MessagingProducerOptions,
  ) {
    this.streamKey = buildEventStreamKey(options.source);
    this.maxLen = options.maxLen ?? DEFAULT_STREAM_MAX_LEN;
  }

  async publish<T extends EventType>(
    type: T,
    payload: EventPayloadMap[T],
  ): Promise<ServiceEventOf<T>> {
    const event: ServiceEventOf<T> = {
      id: randomUUID(),
      type,
      source: this.options.source,
      occurredAt: new Date().toISOString(),
      payload,
    };

    await this.redis.xAdd(
      this.streamKey,
      '*',
      { [STREAM_FIELDS.type]: type, [STREAM_FIELDS.event]: JSON.stringify(event) },
      { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: this.maxLen } },
    );

    return event;
  }
}
