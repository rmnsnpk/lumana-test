import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { ImageSearchBatch } from '../interfaces/image-search-batch.interface';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';

export const ImageSearchActions = createActionGroup({
  source: 'Image Search',
  events: {
    'Query Changed': props<{ query: string }>(),
    'Suggestion Selected': props<{ query: string }>(),
    'Search Retried': emptyProps(),
    'Search Started': props<{ query: string }>(),
    'Search Succeeded': props<{ query: string; batch: ImageSearchBatch; cachedAt: number }>(),
    'Search Restored From Cache': props<{ query: string; accessedAt: number }>(),
    'Search Failed': props<{ query: string; error: string }>(),
    'Next Batch Requested': emptyProps(),
    'Next Batch Started': props<{ query: string }>(),
    'Next Batch Succeeded': props<{ query: string; batch: ImageSearchBatch }>(),
    'Next Batch Failed': props<{ query: string; error: string }>(),
    'Result Selected': props<{ result: ImageSearchResult }>(),
  },
});
