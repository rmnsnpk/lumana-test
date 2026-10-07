import { createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';

import { QUERY_HISTORY_FEATURE_KEY } from '../constants/image-search-store.constants';
import { QUERY_HISTORY_MAX_ENTRIES } from '../constants/query-history.constants';
import { QueryHistoryEntry } from '../interfaces/query-history-entry.interface';
import { QueryHistoryState } from '../interfaces/query-history-state.interface';
import { isTypingStep } from '../utils/query-history.utils';
import { QueryHistoryActions } from './query-history.actions';

export const queryHistoryAdapter = createEntityAdapter<QueryHistoryEntry>({
  selectId: (entry) => entry.query,
  sortComparer: (first, second) => second.lastSearchedAt - first.lastSearchedAt,
});

const initialState: QueryHistoryState = queryHistoryAdapter.getInitialState();

const recordQuery = (
  state: QueryHistoryState,
  query: string,
  searchedAt: number,
): QueryHistoryState => {
  const existingEntry = state.entities[query];
  if (existingEntry) {
    return queryHistoryAdapter.updateOne(
      {
        id: query,
        changes: { searchCount: existingEntry.searchCount + 1, lastSearchedAt: searchedAt },
      },
      state,
    );
  }

  const mostRecentEntry = state.entities[state.ids[0]];
  const withoutTypingStep =
    mostRecentEntry && isTypingStep(mostRecentEntry, query, searchedAt)
      ? queryHistoryAdapter.removeOne(mostRecentEntry.query, state)
      : state;

  const withNewEntry = queryHistoryAdapter.addOne(
    { query, searchCount: 1, lastSearchedAt: searchedAt },
    withoutTypingStep,
  );

  return queryHistoryAdapter.removeMany(
    (withNewEntry.ids as string[]).slice(QUERY_HISTORY_MAX_ENTRIES),
    withNewEntry,
  );
};

export const queryHistoryFeature = createFeature({
  name: QUERY_HISTORY_FEATURE_KEY,
  reducer: createReducer(
    initialState,
    on(QueryHistoryActions.queryRecorded, (state, { query, searchedAt }) =>
      recordQuery(state, query, searchedAt),
    ),
    on(QueryHistoryActions.entryRemoved, (state, { query }) =>
      queryHistoryAdapter.removeOne(query, state),
    ),
  ),
});
