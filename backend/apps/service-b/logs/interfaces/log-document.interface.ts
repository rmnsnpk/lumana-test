import type { ObjectId } from 'mongodb';

import type { EventType } from '#libs/messaging/index.js';

export interface LogRecord {
  eventId: string;
  streamId: string;
  type: EventType;
  source: string;
  occurredAt: Date;
  action?: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
  payload: Record<string, unknown>;
}

export interface LogDocument extends LogRecord {
  _id: ObjectId;
  receivedAt: Date;
}
