import type { DatasetFileFormat } from '#libs/messaging/index.js';
import type { CrashFileReader } from '../interfaces/file-row.interface.js';
import { readJsonCrashes } from './json-crash.reader.js';
import { readXlsxCrashes } from './xlsx-crash.reader.js';

const READERS: Record<DatasetFileFormat, CrashFileReader> = {
  json: readJsonCrashes,
  xlsx: readXlsxCrashes,
};

export const getCrashFileReader = (format: DatasetFileFormat): CrashFileReader => READERS[format];
