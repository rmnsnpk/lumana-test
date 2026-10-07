import type { CrashRow } from './crash-row.interface.js';

export interface CrashFileWriter {
  write(rows: CrashRow[]): Promise<void>;
  finish(): Promise<void>;
  abort(): Promise<void>;
}
