import { SEARCH_CACHE_MAX_ENTRIES, SEARCH_CACHE_TTL_MS } from '../constants/search-cache.constants';
import { SEARCH_STATUS } from '../constants/search.constants';
import { ImageSearchBatch } from '../interfaces/image-search-batch.interface';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';
import { ImageSearchState } from '../interfaces/image-search-state.interface';
import { ImageSearchActions } from './image-search.actions';
import { imageSearchFeature } from './image-search.reducer';
import { selectHasMoreResults, selectResults, selectTotalHits } from './image-search.selectors';

const { reducer, name } = imageSearchFeature;
const NOW = 1_000_000;

const createResult = (id: number): ImageSearchResult => ({
  id,
  title: `Image ${id}`,
  thumbnailUrl: `thumb-${id}`,
  retinaThumbnailUrl: null,
  thumbnailWidth: 120,
  thumbnailHeight: 90,
  previewUrl: `preview-${id}`,
  imageWidth: 1200,
  imageHeight: 900,
});

const createBatch = (...ids: number[]): ImageSearchBatch => ({
  results: ids.map(createResult),
  nextOffset: 30,
  totalHits: 120,
});

const getInitialState = (): ImageSearchState => reducer(undefined, { type: '@@init' });

const succeed = (state: ImageSearchState, query: string, batch: ImageSearchBatch, cachedAt = NOW) =>
  reducer(state, ImageSearchActions.searchSucceeded({ query, batch, cachedAt }));

const selectFrom = <T>(state: ImageSearchState, selector: (root: object) => T): T =>
  selector({ [name]: state });

describe('imageSearch reducer', () => {
  it('stores the raw query as the user types', () => {
    const state = reducer(getInitialState(), ImageSearchActions.queryChanged({ query: 'Cat' }));
    expect(state.query).toBe('Cat');
  });

  it('caches results per query and exposes the active ones', () => {
    const state = succeed(getInitialState(), 'cat', createBatch(1, 2));

    expect(selectFrom(state, selectResults).map(({ id }) => id)).toEqual([1, 2]);
    expect(selectFrom(state, selectTotalHits)).toBe(120);
    expect(state.cachedSearches.ids).toEqual(['cat']);
  });

  it('keeps previous results visible while a new search is loading', () => {
    const loaded = succeed(getInitialState(), 'cat', createBatch(1, 2));
    const loading = reducer(loaded, ImageSearchActions.searchStarted({ query: 'dog' }));

    expect(loading.status).toBe(SEARCH_STATUS.loading);
    expect(selectFrom(loading, selectResults).map(({ id }) => id)).toEqual([1, 2]);
  });

  it('stores an image shared by several queries only once', () => {
    const state = succeed(
      succeed(getInitialState(), 'cat', createBatch(1, 2)),
      'kitten',
      createBatch(2, 3),
    );

    expect(state.results.ids).toEqual([1, 2, 3]);
  });

  it('restores a cached query without touching the results', () => {
    const cached = succeed(
      succeed(getInitialState(), 'cat', createBatch(1)),
      'dog',
      createBatch(2),
    );
    const restored = reducer(
      cached,
      ImageSearchActions.searchRestoredFromCache({ query: 'cat', accessedAt: NOW + 1 }),
    );

    expect(restored.activeQuery).toBe('cat');
    expect(restored.status).toBe(SEARCH_STATUS.success);
    expect(restored.cachedSearches.entities['cat']?.lastAccessedAt).toBe(NOW + 1);
    expect(restored.results).toBe(cached.results);
  });

  it('evicts expired queries and the images only they referenced', () => {
    const cached = succeed(getInitialState(), 'cat', createBatch(1, 2));
    const state = succeed(cached, 'dog', createBatch(2, 3), NOW + SEARCH_CACHE_TTL_MS);

    expect(state.cachedSearches.ids).toEqual(['dog']);
    expect(state.results.ids).toEqual([2, 3]);
  });

  it('evicts the least recently used query when the cache is full', () => {
    let state = getInitialState();
    for (let index = 0; index <= SEARCH_CACHE_MAX_ENTRIES; index++) {
      state = succeed(state, `query-${index}`, createBatch(index), NOW + index);
    }

    expect(state.cachedSearches.ids).toHaveLength(SEARCH_CACHE_MAX_ENTRIES);
    expect(state.cachedSearches.entities['query-0']).toBeUndefined();
    expect(state.results.entities[0]).toBeUndefined();
  });

  it('shows no results after a failure but keeps the cache', () => {
    const loaded = succeed(getInitialState(), 'cat', createBatch(1));
    const failed = reducer(
      loaded,
      ImageSearchActions.searchFailed({ query: 'dog', error: 'Network is unavailable.' }),
    );

    expect(failed.status).toBe(SEARCH_STATUS.error);
    expect(failed.error).toBe('Network is unavailable.');
    expect(selectFrom(failed, selectResults)).toEqual([]);
    expect(failed.cachedSearches.ids).toEqual(['cat']);
  });

  it('appends the next batch to the active query without duplicates', () => {
    const loaded = succeed(getInitialState(), 'cat', createBatch(1, 2));
    const loading = reducer(loaded, ImageSearchActions.nextBatchStarted({ query: 'cat' }));
    const appended = reducer(
      loading,
      ImageSearchActions.nextBatchSucceeded({
        query: 'cat',
        batch: { results: [createResult(2), createResult(3)], nextOffset: null, totalHits: null },
      }),
    );

    expect(loading.isLoadingNextBatch).toBe(true);
    expect(appended.isLoadingNextBatch).toBe(false);
    expect(selectFrom(appended, selectResults).map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(selectFrom(appended, selectHasMoreResults)).toBe(false);
  });

  it('ignores a next batch for a query that was evicted meanwhile', () => {
    const loaded = succeed(getInitialState(), 'cat', createBatch(1));
    const state = reducer(
      loaded,
      ImageSearchActions.nextBatchSucceeded({ query: 'dog', batch: createBatch(5) }),
    );

    expect(state.results).toBe(loaded.results);
    expect(state.cachedSearches).toBe(loaded.cachedSearches);
  });

  it('keeps loaded results and exposes the error when the next batch fails', () => {
    const loaded = succeed(getInitialState(), 'cat', createBatch(1));
    const failed = reducer(
      loaded,
      ImageSearchActions.nextBatchFailed({ query: 'cat', error: 'Network is unavailable.' }),
    );

    expect(failed.nextBatchError).toBe('Network is unavailable.');
    expect(selectFrom(failed, selectResults).map(({ id }) => id)).toEqual([1]);
  });
});
