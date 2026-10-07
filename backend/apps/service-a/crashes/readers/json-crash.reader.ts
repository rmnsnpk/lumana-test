import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream';

import streamArray from 'stream-json/streamers/stream-array.js';

import type { CrashFileReader } from '../interfaces/file-row.interface.js';

interface ArrayItem {
  key: number;
  value: unknown;
}

export const readJsonCrashes: CrashFileReader = async function* (path) {
  const items = pipeline(createReadStream(path), streamArray.withParserAsStream(), () => undefined);

  for await (const { key, value } of items as AsyncIterable<ArrayItem>) {
    yield { row: key + 1, value };
  }
};
