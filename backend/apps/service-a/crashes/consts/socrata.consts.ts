export const SOURCE_ORDER = ':id';
export const SOURCE_REQUEST_TIMEOUT_MS = 120_000;
export const SOURCE_RETRIES = 5;
export const SOURCE_RETRY_BASE_DELAY_MS = 1_000;
export const RETRYABLE_HTTP_STATUSES: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504]);
