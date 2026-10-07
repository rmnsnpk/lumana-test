import { Injectable } from '@nestjs/common';

import { ReportGrpcClient } from './clients/report-grpc.client.js';
import type { ActivityReportQueryDto } from './dto/activity-report-query.dto.js';
import type { ActivityReport } from './interfaces/activity-report.interface.js';

@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportGrpcClient) {}

  activity({ service, from, to }: ActivityReportQueryDto): Promise<ActivityReport> {
    return this.reports.generateActivityReport({ service, from, to });
  }
}
