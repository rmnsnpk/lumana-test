import { createActionGroup, props } from '@ngrx/store';

export const QueryHistoryActions = createActionGroup({
  source: 'Query History',
  events: {
    'Query Recorded': props<{ query: string; searchedAt: number }>(),
    'Entry Removed': props<{ query: string }>(),
  },
});
