import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import {
  FIRST_POINT_INDEX,
  INITIAL_ROTATION_RADIANS,
  MIN_POLYGON_POINTS,
} from '../constants/polygon-editor.constants';
import { DEFAULT_POLYGON_COLOR } from '../constants/polygon-style.constants';
import { Point } from '../interfaces/point.interface';
import { Polygon } from '../interfaces/polygon.interface';
import { PolygonActions } from '../store/polygon.actions';
import { selectImagePolygons } from '../store/polygon.selectors';

@Injectable()
export class PolygonEditor {
  private readonly store = inject(Store);
  private readonly imageId = signal<number | null>(null);
  private readonly imagePolygons = signal<Signal<Polygon[]> | null>(null);
  private readonly drawColor = signal(DEFAULT_POLYGON_COLOR);

  readonly draftPoints = signal<Point[]>([]);
  readonly selectedPolygonId = signal<string | null>(null);

  readonly polygons = computed<Polygon[]>(() => this.imagePolygons()?.() ?? []);

  readonly selectedPolygon = computed(
    () => this.polygons().find(({ id }) => id === this.selectedPolygonId()) ?? null,
  );

  readonly activeColor = computed(() => this.selectedPolygon()?.color ?? this.drawColor());

  readonly hasDraft = computed(() => this.draftPoints().length > 0);
  readonly canClosePolygon = computed(() => this.draftPoints().length >= MIN_POLYGON_POINTS);

  attach(imageId: number): void {
    this.imageId.set(imageId);
    this.imagePolygons.set(this.store.selectSignal(selectImagePolygons(imageId)));
  }

  addDraftPoint(point: Point): void {
    this.selectedPolygonId.set(null);
    this.draftPoints.update((points) => [...points, point]);
  }

  removeLastDraftPoint(): void {
    this.draftPoints.update((points) => points.slice(FIRST_POINT_INDEX, -1));
  }

  cancelDraft(): void {
    this.draftPoints.set([]);
  }

  closeDraft(): void {
    const imageId = this.imageId();
    if (imageId === null || !this.canClosePolygon()) {
      return;
    }

    this.store.dispatch(
      PolygonActions.polygonAdded({
        polygon: {
          id: crypto.randomUUID(),
          imageId,
          points: this.draftPoints(),
          color: this.drawColor(),
          rotation: INITIAL_ROTATION_RADIANS,
          createdAt: Date.now(),
        },
      }),
    );
    this.draftPoints.set([]);
  }

  selectPolygon(id: string | null): void {
    this.selectedPolygonId.set(id);
  }

  updatePolygon(id: string, points: Point[], rotation: number): void {
    this.store.dispatch(PolygonActions.polygonUpdated({ id, points, rotation }));
  }

  changeColor(color: string): void {
    this.drawColor.set(color);

    const id = this.selectedPolygonId();
    if (id) {
      this.store.dispatch(PolygonActions.polygonRecolored({ id, color }));
    }
  }

  removeSelectedPolygon(): void {
    const id = this.selectedPolygonId();
    if (id) {
      this.store.dispatch(PolygonActions.polygonRemoved({ id }));
      this.selectedPolygonId.set(null);
    }
  }
}
