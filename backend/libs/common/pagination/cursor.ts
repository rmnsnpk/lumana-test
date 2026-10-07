import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

export type SortValue = Date | string | number | null;

export interface DecodedCursor {
  value: SortValue;
  id: ObjectId;
}

interface CursorPayload {
  v: string | number | null;
  d?: 1;
  id: string;
}

export const encodeCursor = (value: SortValue, id: ObjectId): string => {
  const payload: CursorPayload =
    value instanceof Date
      ? { v: value.toISOString(), d: 1, id: id.toHexString() }
      : { v: value, id: id.toHexString() };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

export const decodeCursor = (cursor: string): DecodedCursor => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('Malformed pagination cursor');
  }

  if (!isCursorPayload(parsed)) {
    throw new BadRequestException('Malformed pagination cursor');
  }

  return {
    value: parsed.d === 1 && typeof parsed.v === 'string' ? new Date(parsed.v) : parsed.v,
    id: new ObjectId(parsed.id),
  };
};

const isCursorPayload = (value: unknown): value is CursorPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const sortValueType = typeof candidate.v;

  return (
    typeof candidate.id === 'string' &&
    ObjectId.isValid(candidate.id) &&
    (candidate.v === null || sortValueType === 'string' || sortValueType === 'number')
  );
};
