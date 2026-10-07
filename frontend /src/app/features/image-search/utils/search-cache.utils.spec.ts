import { SEARCH_CACHE_TTL_MS } from '../constants/search-cache.constants';
import { CachedSearch } from '../interfaces/cached-search.interface';
import {
  appendUniqueIds,
  findEvictedQueries,
  findOrphanedResultIds,
  isCachedSearchFresh,
} from './search-cache.utils';

const NOW = 1_000_000;

const createCachedSearch = (
  query: string,
  cachedAt: number,
  resultIds: number[] = [],
): CachedSearch => ({
  query,
  resultIds,
  nextOffset: null,
  totalHits: resultIds.length,
  cachedAt,
  lastAccessedAt: cachedAt,
});

describe('search cache utils', () => {
  it('treats entries as fresh until the time to live passes', () => {
    expect(isCachedSearchFresh(createCachedSearch('cat', NOW), NOW + SEARCH_CACHE_TTL_MS - 1)).toBe(
      true,
    );
    expect(isCachedSearchFresh(createCachedSearch('cat', NOW), NOW + SEARCH_CACHE_TTL_MS)).toBe(
      false,
    );
  });

  it('never evicts the protected query even when expired', () => {
    const cachedSearches = [createCachedSearch('cat', NOW), createCachedSearch('dog', NOW)];

    expect(findEvictedQueries(cachedSearches, NOW + SEARCH_CACHE_TTL_MS, 'cat')).toEqual(['dog']);
  });

  it('finds images no longer referenced by any cached query', () => {
    const cachedSearches = [createCachedSearch('cat', NOW, [1, 2])];

    expect(findOrphanedResultIds([1, 2, 3], cachedSearches)).toEqual([3]);
  });

  it('appends only ids that are not already present', () => {
    expect(appendUniqueIds([1, 2], [2, 3, 4])).toEqual([1, 2, 3, 4]);
  });
});
