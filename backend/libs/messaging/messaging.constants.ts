export const MESSAGING_OPTIONS = Symbol('MESSAGING_OPTIONS');
export const MESSAGING_CONSUMER_OPTIONS = Symbol('MESSAGING_CONSUMER_OPTIONS');

export const DEFAULT_STREAM_MAX_LEN = 1_000_000;

export const STREAM_START_ID = '0';
export const STREAM_NEW_MESSAGES_ID = '>';
export const DEFAULT_CONSUMER_BATCH_SIZE = 500;
export const DEFAULT_CONSUMER_BLOCK_MS = 5_000;
export const DEFAULT_CONSUMER_CLAIM_IDLE_MS = 60_000;
export const CONSUMER_ERROR_BACKOFF_MS = 1_000;

export const STREAM_FIELDS = {
  type: 'type',
  event: 'event',
} as const;

export const buildEventStreamKey = (source: string): string => `events:${source}`;
