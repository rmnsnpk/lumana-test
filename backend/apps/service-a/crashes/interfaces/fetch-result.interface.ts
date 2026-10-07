import type { DatasetFileFormat } from '#libs/messaging/index.js';

export interface FetchResult {
  fileName: string;
  path: string;
  format: DatasetFileFormat;
  records: number;
  bytes: number;
  durationMs: number;
}
