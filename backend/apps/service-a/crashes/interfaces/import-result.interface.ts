import type { DatasetFileFormat } from '#libs/messaging/index.js';
import type { UpsertResult } from './upsert-result.interface.js';

export interface ImportRejection {
  row: number;
  reasons: string[];
}

export interface ImportResult extends UpsertResult {
  fileName: string;
  format: DatasetFileFormat;
  received: number;
  rejected: number;
  rejections: ImportRejection[];
  durationMs: number;
}
