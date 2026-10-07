import { describe, expect, it } from 'vitest';

import { parseServiceEvent } from './parse-service-event.js';

const event = {
  id: 'e1',
  type: 'api.request',
  source: 'service-a',
  occurredAt: '2026-10-08T10:00:00.000Z',
  payload: { action: 'crashes.search', statusCode: 200 },
};

describe('parseServiceEvent', () => {
  it('accepts a well-formed event', () => {
    expect(parseServiceEvent(JSON.stringify(event))).toEqual({ event });
  });

  it.each([
    [undefined, 'missing'],
    ['{', 'not valid JSON'],
    ['[]', 'must be an object'],
    [JSON.stringify({ ...event, type: 'nope' }), 'unknown'],
    [JSON.stringify({ ...event, occurredAt: 'later' }), 'occurredAt'],
    [JSON.stringify({ ...event, payload: 1 }), 'payload'],
  ])('rejects %s', (raw, reason) => {
    expect(parseServiceEvent(raw).error).toContain(reason);
  });
});
