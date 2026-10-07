import { createSelector } from '@ngrx/store';

import { SEARCH_STATUS } from '../constants/search.constants';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';
import { cachedSearchesAdapter, imageSearchFeature, resultsAdapter } from './image-search.reducer';

const { selectEntities: selectResultEntitiesFromState } = resultsAdapter.getSelectors();
const { selectEntities: selectCachedSearchEntitiesFromState } =
  cachedSearchesAdapter.getSelectors();

export const {
  selectQuery,
  selectActiveQuery,
  selectStatus,
  selectError,
  selectIsLoadingNextBatch,
  selectNextBatchError,
} = imageSearchFeature;

const selectResultEntities = createSelector(
  imageSearchFeature.selectResults,
  selectResultEntitiesFromState,
);

const selectCachedSearchEntities = createSelector(
  imageSearchFeature.selectCachedSearches,
  selectCachedSearchEntitiesFromState,
);

export const selectCachedSearch = (query: string) =>
  createSelector(selectCachedSearchEntities, (cachedSearches) => cachedSearches[query] ?? null);

export const selectActiveCachedSearch = createSelector(
  selectCachedSearchEntities,
  selectActiveQuery,
  (cachedSearches, activeQuery) => cachedSearches[activeQuery] ?? null,
);

export const selectResults = createSelector(
  selectActiveCachedSearch,
  selectResultEntities,
  (cachedSearch, resultEntities) =>
    (cachedSearch?.resultIds ?? [])
      .map((id) => resultEntities[id])
      .filter((result): result is ImageSearchResult => result !== undefined),
);

export const selectTotalHits = createSelector(
  selectActiveCachedSearch,
  (cachedSearch) => cachedSearch?.totalHits ?? 0,
);

export const selectHasMoreResults = createSelector(
  selectActiveCachedSearch,
  (cachedSearch) => cachedSearch?.nextOffset != null,
);

export const selectIsLoading = createSelector(
  selectStatus,
  (status) => status === SEARCH_STATUS.loading,
);

export const selectHasResults = createSelector(selectResults, (results) => results.length > 0);

export const selectIsEmpty = createSelector(
  selectStatus,
  selectHasResults,
  (status, hasResults) => status === SEARCH_STATUS.success && !hasResults,
);

export const selectHasError = createSelector(
  selectStatus,
  (status) => status === SEARCH_STATUS.error,
);
