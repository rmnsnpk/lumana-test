import {
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
} from './geometry.utils';
import { ROTATE_HANDLE_OFFSET_PX } from '../constants/polygon-editor.constants';

const size = { width: 400, height: 200 };

describe('geometry utils', () => {
  it('converts between canvas pixels and relative coordinates', () => {
    const relative = toRelativePoint({ x: 100, y: 50 }, size);

    expect(relative).toEqual({ x: 0.25, y: 0.25 });
    expect(toCanvasPoint(relative, size)).toEqual({ x: 100, y: 50 });
  });

  it('keeps the same relative point when the canvas is resized', () => {
    const relative = toRelativePoint({ x: 100, y: 50 }, size);

    expect(toCanvasPoint(relative, { width: 800, height: 400 })).toEqual({ x: 200, y: 100 });
  });

  it('measures the distance between two points', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('detects whether a point lies inside a polygon', () => {
    expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(isPointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });

  it('finds the area centroid of a polygon', () => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 4 },
      { x: 0, y: 4 },
    ];
    const centroid = getPolygonCentroid(lShape);

    // A 4x1 bar centred at (2, 0.5) plus a 1x3 bar centred at (0.5, 2.5), weighted by area.
    const expected = (4 * 2 + 3 * 0.5) / 7;
    expect(centroid.x).toBeCloseTo(expected);
    expect(centroid.y).toBeCloseTo(expected);
  });

  it('rotates points around a centre while keeping their distance to it', () => {
    const [rotated] = rotatePoints([{ x: 10, y: 0 }], { x: 0, y: 0 }, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(10);
  });

  it('keeps a moved polygon inside the image', () => {
    const polygon = [
      { x: 0.7, y: 0.2 },
      { x: 0.9, y: 0.2 },
      { x: 0.8, y: 0.4 },
    ];
    const moved = translateWithinBounds(polygon, { x: 0.5, y: -0.5 });

    expect(Math.max(...moved.map(({ x }) => x))).toBeCloseTo(1);
    expect(Math.min(...moved.map(({ y }) => y))).toBeCloseTo(0);
  });

  it('places the rotate handle on an arm that turns with the polygon', () => {
    const canvas = { width: 200, height: 200 };
    const centred = square.map(({ x, y }) => ({ x: x + 95, y: y + 95 }));
    const armLength = Math.hypot(5, 5) + ROTATE_HANDLE_OFFSET_PX;

    const upright = getRotateHandlePosition(centred, 0, canvas);
    const turned = getRotateHandlePosition(centred, Math.PI / 2, canvas);

    expect(upright.x).toBeCloseTo(100);
    expect(upright.y).toBeCloseTo(100 - armLength);
    expect(turned.x).toBeCloseTo(100 + armLength);
    expect(turned.y).toBeCloseTo(100);
  });

  it('keeps the rotate handle on the canvas', () => {
    const handle = getRotateHandlePosition(square, 0, { width: 200, height: 200 });

    expect(handle.y).toBe(0);
  });

  it('wraps angles into the [-π, π] range', () => {
    expect(normalizeAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
    expect(normalizeAngle(Math.PI / 4)).toBeCloseTo(Math.PI / 4);
  });

  describe('limitRotationWithinCanvas', () => {
    const canvas = { width: 200, height: 100 };
    // A wide bar whose ends hit the top and bottom edges once it turns about 34°.
    const bar = [
      { x: 20, y: 45 },
      { x: 180, y: 45 },
      { x: 180, y: 55 },
      { x: 20, y: 55 },
    ];
    const center = { x: 100, y: 50 };

    it('allows the rotation when the polygon stays inside the canvas', () => {
      const smallSquare = square.map(({ x, y }) => ({ x: x + 95, y: y + 45 }));

      expect(limitRotationWithinCanvas(smallSquare, center, 0, Math.PI / 3, canvas)).toBe(
        Math.PI / 3,
      );
    });

    it('stops at the angle where the polygon touches the canvas edge', () => {
      const angle = limitRotationWithinCanvas(bar, center, 0, Math.PI / 2, canvas);
      const rotated = rotatePoints(bar, center, angle);

      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(Math.PI / 2);
      expect(Math.max(...rotated.map(({ x }) => x))).toBeLessThanOrEqual(200);
      expect(Math.max(...rotated.map(({ y }) => y))).toBeCloseTo(100, 1);
    });

    it('does not jump over an invalid position on a fast pointer move', () => {
      const angle = limitRotationWithinCanvas(bar, center, 0, Math.PI, canvas);

      expect(angle).toBeLessThan(Math.PI / 2);
    });
  });
});
