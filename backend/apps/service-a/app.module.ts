import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { createEnvValidator } from '#libs/common/index.js';
import { HealthModule } from '#libs/health/index.js';
import { MessagingModule } from '#libs/messaging/index.js';
import { MongoModule } from '#libs/mongo/index.js';
import { RedisModule } from '#libs/redis/index.js';
import { ApiActivityInterceptor, TelemetryModule } from '#libs/telemetry/index.js';
import { SERVICE_NAME } from './config/service-a.constants.js';
import { ServiceAEnv } from './config/service-a.env.js';
import { CrashesModule } from './crashes/crashes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: createEnvValidator(ServiceAEnv),
    }),
    MongoModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServiceAEnv, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
        dbName: config.get('MONGO_DB', { infer: true }),
        clientOptions: { appName: SERVICE_NAME },
      }),
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServiceAEnv, true>) => ({
        url: config.get('REDIS_URL', { infer: true }),
        clientName: SERVICE_NAME,
      }),
    }),
    MessagingModule.forProducer({ source: SERVICE_NAME }),
    TelemetryModule.forRoot({ service: SERVICE_NAME }),
    HealthModule,
    CrashesModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useExisting: ApiActivityInterceptor }],
})
export class AppModule {}
