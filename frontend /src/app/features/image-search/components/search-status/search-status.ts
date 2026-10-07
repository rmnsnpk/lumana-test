import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-search-status',
  imports: [DecimalPipe],
  templateUrl: './search-status.html',
  styleUrl: './search-status.scss',
})
export class SearchStatus {
  readonly loadedCount = input.required<number>();
  readonly isLoading = input.required<boolean>();
  readonly hasError = input.required<boolean>();
  readonly isEmpty = input.required<boolean>();
  readonly hasMoreResults = input.required<boolean>();
  readonly isLoadingNextBatch = input.required<boolean>();
  readonly nextBatchError = input.required<string | null>();

  readonly nextBatchRetried = output();

  protected retryNextBatch(): void {
    this.nextBatchRetried.emit();
  }
}
