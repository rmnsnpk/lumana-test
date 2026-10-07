import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

import type { DatasetFileFormat } from '#libs/messaging/index.js';
import { CRASH_FILE_FORMATS, DEFAULT_FETCH_LIMIT } from '../consts/fetch.consts.js';

export class FetchCrashesDto {
  @ApiPropertyOptional({ enum: CRASH_FILE_FORMATS, default: 'json' })
  @IsOptional()
  @IsIn(CRASH_FILE_FORMATS)
  format: DatasetFileFormat = 'json';

  @ApiPropertyOptional({
    type: Number,
    default: DEFAULT_FETCH_LIMIT,
    minimum: 1,
    description: 'Max rows to fetch (capped by FETCH_MAX_ROWS)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = DEFAULT_FETCH_LIMIT;
}
