import { describe, expect, it } from 'vitest';
import { createSchedulesCommand } from './schedules.js';

describe('schedules command', () => {
  it('documents RRULE creation instead of legacy cron', () => {
    const help = createSchedulesCommand().commands.find((command) => command.name() === 'create')?.helpInformation() ?? '';

    expect(help).toContain('--rrule <rrule>');
    expect(help).toContain('RRULE expression');
    expect(help).toContain('--timezone <timezone>');
    expect(help).not.toContain('--cron');
    expect(help).not.toContain('Cron expression');
  });
});
