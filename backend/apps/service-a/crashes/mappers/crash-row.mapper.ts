import {
  BOROUGHS,
  EXCEL_EPOCH_OFFSET_DAYS,
  EXCEL_SERIAL_RANGE,
  FACTOR_COLUMNS,
  MS_PER_DAY,
  NYC_BOUNDS,
  PLACEHOLDER_VALUES,
  VEHICLE_COLUMNS,
} from '../consts/crash-values.consts.js';
import type { Borough, CrashRecord, GeoPoint } from '../interfaces/crash-document.interface.js';
import type { MappedRow } from '../interfaces/mapped-row.interface.js';
import { searchPrefixes } from './search-prefixes.js';

type SourceRow = Record<string, unknown>;

const TIME_OF_DAY = /^(\d{1,2}):(\d{2})$/;
const ZIP_CODE = /^\d{5}$/;
const HAS_TIMEZONE = /(Z|[+-]\d{2}:?\d{2})$/i;
const BOROUGH_SET: ReadonlySet<string> = new Set(BOROUGHS);

export const mapCrashRow = (row: unknown): MappedRow => {
  if (!isSourceRow(row)) {
    return { record: null, reasons: ['row must be an object'] };
  }

  const reasons: string[] = [];
  const collisionId = toNumber(row.collision_id);
  const crashDate = combineDateAndTime(row.crash_date, row.crash_time);

  if (collisionId === undefined || !Number.isSafeInteger(collisionId) || collisionId <= 0) {
    reasons.push(`collision_id must be a positive integer, got ${describe(row.collision_id)}`);
  }

  if (!crashDate) {
    reasons.push(`crash_date must be a date, got ${describe(row.crash_date)}`);
  }

  if (collisionId === undefined || !crashDate || reasons.length > 0) {
    return { record: null, reasons };
  }

  const record: CrashRecord = {
    collisionId,
    crashDate,
    personsInjured: toCount(row.number_of_persons_injured),
    personsKilled: toCount(row.number_of_persons_killed),
    pedestriansInjured: toCount(row.number_of_pedestrians_injured),
    pedestriansKilled: toCount(row.number_of_pedestrians_killed),
    cyclistsInjured: toCount(row.number_of_cyclist_injured),
    cyclistsKilled: toCount(row.number_of_cyclist_killed),
    motoristsInjured: toCount(row.number_of_motorist_injured),
    motoristsKilled: toCount(row.number_of_motorist_killed),
    contributingFactors: collectDistinct(row, FACTOR_COLUMNS),
    vehicleTypes: collectDistinct(row, VEHICLE_COLUMNS),
    searchPrefixes: [],
  };

  assignDefined(record, {
    borough: toBorough(row.borough),
    zipCode: toZipCode(row.zip_code),
    location: toLocation(row.latitude, row.longitude),
    onStreetName: toText(row.on_street_name),
    offStreetName: toText(row.off_street_name),
    crossStreetName: toText(row.cross_street_name),
  });

  record.searchPrefixes = searchPrefixes(
    record.borough,
    record.zipCode,
    record.onStreetName,
    record.offStreetName,
    record.crossStreetName,
    ...record.contributingFactors,
    ...record.vehicleTypes,
  );

  return { record };
};

const describe = (value: unknown): string => JSON.stringify(value) ?? 'nothing';

const isSourceRow = (value: unknown): value is SourceRow =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assignDefined = <T extends object>(target: T, values: Partial<T>): void => {
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
};

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;

  const text = String(value).replace(/\s+/g, ' ').trim();

  return PLACEHOLDER_VALUES.has(text.toUpperCase()) ? undefined : text;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  const text = toText(value);
  const number = text === undefined ? NaN : Number(text);

  return Number.isFinite(number) ? number : undefined;
};

const toCount = (value: unknown): number => {
  const number = toNumber(value);
  return number !== undefined && number >= 0 ? Math.trunc(number) : 0;
};

const toBorough = (value: unknown): Borough | undefined => {
  const text = toText(value)?.toUpperCase();
  return text && BOROUGH_SET.has(text) ? (text as Borough) : undefined;
};

const toZipCode = (value: unknown): string | undefined => {
  const text = toText(value);
  return text && ZIP_CODE.test(text) ? text : undefined;
};

const toLocation = (latValue: unknown, lngValue: unknown): GeoPoint | undefined => {
  const lat = toNumber(latValue);
  const lng = toNumber(lngValue);

  if (
    lat === undefined ||
    lng === undefined ||
    lat < NYC_BOUNDS.minLat ||
    lat > NYC_BOUNDS.maxLat ||
    lng < NYC_BOUNDS.minLng ||
    lng > NYC_BOUNDS.maxLng
  ) {
    return undefined;
  }

  return { type: 'Point', coordinates: [lng, lat] };
};

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'number') {
    return Number.isFinite(value) &&
      value >= EXCEL_SERIAL_RANGE.min &&
      value <= EXCEL_SERIAL_RANGE.max
      ? new Date(Math.round((value - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY))
      : undefined;
  }

  const text = toText(value);

  if (!text) return undefined;

  const date = new Date(HAS_TIMEZONE.test(text) || !text.includes('T') ? text : `${text}Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

const combineDateAndTime = (dateValue: unknown, timeValue: unknown): Date | undefined => {
  const parsed = toDate(dateValue);

  if (!parsed) return undefined;

  const date = new Date(parsed.getTime());
  const match = TIME_OF_DAY.exec(toText(timeValue) ?? '');

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours < 24 && minutes < 60) date.setUTCHours(hours, minutes, 0, 0);
  }

  return date;
};

const collectDistinct = (row: SourceRow, columns: readonly string[]): string[] => {
  const values = columns.map((column) => toText(row[column])).filter((v) => v !== undefined);
  return [...new Set(values)];
};
