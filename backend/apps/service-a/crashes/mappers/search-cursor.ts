import { BadRequestException } from '@nestjs/common';

import { MAX_COUNTED_TOTAL, SEARCH_CURSOR_VERSION } from '../consts/search.consts.js';
import type { SearchCursor } from '../interfaces/search-cursor.interface.js';

export const encodeSearchCursor = (cursor: SearchCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

export const decodeSearchCursor = (value: string, query: string): SearchCursor => {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<SearchCursor>;

    if (
      parsed.version !== SEARCH_CURSOR_VERSION ||
      parsed.query !== query ||
      !Number.isInteger(parsed.total) ||
      Number(parsed.total) < 0 ||
      Number(parsed.total) > MAX_COUNTED_TOTAL ||
      !Number.isSafeInteger(parsed.collisionId) ||
      Number(parsed.collisionId) <= 0 ||
      typeof parsed.crashDate !== 'string' ||
      Number.isNaN(Date.parse(parsed.crashDate))
    ) {
      throw new Error('Cursor shape is invalid');
    }

    return parsed as SearchCursor;
  } catch {
    throw new BadRequestException('The search cursor is invalid or belongs to another query');
  }
};
