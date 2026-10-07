import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PDF_CONTENT_TYPE } from './consts/reports.consts.js';
import { ActivityReportQueryDto } from './dto/activity-report-query.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('activity')
  @ApiOperation({
    summary:
      'PDF report with charts of API traffic, errors, latency and events from RedisTimeSeries',
  })
  @ApiProduces(PDF_CONTENT_TYPE)
  @ApiOkResponse({ description: 'The PDF file', schema: { type: 'string', format: 'binary' } })
  @ApiBadRequestResponse({ description: 'Invalid period' })
  @ApiServiceUnavailableResponse({
    description: 'Report service or RedisTimeSeries is unavailable',
  })
  async activity(@Query() query: ActivityReportQueryDto): Promise<StreamableFile> {
    const { pdf, fileName } = await this.reports.activity(query);

    return new StreamableFile(pdf, {
      type: PDF_CONTENT_TYPE,
      disposition: `attachment; filename="${fileName}"`,
      length: pdf.length,
    });
  }
}
