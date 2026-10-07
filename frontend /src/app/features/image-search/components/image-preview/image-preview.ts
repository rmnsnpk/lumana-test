import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';

import { Icon } from '../../../../shared/components/icon/icon';
import { PolygonCanvas } from '../../../polygon-drawing/components/polygon-canvas/polygon-canvas';
import { PolygonColorPicker } from '../../../polygon-drawing/components/polygon-color-picker/polygon-color-picker';
import { PolygonEditor } from '../../../polygon-drawing/services/polygon-editor';

import {
  IMAGE_FRAME_MAX_HEIGHT_VH,
  IMAGE_LOAD_STATUS,
  IMAGE_PREVIEW_TITLE_ID,
} from '../../constants/image-preview.constants';
import { ImageLoadStatus } from '../../interfaces/image-load-status.interface';
import { ImageSearchResult } from '../../interfaces/image-search-result.interface';

@Component({
  selector: 'app-image-preview',
  imports: [Icon, PolygonCanvas, PolygonColorPicker],
  providers: [PolygonEditor],
  templateUrl: './image-preview.html',
  styleUrl: './image-preview.scss',
})
export class ImagePreview {
  private readonly dialogRef = inject(DialogRef);
  private readonly polygonEditor = inject(PolygonEditor);

  protected readonly result = inject<ImageSearchResult>(DIALOG_DATA);
  protected readonly titleId = IMAGE_PREVIEW_TITLE_ID;
  protected readonly loadStatus = signal<ImageLoadStatus>(IMAGE_LOAD_STATUS.loading);
  protected readonly imageLoadStatus = IMAGE_LOAD_STATUS;
  protected readonly polygonColor = this.polygonEditor.activeColor;
  protected readonly hasSelectedPolygon = computed(() => !!this.polygonEditor.selectedPolygon());

  protected readonly frameAspectRatio = `${this.result.imageWidth} / ${this.result.imageHeight}`;
  protected readonly frameWidth = `min(100%, ${
    (IMAGE_FRAME_MAX_HEIGHT_VH * this.result.imageWidth) / this.result.imageHeight
  }vh)`;

  constructor() {
    this.polygonEditor.attach(this.result.id);
  }

  protected changePolygonColor(color: string): void {
    this.polygonEditor.changeColor(color);
  }

  protected deleteSelectedPolygon(): void {
    this.polygonEditor.removeSelectedPolygon();
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
