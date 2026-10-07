import 'reflect-metadata';

import { bootstrapHttpService } from '#libs/common/index.js';
import { AppModule } from './app.module.js';

await bootstrapHttpService({
  module: AppModule,
  name: 'Service B',
  description: 'Stores Service A events as logs, serves log queries and PDF activity reports.',
});
