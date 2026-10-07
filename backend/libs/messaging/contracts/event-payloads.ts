import type { EVENT_TYPES } from './event-types.js';

export type DatasetFileFormat = 'json' | 'xlsx';

export interface ApiRequestPayload {
  action: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  error?: string;
}

export interface DatasetFetchCompletedPayload {
  fileName: string;
  format: DatasetFileFormat;
  rows: number;
  bytes: number;
  durationMs: number;
}

export interface DatasetFetchFailedPayload {
  format: DatasetFileFormat;
  error: string;
  durationMs: number;
}

export interface ImportCompletedPayload {
  fileName: string;
  format: DatasetFileFormat;
  received: number;
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: number;
  failed: number;
  durationMs: number;
}

export interface ImportFailedPayload {
  fileName: string;
  format: DatasetFileFormat;
  error: string;
  durationMs: number;
}

export interface EventPayloadMap {
  [EVENT_TYPES.apiRequest]: ApiRequestPayload;
  [EVENT_TYPES.datasetFetchCompleted]: DatasetFetchCompletedPayload;
  [EVENT_TYPES.datasetFetchFailed]: DatasetFetchFailedPayload;
  [EVENT_TYPES.importCompleted]: ImportCompletedPayload;
  [EVENT_TYPES.importFailed]: ImportFailedPayload;
}
