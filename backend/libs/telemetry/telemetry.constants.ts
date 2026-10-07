export const TELEMETRY_OPTIONS = Symbol('TELEMETRY_OPTIONS');
export const TRACK_ACTION_KEY = 'telemetry:track-action';
export const SKIP_TRACKING_KEY = 'telemetry:skip-tracking';

export const DEFAULT_SERIES_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const METRICS = {
  requests: 'requests',
  errors: 'errors',
  latency: 'latency',
  events: 'events',
  rows: 'rows',
} as const;

export type MetricName = (typeof METRICS)[keyof typeof METRICS];

export const SERIES_KINDS = {
  api: 'api',
  event: 'event',
} as const;

export type SeriesKind = (typeof SERIES_KINDS)[keyof typeof SERIES_KINDS];

export const SERIES_LABELS = {
  service: 'service',
  metric: 'metric',
  kind: 'kind',
  name: 'name',
} as const;

export const buildSeriesKey = (service: string, metric: MetricName, name: string): string =>
  `ts:${service}:${metric}:${name}`;
