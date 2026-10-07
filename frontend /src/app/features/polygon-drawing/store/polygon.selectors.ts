import { createSelector } from '@ngrx/store';

import { polygonsAdapter, polygonsFeature } from './polygon.reducer';

const { selectAll } = polygonsAdapter.getSelectors();

const selectAllPolygons = createSelector(polygonsFeature.selectPolygonsState, selectAll);

export const selectImagePolygons = (imageId: number) =>
  createSelector(selectAllPolygons, (polygons) =>
    polygons.filter((polygon) => polygon.imageId === imageId),
  );
