import { createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';

import { IMAGE_SEARCH_FEATURE_KEY } from '../constants/image-search-store.constants';
import { SEARCH_STATUS } from '../constants/search.constants';
import { CachedSearch } from '../interfaces/cached-search.interface';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';
import { ImageSearchState } from '../interfaces/image-search-state.interface';
import {
  appendUniqueIds,
  findEvictedQueries,
  findOrphanedResultIds,
} from '../utils/search-cache.utils';
import { ImageSearchActions } from './image-search.actions';

export const resultsAdapter = createEntityAdapter<ImageSearchResult>();

export const cachedSearchesAdapter = createEntityAdapter<CachedSearch>({
  selectId: (cachedSearch) => cachedSearch.query,
});

const initialState: ImageSearchState = {
  query: '',
  activeQuery: '',
  status: SEARCH_STATUS.idle,
  error: null,
  isLoadingNextBatch: false,
  nextBatchError: null,
  results: resultsAdapter.getInitialState(),
  cachedSearches: cachedSearchesAdapter.getInitialState(),
};

const evictStaleSearches = (state: ImageSearchState, now: number): ImageSearchState => {
  const { selectAll: selectAllCachedSearches } = cachedSearchesAdapter.getSelectors();

  const evictedQueries = findEvictedQueries(
    selectAllCachedSearches(state.cachedSearches),
    now,
    state.activeQuery,
  );
  if (!evictedQueries.length) {
    return state;
  }

  const cachedSearches = cachedSearchesAdapter.removeMany(evictedQueries, state.cachedSearches);
  const orphanedResultIds = findOrphanedResultIds(
    state.results.ids as number[],
    selectAllCachedSearches(cachedSearches),
  );

  return {
    ...state,
    cachedSearches,
    results: resultsAdapter.removeMany(orphanedResultIds, state.results),
  };
};

export const imageSearchFeature = createFeature({
  name: IMAGE_SEARCH_FEATURE_KEY,
  reducer: createReducer(
    initialState,
    on(
      ImageSearchActions.queryChanged,
      ImageSearchActions.suggestionSelected,
      (state, { query }): ImageSearchState => ({
        ...state,
        query,
      }),
    ),
    on(ImageSearchActions.searchStarted, (state): ImageSearchState => ({
      ...state,
      status: SEARCH_STATUS.loading,
      error: null,
      isLoadingNextBatch: false,
      nextBatchError: null,
    })),
    on(ImageSearchActions.searchSucceeded, (state, { query, batch, cachedAt }): ImageSearchState =>
      evictStaleSearches(
        {
          ...state,
          activeQuery: query,
          status: SEARCH_STATUS.success,
          results: resultsAdapter.upsertMany(batch.results, state.results),
          cachedSearches: cachedSearchesAdapter.upsertOne(
            {
              query,
              resultIds: batch.results.map(({ id }) => id),
              nextOffset: batch.nextOffset,
              totalHits: batch.totalHits ?? batch.results.length,
              cachedAt,
              lastAccessedAt: cachedAt,
            },
            state.cachedSearches,
          ),
        },
        cachedAt,
      ),
    ),
    on(
      ImageSearchActions.searchRestoredFromCache,
      (state, { query, accessedAt }): ImageSearchState => ({
        ...state,
        activeQuery: query,
        status: SEARCH_STATUS.success,
        error: null,
        isLoadingNextBatch: false,
        nextBatchError: null,
        cachedSearches: cachedSearchesAdapter.updateOne(
          { id: query, changes: { lastAccessedAt: accessedAt } },
          state.cachedSearches,
        ),
      }),
    ),
    on(ImageSearchActions.searchFailed, (state, { query, error }): ImageSearchState => ({
      ...state,
      activeQuery: query,
      status: SEARCH_STATUS.error,
      error,
    })),
    on(ImageSearchActions.nextBatchStarted, (state): ImageSearchState => ({
      ...state,
      isLoadingNextBatch: true,
      nextBatchError: null,
    })),
    on(ImageSearchActions.nextBatchSucceeded, (state, { query, batch }): ImageSearchState => {
      const cachedSearch = state.cachedSearches.entities[query];
      if (!cachedSearch) {
        return { ...state, isLoadingNextBatch: false };
      }

      return {
        ...state,
        isLoadingNextBatch: false,
        results: resultsAdapter.upsertMany(batch.results, state.results),
        cachedSearches: cachedSearchesAdapter.updateOne(
          {
            id: query,
            changes: {
              resultIds: appendUniqueIds(
                cachedSearch.resultIds,
                batch.results.map(({ id }) => id),
              ),
              nextOffset: batch.nextOffset,
            },
          },
          state.cachedSearches,
        ),
      };
    }),
    on(ImageSearchActions.nextBatchFailed, (state, { error }): ImageSearchState => ({
      ...state,
      isLoadingNextBatch: false,
      nextBatchError: error,
    })),
  ),
});
