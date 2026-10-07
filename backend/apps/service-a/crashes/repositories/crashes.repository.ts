import { Injectable } from '@nestjs/common';
import { MongoBulkWriteError } from 'mongodb';
import type { AnyBulkWriteOperation, BulkWriteResult, Db, Filter, IndexDescription } from 'mongodb';

import { BaseRepository, InjectDb } from '#libs/mongo/index.js';
import { CRASHES_COLLECTION } from '../consts/crashes-collection.consts.js';
import type { CrashDocument, CrashRecord } from '../interfaces/crash-document.interface.js';
import { MAX_COUNTED_TOTAL } from '../consts/search.consts.js';
import type { SearchCursor } from '../interfaces/search-cursor.interface.js';
import type { UpsertResult } from '../interfaces/upsert-result.interface.js';

@Injectable()
export class CrashesRepository extends BaseRepository<CrashDocument> {
  constructor(@InjectDb() db: Db) {
    super(db, CRASHES_COLLECTION);
  }

  protected indexes(): IndexDescription[] {
    return [
      { key: { collisionId: 1 }, unique: true, name: 'collisionId_unique' },
      { key: { crashDate: -1, collisionId: -1 }, name: 'crashes_browse_cursor' },
      {
        key: { searchPrefixes: 1, crashDate: -1, collisionId: -1 },
        name: 'crashes_prefix_cursor',
      },
    ];
  }

  async upsertMany(records: CrashRecord[]): Promise<UpsertResult> {
    if (records.length === 0) return { inserted: 0, updated: 0, unchanged: 0, failed: 0 };

    const importedAt = new Date();
    const operations: AnyBulkWriteOperation<CrashDocument>[] = records.map((record) => ({
      updateOne: {
        filter: { collisionId: record.collisionId },
        update: { $set: record, $setOnInsert: { importedAt } },
        upsert: true,
      },
    }));

    try {
      return summarize(
        await this.collection.bulkWrite(operations, { ordered: false }),
        records.length,
        0,
      );
    } catch (error) {
      if (!(error instanceof MongoBulkWriteError)) throw error;

      const failed = Array.isArray(error.writeErrors) ? error.writeErrors.length : 1;
      return summarize(error.result, records.length, failed);
    }
  }

  search(
    tokens: string[],
    after: SearchCursor | undefined,
    limit: number,
  ): Promise<CrashDocument[]> {
    const filter = toFilter(tokens);
    const query: Filter<CrashDocument> = after ? { $and: [filter, afterCursor(after)] } : filter;

    return this.collection
      .find(query)
      .sort({ crashDate: -1, collisionId: -1 })
      .limit(limit + 1)
      .toArray();
  }

  count(tokens: string[]): Promise<number> {
    return this.collection.countDocuments(toFilter(tokens), { limit: MAX_COUNTED_TOTAL });
  }
}

const toFilter = (tokens: string[]): Filter<CrashDocument> =>
  tokens.length > 0 ? { searchPrefixes: { $all: tokens } } : {};

const afterCursor = ({ crashDate, collisionId }: SearchCursor): Filter<CrashDocument> => {
  const date = new Date(crashDate);
  return {
    $or: [{ crashDate: { $lt: date } }, { crashDate: date, collisionId: { $lt: collisionId } }],
  };
};

const summarize = (result: BulkWriteResult, total: number, failed: number): UpsertResult => {
  const inserted = result.upsertedCount;
  const updated = result.modifiedCount;

  return { inserted, updated, failed, unchanged: Math.max(0, total - inserted - updated - failed) };
};
