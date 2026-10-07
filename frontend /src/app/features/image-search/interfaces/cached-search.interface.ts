export interface CachedSearch {
  query: string;
  resultIds: number[];
  nextOffset: number | null;
  totalHits: number;
  cachedAt: number;
  lastAccessedAt: number;
}
