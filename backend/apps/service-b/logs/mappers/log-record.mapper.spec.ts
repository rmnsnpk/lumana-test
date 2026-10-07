import { describe, expect, it } from 'vitest';

import type { ServiceEvent } from '#libs/messaging/index.js';
import { toLogRecord } from './log-record.mapper.js';

describe('toLogRecord', () => {
  it('lifts the API request fields used for filtering', () => {
    const event: ServiceEvent = {
      id: 'e1',
      type: 'api.request',
      source: 'service-a',
      occurredAt: '2026-10-08T10:00:00.000Z',
      payload: {
        action: 'crashes.search',
        method: 'GET',
        path: '/crashes/search?q=a',
        statusCode: 400,
        durationMs: 3,
        error: 'q must contain at least one word',
      },
    };

    expect(toLogRecord({ streamId: '1-0', event })).toEqual({
      eventId: 'e1',
      streamId: '1-0',
      type: 'api.request',
      source: 'service-a',
      occurredAt: new Date('2026-10-08T10:00:00.000Z'),
      action: 'crashes.search',
      statusCode: 400,
      durationMs: 3,
      error: 'q must contain at least one word',
      payload: event.payload,
    });
  });

  it('keeps business events without an action', () => {
    const event: ServiceEvent = {
      id: 'e2',
      type: 'dataset.fetch.completed',
      source: 'service-a',
      occurredAt: '2026-10-08T10:00:00.000Z',
      payload: { fileName: 'a.json', format: 'json', rows: 10, bytes: 100, durationMs: 50 },
    };

    expect(toLogRecord({ streamId: '2-0', event })).toMatchObject({
      type: 'dataset.fetch.completed',
      durationMs: 50,
      payload: event.payload,
    });
    expect(toLogRecord({ streamId: '2-0', event }).action).toBeUndefined();
  });
});
