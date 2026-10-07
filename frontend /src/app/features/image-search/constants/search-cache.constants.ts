import { MS_IN_MINUTE } from '../../../core/constants/time.constants';

const SEARCH_CACHE_TTL_MINUTES = 5;

export const SEARCH_CACHE_TTL_MS = SEARCH_CACHE_TTL_MINUTES * MS_IN_MINUTE;
export const SEARCH_CACHE_MAX_ENTRIES = 50;
