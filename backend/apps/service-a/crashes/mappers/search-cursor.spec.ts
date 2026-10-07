import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { decodeSearchCursor, encodeSearchCursor } from './search-cursor.js';

const cursor = {
  version: 1,
  query: 'atl',
  total: 40,
  crashDate: '2021-04-13T10:00:00.000Z',
  collisionId: 10,
} as const;

describe('search cursor', () => {
  it('round-trips for the same query', () => {
    expect(decodeSearchCursor(encodeSearchCursor(cursor), 'atl')).toEqual(cursor);
  });

  it('rejects cursors from another query or with a broken shape', () => {
    expect(() => decodeSearchCursor(encodeSearchCursor(cursor), 'sedan')).toThrow(
      BadRequestException,
    );
    expect(() =>
      decodeSearchCursor(encodeSearchCursor({ ...cursor, total: 50_000 }), 'atl'),
    ).toThrow(BadRequestException);
    expect(() => decodeSearchCursor('garbage', 'atl')).toThrow(BadRequestException);
  });
});
