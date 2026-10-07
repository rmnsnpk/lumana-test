import { ImageSearchResult } from './image-search-result.interface';

export interface ImageSearchBatch {
  results: ImageSearchResult[];
  nextOffset: number | null;
  totalHits: number | null;
}
