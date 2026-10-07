declare module 'unzipper' {
  import type { Readable } from 'node:stream';

  export interface CentralDirectoryFile {
    path: string;
    type: 'File' | 'Directory';
    stream(): Readable;
  }

  export interface CentralDirectory {
    files: CentralDirectoryFile[];
  }

  export const Open: {
    file(path: string): Promise<CentralDirectory>;
  };
}
