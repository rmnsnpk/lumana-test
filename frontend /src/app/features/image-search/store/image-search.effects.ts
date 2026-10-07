import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  concat,
  debounce,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  merge,
  of,
  startWith,
  switchMap,
  take,
  tap,
  timer,
  withLatestFrom,
} from 'rxjs';

import { AppHttpError } from '../../../core/interfaces/app-http-error.interface';
import { SEARCH_DEBOUNCE_MS } from '../constants/search.constants';
import { ImageSearchApi } from '../services/image-search-api';
import { ImagePreviewDialog } from '../services/image-preview-dialog';
import { isCachedSearchFresh } from '../utils/search-cache.utils';
import { normalizeSearchQuery } from '../utils/search-query.utils';
import { ImageSearchActions } from './image-search.actions';
import {
  selectActiveCachedSearch,
  selectCachedSearch,
  selectIsLoading,
  selectQuery,
} from './image-search.selectors';

export const searchImages = createEffect(
  (actions$ = inject(Actions), store = inject(Store), imageSearchApi = inject(ImageSearchApi)) => {
    const userQuery$ = actions$.pipe(
      ofType(ImageSearchActions.queryChanged, ImageSearchActions.suggestionSelected),
      debounce((action) =>
        action.type === ImageSearchActions.suggestionSelected.type
          ? of(action)
          : timer(SEARCH_DEBOUNCE_MS),
      ),
      map(({ query }) => normalizeSearchQuery(query)),
      startWith(''),
      distinctUntilChanged(),
    );

    const retriedQuery$ = actions$.pipe(
      ofType(ImageSearchActions.searchRetried),
      withLatestFrom(store.select(selectQuery)),
      map(([, query]) => normalizeSearchQuery(query)),
    );

    const fetchQuery = (query: string) =>
      concat(
        of(ImageSearchActions.searchStarted({ query })),
        imageSearchApi.search(query).pipe(
          map((batch) =>
            ImageSearchActions.searchSucceeded({ query, batch, cachedAt: Date.now() }),
          ),
          catchError((error: AppHttpError) =>
            of(ImageSearchActions.searchFailed({ query, error: error.message })),
          ),
        ),
      );

    return merge(userQuery$, retriedQuery$).pipe(
      switchMap((query) =>
        store.select(selectCachedSearch(query)).pipe(
          take(1),
          switchMap((cachedSearch) => {
            const now = Date.now();
            return cachedSearch && isCachedSearchFresh(cachedSearch, now)
              ? of(ImageSearchActions.searchRestoredFromCache({ query, accessedAt: now }))
              : fetchQuery(query);
          }),
        ),
      ),
    );
  },
  { functional: true },
);

export const loadNextBatch = createEffect(
  (actions$ = inject(Actions), store = inject(Store), imageSearchApi = inject(ImageSearchApi)) =>
    actions$.pipe(
      ofType(ImageSearchActions.nextBatchRequested),
      withLatestFrom(store.select(selectActiveCachedSearch), store.select(selectIsLoading)),
      map(([, cachedSearch, isLoading]) =>
        !isLoading && cachedSearch?.nextOffset != null
          ? { query: cachedSearch.query, offset: cachedSearch.nextOffset }
          : null,
      ),
      filter((request) => request !== null),
      exhaustMap(({ query, offset }) =>
        concat(
          of(ImageSearchActions.nextBatchStarted({ query })),
          imageSearchApi.search(query, offset).pipe(
            map((batch) => ImageSearchActions.nextBatchSucceeded({ query, batch })),
            catchError((error: AppHttpError) =>
              of(ImageSearchActions.nextBatchFailed({ query, error: error.message })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const openImagePreview = createEffect(
  (actions$ = inject(Actions), imagePreviewDialog = inject(ImagePreviewDialog)) =>
    actions$.pipe(
      ofType(ImageSearchActions.resultSelected),
      tap(({ result }) => imagePreviewDialog.open(result)),
    ),
  { functional: true, dispatch: false },
);
