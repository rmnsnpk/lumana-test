export interface ImageSearchResult {
  id: number;
  title: string;
  thumbnailUrl: string;
  retinaThumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  previewUrl: string;
  imageWidth: number;
  imageHeight: number;
}
