import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  limit: number;
  total?: number;
}

export class CursorPageMetaDto {
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Pass as `cursor` to get the next page',
  })
  nextCursor: string | null;

  @ApiProperty()
  limit: number;

  @ApiPropertyOptional({ description: 'Only present when `includeTotal=true`' })
  total?: number;
}
