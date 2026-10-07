import {
  MAX_QUERY_SUGGESTIONS,
  SUGGESTION_SCORE_WEIGHTS,
} from '../constants/query-suggestions.constants';
import { IndexedHistoryEntry } from '../interfaces/indexed-history-entry.interface';
import { QueryHistoryEntry } from '../interfaces/query-history-entry.interface';
import {
  QuerySuggestion,
  QuerySuggestionSegment,
} from '../../../shared/interfaces/query-suggestion.interface';
import { normalizeSearchQuery } from './search-query.utils';

const WORD_SEPARATOR = ' ';

const splitIntoWords = (normalizedQuery: string): string[] =>
  normalizedQuery ? normalizedQuery.split(WORD_SEPARATOR) : [];

export const indexHistoryEntry = (entry: QueryHistoryEntry): IndexedHistoryEntry => ({
  entry,
  words: splitIntoWords(entry.query),
});

const longestMatchingPrefixLength = (word: string, inputWords: string[]): number =>
  Math.max(
    0,
    ...inputWords.filter((inputWord) => word.startsWith(inputWord)).map(({ length }) => length),
  );

const appendSegment = (segments: QuerySuggestionSegment[], segment: QuerySuggestionSegment) => {
  const previous = segments.at(-1);
  if (previous && previous.isMatch === segment.isMatch) {
    previous.text += segment.text;
  } else {
    segments.push(segment);
  }
};

const buildSuggestionSegments = (
  words: string[],
  inputWords: string[],
): QuerySuggestionSegment[] => {
  const segments: QuerySuggestionSegment[] = [];

  words.forEach((word, index) => {
    if (index > 0) {
      appendSegment(segments, { text: WORD_SEPARATOR, isMatch: false });
    }

    const matchLength = longestMatchingPrefixLength(word, inputWords);
    if (matchLength) {
      appendSegment(segments, { text: word.slice(0, matchLength), isMatch: true });
    }
    if (matchLength < word.length) {
      appendSegment(segments, { text: word.slice(matchLength), isMatch: false });
    }
  });

  return segments;
};

const matchesAllInputWords = (words: string[], inputWords: string[]): boolean =>
  inputWords.every((inputWord) => words.some((word) => word.startsWith(inputWord)));

const scoreEntry = (
  { entry, words }: IndexedHistoryEntry,
  normalizedQuery: string,
  inputWords: string[],
): number => {
  const exactWordMatches = inputWords.filter((inputWord) => words.includes(inputWord)).length;
  const isQueryPrefix = entry.query.startsWith(normalizedQuery);

  return (
    exactWordMatches * SUGGESTION_SCORE_WEIGHTS.exactWordMatch +
    Number(isQueryPrefix) * SUGGESTION_SCORE_WEIGHTS.queryPrefixMatch +
    entry.searchCount * SUGGESTION_SCORE_WEIGHTS.searchCount
  );
};

const toSuggestion = ({ entry, words }: IndexedHistoryEntry, inputWords: string[]) => ({
  query: entry.query,
  segments: buildSuggestionSegments(words, inputWords),
});

export const buildQuerySuggestions = (
  indexedEntries: IndexedHistoryEntry[],
  rawQuery: string,
): QuerySuggestion[] => {
  const normalizedQuery = normalizeSearchQuery(rawQuery);
  const inputWords = splitIntoWords(normalizedQuery);

  if (!inputWords.length) {
    return indexedEntries
      .slice(0, MAX_QUERY_SUGGESTIONS)
      .map((indexedEntry) => toSuggestion(indexedEntry, inputWords));
  }

  return indexedEntries
    .filter(
      ({ entry, words }) =>
        entry.query !== normalizedQuery && matchesAllInputWords(words, inputWords),
    )
    .map((indexedEntry) => ({
      indexedEntry,
      score: scoreEntry(indexedEntry, normalizedQuery, inputWords),
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, MAX_QUERY_SUGGESTIONS)
    .map(({ indexedEntry }) => toSuggestion(indexedEntry, inputWords));
};
