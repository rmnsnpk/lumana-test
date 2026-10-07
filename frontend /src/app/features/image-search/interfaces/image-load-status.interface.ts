import { IMAGE_LOAD_STATUS } from '../constants/image-preview.constants';

export type ImageLoadStatus = (typeof IMAGE_LOAD_STATUS)[keyof typeof IMAGE_LOAD_STATUS];
