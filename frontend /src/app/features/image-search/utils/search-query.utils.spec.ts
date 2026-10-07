import { normalizeSearchQuery } from './search-query.utils';

describe('normalizeSearchQuery', () => {
  it('trims, collapses whitespace and lowercases the query', () => {
    expect(normalizeSearchQuery('  Mountain   LAKE ')).toBe('mountain lake');
  });
});
