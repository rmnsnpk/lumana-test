import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

import {
  DEFAULT_SEARCH_LIMIT,
  MAX_QUERY_LENGTH,
  MAX_SEARCH_LIMIT,
} from '../consts/search.consts.js';

export class SearchCrashesDto {
  @ApiPropertyOptional({
    example: 'atl sed',
    description:
      'Word prefixes that must all match the borough, zip code, street names, contributing factors or vehicle types; leave empty to list all crashes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_QUERY_LENGTH)
  q?: string;

  @ApiPropertyOptional({ type: Number, default: DEFAULT_SEARCH_LIMIT, maximum: MAX_SEARCH_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SEARCH_LIMIT)
  limit: number = DEFAULT_SEARCH_LIMIT;

  @ApiPropertyOptional({ description: 'Opaque cursor returned as nextCursor by the previous page' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  cursor?: string;
}
