import { ApiProperty } from '@nestjs/swagger';

import type { DatasetFileFormat } from '#libs/messaging/index.js';
import { CRASH_FILE_FORMATS } from '../consts/fetch.consts.js';
import type { ImportRejection, ImportResult } from '../interfaces/import-result.interface.js';

export class ImportRejectionDto implements ImportRejection {
  @ApiProperty({ description: 'Row number in the file' })
  row: number;

  @ApiProperty({ type: [String] })
  reasons: string[];
}

export class ImportResultDto implements ImportResult {
  @ApiProperty()
  fileName: string;

  @ApiProperty({ enum: CRASH_FILE_FORMATS })
  format: DatasetFileFormat;

  @ApiProperty({ description: 'Rows read from the file' })
  received: number;

  @ApiProperty({ description: 'New crashes stored' })
  inserted: number;

  @ApiProperty({ description: 'Existing crashes whose data changed' })
  updated: number;

  @ApiProperty({ description: 'Existing crashes already up to date' })
  unchanged: number;

  @ApiProperty({ description: 'Rows that failed validation' })
  rejected: number;

  @ApiProperty({ description: 'Rows MongoDB refused to write' })
  failed: number;

  @ApiProperty({ type: [ImportRejectionDto], description: 'First rejected rows with reasons' })
  rejections: ImportRejectionDto[];

  @ApiProperty()
  durationMs: number;
}
