import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import type { WriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';

import type { CrashFileWriter } from '../interfaces/crash-file-writer.interface.js';
import type { CrashRow } from '../interfaces/crash-row.interface.js';

export class JsonCrashWriter implements CrashFileWriter {
  private readonly stream: WriteStream;
  private readonly completed: Promise<void>;
  private records = 0;

  constructor(path: string) {
    this.stream = createWriteStream(path, { encoding: 'utf8' });
    this.completed = finished(this.stream);
    this.completed.catch(() => undefined);
    this.stream.write('[');
  }

  async write(rows: CrashRow[]): Promise<void> {
    for (const row of rows) {
      const chunk = `${this.records === 0 ? '\n' : ',\n'}${JSON.stringify(row)}`;
      this.records++;
      if (!this.stream.write(chunk)) await once(this.stream, 'drain');
    }
  }

  async finish(): Promise<void> {
    this.stream.end(this.records === 0 ? ']\n' : '\n]\n');
    await this.completed;
  }

  async abort(): Promise<void> {
    this.stream.destroy();
    await this.completed.catch(() => undefined);
  }
}
