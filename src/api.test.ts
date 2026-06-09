import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSchedule } from './api.js';

describe('schedule API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates schedules with RRULE payload fields', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ schedule: { id: 'schedule-1' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await createSchedule('pk_test', 'group-1', {
      topicGroupId: 'topic-1',
      eventName: 'Friday lunch',
      recurrenceRRule: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=12;BYMINUTE=0;BYSECOND=0',
      recurrenceDtStart: '2026-06-12T10:00:00.000Z',
      parseTimezone: 'Europe/Prague',
      submissionDurationMin: 60,
      votingDurationMin: 30,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string | URL, RequestInit];
    const [url, init] = call;
    expect(String(url)).toBe('https://www.pikarama.com/api/v1/groups/group-1/schedules');
    expect(JSON.parse(String(init.body))).toEqual({
      topicGroupId: 'topic-1',
      eventName: 'Friday lunch',
      recurrenceRRule: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=12;BYMINUTE=0;BYSECOND=0',
      recurrenceDtStart: '2026-06-12T10:00:00.000Z',
      parseTimezone: 'Europe/Prague',
      submissionDurationMin: 60,
      votingDurationMin: 30,
    });
    expect(String(init.body)).not.toContain('recurrenceCron');
  });
});
