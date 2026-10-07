import { setTimeout as sleep } from 'node:timers/promises';

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export const withRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  { retries, baseDelayMs, maxDelayMs = 30_000, isRetryable = () => true, onRetry }: RetryOptions,
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) {
        throw error;
      }

      const delayMs = Math.round(Math.random() * Math.min(maxDelayMs, baseDelayMs * 2 ** attempt));
      onRetry?.(error, attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }
};
