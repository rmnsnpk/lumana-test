import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

import { BaseEnv } from '#libs/common/index.js';

export class ServiceAEnv extends BaseEnv {
  @IsString()
  DATA_DIR = './data';

  @IsUrl({ require_tld: false })
  SOURCE_API_URL = 'https://data.cityofnewyork.us/resource/h9gi-nx95.json';

  @IsOptional()
  @IsString()
  SOURCE_APP_TOKEN?: string;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50_000)
  FETCH_PAGE_SIZE = 50_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  FETCH_MAX_ROWS = 3_000_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  IMPORT_BATCH_SIZE = 1_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;
}
