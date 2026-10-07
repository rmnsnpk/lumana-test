import { SEARCH_CACHE_MAX_ENTRIES, SEARCH_CACHE_TTL_MS } from '../constants/search-cache.constants';
import { CachedSearch } from '../interfaces/cached-search.interface';

export const isCachedSearchFresh = (cachedSearch: CachedSearch, now: number): boolean =>
  now - cachedSearch.cachedAt < SEARCH_CACHE_TTL_MS;

export const findEvictedQueries = (
  cachedSearches: CachedSearch[],
  now: number,
  protectedQuery: string,
): string[] => {
  const evictable = cachedSearches.filter(({ query }) => query !== protectedQuery);
  const expired = evictable.filter((cachedSearch) => !isCachedSearchFresh(cachedSearch, now));
  const fresh = evictable.filter((cachedSearch) => isCachedSearchFresh(cachedSearch, now));

  const keptCount = cachedSearches.length - expired.length;
  const overflowCount = Math.max(keptCount - SEARCH_CACHE_MAX_ENTRIES, 0);
  const leastRecentlyUsed = [...fresh]
    .sort((first, second) => first.lastAccessedAt - second.lastAccessedAt)
    .slice(0, overflowCount);

  return [...expired, ...leastRecentlyUsed].map(({ query }) => query);
};

export const appendUniqueIds = (existingIds: number[], newIds: number[]): number[] => {
  const knownIds = new Set(existingIds);
  return [...existingIds, ...newIds.filter((id) => !knownIds.has(id))];
};

export const findOrphanedResultIds = (
  resultIds: number[],
  cachedSearches: CachedSearch[],
): number[] => {
  const referencedIds = new Set(cachedSearches.flatMap((cachedSearch) => cachedSearch.resultIds));
  return resultIds.filter((id) => !referencedIds.has(id));
};
