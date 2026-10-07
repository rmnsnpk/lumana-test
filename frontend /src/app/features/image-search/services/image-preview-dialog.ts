import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';

import { ImagePreview } from '../components/image-preview/image-preview';
import {
  IMAGE_PREVIEW_BACKDROP_CLASS,
  IMAGE_PREVIEW_PANEL_CLASS,
  IMAGE_PREVIEW_TITLE_ID,
} from '../constants/image-preview.constants';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';

@Service()
export class ImagePreviewDialog {
  private readonly dialog = inject(Dialog);

  open(result: ImageSearchResult): void {
    this.dialog.closeAll();
    this.dialog.open<void, ImageSearchResult>(ImagePreview, {
      data: result,
      ariaLabelledBy: IMAGE_PREVIEW_TITLE_ID,
      panelClass: IMAGE_PREVIEW_PANEL_CLASS,
      backdropClass: IMAGE_PREVIEW_BACKDROP_CLASS,
      autoFocus: 'dialog',
      restoreFocus: true,
    });
  }
}
