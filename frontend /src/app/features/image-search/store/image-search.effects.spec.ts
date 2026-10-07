import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

import { ImageSearchBatch } from '../interfaces/image-search-batch.interface';
import { ImageSearchState } from '../interfaces/image-search-state.interface';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';
import { ImageSearchApi } from '../services/image-search-api';
import { ImagePreviewDialog } from '../services/image-preview-dialog';
import { ImageSearchActions } from './image-search.actions';
import { loadNextBatch, openImagePreview, searchImages } from './image-search.effects';
import { imageSearchFeature } from './image-search.reducer';

const NOW = 1_000_000;
const FEATURED_QUERY = '';
const batch: ImageSearchBatch = { results: [], nextOffset: null, totalHits: 0 };

const createState = (cachedQueries: string[]): ImageSearchState =>
  cachedQueries.reduce(
    (state, query) =>
      imageSearchFeature.reducer(
        state,
        ImageSearchActions.searchSucceeded({ query, batch, cachedAt: NOW }),
      ),
    imageSearchFeature.reducer(undefined, ImageSearchActions.queryChanged({ query: 'Cats' })),
  );

const restoredFeatured = ImageSearchActions.searchRestoredFromCache({
  query: FEATURED_QUERY,
  accessedAt: NOW,
});

describe('searchImages effect', () => {
  let actions$: Observable<Action>;
  let scheduler: TestScheduler;
  let searchSpy: ReturnType<typeof vi.fn>;
  let openPreviewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    searchSpy = vi.fn();
    openPreviewSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: { [imageSearchFeature.name]: createState([FEATURED_QUERY, 'cached']) },
        }),
        { provide: ImageSearchApi, useValue: { search: searchSpy } },
        { provide: ImagePreviewDialog, useValue: { open: openPreviewSpy } },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  const runEffect = () => TestBed.runInInjectionContext(() => searchImages());

  it('loads featured images on start without waiting for input', () => {
    TestBed.inject(MockStore).setState({ [imageSearchFeature.name]: createState([]) });

    scheduler.run(({ hot, cold, expectObservable }) => {
      searchSpy.mockReturnValue(cold('-r', { r: batch }));
      actions$ = hot('');

      expectObservable(runEffect()).toBe('s r', {
        s: ImageSearchActions.searchStarted({ query: FEATURED_QUERY }),
        r: ImageSearchActions.searchSucceeded({ query: FEATURED_QUERY, batch, cachedAt: NOW }),
      });
    });

    expect(searchSpy).toHaveBeenCalledWith(FEATURED_QUERY);
  });

  it('debounces typing and searches only the last normalized query', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      searchSpy.mockReturnValue(cold('-r', { r: batch }));
      actions$ = hot('a 100ms b', {
        a: ImageSearchActions.queryChanged({ query: 'c' }),
        b: ImageSearchActions.queryChanged({ query: ' Cats ' }),
      });

      expectObservable(runEffect()).toBe('i 400ms s r', {
        i: restoredFeatured,
        s: ImageSearchActions.searchStarted({ query: 'cats' }),
        r: ImageSearchActions.searchSucceeded({ query: 'cats', batch, cachedAt: NOW }),
      });
    });

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith('cats');
  });

  it('searches a selected suggestion at once and drops pending typing', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      searchSpy.mockReturnValue(cold('-r', { r: batch }));
      actions$ = hot('a 99ms b', {
        a: ImageSearchActions.queryChanged({ query: 'red' }),
        b: ImageSearchActions.suggestionSelected({ query: 'red fox' }),
      });

      expectObservable(runEffect()).toBe('i 99ms s r', {
        i: restoredFeatured,
        s: ImageSearchActions.searchStarted({ query: 'red fox' }),
        r: ImageSearchActions.searchSucceeded({ query: 'red fox', batch, cachedAt: NOW }),
      });
    });

    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  it('restores a fresh cached query without calling the API', () => {
    scheduler.run(({ hot, expectObservable }) => {
      actions$ = hot('a', { a: ImageSearchActions.queryChanged({ query: 'Cached' }) });

      expectObservable(runEffect()).toBe('i 299ms c', {
        i: restoredFeatured,
        c: ImageSearchActions.searchRestoredFromCache({ query: 'cached', accessedAt: NOW }),
      });
    });

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('maps request errors to a failure action', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      searchSpy.mockReturnValue(cold('-#', {}, { message: 'Network is unavailable.' }));
      actions$ = hot('10ms a', { a: ImageSearchActions.searchRetried() });

      expectObservable(runEffect()).toBe('i 9ms s f', {
        i: restoredFeatured,
        s: ImageSearchActions.searchStarted({ query: 'cats' }),
        f: ImageSearchActions.searchFailed({ query: 'cats', error: 'Network is unavailable.' }),
      });
    });
  });

  describe('loadNextBatch', () => {
    const runNextBatchEffect = () => TestBed.runInInjectionContext(() => loadNextBatch());

    const setActiveQuery = (query: string) => {
      const state = imageSearchFeature.reducer(
        createState([]),
        ImageSearchActions.searchSucceeded({
          query,
          batch: { ...batch, nextOffset: 30 },
          cachedAt: NOW,
        }),
      );
      TestBed.inject(MockStore).setState({ [imageSearchFeature.name]: state });
    };

    it('requests the next offset of the active query once while loading', () => {
      setActiveQuery('cats');

      scheduler.run(({ hot, cold, expectObservable }) => {
        searchSpy.mockReturnValue(cold('--r', { r: batch }));
        actions$ = hot('ab', {
          a: ImageSearchActions.nextBatchRequested(),
          b: ImageSearchActions.nextBatchRequested(),
        });

        expectObservable(runNextBatchEffect()).toBe('s-r', {
          s: ImageSearchActions.nextBatchStarted({ query: 'cats' }),
          r: ImageSearchActions.nextBatchSucceeded({ query: 'cats', batch }),
        });
      });

      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(searchSpy).toHaveBeenCalledWith('cats', 30);
    });

    it('does nothing when there are no more results', () => {
      scheduler.run(({ hot, expectObservable }) => {
        actions$ = hot('a', { a: ImageSearchActions.nextBatchRequested() });

        expectObservable(runNextBatchEffect()).toBe('');
      });

      expect(searchSpy).not.toHaveBeenCalled();
    });
  });

  it('opens the preview dialog for a selected result', () => {
    const result = { id: 1, title: 'Owl' } as ImageSearchResult;

    scheduler.run(({ hot, expectObservable }) => {
      actions$ = hot('a', { a: ImageSearchActions.resultSelected({ result }) });

      expectObservable(TestBed.runInInjectionContext(() => openImagePreview())).toBe('a', {
        a: ImageSearchActions.resultSelected({ result }),
      });
    });

    expect(openPreviewSpy).toHaveBeenCalledWith(result);
  });
});
