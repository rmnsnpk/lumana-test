import type { DatasetFileFormat } from '#libs/messaging/index.js';
import type { CrashFileWriter } from '../interfaces/crash-file-writer.interface.js';
import { JsonCrashWriter } from './json-crash.writer.js';
import { XlsxCrashWriter } from './xlsx-crash.writer.js';

export const createCrashFileWriter = (format: DatasetFileFormat, path: string): CrashFileWriter =>
  format === 'xlsx' ? new XlsxCrashWriter(path) : new JsonCrashWriter(path);
