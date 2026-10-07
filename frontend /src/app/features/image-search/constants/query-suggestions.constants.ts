export const MAX_QUERY_SUGGESTIONS = 6;

export const SUGGESTION_SCORE_WEIGHTS = {
  exactWordMatch: 3,
  queryPrefixMatch: 5,
  searchCount: 1,
} as const;
