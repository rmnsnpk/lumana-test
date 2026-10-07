import { Point } from './point.interface';

interface PolygonDragInteraction {
  kind: 'drag';
  polygonId: string;
  startPointer: Point;
  originalPoints: Point[];
  rotation: number;
}

export interface PolygonRotateInteraction {
  kind: 'rotate';
  polygonId: string;
  startAngle: number;
  originalRotation: number;
  center: Point;
  originalCanvasPoints: Point[];
}

export type PolygonInteraction = PolygonDragInteraction | PolygonRotateInteraction;
