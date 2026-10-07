import { describe, expect, it } from 'vitest';

import { mapCrashRow } from './crash-row.mapper.js';

const sourceRow = {
  collision_id: '4407041',
  crash_date: '2021-04-13T00:00:00.000',
  crash_time: '14:30',
  borough: 'brooklyn',
  zip_code: '11201',
  latitude: '40.6962930',
  longitude: '-73.9911960',
  on_street_name: 'TILLARY STREET                  ',
  number_of_persons_injured: '2',
  number_of_persons_killed: '0',
  contributing_factor_vehicle_1: 'Driver Inattention/Distraction',
  contributing_factor_vehicle_2: 'Unspecified',
  vehicle_type_code1: 'Sedan',
  vehicle_type_code2: 'Sedan',
};

describe('mapCrashRow', () => {
  it('normalizes a JSON export row', () => {
    expect(mapCrashRow(sourceRow).record).toEqual({
      collisionId: 4407041,
      crashDate: new Date('2021-04-13T14:30:00.000Z'),
      borough: 'BROOKLYN',
      zipCode: '11201',
      location: { type: 'Point', coordinates: [-73.991196, 40.696293] },
      onStreetName: 'TILLARY STREET',
      personsInjured: 2,
      personsKilled: 0,
      pedestriansInjured: 0,
      pedestriansKilled: 0,
      cyclistsInjured: 0,
      cyclistsKilled: 0,
      motoristsInjured: 0,
      motoristsKilled: 0,
      contributingFactors: ['Driver Inattention/Distraction'],
      vehicleTypes: ['Sedan'],
      searchPrefixes: expect.arrayContaining([
        'b',
        'bro',
        'brooklyn',
        '112',
        '11201',
        'till',
        'sedan',
      ]),
    });
  });

  it('maps an XLSX export row (numbers, Date cells, Excel serial dates) to the same record', () => {
    const expected = mapCrashRow(sourceRow).record;
    const xlsxRow = {
      ...sourceRow,
      collision_id: 4407041,
      latitude: 40.696293,
      longitude: -73.991196,
      number_of_persons_injured: 2,
      number_of_persons_killed: 0,
    };

    expect(
      mapCrashRow({ ...xlsxRow, crash_date: new Date('2021-04-13T00:00:00Z') }).record,
    ).toEqual(expected);
    expect(mapCrashRow({ ...xlsxRow, crash_date: 44299 }).record).toEqual(expected);
  });

  it('drops out-of-range optional values instead of rejecting the row', () => {
    const { record } = mapCrashRow({
      ...sourceRow,
      latitude: '0',
      borough: 'ATLANTIS',
      zip_code: 'N/A',
    });

    expect(record?.location).toBeUndefined();
    expect(record?.borough).toBeUndefined();
    expect(record?.zipCode).toBeUndefined();
  });

  it('rejects rows without a usable id or date and lists every reason', () => {
    expect(mapCrashRow({ collision_id: 'abc', crash_date: 'soon' })).toEqual({
      record: null,
      reasons: [
        'collision_id must be a positive integer, got "abc"',
        'crash_date must be a date, got "soon"',
      ],
    });
    expect(mapCrashRow([1, 2])).toEqual({ record: null, reasons: ['row must be an object'] });
  });
});
