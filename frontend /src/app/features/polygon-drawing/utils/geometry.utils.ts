import {
  RELATIVE_COORDINATE_MAX,
  RELATIVE_COORDINATE_MIN,
  ROTATE_HANDLE_OFFSET_PX,
} from '../constants/polygon-editor.constants';
import { BoundingBox } from '../interfaces/bounding-box.interface';
import { CanvasSize } from '../interfaces/canvas-size.interface';
import { Point } from '../interfaces/point.interface';

const CANVAS_ORIGIN = 0;
const QUARTER_TURN_RADIANS = Math.PI / 2;
const FULL_TURN_RADIANS = Math.PI * 2;
const ROTATION_SAMPLE_STEP_RADIANS = Math.PI / 180;
const ROTATION_BISECTION_ITERATIONS = 12;
const CANVAS_BOUNDS_TOLERANCE_PX = 0.001;
const SHOELACE_AREA_FACTOR = 0.5;
const CENTROID_DIVISOR_FACTOR = 6;

export const toRelativePoint = (point: Point, size: CanvasSize): Point => ({
  x: point.x / size.width,
  y: point.y / size.height,
});

export const toCanvasPoint = (point: Point, size: CanvasSize): Point => ({
  x: point.x * size.width,
  y: point.y * size.height,
});

export const distanceBetween = (first: Point, second: Point): number =>
  Math.hypot(first.x - second.x, first.y - second.y);

export const areRelativePointsNear = (
  first: Point,
  second: Point,
  maxDistancePx: number,
  size: CanvasSize,
): boolean =>
  distanceBetween(toCanvasPoint(first, size), toCanvasPoint(second, size)) <= maxDistancePx;

const getBoundingBox = (points: Point[]): BoundingBox => ({
  minX: Math.min(...points.map(({ x }) => x)),
  minY: Math.min(...points.map(({ y }) => y)),
  maxX: Math.max(...points.map(({ x }) => x)),
  maxY: Math.max(...points.map(({ y }) => y)),
});

// Ray casting; scaling both axes does not change the result, so relative points work as well.
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean =>
  polygon.reduce((isInside, current, index) => {
    const previous = polygon.at(index - 1)!;
    const crossesRay =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    return crossesRay ? !isInside : isInside;
  }, false);

const vertexAverage = (points: Point[]): Point => ({
  x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
  y: points.reduce((sum, { y }) => sum + y, 0) / points.length,
});

// Area centroid stays fixed while the polygon rotates, unlike the bounding box centre.
export const getPolygonCentroid = (points: Point[]): Point => {
  let doubledArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  points.forEach((current, index) => {
    const previous = points.at(index - 1)!;
    const cross = previous.x * current.y - current.x * previous.y;
    doubledArea += cross;
    centroidX += (previous.x + current.x) * cross;
    centroidY += (previous.y + current.y) * cross;
  });

  const area = doubledArea * SHOELACE_AREA_FACTOR;
  if (!area) {
    return vertexAverage(points);
  }

  const divisor = CENTROID_DIVISOR_FACTOR * area;
  return { x: centroidX / divisor, y: centroidY / divisor };
};

export const angleFromCenter = (center: Point, point: Point): number =>
  Math.atan2(point.y - center.y, point.x - center.x);

export const rotatePoints = (points: Point[], center: Point, angle: number): Point[] => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return points.map(({ x, y }) => {
    const offsetX = x - center.x;
    const offsetY = y - center.y;
    return {
      x: center.x + offsetX * cos - offsetY * sin,
      y: center.y + offsetX * sin + offsetY * cos,
    };
  });
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// Moves relative points while keeping the whole polygon inside the image.
export const translateWithinBounds = (points: Point[], offset: Point): Point[] => {
  const { minX, minY, maxX, maxY } = getBoundingBox(points);
  const offsetX = clamp(offset.x, RELATIVE_COORDINATE_MIN - minX, RELATIVE_COORDINATE_MAX - maxX);
  const offsetY = clamp(offset.y, RELATIVE_COORDINATE_MIN - minY, RELATIVE_COORDINATE_MAX - maxY);

  return points.map(({ x, y }) => ({ x: x + offsetX, y: y + offsetY }));
};

// Wraps an angle into the [-π, π] range.
export const normalizeAngle = (angle: number): number =>
  angle - FULL_TURN_RADIANS * Math.round(angle / FULL_TURN_RADIANS);

export const arePointsWithinCanvas = (canvasPoints: Point[], size: CanvasSize): boolean =>
  canvasPoints.every(
    ({ x, y }) =>
      x >= CANVAS_ORIGIN - CANVAS_BOUNDS_TOLERANCE_PX &&
      x <= size.width + CANVAS_BOUNDS_TOLERANCE_PX &&
      y >= CANVAS_ORIGIN - CANVAS_BOUNDS_TOLERANCE_PX &&
      y <= size.height + CANVAS_BOUNDS_TOLERANCE_PX,
  );

// Turns from `fromAngle` towards `toAngle` and stops where the polygon would first leave the canvas.
// The arc is sampled so a fast pointer move cannot jump over a position that sticks out.
export const limitRotationWithinCanvas = (
  canvasPoints: Point[],
  center: Point,
  fromAngle: number,
  toAngle: number,
  size: CanvasSize,
): number => {
  const fits = (angle: number): boolean =>
    arePointsWithinCanvas(rotatePoints(canvasPoints, center, angle), size);

  const span = toAngle - fromAngle;
  const sampleCount = Math.max(1, Math.ceil(Math.abs(span) / ROTATION_SAMPLE_STEP_RADIANS));
  let validAngle = fromAngle;

  for (let sample = 1; sample <= sampleCount; sample++) {
    const angle = fromAngle + (span * sample) / sampleCount;
    if (!fits(angle)) {
      let invalidAngle = angle;
      for (let iteration = 0; iteration < ROTATION_BISECTION_ITERATIONS; iteration++) {
        const middleAngle = (validAngle + invalidAngle) / 2;
        if (fits(middleAngle)) {
          validAngle = middleAngle;
        } else {
          invalidAngle = middleAngle;
        }
      }
      return validAngle;
    }
    validAngle = angle;
  }

  return toAngle;
};

// The handle sits on an arm from the centroid that turns with the polygon and stays on the canvas.
export const getRotateHandlePosition = (
  canvasPoints: Point[],
  rotation: number,
  size: CanvasSize,
): Point => {
  const center = getPolygonCentroid(canvasPoints);
  const armLength =
    Math.max(...canvasPoints.map((point) => distanceBetween(center, point))) +
    ROTATE_HANDLE_OFFSET_PX;
  const direction = rotation - QUARTER_TURN_RADIANS;

  return {
    x: clamp(center.x + armLength * Math.cos(direction), CANVAS_ORIGIN, size.width),
    y: clamp(center.y + armLength * Math.sin(direction), CANVAS_ORIGIN, size.height),
  };
};
