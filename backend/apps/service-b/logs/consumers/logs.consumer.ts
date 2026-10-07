import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { EventStreamConsumer } from '#libs/messaging/index.js';
import type { ConsumedEvent } from '#libs/messaging/index.js';
import { toLogRecord } from '../mappers/log-record.mapper.js';
import { LogsRepository } from '../repositories/logs.repository.js';

@Injectable()
export class LogsConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(LogsConsumer.name);

  constructor(
    private readonly consumer: EventStreamConsumer,
    private readonly logs: LogsRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.consumer.start((events) => this.store(events));
  }

  private async store(events: ConsumedEvent[]): Promise<void> {
    const inserted = await this.logs.saveMany(events.map(toLogRecord));
    this.logger.debug(`Stored ${inserted}/${events.length} events`);
  }
}
