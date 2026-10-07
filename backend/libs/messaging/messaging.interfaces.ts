import type { ServiceEvent } from './contracts/index.js';

export interface MessagingProducerOptions {
  source: string;
  maxLen?: number;
}

export interface MessagingConsumerOptions {
  source: string;
  group: string;
  consumer?: string;
  batchSize?: number;
  blockMs?: number;
  claimIdleMs?: number;
}

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface ConsumedEvent {
  streamId: string;
  event: ServiceEvent;
}

export type EventBatchHandler = (events: ConsumedEvent[]) => Promise<void>;
