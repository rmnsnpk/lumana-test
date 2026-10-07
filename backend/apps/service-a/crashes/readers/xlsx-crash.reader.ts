import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

import type { CrashFileReader } from '../interfaces/file-row.interface.js';
import { readSharedStrings } from './xlsx-shared-strings.js';

export const readXlsxCrashes: CrashFileReader = async function* (path) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(path, {
    entries: 'ignore',
    sharedStrings: 'ignore',
    hyperlinks: 'ignore',
    styles: 'ignore',
    worksheets: 'emit',
  });
  Object.assign(workbook, {
    model: { sheets: [] },
    properties: {},
    workbookRels: [],
    sharedStrings: await readSharedStrings(path),
  });
  let rowsBefore = 0;

  for await (const worksheet of workbook) {
    let headers: string[] | undefined;
    let lastRow = 0;

    for await (const row of worksheet) {
      const values = (row.values as ExcelJS.CellValue[]).slice(1).map(toValue);
      lastRow = row.number;

      if (values.every((value) => value === null || value === '')) continue;

      if (!headers) {
        headers = toHeaders(values);
        continue;
      }

      yield {
        row: rowsBefore + row.number,
        value: Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])),
      };
    }

    rowsBefore += lastRow;
  }
};

const toHeaders = (values: unknown[]): string[] => {
  const headers = values.map((value) => (value === null ? '' : String(value).trim()));

  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new BadRequestException('Every worksheet must start with a row of unique column names');
  }

  return headers;
};

const toValue = (value: ExcelJS.CellValue | undefined): unknown => {
  if (value === null || value === undefined || value instanceof Date) return value ?? null;
  if (typeof value !== 'object') return value;
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('result' in value) return value.result ?? null;
  if ('text' in value) return value.text;
  return null;
};
