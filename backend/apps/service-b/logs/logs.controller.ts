import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { LogDto, LogPageDto } from './dto/log.dto.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';
import type { LogPage } from './interfaces/log-page.interface.js';
import { LogsService } from './logs.service.js';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'Query Service A event logs by type, action and date, newest first' })
  @ApiOkResponse({ type: LogPageDto })
  query(@Query() query: QueryLogsDto): Promise<LogPage<LogDto>> {
    return this.logs.query(query);
  }
}
