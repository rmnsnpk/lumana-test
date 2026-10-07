import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './cursor.js';
import { buildKeysetQuery, toCursorPage } from './keyset.js';

describe('cursor', () => {
  it('round-trips dates, numbers and ids', () => {
    const id = new ObjectId();
    const date = new Date('2024-05-01T10:00:00Z');

    expect(decodeCursor(encodeCursor(date, id))).toEqual({ value: date, id });
    expect(decodeCursor(encodeCursor(7, id))).toEqual({ value: 7, id });
  });

  it('rejects tampered cursors', () => {
    expect(() => decodeCursor('garbage')).toThrow(BadRequestException);
    expect(() => decodeCursor(Buffer.from('{"v":1,"id":"x"}').toString('base64url'))).toThrow(
      BadRequestException,
    );
  });
});

describe('keyset pagination', () => {
  it('builds a seek filter after the last (value, _id) pair', () => {
    const id = new ObjectId();
    const { sort, filter } = buildKeysetQuery({
      sortField: 'personsInjured',
      direction: 'desc',
      cursor: encodeCursor(3, id),
    });

    expect(sort).toEqual({ personsInjured: -1, _id: -1 });
    expect(filter).toEqual({
      $or: [{ personsInjured: { $lt: 3 } }, { personsInjured: 3, _id: { $lt: id } }],
    });
  });

  it('uses the extra probe document only to detect a next page', () => {
    const docs = [1, 2, 3].map((n) => ({ _id: new ObjectId(), n }));
    const page = toCursorPage(docs, 2, 'n', (doc) => doc.n);

    expect(page.items).toEqual([1, 2]);
    expect(decodeCursor(page.nextCursor ?? '')).toEqual({ value: 2, id: docs[1]?._id });
    expect(toCursorPage(docs.slice(0, 2), 2, 'n', (doc) => doc.n).nextCursor).toBeNull();
  });
});
