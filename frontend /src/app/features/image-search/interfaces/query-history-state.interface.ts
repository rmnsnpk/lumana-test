import { EntityState } from '@ngrx/entity';

import { QueryHistoryEntry } from './query-history-entry.interface';

export type QueryHistoryState = EntityState<QueryHistoryEntry>;
