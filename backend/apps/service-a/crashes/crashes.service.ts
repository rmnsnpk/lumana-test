import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoError } from 'mongodb';

import { toErrorMessage, withRetry } from '#libs/common/index.js';
import { EVENT_TYPES } from '#libs/messaging/index.js';
import type { DatasetFileFormat } from '#libs/messaging/index.js';
import { isTransientMongoError } from '#libs/mongo/index.js';
import { ActivityRecorder } from '#libs/telemetry/index.js';
import type { ServiceAEnv } from '../config/service-a.env.js';
import { SocrataClient } from './clients/socrata.client.js';
import { EXPORT_FILE_PREFIX, EXPORTS_SUBDIR, PARTIAL_FILE_SUFFIX } from './consts/fetch.consts.js';
import {
  IMPORT_BATCH_RETRIES,
  IMPORT_BATCH_RETRY_BASE_DELAY_MS,
  MAX_REJECTIONS,
  UPLOAD_FORMATS,
} from './consts/upload.consts.js';
import { MAX_QUERY_TOKENS, SEARCH_CURSOR_VERSION } from './consts/search.consts.js';
import { CrashDto } from './dto/crash.dto.js';
import type { FetchCrashesDto } from './dto/fetch-crashes.dto.js';
import type { SearchCrashesDto } from './dto/search-crashes.dto.js';
import type { CrashRecord } from './interfaces/crash-document.interface.js';
import type { CrashSearchPage } from './interfaces/crash-search-page.interface.js';
import type { FetchResult } from './interfaces/fetch-result.interface.js';
import type { ImportResult } from './interfaces/import-result.interface.js';
import { mapCrashRow } from './mappers/crash-row.mapper.js';
import { decodeSearchCursor, encodeSearchCursor } from './mappers/search-cursor.js';
import { searchTokens } from './mappers/search-prefixes.js';
import { getCrashFileReader } from './readers/crash-file-reader.factory.js';
import { CrashesRepository } from './repositories/crashes.repository.js';
import { createCrashFileWriter } from './writers/crash-file-writer.factory.js';

@Injectable()
export class CrashesService implements OnModuleInit {
  private readonly logger = new Logger(CrashesService.name);
  private readonly exportDirectory: string;
  private readonly maxRows: number;
  private readonly batchSize: number;

  constructor(
    private readonly source: SocrataClient,
    private readonly crashes: CrashesRepository,
    private readonly recorder: ActivityRecorder,
    config: ConfigService<ServiceAEnv, true>,
  ) {
    this.exportDirectory = join(resolve(config.get('DATA_DIR', { infer: true })), EXPORTS_SUBDIR);
    this.maxRows = config.get('FETCH_MAX_ROWS', { infer: true });
    this.batchSize = config.get('IMPORT_BATCH_SIZE', { infer: true });
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.exportDirectory, { recursive: true });
  }

  async search(dto: SearchCrashesDto): Promise<CrashSearchPage<CrashDto>> {
    const query = normalizeQuery(dto.q);
    const tokens = searchTokens(query);

    if (tokens.length > MAX_QUERY_TOKENS) {
      throw new BadRequestException(`q may contain at most ${MAX_QUERY_TOKENS} words`);
    }

    const cursor = dto.cursor ? decodeSearchCursor(dto.cursor, query) : undefined;
    const [documents, total] = await Promise.all([
      this.crashes.search(tokens, cursor, dto.limit),
      cursor ? Promise.resolve(cursor.total) : this.crashes.count(tokens),
    ]);
    const hasMore = documents.length > dto.limit;
    const page = documents.slice(0, dto.limit);
    const last = page.at(-1);

    return {
      items: page.map(CrashDto.fromDocument),
      total,
      limit: dto.limit,
      hasMore,
      ...(hasMore && last
        ? {
            nextCursor: encodeSearchCursor({
              version: SEARCH_CURSOR_VERSION,
              query,
              total,
              crashDate: last.crashDate.toISOString(),
              collisionId: last.collisionId,
            }),
          }
        : {}),
    };
  }

  async fetchToFile({ format, limit }: FetchCrashesDto): Promise<FetchResult> {
    const startedAt = Date.now();
    const rowLimit = Math.min(limit, this.maxRows);
    const fileName = buildFileName(format, rowLimit);
    const path = join(this.exportDirectory, fileName);
    const partialPath = `${path}${PARTIAL_FILE_SUFFIX}`;
    const writer = createCrashFileWriter(format, partialPath);
    let records = 0;

    try {
      for await (const rows of this.source.pages(rowLimit)) {
        await writer.write(rows);
        records += rows.length;
        this.logger.log(`${fileName}: ${records}/${rowLimit} rows`);
      }

      await writer.finish();
      await rename(partialPath, path);
    } catch (error) {
      await writer.abort();
      await rm(partialPath, { force: true });
      await this.recorder.recordEvent(EVENT_TYPES.datasetFetchFailed, {
        format,
        error: toErrorMessage(error),
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }

    const { size: bytes } = await stat(path);
    const durationMs = Date.now() - startedAt;
    await this.recorder.recordEvent(EVENT_TYPES.datasetFetchCompleted, {
      fileName,
      format,
      rows: records,
      bytes,
      durationMs,
    });

    return { fileName, path, format, records, bytes, durationMs };
  }

  async importFile(file: Express.Multer.File | undefined): Promise<ImportResult> {
    if (!file) throw new BadRequestException('A .json or .xlsx file is required in field "file"');

    const startedAt = Date.now();
    const format = UPLOAD_FORMATS[extname(file.originalname).toLowerCase()] ?? 'json';

    try {
      const result = await this.importRows(file.originalname, format, file.path, startedAt);
      await this.recorder.recordEvent(EVENT_TYPES.importCompleted, {
        fileName: result.fileName,
        format,
        received: result.received,
        inserted: result.inserted,
        updated: result.updated,
        unchanged: result.unchanged,
        rejected: result.rejected,
        failed: result.failed,
        durationMs: result.durationMs,
      });
      this.logger.log(
        `Imported ${file.originalname}: ${result.received} rows, ${result.rejected} rejected`,
      );
      return result;
    } catch (error) {
      await this.recorder.recordEvent(EVENT_TYPES.importFailed, {
        fileName: file.originalname,
        format,
        error: toErrorMessage(error),
        durationMs: Date.now() - startedAt,
      });
      throw error;
    } finally {
      await rm(file.path, { force: true });
    }
  }

  private async importRows(
    fileName: string,
    format: DatasetFileFormat,
    path: string,
    startedAt: number,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      fileName,
      format,
      received: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      rejected: 0,
      failed: 0,
      rejections: [],
      durationMs: 0,
    };
    const batch = new Map<number, CrashRecord>();

    try {
      for await (const { row, value } of getCrashFileReader(format)(path)) {
        result.received++;
        const mapped = mapCrashRow(value);

        if (!mapped.record) {
          result.rejected++;
          if (result.rejections.length < MAX_REJECTIONS) {
            result.rejections.push({ row, reasons: mapped.reasons });
          }
          continue;
        }

        if (batch.has(mapped.record.collisionId)) result.unchanged++;
        batch.set(mapped.record.collisionId, mapped.record);

        if (batch.size >= this.batchSize) await this.flush(batch, result);
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof MongoError) throw error;
      this.logger.warn(`Unable to read ${format} file: ${toErrorMessage(error)}`);
      throw new BadRequestException(`Unable to read ${format} file`);
    }

    await this.flush(batch, result);
    result.durationMs = Date.now() - startedAt;

    return result;
  }

  private async flush(batch: Map<number, CrashRecord>, result: ImportResult): Promise<void> {
    if (batch.size === 0) return;

    const records = [...batch.values()];
    batch.clear();
    const written = await withRetry(() => this.crashes.upsertMany(records), {
      retries: IMPORT_BATCH_RETRIES,
      baseDelayMs: IMPORT_BATCH_RETRY_BASE_DELAY_MS,
      isRetryable: isTransientMongoError,
      onRetry: (error, attempt) =>
        this.logger.warn(`Batch write retry ${attempt}: ${toErrorMessage(error)}`),
    });

    result.inserted += written.inserted;
    result.updated += written.updated;
    result.unchanged += written.unchanged;
    result.failed += written.failed;
  }
}

const buildFileName = (format: DatasetFileFormat, limit: number): string => {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  return `${EXPORT_FILE_PREFIX}-${stamp}-${limit}.${format}`;
};

const normalizeQuery = (value: string | undefined): string =>
  (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
