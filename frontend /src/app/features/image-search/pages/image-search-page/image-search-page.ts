import { Component, effect, inject, linkedSignal, untracked } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Store } from '@ngrx/store';

import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { SearchResults } from '../../components/search-results/search-results';
import { SearchStatus } from '../../components/search-status/search-status';
import { ImageSearchResult } from '../../interfaces/image-search-result.interface';
import { ImageSearchActions } from '../../store/image-search.actions';
import {
  selectActiveQuery,
  selectError,
  selectHasError,
  selectHasMoreResults,
  selectHasResults,
  selectIsEmpty,
  selectIsLoading,
  selectIsLoadingNextBatch,
  selectNextBatchError,
  selectQuery,
  selectResults,
  selectTotalHits,
} from '../../store/image-search.selectors';
import { QueryHistoryActions } from '../../store/query-history.actions';
import { selectQuerySuggestions } from '../../store/query-history.selectors';

@Component({
  selector: 'app-image-search-page',
  imports: [FormField, SearchInput, SearchResults, SearchStatus],
  templateUrl: './image-search-page.html',
  styleUrl: './image-search-page.scss',
})
export class ImageSearchPage {
  private readonly store = inject(Store);

  private readonly query = this.store.selectSignal(selectQuery);

  private readonly searchModel = linkedSignal(() => ({ query: this.query() }));
  protected readonly searchForm = form(this.searchModel);
  protected readonly suggestions = this.store.selectSignal(selectQuerySuggestions);
  protected readonly activeQuery = this.store.selectSignal(selectActiveQuery);
  protected readonly results = this.store.selectSignal(selectResults);
  protected readonly totalHits = this.store.selectSignal(selectTotalHits);
  protected readonly error = this.store.selectSignal(selectError);
  protected readonly isLoading = this.store.selectSignal(selectIsLoading);
  protected readonly isEmpty = this.store.selectSignal(selectIsEmpty);
  protected readonly hasError = this.store.selectSignal(selectHasError);
  protected readonly hasResults = this.store.selectSignal(selectHasResults);
  protected readonly hasMoreResults = this.store.selectSignal(selectHasMoreResults);
  protected readonly isLoadingNextBatch = this.store.selectSignal(selectIsLoadingNextBatch);
  protected readonly nextBatchError = this.store.selectSignal(selectNextBatchError);

  constructor() {
    effect(() => {
      const query = this.searchForm.query().value();
      untracked(() => {
        if (query !== this.query()) {
          this.store.dispatch(ImageSearchActions.queryChanged({ query }));
        }
      });
    });
  }

  protected onSuggestionSelected(query: string): void {
    this.store.dispatch(ImageSearchActions.suggestionSelected({ query }));
  }

  protected onSuggestionRemoved(query: string): void {
    this.store.dispatch(QueryHistoryActions.entryRemoved({ query }));
  }

  protected openResult(result: ImageSearchResult): void {
    this.store.dispatch(ImageSearchActions.resultSelected({ result }));
  }

  protected requestNextBatch(): void {
    this.store.dispatch(ImageSearchActions.nextBatchRequested());
  }

  protected retry(): void {
    this.store.dispatch(ImageSearchActions.searchRetried());
  }
}
