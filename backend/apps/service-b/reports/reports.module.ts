import { Module } from '@nestjs/common';

import { ReportGrpcClient } from './clients/report-grpc.client.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportGrpcClient],
})
export class ReportsModule {}
