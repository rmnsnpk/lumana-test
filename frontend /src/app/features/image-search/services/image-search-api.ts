import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../../../core/constants/api.constants';
import {
  BITMAP_FILES_FILTER,
  FEATURED_PICTURES_FILTER,
  FILE_NAMESPACE_ID,
  IMAGE_INFO_PROPERTIES,
  THUMBNAIL_WIDTH,
  TOTAL_HITS_SEARCH_LIMIT,
} from '../constants/image-search-api.constants';
import { SEARCH_BATCH_SIZE, SEARCH_FIRST_OFFSET } from '../constants/search.constants';
import { ApiSearchResponse } from '../interfaces/api-search-response.interface';
import { ImageSearchBatch } from '../interfaces/image-search-batch.interface';
import { toImageSearchBatch } from '../utils/image-search-result.mapper';

@Service()
export class ImageSearchApi {
  private readonly http = inject(HttpClient);

  search(query: string, offset = SEARCH_FIRST_OFFSET): Observable<ImageSearchBatch> {
    const searchTerm = `${query || FEATURED_PICTURES_FILTER} ${BITMAP_FILES_FILTER}`;

    let params = new HttpParams({
      fromObject: {
        action: 'query',
        generator: 'search',
        gsrsearch: searchTerm,
        gsrnamespace: FILE_NAMESPACE_ID,
        gsrlimit: SEARCH_BATCH_SIZE,
        gsroffset: offset,
        prop: 'imageinfo',
        iiprop: IMAGE_INFO_PROPERTIES,
        iiurlwidth: THUMBNAIL_WIDTH,
      },
    });

    if (offset === SEARCH_FIRST_OFFSET) {
      params = params
        .set('list', 'search')
        .set('srsearch', searchTerm)
        .set('srnamespace', FILE_NAMESPACE_ID)
        .set('srlimit', TOTAL_HITS_SEARCH_LIMIT)
        .set('srinfo', 'totalhits')
        .set('srprop', '');
    }

    return this.http.get<ApiSearchResponse>(API_URL, { params }).pipe(map(toImageSearchBatch));
  }
}
