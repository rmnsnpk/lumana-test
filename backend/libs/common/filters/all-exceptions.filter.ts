import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';

import { MONGO_DUPLICATE_KEY_CODE } from './filters.constants.js';

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { statusCode, message } = this.resolve(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (response.headersSent) {
      response.end();
      return;
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error: toReasonPhrase(statusCode),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): { statusCode: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? (payload as { message: string | string[] }).message
          : exception.message;

      return { statusCode: exception.getStatus(), message };
    }

    if (exception instanceof MongoServerError && exception.code === MONGO_DUPLICATE_KEY_CODE) {
      return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}

const toReasonPhrase = (statusCode: number): string => {
  const name: string | undefined = HttpStatus[statusCode];

  return name
    ? name
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ')
    : 'Error';
};
