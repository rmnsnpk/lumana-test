import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { toErrorMessage, withRetry } from '#libs/common/index.js';
import type { ServiceAEnv } from '../../config/service-a.env.js';
import { CRASH_COLUMNS } from '../consts/crash-columns.consts.js';
import {
  RETRYABLE_HTTP_STATUSES,
  SOURCE_ORDER,
  SOURCE_REQUEST_TIMEOUT_MS,
  SOURCE_RETRIES,
  SOURCE_RETRY_BASE_DELAY_MS,
} from '../consts/socrata.consts.js';
import type { CrashRow } from '../interfaces/crash-row.interface.js';

class SourceHttpError extends Error {
  constructor(readonly status: number) {
    super(`NYC Open Data responded ${status}`);
  }
}

const isRetryable = (error: unknown): boolean =>
  !(error instanceof SourceHttpError) || RETRYABLE_HTTP_STATUSES.has(error.status);

@Injectable()
export class SocrataClient {
  private readonly logger = new Logger(SocrataClient.name);
  private readonly endpoint: string;
  private readonly pageSize: number;
  private readonly appToken?: string;

  constructor(config: ConfigService<ServiceAEnv, true>) {
    this.endpoint = config.get('SOURCE_API_URL', { infer: true });
    this.pageSize = config.get('FETCH_PAGE_SIZE', { infer: true });
    this.appToken = config.get('SOURCE_APP_TOKEN', { infer: true });
  }

  async *pages(limit: number): AsyncGenerator<CrashRow[]> {
    for (let offset = 0; offset < limit;) {
      const size = Math.min(this.pageSize, limit - offset);
      const rows = await this.fetchPage(offset, size);

      if (rows.length === 0) return;

      yield rows;
      offset += rows.length;

      if (rows.length < size) return;
    }
  }

  private fetchPage(offset: number, size: number): Promise<CrashRow[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set('$select', CRASH_COLUMNS.join(','));
    url.searchParams.set('$order', SOURCE_ORDER);
    url.searchParams.set('$limit', String(size));
    url.searchParams.set('$offset', String(offset));

    return withRetry(
      async () => {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            ...(this.appToken ? { 'X-App-Token': this.appToken } : {}),
          },
          signal: AbortSignal.timeout(SOURCE_REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) throw new SourceHttpError(response.status);

        const body: unknown = await response.json();

        if (!Array.isArray(body)) throw new Error('NYC Open Data returned a non-array payload');

        return body as CrashRow[];
      },
      {
        retries: SOURCE_RETRIES,
        baseDelayMs: SOURCE_RETRY_BASE_DELAY_MS,
        isRetryable,
        onRetry: (error, attempt, delayMs) =>
          this.logger.warn(
            `Page at offset ${offset} failed (${toErrorMessage(error)}), retry ${attempt} in ${delayMs}ms`,
          ),
      },
    ).catch((error: unknown) => {
      throw new BadGatewayException(`NYC Open Data request failed: ${toErrorMessage(error)}`);
    });
  }
}
