import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { FileRow } from '../interfaces/file-row.interface.js';
import { mapCrashRow } from '../mappers/crash-row.mapper.js';
import { readJsonCrashes } from './json-crash.reader.js';
import { readXlsxCrashes } from './xlsx-crash.reader.js';

const collect = async (rows: AsyncGenerator<FileRow>): Promise<FileRow[]> => {
  const items: FileRow[] = [];
  for await (const row of rows) items.push(row);
  return items;
};

describe('crash file readers', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'crash-readers-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('streams a JSON array with 1-based row numbers', async () => {
    const path = join(dir, 'a.json');
    await writeFile(path, '[{"collision_id":"1"},{"collision_id":"2"},7]');

    expect(await collect(readJsonCrashes(path))).toEqual([
      { row: 1, value: { collision_id: '1' } },
      { row: 2, value: { collision_id: '2' } },
      { row: 3, value: 7 },
    ]);
  });

  it('fails on truncated JSON', async () => {
    const path = join(dir, 'bad.json');
    await writeFile(path, '[{"collision_id":"1"},{"collis');

    await expect(collect(readJsonCrashes(path))).rejects.toThrow();
  });

  it('reads a streamed export with inline strings and date cells like JSON', async () => {
    const path = join(dir, 'export.xlsx');
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: path,
      useStyles: true,
      useSharedStrings: false,
    });
    const sheet = workbook.addWorksheet('crashes-1');
    sheet.columns = [
      { key: 'collision_id' },
      { key: 'crash_date', style: { numFmt: 'yyyy-mm-dd' } },
      { key: 'borough' },
    ];
    sheet.addRow(['collision_id', 'crash_date', 'borough']).commit();
    sheet.addRow([9, new Date('2021-04-13T00:00:00Z'), 'QUEENS']).commit();
    sheet.commit();
    await workbook.commit();

    const [first] = await collect(readXlsxCrashes(path));

    expect(first?.row).toBe(2);
    expect(mapCrashRow(first?.value).record).toEqual(
      mapCrashRow({ collision_id: '9', crash_date: '2021-04-13T00:00:00.000', borough: 'QUEENS' })
        .record,
    );
  });

  it('reads shared strings and every sheet of Excel-ordered workbooks on every run', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('one').addRows([
      ['collision_id', 'borough'],
      [1, 'QUEENS'],
    ]);
    workbook.addWorksheet('two').addRows([[], ['collision_id', 'borough'], [2, 'BRONX']]);
    const path = join(dir, 'excel.xlsx');
    await workbook.xlsx.writeFile(path);

    for (let attempt = 0; attempt < 20; attempt++) {
      expect(await collect(readXlsxCrashes(path))).toEqual([
        { row: 2, value: { collision_id: 1, borough: 'QUEENS' } },
        { row: 5, value: { collision_id: 2, borough: 'BRONX' } },
      ]);
    }
  });

  it('rejects sheets without unique column names', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('one').addRows([
      ['id', 'id'],
      [1, 2],
    ]);
    const path = join(dir, 'dupes.xlsx');
    await workbook.xlsx.writeFile(path);

    await expect(collect(readXlsxCrashes(path))).rejects.toThrow('unique column names');
  });
});
