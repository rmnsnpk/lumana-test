import { MAX_QUERY_SUGGESTIONS } from '../constants/query-suggestions.constants';
import { QueryHistoryEntry } from '../interfaces/query-history-entry.interface';
import { buildQuerySuggestions, indexHistoryEntry } from './query-suggestions.utils';

const createEntry = (query: string, searchCount = 1, lastSearchedAt = 0): QueryHistoryEntry => ({
  query,
  searchCount,
  lastSearchedAt,
});

const index = (...entries: QueryHistoryEntry[]) => entries.map(indexHistoryEntry);

describe('buildQuerySuggestions', () => {
  it('returns the most recent queries when the input is empty', () => {
    const entries = Array.from({ length: MAX_QUERY_SUGGESTIONS + 1 }, (_, position) =>
      createEntry(`query ${position}`),
    );

    const suggestions = buildQuerySuggestions(index(...entries), '  ');

    expect(suggestions).toHaveLength(MAX_QUERY_SUGGESTIONS);
    expect(suggestions[0].query).toBe('query 0');
  });

  it('matches every typed word against word prefixes in any order', () => {
    const suggestions = buildQuerySuggestions(
      index(createEntry('mountain lake'), createEntry('lake district'), createEntry('red fox')),
      'Lake Mou',
    );

    expect(suggestions.map(({ query }) => query)).toEqual(['mountain lake']);
  });

  it('highlights the matched part of every word', () => {
    const [suggestion] = buildQuerySuggestions(index(createEntry('mountain lake')), 'lake mou');

    expect(suggestion.segments).toEqual([
      { text: 'mou', isMatch: true },
      { text: 'ntain ', isMatch: false },
      { text: 'lake', isMatch: true },
    ]);
  });

  it('ranks queries starting with the input and searched often first', () => {
    const suggestions = buildQuerySuggestions(
      index(
        createEntry('snowy mountain'),
        createEntry('mountain lake'),
        createEntry('mountain river', 3),
      ),
      'mountain',
    );

    expect(suggestions.map(({ query }) => query)).toEqual([
      'mountain river',
      'mountain lake',
      'snowy mountain',
    ]);
  });

  it('does not suggest the query that is already typed', () => {
    expect(buildQuerySuggestions(index(createEntry('red fox')), 'Red  Fox')).toEqual([]);
  });
});
