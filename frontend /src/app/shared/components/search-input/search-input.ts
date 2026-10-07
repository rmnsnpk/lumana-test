import { Component, computed, input, linkedSignal, model, output, signal } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import {
  NO_ACTIVE_SUGGESTION_INDEX,
  SUGGESTION_NAVIGATION_STEP,
  SUGGESTIONS_LISTBOX_ID,
} from '../../constants/search-suggestions.constants';
import { QuerySuggestion } from '../../interfaces/query-suggestion.interface';
import { toSuggestionOptionId } from '../../utils/search-suggestions.utils';
import { Icon } from '../icon/icon';
import { SearchSuggestions } from '../search-suggestions/search-suggestions';

@Component({
  selector: 'app-search-input',
  imports: [Icon, SearchSuggestions],
  templateUrl: './search-input.html',
  styleUrl: './search-input.scss',
})
export class SearchInput implements FormValueControl<string> {
  readonly value = model('');
  readonly isLoading = input(false);
  readonly suggestions = input<QuerySuggestion[]>([]);

  readonly touch = output();
  readonly suggestionSelected = output<string>();
  readonly suggestionRemoved = output<string>();

  protected readonly listboxId = SUGGESTIONS_LISTBOX_ID;

  private readonly isOpen = signal(false);

  protected readonly activeIndex = linkedSignal({
    source: this.suggestions,
    computation: () => NO_ACTIVE_SUGGESTION_INDEX,
  });

  protected readonly isExpanded = computed(() => this.isOpen() && this.suggestions().length > 0);

  protected readonly suggestionsHeading = computed(() =>
    this.value().trim() ? 'Suggestions' : 'Recent searches',
  );

  protected readonly activeOptionId = computed(() =>
    this.isExpanded() && this.activeIndex() !== NO_ACTIVE_SUGGESTION_INDEX
      ? toSuggestionOptionId(this.listboxId, this.activeIndex())
      : null,
  );

  protected open(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected onBlur(): void {
    this.close();
    this.touch.emit();
  }

  protected onInput(event: Event): void {
    this.open();
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open();
        this.moveActiveIndex(SUGGESTION_NAVIGATION_STEP.next);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActiveIndex(SUGGESTION_NAVIGATION_STEP.previous);
        break;
      case 'Enter': {
        const activeSuggestion = this.suggestions()[this.activeIndex()];
        if (this.isExpanded() && activeSuggestion) {
          event.preventDefault();
          this.selectSuggestion(activeSuggestion.query);
        }
        break;
      }
      case 'Escape':
        this.close();
        break;
    }
  }

  protected selectSuggestion(query: string): void {
    this.close();
    this.suggestionSelected.emit(query);
  }

  protected removeSuggestion(query: string): void {
    this.suggestionRemoved.emit(query);
  }

  protected clear(input: HTMLInputElement): void {
    this.value.set('');
    input.focus();
  }

  private moveActiveIndex(step: number): void {
    const count = this.suggestions().length;
    if (!count) {
      return;
    }

    this.activeIndex.update((index) => {
      const startIndex =
        index === NO_ACTIVE_SUGGESTION_INDEX && step === SUGGESTION_NAVIGATION_STEP.previous
          ? count
          : index;
      return (startIndex + step + count) % count;
    });
  }
}
