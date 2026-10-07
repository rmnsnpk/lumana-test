import { EntityState } from '@ngrx/entity';

import { SEARCH_STATUS } from '../constants/search.constants';
import { CachedSearch } from './cached-search.interface';
import { ImageSearchResult } from './image-search-result.interface';

type SearchStatus = (typeof SEARCH_STATUS)[keyof typeof SEARCH_STATUS];

export interface ImageSearchState {
  query: string;
  activeQuery: string;
  status: SearchStatus;
  error: string | null;
  isLoadingNextBatch: boolean;
  nextBatchError: string | null;
  results: EntityState<ImageSearchResult>;
  cachedSearches: EntityState<CachedSearch>;
}
