import type { CRASH_COLUMNS } from '../consts/crash-columns.consts.js';

export type CrashColumn = (typeof CRASH_COLUMNS)[number];

export type CrashRow = Partial<Record<CrashColumn, string>>;
