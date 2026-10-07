import { ApiImagePage, ApiSearchResponse } from '../interfaces/api-search-response.interface';
import { toImageSearchBatch } from './image-search-result.mapper';

const createPage = (pageid: number, index: number, title: string): ApiImagePage => ({
  pageid,
  index,
  title,
  imageinfo: [
    {
      width: 4000,
      height: 3000,
      thumburl: `https://example.org/thumb/${pageid}.jpg/120px-${pageid}.jpg`,
      thumbwidth: 120,
      thumbheight: 90,
      responsiveUrls: { '2': `https://example.org/${pageid}-thumb@2x.jpg` },
    },
  ],
});

describe('toImageSearchBatch', () => {
  it('orders results by relevance index and cleans file titles', () => {
    const response: ApiSearchResponse = {
      continue: { gsroffset: 30 },
      query: {
        pages: [
          createPage(2, 2, 'File:Second_photo.png'),
          createPage(1, 1, 'File:First_photo.jpg'),
        ],
        searchinfo: { totalhits: 500 },
      },
    };

    const batch = toImageSearchBatch(response);

    expect(batch.results.map((result) => result.title)).toEqual(['First photo', 'Second photo']);
    expect(batch.results[0].retinaThumbnailUrl).toBe('https://example.org/1-thumb@2x.jpg');
    expect(batch.results[0].previewUrl).toBe('https://example.org/thumb/1.jpg/1280px-1.jpg');
    expect(batch.nextOffset).toBe(30);
    expect(batch.totalHits).toBe(500);
  });

  it('skips pages without a thumbnail', () => {
    const response: ApiSearchResponse = {
      query: { pages: [{ pageid: 3, index: 1, title: 'File:Broken.jpg' }] },
    };

    expect(toImageSearchBatch(response).results).toEqual([]);
  });

  it('returns an empty batch when nothing matches', () => {
    expect(toImageSearchBatch({})).toEqual({ results: [], nextOffset: null, totalHits: null });
  });
});
