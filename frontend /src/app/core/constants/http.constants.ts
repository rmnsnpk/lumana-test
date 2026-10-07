export const HTTP_STATUS = {
  networkError: 0,
  tooManyRequests: 429,
  internalServerError: 500,
} as const;

export const HTTP_RETRY_COUNT = 2;
export const HTTP_RETRY_BASE_DELAY_MS = 500;

export const UNKNOWN_HTTP_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const NETWORK_ERROR_MESSAGE = 'Network is unavailable. Check your connection.';
