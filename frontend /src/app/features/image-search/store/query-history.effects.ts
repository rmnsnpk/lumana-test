import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, map, merge, take, switchMap } from 'rxjs';

import { isMeaningfulQuery } from '../utils/query-history.utils';
import { ImageSearchActions } from './image-search.actions';
import { selectCachedSearch } from './image-search.selectors';
import { QueryHistoryActions } from './query-history.actions';

export const recordMeaningfulQuery = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) => {
    const searchedWithResults$ = actions$.pipe(
      ofType(ImageSearchActions.searchSucceeded),
      filter(({ batch }) => batch.results.length > 0),
      map(({ query, cachedAt }) => ({ query, searchedAt: cachedAt })),
    );

    const restoredWithResults$ = actions$.pipe(
      ofType(ImageSearchActions.searchRestoredFromCache),
      switchMap(({ query, accessedAt }) =>
        store.select(selectCachedSearch(query)).pipe(
          take(1),
          filter((cachedSearch) => !!cachedSearch?.resultIds.length),
          map(() => ({ query, searchedAt: accessedAt })),
        ),
      ),
    );

    return merge(searchedWithResults$, restoredWithResults$).pipe(
      filter(({ query }) => isMeaningfulQuery(query)),
      map(({ query, searchedAt }) => QueryHistoryActions.queryRecorded({ query, searchedAt })),
    );
  },
  { functional: true },
);
