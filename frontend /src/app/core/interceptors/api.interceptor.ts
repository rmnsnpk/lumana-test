import { HttpInterceptorFn } from '@angular/common/http';

import { API_URL, API_DEFAULT_PARAMS } from '../constants/api.constants';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_URL)) {
    return next(request);
  }

  return next(request.clone({ setParams: API_DEFAULT_PARAMS }));
};
