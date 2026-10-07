import { Inject, Injectable, Logger } from '@nestjs/common';

import { toErrorMessage } from '../common/index.js';
import { EVENT_TYPES, EventPublisher } from '../messaging/index.js';
import type { ApiRequestPayload, EventPayloadMap, EventType } from '../messaging/index.js';
import { TimeSeriesService } from '../redis/index.js';
import type { TimeSeriesSample } from '../redis/index.js';
import {
  buildSeriesKey,
  DEFAULT_SERIES_RETENTION_MS,
  METRICS,
  SERIES_KINDS,
  SERIES_LABELS,
  TELEMETRY_OPTIONS,
} from './telemetry.constants.js';
import type { MetricName, SeriesKind } from './telemetry.constants.js';
import type { TelemetryOptions } from './telemetry.interfaces.js';

const ERROR_STATUS_THRESHOLD = 400;

@Injectable()
export class ActivityRecorder {
  private readonly logger = new Logger(ActivityRecorder.name);
  private readonly retentionMs: number;

  constructor(
    private readonly timeSeries: TimeSeriesService,
    private readonly publisher: EventPublisher,
    @Inject(TELEMETRY_OPTIONS) private readonly options: TelemetryOptions,
  ) {
    this.retentionMs = options.retentionMs ?? DEFAULT_SERIES_RETENTION_MS;
  }

  async recordApiRequest(payload: ApiRequestPayload): Promise<void> {
    const { action, statusCode, durationMs } = payload;
    const samples: TimeSeriesSample[] = [
      this.sample(METRICS.requests, SERIES_KINDS.api, action, 1, 'SUM'),
      this.sample(METRICS.latency, SERIES_KINDS.api, action, durationMs, 'MAX'),
    ];

    if (statusCode >= ERROR_STATUS_THRESHOLD) {
      samples.push(this.sample(METRICS.errors, SERIES_KINDS.api, action, 1, 'SUM'));
    }

    await this.safely(`api ${action}`, () =>
      Promise.all([
        this.timeSeries.add(samples),
        this.publisher.publish(EVENT_TYPES.apiRequest, payload),
      ]),
    );
  }

  async recordEvent<T extends EventType>(type: T, payload: EventPayloadMap[T]): Promise<void> {
    const samples = [this.sample(METRICS.events, SERIES_KINDS.event, type, 1, 'SUM')];
    const rows = extractRowCount(payload);

    if (rows !== undefined) {
      samples.push(this.sample(METRICS.rows, SERIES_KINDS.event, type, rows, 'SUM'));
    }

    await this.safely(`event ${type}`, () =>
      Promise.all([this.timeSeries.add(samples), this.publisher.publish(type, payload)]),
    );
  }

  private sample(
    metric: MetricName,
    kind: SeriesKind,
    name: string,
    value: number,
    duplicatePolicy: TimeSeriesSample['duplicatePolicy'],
  ): TimeSeriesSample {
    const { service } = this.options;

    return {
      key: buildSeriesKey(service, metric, name),
      value,
      duplicatePolicy,
      retentionMs: this.retentionMs,
      labels: {
        [SERIES_LABELS.service]: service,
        [SERIES_LABELS.metric]: metric,
        [SERIES_LABELS.kind]: kind,
        [SERIES_LABELS.name]: name,
      },
    };
  }

  private async safely(label: string, operation: () => Promise<unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      this.logger.warn(`Failed to record ${label}: ${toErrorMessage(error)}`);
    }
  }
}

const extractRowCount = (payload: object): number | undefined => {
  if ('rows' in payload && typeof payload.rows === 'number') {
    return payload.rows;
  }

  if ('received' in payload && typeof payload.received === 'number') {
    return payload.received;
  }

  return undefined;
};
