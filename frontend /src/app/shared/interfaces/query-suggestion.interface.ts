export interface QuerySuggestionSegment {
  text: string;
  isMatch: boolean;
}

export interface QuerySuggestion {
  query: string;
  segments: QuerySuggestionSegment[];
}
