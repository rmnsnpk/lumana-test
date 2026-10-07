import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, Matches } from 'class-validator';

import { DEFAULT_REPORT_SERVICE } from '../consts/reports.consts.js';

export class ActivityReportQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_REPORT_SERVICE })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,50}$/)
  service: string = DEFAULT_REPORT_SERVICE;

  @ApiPropertyOptional({
    example: '2026-10-07T00:00:00Z',
    description: 'Defaults to 24 hours before to',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-10-08T23:59:59Z', description: 'Defaults to now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
