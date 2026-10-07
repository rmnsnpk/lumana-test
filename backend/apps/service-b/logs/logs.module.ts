import { Module } from '@nestjs/common';

import { LogsConsumer } from './consumers/logs.consumer.js';
import { LogsController } from './logs.controller.js';
import { LogsService } from './logs.service.js';
import { LogsRepository } from './repositories/logs.repository.js';

@Module({
  controllers: [LogsController],
  providers: [LogsService, LogsRepository, LogsConsumer],
})
export class LogsModule {}
