import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

import {
  HTTP_RETRY_BASE_DELAY_MS,
  HTTP_RETRY_COUNT,
  HTTP_STATUS,
} from '../constants/http.constants';

const isRetryableError = (error: unknown): boolean =>
  error instanceof HttpErrorResponse &&
  (error.status === HTTP_STATUS.networkError ||
    error.status === HTTP_STATUS.tooManyRequests ||
    error.status >= HTTP_STATUS.internalServerError);

export const httpRetryInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'GET') {
    return next(request);
  }

  return next(request).pipe(
    retry({
      count: HTTP_RETRY_COUNT,
      delay: (error, attempt) =>
        isRetryableError(error)
          ? timer(HTTP_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
          : throwError(() => error),
    }),
  );
};
