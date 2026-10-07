import type { Document, Filter, ObjectId, Sort } from 'mongodb';

import type { CursorPage } from './cursor-page.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { SortValue } from './cursor.js';

export type SortDirection = 'asc' | 'desc';

export interface KeysetOptions {
  sortField: string;
  direction: SortDirection;
  cursor?: string;
}

export interface KeysetQuery {
  sort: Sort;
  filter: Filter<Document>;
}

export const buildKeysetQuery = ({ sortField, direction, cursor }: KeysetOptions): KeysetQuery => {
  const order = direction === 'asc' ? 1 : -1;
  const sort: Sort = { [sortField]: order, _id: order };

  if (!cursor) {
    return { sort, filter: {} };
  }

  const { value, id } = decodeCursor(cursor);
  const op = order === 1 ? '$gt' : '$lt';

  return {
    sort,
    filter: {
      $or: [{ [sortField]: { [op]: value } }, { [sortField]: value, _id: { [op]: id } }],
    },
  };
};

export const toCursorPage = <TDoc extends { _id: ObjectId }, TOut>(
  docs: TDoc[],
  limit: number,
  sortField: keyof TDoc & string,
  map: (doc: TDoc) => TOut,
  total?: number,
): CursorPage<TOut> => {
  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;
  const last = pageDocs.at(-1);

  return {
    items: pageDocs.map(map),
    nextCursor: hasMore && last ? encodeCursor(toSortValue(last[sortField]), last._id) : null,
    limit,
    ...(total === undefined ? {} : { total }),
  };
};

const toSortValue = (value: unknown): SortValue =>
  value instanceof Date || typeof value === 'string' || typeof value === 'number' ? value : null;
