import { Component, computed, input, output } from '@angular/core';

import { POLYGON_COLOR_PRESETS } from '../../constants/polygon-style.constants';

@Component({
  selector: 'app-polygon-color-picker',
  templateUrl: './polygon-color-picker.html',
  styleUrl: './polygon-color-picker.scss',
})
export class PolygonColorPicker {
  readonly color = input.required<string>();

  readonly colorChanged = output<string>();

  protected readonly presets = POLYGON_COLOR_PRESETS;
  protected readonly isCustom = computed(() => !this.presets.includes(this.color()));

  protected select(color: string): void {
    this.colorChanged.emit(color);
  }

  protected onCustomInput(event: Event): void {
    this.select((event.target as HTMLInputElement).value);
  }
}
