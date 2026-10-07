const WHITESPACE_PATTERN = /\s+/g;

export const normalizeSearchQuery = (query: string): string =>
  query.trim().replace(WHITESPACE_PATTERN, ' ').toLowerCase();
