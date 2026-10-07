import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ALL_EVENT_TYPES } from '#libs/messaging/index.js';
import type { EventType } from '#libs/messaging/index.js';
import { MAX_COUNTED_TOTAL } from '../consts/logs.consts.js';
import type { LogDocument } from '../interfaces/log-document.interface.js';
import type { LogPage } from '../interfaces/log-page.interface.js';

export class LogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty({ enum: ALL_EVENT_TYPES })
  type: EventType;

  @ApiProperty()
  source: string;

  @ApiProperty()
  occurredAt: string;

  @ApiProperty()
  receivedAt: string;

  @ApiPropertyOptional()
  action?: string;

  @ApiPropertyOptional()
  statusCode?: number;

  @ApiPropertyOptional()
  durationMs?: number;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload: Record<string, unknown>;

  static fromDocument(document: LogDocument): LogDto {
    const { _id, streamId: _streamId, occurredAt, receivedAt, ...rest } = document;

    return {
      ...rest,
      id: _id.toHexString(),
      occurredAt: occurredAt.toISOString(),
      receivedAt: receivedAt.toISOString(),
    };
  }
}

export class LogPageDto implements LogPage<LogDto> {
  @ApiProperty({ type: [LogDto] })
  items: LogDto[];

  @ApiProperty({ description: `Number of matches, counted up to ${MAX_COUNTED_TOTAL}` })
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Pass back unchanged as cursor to get the next page' })
  nextCursor?: string;
}
