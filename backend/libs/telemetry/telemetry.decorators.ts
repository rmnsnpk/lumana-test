import { SetMetadata } from '@nestjs/common';

import { SKIP_TRACKING_KEY, TRACK_ACTION_KEY } from './telemetry.constants.js';

export const TrackAction = (action: string): MethodDecorator =>
  SetMetadata(TRACK_ACTION_KEY, action);

export const SkipTracking = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_TRACKING_KEY, true);
