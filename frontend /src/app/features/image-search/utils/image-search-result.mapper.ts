import {
  FILE_EXTENSION_PATTERN,
  FILE_NAME_SEPARATOR_PATTERN,
  FILE_TITLE_PREFIX,
  PREVIEW_IMAGE_WIDTH,
  RETINA_THUMBNAIL_KEY,
  THUMBNAIL_WIDTH_SEGMENT_PATTERN,
} from '../constants/image-search-api.constants';
import { ApiImagePage, ApiSearchResponse } from '../interfaces/api-search-response.interface';
import { ImageSearchBatch } from '../interfaces/image-search-batch.interface';
import { ImageSearchResult } from '../interfaces/image-search-result.interface';

const toDisplayTitle = (fileTitle: string): string =>
  fileTitle
    .replace(FILE_TITLE_PREFIX, '')
    .replace(FILE_EXTENSION_PATTERN, '')
    .replace(FILE_NAME_SEPARATOR_PATTERN, ' ')
    .trim();

const toPreviewUrl = (thumbnailUrl: string): string =>
  thumbnailUrl.replace(THUMBNAIL_WIDTH_SEGMENT_PATTERN, `$1${PREVIEW_IMAGE_WIDTH}px-`);

const toImageSearchResult = (page: ApiImagePage): ImageSearchResult | null => {
  const imageInfo = page.imageinfo?.[0];
  if (!imageInfo?.thumburl) {
    return null;
  }

  return {
    id: page.pageid,
    title: toDisplayTitle(page.title),
    thumbnailUrl: imageInfo.thumburl,
    retinaThumbnailUrl: imageInfo.responsiveUrls?.[RETINA_THUMBNAIL_KEY] ?? null,
    thumbnailWidth: imageInfo.thumbwidth ?? imageInfo.width,
    thumbnailHeight: imageInfo.thumbheight ?? imageInfo.height,
    previewUrl: toPreviewUrl(imageInfo.thumburl),
    imageWidth: imageInfo.width,
    imageHeight: imageInfo.height,
  };
};

export const toImageSearchBatch = (response: ApiSearchResponse): ImageSearchBatch => {
  const pages = [...(response.query?.pages ?? [])].sort(
    (first, second) => first.index - second.index,
  );

  return {
    results: pages
      .map(toImageSearchResult)
      .filter((result): result is ImageSearchResult => result !== null),
    nextOffset: response.continue?.gsroffset ?? null,
    totalHits: response.query?.searchinfo?.totalhits ?? null,
  };
};
