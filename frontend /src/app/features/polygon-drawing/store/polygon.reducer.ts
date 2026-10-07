import { createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';

import { POLYGONS_FEATURE_KEY } from '../constants/polygon-store.constants';
import { Polygon } from '../interfaces/polygon.interface';
import { PolygonsState } from '../interfaces/polygons-state.interface';
import { PolygonActions } from './polygon.actions';

export const polygonsAdapter = createEntityAdapter<Polygon>({
  sortComparer: (first, second) => first.createdAt - second.createdAt,
});

const initialState: PolygonsState = polygonsAdapter.getInitialState();

export const polygonsFeature = createFeature({
  name: POLYGONS_FEATURE_KEY,
  reducer: createReducer(
    initialState,
    on(PolygonActions.polygonAdded, (state, { polygon }) => polygonsAdapter.addOne(polygon, state)),
    on(PolygonActions.polygonUpdated, (state, { id, points, rotation }) =>
      polygonsAdapter.updateOne({ id, changes: { points, rotation } }, state),
    ),
    on(PolygonActions.polygonRecolored, (state, { id, color }) =>
      polygonsAdapter.updateOne({ id, changes: { color } }, state),
    ),
    on(PolygonActions.polygonRemoved, (state, { id }) => polygonsAdapter.removeOne(id, state)),
  ),
});
