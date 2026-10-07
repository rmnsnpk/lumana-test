import { createSelector } from '@ngrx/store';

import { buildQuerySuggestions, indexHistoryEntry } from '../utils/query-suggestions.utils';
import { selectQuery } from './image-search.selectors';
import { queryHistoryAdapter, queryHistoryFeature } from './query-history.reducer';

const { selectAll } = queryHistoryAdapter.getSelectors();

const selectQueryHistory = createSelector(queryHistoryFeature.selectQueryHistoryState, selectAll);

const selectIndexedQueryHistory = createSelector(selectQueryHistory, (entries) =>
  entries.map(indexHistoryEntry),
);

export const selectQuerySuggestions = createSelector(
  selectIndexedQueryHistory,
  selectQuery,
  buildQuerySuggestions,
);
