import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { toErrorMessage } from '../common/index.js';
import { ActivityRecorder } from './activity-recorder.service.js';
import { SKIP_TRACKING_KEY, TRACK_ACTION_KEY } from './telemetry.constants.js';

const CONTROLLER_SUFFIX = /Controller$/;

@Injectable()
export class ApiActivityInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly recorder: ActivityRecorder,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [context.getHandler(), context.getClass()];

    if (
      context.getType() !== 'http' ||
      this.reflector.getAllAndOverride(SKIP_TRACKING_KEY, targets)
    ) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const action = this.resolveAction(context);
    const startedAt = performance.now();

    const record = (statusCode: number, error?: unknown): void => {
      void this.recorder.recordApiRequest({
        action,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        ...(error === undefined ? {} : { error: toErrorMessage(error) }),
      });
    };

    return next.handle().pipe(
      tap({
        complete: () => record(response.statusCode),
        error: (error: unknown) =>
          record(
            error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
            error,
          ),
      }),
    );
  }

  private resolveAction(context: ExecutionContext): string {
    const explicit = this.reflector.get<string | undefined>(TRACK_ACTION_KEY, context.getHandler());

    if (explicit) {
      return explicit;
    }

    const controller = context.getClass().name.replace(CONTROLLER_SUFFIX, '');

    return `${controller.charAt(0).toLowerCase()}${controller.slice(1)}.${context.getHandler().name}`;
  }
}
