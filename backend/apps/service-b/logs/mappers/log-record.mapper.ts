import type { ConsumedEvent } from '#libs/messaging/index.js';
import type { LogRecord } from '../interfaces/log-document.interface.js';

export const toLogRecord = ({ streamId, event }: ConsumedEvent): LogRecord => {
  const payload = event.payload as unknown as Record<string, unknown>;
  const record: LogRecord = {
    eventId: event.id,
    streamId,
    type: event.type,
    source: event.source,
    occurredAt: new Date(event.occurredAt),
    payload,
  };
  const action = pickString(payload, 'action');
  const statusCode = pickNumber(payload, 'statusCode');
  const durationMs = pickNumber(payload, 'durationMs');
  const error = pickString(payload, 'error');

  if (action !== undefined) record.action = action;
  if (statusCode !== undefined) record.statusCode = statusCode;
  if (durationMs !== undefined) record.durationMs = durationMs;
  if (error !== undefined) record.error = error;

  return record;
};

const pickString = (payload: Record<string, unknown>, key: string): string | undefined => {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
};

const pickNumber = (payload: Record<string, unknown>, key: string): number | undefined => {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};
