import { CANVAS_CURSOR } from '../constants/polygon-editor.constants';

export type CanvasCursor = (typeof CANVAS_CURSOR)[keyof typeof CANVAS_CURSOR];
