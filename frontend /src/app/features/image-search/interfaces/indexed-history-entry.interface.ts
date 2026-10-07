import { QueryHistoryEntry } from './query-history-entry.interface';

export interface IndexedHistoryEntry {
  entry: QueryHistoryEntry;
  words: string[];
}
