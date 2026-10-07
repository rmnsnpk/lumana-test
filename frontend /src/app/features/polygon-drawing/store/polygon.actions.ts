import { createActionGroup, props } from '@ngrx/store';

import { Point } from '../interfaces/point.interface';
import { Polygon } from '../interfaces/polygon.interface';

export const PolygonActions = createActionGroup({
  source: 'Polygons',
  events: {
    'Polygon Added': props<{ polygon: Polygon }>(),
    'Polygon Updated': props<{ id: string; points: Point[]; rotation: number }>(),
    'Polygon Recolored': props<{ id: string; color: string }>(),
    'Polygon Removed': props<{ id: string }>(),
  },
});
