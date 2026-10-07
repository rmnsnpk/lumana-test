import { Polygon } from '../interfaces/polygon.interface';
import { PolygonsState } from '../interfaces/polygons-state.interface';
import { PolygonActions } from './polygon.actions';
import { polygonsFeature } from './polygon.reducer';
import { selectImagePolygons } from './polygon.selectors';

const { reducer, name } = polygonsFeature;

const createPolygon = (id: string, imageId: number, createdAt: number): Polygon => ({
  id,
  imageId,
  createdAt,
  color: '#7c6cff',
  rotation: 0,
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.5, y: 0.1 },
    { x: 0.3, y: 0.4 },
  ],
});

const addAll = (...polygons: Polygon[]): PolygonsState =>
  polygons.reduce<PolygonsState | undefined>(
    (state, polygon) => reducer(state, PolygonActions.polygonAdded({ polygon })),
    undefined,
  )!;

const selectFor = (state: PolygonsState, imageId: number) =>
  selectImagePolygons(imageId)({ [name]: state });

describe('polygons reducer', () => {
  it('returns the polygons of one image in drawing order', () => {
    const state = addAll(
      createPolygon('b', 1, 2),
      createPolygon('c', 2, 3),
      createPolygon('a', 1, 1),
    );

    expect(selectFor(state, 1).map(({ id }) => id)).toEqual(['a', 'b']);
    expect(selectFor(state, 2).map(({ id }) => id)).toEqual(['c']);
  });

  it('replaces the points of a moved or rotated polygon', () => {
    const points = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ];
    const state = reducer(
      addAll(createPolygon('a', 1, 1)),
      PolygonActions.polygonUpdated({ id: 'a', points, rotation: 1 }),
    );

    expect(state.entities['a']).toEqual(expect.objectContaining({ points, rotation: 1 }));
  });

  it('changes the colour of a polygon', () => {
    const state = reducer(
      addAll(createPolygon('a', 1, 1)),
      PolygonActions.polygonRecolored({ id: 'a', color: '#ff0000' }),
    );

    expect(state.entities['a']?.color).toBe('#ff0000');
  });

  it('removes a polygon', () => {
    const state = reducer(
      addAll(createPolygon('a', 1, 1), createPolygon('b', 1, 2)),
      PolygonActions.polygonRemoved({ id: 'a' }),
    );

    expect(state.ids).toEqual(['b']);
  });
});
