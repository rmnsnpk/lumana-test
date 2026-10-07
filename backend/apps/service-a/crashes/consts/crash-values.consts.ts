export const BOROUGHS = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'] as const;

export const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  '',
  'UNSPECIFIED',
  'UNKNOWN',
  'N/A',
  'NULL',
]);

export const NYC_BOUNDS = { minLat: 40.3, maxLat: 41.1, minLng: -74.5, maxLng: -73.5 } as const;

export const EXCEL_SERIAL_RANGE = { min: 10_000, max: 80_000 } as const;
export const EXCEL_EPOCH_OFFSET_DAYS = 25_569;
export const MS_PER_DAY = 86_400_000;

export const FACTOR_COLUMNS = [
  'contributing_factor_vehicle_1',
  'contributing_factor_vehicle_2',
  'contributing_factor_vehicle_3',
  'contributing_factor_vehicle_4',
  'contributing_factor_vehicle_5',
] as const;

export const VEHICLE_COLUMNS = [
  'vehicle_type_code1',
  'vehicle_type_code2',
  'vehicle_type_code_3',
  'vehicle_type_code_4',
  'vehicle_type_code_5',
] as const;
