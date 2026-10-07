import 'reflect-metadata';

import { bootstrapHttpService } from '#libs/common/index.js';
import { AppModule } from './app.module.js';

await bootstrapHttpService({
  module: AppModule,
  name: 'Service A',
  description: 'Every API call is recorded in RedisTimeSeries and published to Redis Streams.',
});
