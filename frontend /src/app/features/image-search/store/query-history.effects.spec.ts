import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

import { ImageSearchBatch } from '../interfaces/image-search-batch.interface';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';
import { ImageSearchActions } from './image-search.actions';
import { imageSearchFeature } from './image-search.reducer';
import { QueryHistoryActions } from './query-history.actions';
import { recordMeaningfulQuery } from './query-history.effects';

const NOW = 1_000_000;

const result = { id: 1 } as ImageSearchResult;
const batchWithResults: ImageSearchBatch = { results: [result], nextOffset: null, totalHits: 1 };
const emptyBatch: ImageSearchBatch = { results: [], nextOffset: null, totalHits: 0 };

const cachedState = [
  ImageSearchActions.searchSucceeded({ query: 'owl', batch: batchWithResults, cachedAt: NOW }),
  ImageSearchActions.searchSucceeded({ query: 'zzz', batch: emptyBatch, cachedAt: NOW }),
].reduce(imageSearchFeature.reducer, undefined);

describe('recordMeaningfulQuery effect', () => {
  let actions$: Observable<Action>;
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [imageSearchFeature.name]: cachedState } }),
      ],
    });
  });

  const runEffect = () => TestBed.runInInjectionContext(() => recordMeaningfulQuery());

  it('records searches and cache restores that produced results', () => {
    scheduler.run(({ hot, expectObservable }) => {
      actions$ = hot('ab', {
        a: ImageSearchActions.searchSucceeded({
          query: 'red fox',
          batch: batchWithResults,
          cachedAt: NOW,
        }),
        b: ImageSearchActions.searchRestoredFromCache({ query: 'owl', accessedAt: NOW + 1 }),
      });

      expectObservable(runEffect()).toBe('ab', {
        a: QueryHistoryActions.queryRecorded({ query: 'red fox', searchedAt: NOW }),
        b: QueryHistoryActions.queryRecorded({ query: 'owl', searchedAt: NOW + 1 }),
      });
    });
  });

  it('skips empty results, featured images and too short queries', () => {
    scheduler.run(({ hot, expectObservable }) => {
      actions$ = hot('abcd', {
        a: ImageSearchActions.searchSucceeded({ query: 'qzx', batch: emptyBatch, cachedAt: NOW }),
        b: ImageSearchActions.searchRestoredFromCache({ query: 'zzz', accessedAt: NOW }),
        c: ImageSearchActions.searchSucceeded({
          query: '',
          batch: batchWithResults,
          cachedAt: NOW,
        }),
        d: ImageSearchActions.searchSucceeded({
          query: 'x',
          batch: batchWithResults,
          cachedAt: NOW,
        }),
      });

      expectObservable(runEffect()).toBe('');
    });
  });
});
