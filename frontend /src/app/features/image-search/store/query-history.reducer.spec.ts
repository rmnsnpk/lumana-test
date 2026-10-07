import {
  QUERY_HISTORY_MAX_ENTRIES,
  TYPING_REFINEMENT_WINDOW_MS,
} from '../constants/query-history.constants';
import { QueryHistoryState } from '../interfaces/query-history-state.interface';
import { QueryHistoryActions } from './query-history.actions';
import { queryHistoryFeature } from './query-history.reducer';

const { reducer } = queryHistoryFeature;
const NOW = 1_000_000;

const record = (state: QueryHistoryState | undefined, query: string, searchedAt: number) =>
  reducer(state, QueryHistoryActions.queryRecorded({ query, searchedAt }));

describe('queryHistory reducer', () => {
  it('keeps entries ordered from the most recently searched', () => {
    const state = record(
      record(undefined, 'red fox', NOW),
      'owl',
      NOW + TYPING_REFINEMENT_WINDOW_MS,
    );

    expect(state.ids).toEqual(['owl', 'red fox']);
  });

  it('counts repeated searches of the same query', () => {
    const state = record(record(undefined, 'owl', NOW), 'owl', NOW + 1);

    expect(state.entities['owl']).toEqual({
      query: 'owl',
      searchCount: 2,
      lastSearchedAt: NOW + 1,
    });
  });

  it('replaces a query that was only a typing step', () => {
    const state = record(record(undefined, 'moun', NOW), 'mountain', NOW + 1);

    expect(state.ids).toEqual(['mountain']);
  });

  it('keeps a related query searched long enough ago', () => {
    const state = record(
      record(undefined, 'mountain', NOW),
      'mountain lake',
      NOW + TYPING_REFINEMENT_WINDOW_MS + 1,
    );

    expect(state.ids).toEqual(['mountain lake', 'mountain']);
  });

  it('keeps a related query that was searched more than once', () => {
    const repeated = record(record(undefined, 'mountain', NOW), 'mountain', NOW + 1);
    const state = record(repeated, 'mountain lake', NOW + 2);

    expect(state.ids).toEqual(['mountain lake', 'mountain']);
  });

  it('drops the oldest entries above the limit', () => {
    let state: QueryHistoryState | undefined;
    for (let position = 0; position <= QUERY_HISTORY_MAX_ENTRIES; position++) {
      state = record(state, `query-${position}`, NOW + position * TYPING_REFINEMENT_WINDOW_MS);
    }

    expect(state!.ids).toHaveLength(QUERY_HISTORY_MAX_ENTRIES);
    expect(state!.entities['query-0']).toBeUndefined();
  });

  it('removes an entry on request', () => {
    const state = reducer(
      record(undefined, 'owl', NOW),
      QueryHistoryActions.entryRemoved({ query: 'owl' }),
    );

    expect(state.ids).toEqual([]);
  });
});
