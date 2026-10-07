import { Component, input, output } from '@angular/core';

import { QuerySuggestion } from '../../interfaces/query-suggestion.interface';
import { toSuggestionOptionId } from '../../utils/search-suggestions.utils';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-search-suggestions',
  imports: [Icon],
  templateUrl: './search-suggestions.html',
  styleUrl: './search-suggestions.scss',
})
export class SearchSuggestions {
  readonly listboxId = input.required<string>();
  readonly heading = input.required<string>();
  readonly suggestions = input.required<QuerySuggestion[]>();
  readonly activeIndex = input.required<number>();

  readonly suggestionSelected = output<string>();
  readonly suggestionRemoved = output<string>();
  readonly suggestionHovered = output<number>();

  protected optionId(index: number): string {
    return toSuggestionOptionId(this.listboxId(), index);
  }

  protected select(query: string): void {
    this.suggestionSelected.emit(query);
  }

  protected hover(index: number): void {
    this.suggestionHovered.emit(index);
  }

  protected remove(event: Event, query: string): void {
    event.stopPropagation();
    this.suggestionRemoved.emit(query);
  }
}
