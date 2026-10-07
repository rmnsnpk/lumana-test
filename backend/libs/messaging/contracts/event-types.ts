export const EVENT_TYPES = {
  apiRequest: 'api.request',
  datasetFetchCompleted: 'dataset.fetch.completed',
  datasetFetchFailed: 'dataset.fetch.failed',
  importCompleted: 'import.completed',
  importFailed: 'import.failed',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const ALL_EVENT_TYPES: readonly EventType[] = Object.values(EVENT_TYPES);
