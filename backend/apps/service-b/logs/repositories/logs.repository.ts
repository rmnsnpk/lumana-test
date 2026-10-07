import { Injectable } from '@nestjs/common';
import type { AnyBulkWriteOperation, Db, Filter, IndexDescription } from 'mongodb';

import { buildKeysetQuery } from '#libs/common/index.js';
import type { KeysetOptions } from '#libs/common/index.js';
import { BaseRepository, InjectDb } from '#libs/mongo/index.js';
import { LOGS_COLLECTION, MAX_COUNTED_TOTAL } from '../consts/logs.consts.js';
import type { LogDocument, LogRecord } from '../interfaces/log-document.interface.js';
import type { LogFilter } from '../interfaces/log-filter.interface.js';

@Injectable()
export class LogsRepository extends BaseRepository<LogDocument> {
  constructor(@InjectDb() db: Db) {
    super(db, LOGS_COLLECTION);
  }

  protected indexes(): IndexDescription[] {
    return [
      { key: { eventId: 1 }, unique: true, name: 'eventId_unique' },
      { key: { occurredAt: -1, _id: -1 }, name: 'occurredAt_cursor' },
      { key: { type: 1, occurredAt: -1, _id: -1 }, name: 'type_occurredAt_cursor' },
      { key: { action: 1, occurredAt: -1, _id: -1 }, name: 'action_occurredAt_cursor' },
    ];
  }

  async saveMany(records: LogRecord[]): Promise<number> {
    if (records.length === 0) return 0;

    const receivedAt = new Date();
    const operations: AnyBulkWriteOperation<LogDocument>[] = records.map((record) => ({
      updateOne: {
        filter: { eventId: record.eventId },
        update: { $setOnInsert: { ...record, receivedAt } },
        upsert: true,
      },
    }));
    const result = await this.collection.bulkWrite(operations, { ordered: false });

    return result.upsertedCount;
  }

  find(filter: LogFilter, keyset: KeysetOptions, limit: number): Promise<LogDocument[]> {
    const { sort, filter: seek } = buildKeysetQuery(keyset);
    const base = toFilter(filter);
    const query = Object.keys(seek).length > 0 ? { $and: [base, seek] } : base;

    return this.collection
      .find(query as Filter<LogDocument>)
      .sort(sort)
      .limit(limit + 1)
      .toArray();
  }

  count(filter: LogFilter): Promise<number> {
    return this.collection.countDocuments(toFilter(filter), { limit: MAX_COUNTED_TOTAL });
  }
}

const toFilter = ({ type, action, from, to }: LogFilter): Filter<LogDocument> => {
  const filter: Filter<LogDocument> = {};

  if (type) filter.type = type;
  if (action) filter.action = action;
  if (from || to) {
    filter.occurredAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  return filter;
};
