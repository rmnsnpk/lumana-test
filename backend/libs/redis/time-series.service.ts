import { Inject, Injectable } from '@nestjs/common';

import { REDIS_CLIENT } from './redis.constants.js';
import type { RedisClient } from './redis.interfaces.js';
import type {
  TimeSeriesRange,
  TimeSeriesRangeQuery,
  TimeSeriesSample,
} from './time-series.interfaces.js';

@Injectable()
export class TimeSeriesService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async add(samples: TimeSeriesSample[]): Promise<void> {
    if (samples.length === 0) {
      return;
    }

    const multi = this.redis.multi();

    for (const { key, value, labels, duplicatePolicy, timestamp, retentionMs } of samples) {
      multi.ts.add(key, timestamp ?? '*', value, {
        LABELS: labels,
        ON_DUPLICATE: duplicatePolicy,
        RETENTION: retentionMs,
      });
    }

    await multi.execAsPipeline();
  }

  async mrange({
    filters,
    from,
    to,
    aggregation,
    bucketMs,
  }: TimeSeriesRangeQuery): Promise<TimeSeriesRange[]> {
    const reply = await this.redis.ts.mRangeWithLabels(from, to, filters, {
      AGGREGATION: { type: aggregation, timeBucket: bucketMs },
    });

    return Object.entries(reply).map(([key, series]) => ({
      key,
      labels: Object.fromEntries(
        Object.entries(series.labels).map(([name, value]) => [name, String(value)]),
      ),
      points: series.samples.map(({ timestamp, value }) => ({
        timestamp: Number(timestamp),
        value: Number(value),
      })),
    }));
  }
}
