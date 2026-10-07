import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { createEnvValidator } from '#libs/common/index.js';
import { HealthModule } from '#libs/health/index.js';
import { MessagingModule } from '#libs/messaging/index.js';
import { MongoModule } from '#libs/mongo/index.js';
import { RedisModule } from '#libs/redis/index.js';
import { EVENT_SOURCE, LOGS_CONSUMER_GROUP, SERVICE_NAME } from './config/service-b.constants.js';
import { ServiceBEnv } from './config/service-b.env.js';
import { LogsModule } from './logs/logs.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: createEnvValidator(ServiceBEnv),
    }),
    MongoModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServiceBEnv, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
        dbName: config.get('MONGO_DB', { infer: true }),
        clientOptions: { appName: SERVICE_NAME },
      }),
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServiceBEnv, true>) => ({
        url: config.get('REDIS_URL', { infer: true }),
        clientName: SERVICE_NAME,
      }),
    }),
    MessagingModule.forConsumer({ source: EVENT_SOURCE, group: LOGS_CONSUMER_GROUP }),
    HealthModule,
    LogsModule,
    ReportsModule,
  ],
})
export class AppModule {}
