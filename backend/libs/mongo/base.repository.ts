import { Logger, OnModuleInit } from '@nestjs/common';
import type { Collection, Db, Document, IndexDescription } from 'mongodb';

export abstract class BaseRepository<TSchema extends Document> implements OnModuleInit {
  protected readonly collection: Collection<TSchema>;
  protected readonly logger = new Logger(this.constructor.name);

  protected constructor(db: Db, collectionName: string) {
    this.collection = db.collection<TSchema>(collectionName);
  }

  protected abstract indexes(): IndexDescription[];

  async onModuleInit(): Promise<void> {
    const indexes = this.indexes();

    if (indexes.length > 0) {
      const names = await this.collection.createIndexes(indexes);
      this.logger.log(
        `Ensured indexes on "${this.collection.collectionName}": ${names.join(', ')}`,
      );
    }
  }
}
