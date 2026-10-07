import type { SEARCH_CURSOR_VERSION } from '../consts/search.consts.js';

export interface SearchCursor {
  version: typeof SEARCH_CURSOR_VERSION;
  query: string;
  total: number;
  crashDate: string;
  collisionId: number;
}
