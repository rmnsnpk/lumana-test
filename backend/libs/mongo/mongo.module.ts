import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';

import { toErrorMessage, withRetry } from '../common/index.js';
import {
  MONGO_CLIENT,
  MONGO_CONNECT_BASE_DELAY_MS,
  MONGO_CONNECT_RETRIES,
  MONGO_DB,
  MONGO_MODULE_OPTIONS,
} from './mongo.constants.js';
import type { MongoModuleAsyncOptions, MongoModuleOptions } from './mongo.interfaces.js';

@Global()
@Module({})
export class MongoModule implements OnApplicationShutdown {
  private static readonly logger = new Logger(MongoModule.name);

  constructor(@Inject(MONGO_CLIENT) private readonly client: MongoClient) {}

  static forRootAsync(options: MongoModuleAsyncOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MONGO_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        {
          provide: MONGO_CLIENT,
          useFactory: (moduleOptions: MongoModuleOptions) => MongoModule.connect(moduleOptions),
          inject: [MONGO_MODULE_OPTIONS],
        },
        {
          provide: MONGO_DB,
          useFactory: (client: MongoClient, { dbName }: MongoModuleOptions): Db =>
            client.db(dbName),
          inject: [MONGO_CLIENT, MONGO_MODULE_OPTIONS],
        },
      ],
      exports: [MONGO_CLIENT, MONGO_DB],
    };
  }

  private static async connect({ uri, clientOptions }: MongoModuleOptions): Promise<MongoClient> {
    const client = new MongoClient(uri, clientOptions);

    await withRetry(() => client.connect(), {
      retries: MONGO_CONNECT_RETRIES,
      baseDelayMs: MONGO_CONNECT_BASE_DELAY_MS,
      onRetry: (error, attempt) =>
        MongoModule.logger.warn(
          `Mongo connect attempt ${attempt} failed: ${toErrorMessage(error)}`,
        ),
    });
    MongoModule.logger.log('Connected to MongoDB');

    return client;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
