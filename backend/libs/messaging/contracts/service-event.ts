import type { EventPayloadMap } from './event-payloads.js';
import type { EventType } from './event-types.js';

export interface ServiceEventOf<T extends EventType> {
  id: string;
  type: T;
  source: string;
  occurredAt: string;
  payload: EventPayloadMap[T];
}

export type ServiceEvent = { [T in EventType]: ServiceEventOf<T> }[EventType];
