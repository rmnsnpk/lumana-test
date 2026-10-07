import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';

import {
  HTTP_STATUS,
  NETWORK_ERROR_MESSAGE,
  UNKNOWN_HTTP_ERROR_MESSAGE,
} from '../constants/http.constants';
import { AppHttpError } from '../interfaces/app-http-error.interface';
import { isApiErrorResponse } from '../utils/api-error.utils';

class ApiResponseError extends Error {}

const toAppHttpError = (error: unknown, url: string): AppHttpError => {
  if (error instanceof ApiResponseError) {
    return { status: HTTP_STATUS.internalServerError, message: error.message, url };
  }

  if (error instanceof HttpErrorResponse) {
    const isNetworkError = error.status === HTTP_STATUS.networkError;
    return {
      status: error.status,
      message: isNetworkError ? NETWORK_ERROR_MESSAGE : UNKNOWN_HTTP_ERROR_MESSAGE,
      url: error.url ?? url,
    };
  }

  return { status: HTTP_STATUS.internalServerError, message: UNKNOWN_HTTP_ERROR_MESSAGE, url };
};

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    map((event) => {
      if (event instanceof HttpResponse && isApiErrorResponse(event.body)) {
        throw new ApiResponseError(event.body.error.info);
      }
      return event;
    }),
    catchError((error: unknown) => throwError(() => toAppHttpError(error, request.urlWithParams))),
  );
