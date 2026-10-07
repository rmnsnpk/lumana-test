export interface FileRow {
  row: number;
  value: unknown;
}

export type CrashFileReader = (path: string) => AsyncGenerator<FileRow>;
