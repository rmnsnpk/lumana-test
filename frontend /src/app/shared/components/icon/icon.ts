import { Component, input } from '@angular/core';

import { IconName, IconSize } from '../../types/icon.types';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: {
    '[class]': "'icon--' + size()",
  },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('sm');
}
