import { Point } from './point.interface';

export interface Polygon {
  id: string;
  imageId: number;
  points: Point[];
  color: string;
  rotation: number;
  createdAt: number;
}
