import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  FIRST_ROW_INDEX,
  NEXT_BATCH_THRESHOLD_ROWS,
  RESULT_ROW_HEIGHT_PX,
  VIRTUAL_SCROLL_MAX_BUFFER_PX,
  VIRTUAL_SCROLL_MIN_BUFFER_PX,
} from '../../constants/virtual-scroll.constants';
import { ImageSearchResult } from '../../interfaces/image-search-result.interface';
import { SearchResultItem } from '../search-result-item/search-result-item';

@Component({
  selector: 'app-search-results',
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    DecimalPipe,
    SearchResultItem,
  ],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResults {
  readonly results = input.required<ImageSearchResult[]>();
  readonly totalHits = input.required<number>();
  readonly query = input.required<string>();
  readonly hasMoreResults = input.required<boolean>();
  readonly isLoadingNextBatch = input.required<boolean>();
  readonly nextBatchError = input.required<string | null>();

  readonly nextBatchRequested = output();
  readonly resultSelected = output<ImageSearchResult>();

  protected readonly rowHeight = RESULT_ROW_HEIGHT_PX;
  protected readonly minBufferPx = VIRTUAL_SCROLL_MIN_BUFFER_PX;
  protected readonly maxBufferPx = VIRTUAL_SCROLL_MAX_BUFFER_PX;

  private readonly viewport = viewChild.required(CdkVirtualScrollViewport);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.viewport()
        .renderedRangeStream.pipe(takeUntilDestroyed(destroyRef))
        .subscribe(({ end }) => this.requestNextBatchIfNeeded(end));
    });

    effect(() => {
      this.query();
      untracked(() => this.viewport().scrollToIndex(FIRST_ROW_INDEX));
    });
  }

  protected trackById(_index: number, result: ImageSearchResult): number {
    return result.id;
  }

  protected selectResult(result: ImageSearchResult): void {
    this.resultSelected.emit(result);
  }

  private requestNextBatchIfNeeded(renderedEnd: number): void {
    const isNearEnd = renderedEnd >= this.results().length - NEXT_BATCH_THRESHOLD_ROWS;
    const canLoad = this.hasMoreResults() && !this.isLoadingNextBatch() && !this.nextBatchError();

    if (isNearEnd && canLoad) {
      this.nextBatchRequested.emit();
    }
  }
}
