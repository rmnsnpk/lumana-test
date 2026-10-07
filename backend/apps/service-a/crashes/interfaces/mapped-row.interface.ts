import type { CrashRecord } from './crash-document.interface.js';

export type MappedRow =
  { record: CrashRecord; reasons?: never } | { record: null; reasons: string[] };
