import {
  QUERY_HISTORY_MIN_LENGTH,
  TYPING_REFINEMENT_WINDOW_MS,
} from '../constants/query-history.constants';
import { QueryHistoryEntry } from '../interfaces/query-history-entry.interface';

export const isMeaningfulQuery = (normalizedQuery: string): boolean =>
  normalizedQuery.length >= QUERY_HISTORY_MIN_LENGTH;

export const isTypingStep = (
  previousEntry: QueryHistoryEntry,
  query: string,
  searchedAt: number,
): boolean => {
  const isRelated =
    previousEntry.query !== query &&
    (query.startsWith(previousEntry.query) || previousEntry.query.startsWith(query));
  const isRecent = searchedAt - previousEntry.lastSearchedAt <= TYPING_REFINEMENT_WINDOW_MS;

  return isRelated && isRecent && previousEntry.searchCount === 1;
};
