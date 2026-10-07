import { ApiProperty } from '@nestjs/swagger';

import type { DatasetFileFormat } from '#libs/messaging/index.js';
import { CRASH_FILE_FORMATS } from '../consts/fetch.consts.js';
import type { FetchResult } from '../interfaces/fetch-result.interface.js';

export class FetchResultDto implements FetchResult {
  @ApiProperty({ example: 'nyc-crashes-20261008T120000Z-100000.json' })
  fileName: string;

  @ApiProperty({ example: '/data/exports/nyc-crashes-20261008T120000Z-100000.json' })
  path: string;

  @ApiProperty({ enum: CRASH_FILE_FORMATS })
  format: DatasetFileFormat;

  @ApiProperty()
  records: number;

  @ApiProperty()
  bytes: number;

  @ApiProperty()
  durationMs: number;
}
