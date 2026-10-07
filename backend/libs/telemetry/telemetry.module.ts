import { DynamicModule, Module } from '@nestjs/common';

import { ActivityRecorder } from './activity-recorder.service.js';
import { ApiActivityInterceptor } from './api-activity.interceptor.js';
import { TELEMETRY_OPTIONS } from './telemetry.constants.js';
import type { TelemetryOptions } from './telemetry.interfaces.js';

@Module({})
export class TelemetryModule {
  static forRoot(options: TelemetryOptions): DynamicModule {
    return {
      module: TelemetryModule,
      global: true,
      providers: [
        { provide: TELEMETRY_OPTIONS, useValue: options },
        ActivityRecorder,
        ApiActivityInterceptor,
      ],
      exports: [ActivityRecorder, ApiActivityInterceptor],
    };
  }
}
