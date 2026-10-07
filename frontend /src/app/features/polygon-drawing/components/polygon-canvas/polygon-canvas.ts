import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import {
  CANVAS_CURSOR,
  CLOSE_POLYGON_DISTANCE_PX,
  DUPLICATE_POINT_DISTANCE_PX,
  FIRST_POINT_INDEX,
  ROTATE_HANDLE_HIT_RADIUS_PX,
} from '../../constants/polygon-editor.constants';
import { CanvasCursor } from '../../interfaces/canvas-cursor.interface';
import { CanvasSize } from '../../interfaces/canvas-size.interface';
import { Point } from '../../interfaces/point.interface';
import { Polygon } from '../../interfaces/polygon.interface';
import {
  PolygonInteraction,
  PolygonRotateInteraction,
} from '../../interfaces/polygon-interaction.interface';
import { PolygonEditor } from '../../services/polygon-editor';
import {
  angleFromCenter,
  areRelativePointsNear,
  distanceBetween,
  getPolygonCentroid,
  getRotateHandlePosition,
  isPointInPolygon,
  limitRotationWithinCanvas,
  normalizeAngle,
  rotatePoints,
  toCanvasPoint,
  toRelativePoint,
  translateWithinBounds,
} from '../../utils/geometry.utils';
import {
  drawDraftPolygon,
  drawPolygon,
  drawRotateHandle,
  toPolygonStyle,
} from '../../utils/polygon-render.utils';

@Component({
  selector: 'app-polygon-canvas',
  templateUrl: './polygon-canvas.html',
  styleUrl: './polygon-canvas.scss',
})
export class PolygonCanvas {
  private readonly editor = inject(PolygonEditor);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly size = signal<CanvasSize>({ width: 0, height: 0 });
  private readonly cursor = signal<Point | null>(null);
  private readonly interaction = signal<PolygonInteraction | null>(null);
  private readonly transformPreview = signal<Pick<Polygon, 'id' | 'points' | 'rotation'> | null>(
    null,
  );

  private readonly displayedPolygons = computed(() => {
    const preview = this.transformPreview();
    return this.editor
      .polygons()
      .map((polygon) => (polygon.id === preview?.id ? { ...polygon, ...preview } : polygon));
  });

  private readonly displayedSelection = computed(
    () => this.displayedPolygons().find(({ id }) => id === this.editor.selectedPolygonId()) ?? null,
  );

  private readonly isCursorOnFirstPoint = computed(() => {
    const cursor = this.cursor();
    const firstPoint = this.editor.draftPoints()[FIRST_POINT_INDEX];
    if (!cursor || !firstPoint || !this.editor.canClosePolygon()) {
      return false;
    }

    return areRelativePointsNear(cursor, firstPoint, CLOSE_POLYGON_DISTANCE_PX, this.size());
  });

  protected readonly cursorStyle = computed<CanvasCursor>(() => {
    const interaction = this.interaction();
    if (interaction) {
      return interaction.kind === 'rotate' ? CANVAS_CURSOR.rotating : CANVAS_CURSOR.move;
    }

    const cursor = this.cursor();
    if (!cursor || this.editor.hasDraft()) {
      return CANVAS_CURSOR.draw;
    }
    if (this.isOnRotateHandle(cursor, this.size())) {
      return CANVAS_CURSOR.rotate;
    }
    return this.findPolygonAt(cursor) ? CANVAS_CURSOR.move : CANVAS_CURSOR.draw;
  });

  constructor() {
    this.observeSize();

    afterRenderEffect(() => {
      const size = this.size();
      const polygons = this.displayedPolygons();
      const selectedId = this.editor.selectedPolygonId();
      const selection = this.displayedSelection();
      const draftPoints = this.editor.draftPoints();
      const cursor = this.cursor();
      const isClosable = this.isCursorOnFirstPoint();

      const context = this.prepareContext(size);
      if (!context) {
        return;
      }

      polygons.forEach(({ id, points, color }) =>
        drawPolygon(context, points, size, toPolygonStyle(color), id === selectedId),
      );
      if (selection) {
        drawRotateHandle(context, selection.points, selection.rotation, size, selection.color);
      }
      if (draftPoints.length) {
        drawDraftPolygon(context, draftPoints, cursor, isClosable, size);
      }
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    const bounds = this.canvas().nativeElement.getBoundingClientRect();
    const point = this.toRelative(event, bounds);

    if (this.editor.hasDraft()) {
      this.continueDraft(point, bounds);
      return;
    }

    const selection = this.editor.selectedPolygon();
    if (selection && this.isOnRotateHandle(point, bounds)) {
      this.startRotation(event, selection, point, bounds);
      return;
    }

    const polygon = this.findPolygonAt(point);
    if (polygon) {
      this.editor.selectPolygon(polygon.id);
      this.startDrag(event, polygon, point);
      return;
    }

    this.editor.addDraftPoint(point);
  }

  protected onPointerMove(event: PointerEvent): void {
    const bounds = this.canvas().nativeElement.getBoundingClientRect();
    const point = this.toRelative(event, bounds);
    this.cursor.set(point);

    const interaction = this.interaction();
    if (interaction?.kind === 'drag') {
      this.transformPreview.set({
        id: interaction.polygonId,
        points: translateWithinBounds(interaction.originalPoints, {
          x: point.x - interaction.startPointer.x,
          y: point.y - interaction.startPointer.y,
        }),
        rotation: interaction.rotation,
      });
    } else if (interaction?.kind === 'rotate') {
      const angleDelta = this.limitRotation(
        interaction,
        angleFromCenter(interaction.center, toCanvasPoint(point, bounds)) - interaction.startAngle,
        bounds,
      );
      const rotatedPoints = rotatePoints(
        interaction.originalCanvasPoints,
        interaction.center,
        angleDelta,
      );
      this.transformPreview.set({
        id: interaction.polygonId,
        points: rotatedPoints.map((rotatedPoint) => toRelativePoint(rotatedPoint, bounds)),
        rotation: interaction.originalRotation + angleDelta,
      });
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const preview = this.transformPreview();
    if (preview) {
      this.editor.updatePolygon(preview.id, preview.points, preview.rotation);
    }

    this.interaction.set(null);
    this.transformPreview.set(null);
    this.canvas().nativeElement.releasePointerCapture(event.pointerId);
  }

  protected onPointerLeave(): void {
    if (!this.interaction()) {
      this.cursor.set(null);
    }
  }

  protected onDoubleClick(): void {
    this.editor.closeDraft();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const hasDraft = this.editor.hasDraft();
    const hasSelection = !!this.editor.selectedPolygonId();

    switch (event.key) {
      case 'Enter':
        this.editor.closeDraft();
        break;
      case 'Backspace':
      case 'Delete':
        if (hasDraft) {
          this.editor.removeLastDraftPoint();
        } else {
          this.editor.removeSelectedPolygon();
        }
        break;
      case 'Escape':
        if (!hasDraft && !hasSelection) {
          return;
        }
        event.stopPropagation();
        this.editor.cancelDraft();
        this.editor.selectPolygon(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private continueDraft(point: Point, size: CanvasSize): void {
    const draftPoints = this.editor.draftPoints();
    const firstPoint = draftPoints[FIRST_POINT_INDEX];
    const lastPoint = draftPoints.at(-1);

    if (
      this.editor.canClosePolygon() &&
      areRelativePointsNear(point, firstPoint, CLOSE_POLYGON_DISTANCE_PX, size)
    ) {
      this.editor.closeDraft();
      return;
    }

    if (!lastPoint || !areRelativePointsNear(point, lastPoint, DUPLICATE_POINT_DISTANCE_PX, size)) {
      this.editor.addDraftPoint(point);
    }
  }

  private startDrag(event: PointerEvent, polygon: Polygon, point: Point): void {
    this.canvas().nativeElement.setPointerCapture(event.pointerId);
    this.interaction.set({
      kind: 'drag',
      polygonId: polygon.id,
      startPointer: point,
      originalPoints: polygon.points,
      rotation: polygon.rotation,
    });
  }

  private startRotation(
    event: PointerEvent,
    polygon: Polygon,
    point: Point,
    size: CanvasSize,
  ): void {
    const canvasPoints = polygon.points.map((polygonPoint) => toCanvasPoint(polygonPoint, size));
    const center = getPolygonCentroid(canvasPoints);

    this.canvas().nativeElement.setPointerCapture(event.pointerId);
    this.interaction.set({
      kind: 'rotate',
      polygonId: polygon.id,
      center,
      startAngle: angleFromCenter(center, toCanvasPoint(point, size)),
      originalRotation: polygon.rotation,
      originalCanvasPoints: canvasPoints,
    });
  }

  // Continues from the currently shown angle, so the polygon stops at the canvas edge instead of
  // jumping across the ±π wrap of atan2.
  private limitRotation(
    interaction: PolygonRotateInteraction,
    requestedDelta: number,
    size: CanvasSize,
  ): number {
    const preview = this.transformPreview();
    const currentDelta = preview ? preview.rotation - interaction.originalRotation : 0;
    const targetDelta = currentDelta + normalizeAngle(requestedDelta - currentDelta);

    return limitRotationWithinCanvas(
      interaction.originalCanvasPoints,
      interaction.center,
      currentDelta,
      targetDelta,
      size,
    );
  }

  private findPolygonAt(point: Point): Polygon | null {
    const topmostFirst = [...this.editor.polygons()].reverse();
    return topmostFirst.find(({ points }) => isPointInPolygon(point, points)) ?? null;
  }

  private isOnRotateHandle(point: Point, size: CanvasSize): boolean {
    const selection = this.editor.selectedPolygon();
    if (!selection) {
      return false;
    }

    const handle = getRotateHandlePosition(
      selection.points.map((polygonPoint) => toCanvasPoint(polygonPoint, size)),
      selection.rotation,
      size,
    );
    return distanceBetween(toCanvasPoint(point, size), handle) <= ROTATE_HANDLE_HIT_RADIUS_PX;
  }

  private toRelative(event: PointerEvent, bounds: DOMRect): Point {
    return toRelativePoint(
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      bounds,
    );
  }

  private prepareContext(size: CanvasSize): CanvasRenderingContext2D | null {
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return context;
  }

  private observeSize(): void {
    const destroyRef = inject(DestroyRef);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    const observer = new ResizeObserver(([entry]) =>
      this.size.set({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(host);
    destroyRef.onDestroy(() => observer.disconnect());
  }
}
