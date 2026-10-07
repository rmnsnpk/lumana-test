import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { polygonsFeature } from '../polygon-drawing/store/polygon.reducer';
import * as imageSearchEffects from './store/image-search.effects';
import { imageSearchFeature } from './store/image-search.reducer';
import * as queryHistoryEffects from './store/query-history.effects';
import { queryHistoryFeature } from './store/query-history.reducer';

export const IMAGE_SEARCH_ROUTES: Routes = [
  {
    path: '',
    title: 'Image Search',
    providers: [
      provideState(imageSearchFeature),
      provideState(queryHistoryFeature),
      provideState(polygonsFeature),
      provideEffects(imageSearchEffects, queryHistoryEffects),
    ],
    loadComponent: () =>
      import('./pages/image-search-page/image-search-page').then((m) => m.ImageSearchPage),
  },
];
