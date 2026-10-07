import type { TimeSeriesAggregationType, TimeSeriesDuplicatePolicies } from 'redis';

export type TimeSeriesLabels = Record<string, string>;

export interface TimeSeriesSample {
  key: string;
  value: number;
  labels: TimeSeriesLabels;
  duplicatePolicy: TimeSeriesDuplicatePolicies;
  timestamp?: number | Date;
  retentionMs?: number;
}

export interface TimeSeriesRangeQuery {
  filters: string[];
  from: number | Date;
  to: number | Date;
  aggregation: TimeSeriesAggregationType;
  bucketMs: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface TimeSeriesRange {
  key: string;
  labels: TimeSeriesLabels;
  points: TimeSeriesPoint[];
}
