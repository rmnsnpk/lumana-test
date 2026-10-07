import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ALL_EVENT_TYPES } from '#libs/messaging/index.js';
import type { EventType } from '#libs/messaging/index.js';
import { DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT } from '../consts/logs.consts.js';

export class QueryLogsDto {
  @ApiPropertyOptional({ enum: ALL_EVENT_TYPES })
  @IsOptional()
  @IsIn(ALL_EVENT_TYPES)
  type?: EventType;

  @ApiPropertyOptional({ example: 'crashes.search', description: 'API action of api.request logs' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  action?: string;

  @ApiPropertyOptional({ example: '2026-10-08T00:00:00Z', description: 'Occurred at or after' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-10-08T23:59:59Z', description: 'Occurred at or before' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ type: Number, default: DEFAULT_LOG_LIMIT, maximum: MAX_LOG_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LOG_LIMIT)
  limit: number = DEFAULT_LOG_LIMIT;

  @ApiPropertyOptional({ description: 'Opaque cursor returned as nextCursor by the previous page' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  cursor?: string;
}
