import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';

import { QuerySuggestion } from '../../interfaces/query-suggestion.interface';
import { SearchInput } from './search-input';

const suggestions: QuerySuggestion[] = [
  { query: 'red fox', segments: [{ text: 'red fox', isMatch: false }] },
  { query: 'arctic fox', segments: [{ text: 'arctic fox', isMatch: false }] },
];

@Component({
  imports: [FormField, SearchInput],
  template: `
    <app-search-input
      [formField]="searchForm.query"
      [suggestions]="suggestions"
      (suggestionSelected)="selected = $event"
    />
  `,
})
class SearchInputHost {
  readonly searchForm = form(signal({ query: 'fox' }));
  readonly suggestions = suggestions;
  selected: string | null = null;
}

describe('SearchInput', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(SearchInputHost);
    await fixture.whenStable();
    const field = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    return { fixture, field, host: fixture.componentInstance };
  };

  it('shows the form value and writes typed text back to the form', async () => {
    const { fixture, field, host } = await setup();
    expect(field.value).toBe('fox');

    field.value = 'owl';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(host.searchForm.query().value()).toBe('owl');
  });

  it('marks the field as touched on blur', async () => {
    const { fixture, field, host } = await setup();

    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(host.searchForm.query().touched()).toBe(true);
  });

  it('selects a suggestion with the keyboard', async () => {
    const { fixture, field, host } = await setup();

    field.dispatchEvent(new Event('focus'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();

    expect(host.selected).toBe('arctic fox');
  });

  it('clears the value from the clear button', async () => {
    const { fixture, host } = await setup();

    (fixture.nativeElement.querySelector('.search-input__clear') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(host.searchForm.query().value()).toBe('');
  });
});
