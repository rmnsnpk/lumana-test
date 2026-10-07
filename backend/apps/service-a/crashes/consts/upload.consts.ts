import type { DatasetFileFormat } from '#libs/messaging/index.js';

export const UPLOADS_SUBDIR = 'uploads';
export const UPLOAD_FIELD_NAME = 'file';

export const UPLOAD_FORMATS: Readonly<Record<string, DatasetFileFormat>> = {
  '.json': 'json',
  '.xlsx': 'xlsx',
};

export const MAX_REJECTIONS = 100;
export const IMPORT_BATCH_RETRIES = 3;
export const IMPORT_BATCH_RETRY_BASE_DELAY_MS = 500;
