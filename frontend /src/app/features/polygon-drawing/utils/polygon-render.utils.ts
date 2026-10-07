import { FIRST_POINT_INDEX } from '../constants/polygon-editor.constants';
import {
  CLOSING_VERTEX_RADIUS_PX,
  DRAFT_POLYGON_STYLE,
  FULL_CIRCLE_RADIANS,
  POLYGON_FILL_ALPHA_HEX,
  POLYGON_STROKE_WIDTH_PX,
  POLYGON_VERTEX_RADIUS_PX,
  ROTATE_HANDLE_RADIUS_PX,
  ROTATE_HANDLE_OUTLINE_COLOR,
  ROTATION_PIVOT_RADIUS_PX,
  SELECTED_POLYGON_STROKE_WIDTH_PX,
} from '../constants/polygon-style.constants';
import { CanvasSize } from '../interfaces/canvas-size.interface';
import { Point } from '../interfaces/point.interface';
import { PolygonStyle } from '../interfaces/polygon-style.interface';
import { getPolygonCentroid, getRotateHandlePosition, toCanvasPoint } from './geometry.utils';

const NO_DASH: number[] = [];

export const toPolygonStyle = (color: string): PolygonStyle => ({
  stroke: color,
  fill: `${color}${POLYGON_FILL_ALPHA_HEX}`,
});

const tracePath = (context: CanvasRenderingContext2D, points: Point[], size: CanvasSize) => {
  context.beginPath();
  points
    .map((point) => toCanvasPoint(point, size))
    .forEach(({ x, y }, index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
};

const drawVertex = (context: CanvasRenderingContext2D, point: Point, radius: number) => {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, FULL_CIRCLE_RADIANS);
  context.fill();
  context.stroke();
};

export const drawPolygon = (
  context: CanvasRenderingContext2D,
  points: Point[],
  size: CanvasSize,
  style: PolygonStyle,
  isSelected: boolean,
): void => {
  context.setLineDash(NO_DASH);
  context.lineWidth = isSelected ? SELECTED_POLYGON_STROKE_WIDTH_PX : POLYGON_STROKE_WIDTH_PX;
  context.strokeStyle = style.stroke;
  context.fillStyle = style.fill;

  tracePath(context, points, size);
  context.closePath();
  context.fill();
  context.stroke();

  if (isSelected) {
    context.fillStyle = style.stroke;
    points
      .map((point) => toCanvasPoint(point, size))
      .forEach((point) => drawVertex(context, point, POLYGON_VERTEX_RADIUS_PX));
  }
};

export const drawRotateHandle = (
  context: CanvasRenderingContext2D,
  points: Point[],
  rotation: number,
  size: CanvasSize,
  color: string,
): void => {
  const canvasPoints = points.map((point) => toCanvasPoint(point, size));
  const pivot = getPolygonCentroid(canvasPoints);
  const handle = getRotateHandlePosition(canvasPoints, rotation, size);

  context.setLineDash(NO_DASH);
  context.lineWidth = POLYGON_STROKE_WIDTH_PX;
  context.strokeStyle = color;
  context.fillStyle = color;

  context.beginPath();
  context.moveTo(pivot.x, pivot.y);
  context.lineTo(handle.x, handle.y);
  context.stroke();
  drawVertex(context, pivot, ROTATION_PIVOT_RADIUS_PX);

  context.strokeStyle = ROTATE_HANDLE_OUTLINE_COLOR;
  drawVertex(context, handle, ROTATE_HANDLE_RADIUS_PX);
};

export const drawDraftPolygon = (
  context: CanvasRenderingContext2D,
  points: Point[],
  cursor: Point | null,
  isClosable: boolean,
  size: CanvasSize,
): void => {
  const path = cursor ? [...points, cursor] : points;

  context.lineWidth = POLYGON_STROKE_WIDTH_PX;
  context.strokeStyle = DRAFT_POLYGON_STYLE.stroke;
  context.fillStyle = DRAFT_POLYGON_STYLE.fill;
  context.setLineDash([...DRAFT_POLYGON_STYLE.dash]);

  tracePath(context, path, size);
  context.fill();
  context.stroke();

  context.setLineDash(NO_DASH);
  points
    .map((point) => toCanvasPoint(point, size))
    .forEach((point, index) =>
      drawVertex(
        context,
        point,
        index === FIRST_POINT_INDEX && isClosable
          ? CLOSING_VERTEX_RADIUS_PX
          : POLYGON_VERTEX_RADIUS_PX,
      ),
    );
};
