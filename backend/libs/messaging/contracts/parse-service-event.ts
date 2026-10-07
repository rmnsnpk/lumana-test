import { ALL_EVENT_TYPES } from './event-types.js';
import type { EventType } from './event-types.js';
import type { ServiceEvent } from './service-event.js';

const EVENT_TYPE_SET: ReadonlySet<string> = new Set(ALL_EVENT_TYPES);
const MAX_ID_LENGTH = 128;

export type ParsedServiceEvent =
  { event: ServiceEvent; error?: never } | { event: null; error: string };

export const parseServiceEvent = (raw: string | undefined): ParsedServiceEvent => {
  if (!raw) return { event: null, error: 'event field is missing' };

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return { event: null, error: 'event is not valid JSON' };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { event: null, error: 'event must be an object' };
  }

  const { id, type, source, occurredAt, payload } = value as Record<string, unknown>;

  if (typeof id !== 'string' || id.length === 0 || id.length > MAX_ID_LENGTH) {
    return { event: null, error: 'event id is invalid' };
  }
  if (typeof type !== 'string' || !EVENT_TYPE_SET.has(type)) {
    return { event: null, error: `event type ${JSON.stringify(type)} is unknown` };
  }
  if (typeof source !== 'string' || source.length === 0) {
    return { event: null, error: 'event source is invalid' };
  }
  if (typeof occurredAt !== 'string' || Number.isNaN(Date.parse(occurredAt))) {
    return { event: null, error: 'event occurredAt is invalid' };
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { event: null, error: 'event payload must be an object' };
  }

  return { event: { id, type: type as EventType, source, occurredAt, payload } as ServiceEvent };
};
