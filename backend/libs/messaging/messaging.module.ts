import { DynamicModule, Module } from '@nestjs/common';

import { EventPublisher } from './event-publisher.service.js';
import { EventStreamConsumer } from './event-stream-consumer.service.js';
import { MESSAGING_CONSUMER_OPTIONS, MESSAGING_OPTIONS } from './messaging.constants.js';
import type { MessagingConsumerOptions, MessagingProducerOptions } from './messaging.interfaces.js';

@Module({})
export class MessagingModule {
  static forProducer(options: MessagingProducerOptions): DynamicModule {
    return {
      module: MessagingModule,
      global: true,
      providers: [{ provide: MESSAGING_OPTIONS, useValue: options }, EventPublisher],
      exports: [EventPublisher],
    };
  }

  static forConsumer(options: MessagingConsumerOptions): DynamicModule {
    return {
      module: MessagingModule,
      global: true,
      providers: [{ provide: MESSAGING_CONSUMER_OPTIONS, useValue: options }, EventStreamConsumer],
      exports: [EventStreamConsumer],
    };
  }
}
