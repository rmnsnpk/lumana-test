import { Component, computed, input, output } from '@angular/core';

import { ImageSearchResult } from '../../interfaces/image-search-result.interface';

@Component({
  selector: 'app-search-result-item',
  templateUrl: './search-result-item.html',
  styleUrl: './search-result-item.scss',
})
export class SearchResultItem {
  readonly result = input.required<ImageSearchResult>();

  readonly selected = output<ImageSearchResult>();

  protected readonly thumbnailSrcset = computed(() => {
    const { thumbnailUrl, retinaThumbnailUrl } = this.result();
    return retinaThumbnailUrl ? `${thumbnailUrl} 1x, ${retinaThumbnailUrl} 2x` : null;
  });

  protected select(): void {
    this.selected.emit(this.result());
  }
}
