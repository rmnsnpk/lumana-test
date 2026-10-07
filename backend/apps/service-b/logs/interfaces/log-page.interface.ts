export interface LogPage<T> {
  items: T[];
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}
