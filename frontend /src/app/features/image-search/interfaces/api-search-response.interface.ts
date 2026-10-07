interface ApiImageInfo {
  width: number;
  height: number;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  responsiveUrls?: Record<string, string>;
}

export interface ApiImagePage {
  pageid: number;
  title: string;
  index: number;
  imageinfo?: ApiImageInfo[];
}

export interface ApiSearchResponse {
  continue?: {
    gsroffset?: number;
  };
  query?: {
    pages?: ApiImagePage[];
    searchinfo?: {
      totalhits: number;
    };
  };
}
