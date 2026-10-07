import { createWriteStream } from 'node:fs';
import type { WriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';

import ExcelJS from 'exceljs';

import { CRASH_COLUMNS, NUMERIC_COLUMNS } from '../consts/crash-columns.consts.js';
import {
  XLSX_DATE_COLUMN,
  XLSX_DATE_FORMAT,
  XLSX_MAX_ROWS_PER_SHEET,
  XLSX_SHEET_NAME_PREFIX,
} from '../consts/xlsx.consts.js';
import type { CrashFileWriter } from '../interfaces/crash-file-writer.interface.js';
import type { CrashColumn, CrashRow } from '../interfaces/crash-row.interface.js';

type XlsxCell = string | number | Date | null;

export class XlsxCrashWriter implements CrashFileWriter {
  private readonly stream: WriteStream;
  private readonly completed: Promise<void>;
  private readonly workbook: ExcelJS.stream.xlsx.WorkbookWriter;
  private sheet: ExcelJS.Worksheet;
  private sheetCount = 0;
  private sheetRows = 0;

  constructor(path: string) {
    this.stream = createWriteStream(path);
    this.completed = finished(this.stream);
    this.completed.catch(() => undefined);
    this.workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: this.stream,
      useStyles: true,
      useSharedStrings: false,
    });
    this.sheet = this.addSheet();
  }

  async write(rows: CrashRow[]): Promise<void> {
    for (const row of rows) {
      if (this.sheetRows >= XLSX_MAX_ROWS_PER_SHEET) {
        this.sheet.commit();
        this.sheet = this.addSheet();
      }

      this.sheet.addRow(CRASH_COLUMNS.map((column) => toCell(column, row[column]))).commit();
      this.sheetRows++;
    }
  }

  async finish(): Promise<void> {
    this.sheet.commit();
    await this.workbook.commit();
    await this.completed;
  }

  async abort(): Promise<void> {
    this.stream.destroy();
    await this.completed.catch(() => undefined);
  }

  private addSheet(): ExcelJS.Worksheet {
    this.sheetCount++;
    this.sheetRows = 0;

    const sheet = this.workbook.addWorksheet(`${XLSX_SHEET_NAME_PREFIX}-${this.sheetCount}`);
    sheet.columns = CRASH_COLUMNS.map((column) => ({
      key: column,
      width: Math.max(12, column.length + 2),
      ...(column === XLSX_DATE_COLUMN ? { style: { numFmt: XLSX_DATE_FORMAT } } : {}),
    }));

    const header = sheet.addRow([...CRASH_COLUMNS]);
    header.font = { bold: true };
    header.commit();

    return sheet;
  }
}

const toCell = (column: CrashColumn, value: string | undefined): XlsxCell => {
  if (value === undefined || value === '') return null;

  if (column === XLSX_DATE_COLUMN) {
    const date = new Date(`${value.replace(/Z?$/, '')}Z`);
    return Number.isNaN(date.getTime()) ? value : date;
  }

  if (NUMERIC_COLUMNS.has(column)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }

  return value.trim();
};
