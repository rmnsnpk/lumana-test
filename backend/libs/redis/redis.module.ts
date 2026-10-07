import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { createClient } from 'redis';

import {
  REDIS_CLIENT,
  REDIS_MODULE_OPTIONS,
  REDIS_RECONNECT_BASE_DELAY_MS,
  REDIS_RECONNECT_MAX_DELAY_MS,
} from './redis.constants.js';
import type {
  RedisClient,
  RedisModuleAsyncOptions,
  RedisModuleOptions,
} from './redis.interfaces.js';
import { TimeSeriesService } from './time-series.service.js';

@Global()
@Module({})
export class RedisModule implements OnApplicationShutdown {
  private static readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient) {}

  static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    return {
      module: RedisModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: REDIS_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        {
          provide: REDIS_CLIENT,
          useFactory: (moduleOptions: RedisModuleOptions) => RedisModule.connect(moduleOptions),
          inject: [REDIS_MODULE_OPTIONS],
        },
        TimeSeriesService,
      ],
      exports: [REDIS_CLIENT, TimeSeriesService],
    };
  }

  static async connect({ url, clientName }: RedisModuleOptions): Promise<RedisClient> {
    const client = createClient({
      url,
      name: clientName,
      socket: {
        reconnectStrategy: (retries) =>
          Math.min(REDIS_RECONNECT_BASE_DELAY_MS * 2 ** retries, REDIS_RECONNECT_MAX_DELAY_MS),
      },
    });

    client.on('error', (error: Error) => RedisModule.logger.error(`Redis error: ${error.message}`));
    await client.connect();
    RedisModule.logger.log(`Connected to Redis${clientName ? ` as "${clientName}"` : ''}`);

    return client;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }
}
