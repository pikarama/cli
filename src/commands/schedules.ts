/**
 * Schedule management commands for recurring events
 * Requires Plus or Pro plan
 */

import { Command } from 'commander';
import { addOutputOptions, handleOutput, OutputOptions } from '../output.js';
import { wrapAction } from '../errors.js';
import { requireToken } from '../utils.js';

const API_BASE = 'https://www.pikarama.com/api/v1';

interface Schedule {
  id: string;
  event_name: string;
  topic_name: string;
  topic_icon: string;
  recurrence_cron: string;
  submission_duration_min: number;
  voting_duration_min: number;
  recurrence_active: boolean;
}

export function createSchedulesCommand(): Command {
  const cmd = new Command('schedules');
  cmd.alias('schedule');
  cmd.description('Manage recurring event schedules (Plus/Pro plans)');

  // List schedules
  const listCmd = new Command('list');
  listCmd.description('List recurring schedules for a group');
  listCmd.argument('<groupId>', 'Group ID');
  addOutputOptions(listCmd);

  listCmd.action(
    wrapAction(async (groupId, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();

      const response = await fetch(`${API_BASE}/groups/${groupId}/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.upgradeRequired) {
          console.log('⬆️ Recurring events require Plus or Pro plan.');
          console.log(`Upgrade at: https://www.pikarama.com/groups/${groupId}/settings/billing`);
          return;
        }
        throw new Error(error.error || 'Failed to fetch schedules');
      }

      const data = await response.json();
      const schedules = (data.schedules || []) as Schedule[];

      handleOutput(
        schedules,
        opts,
        (items: Schedule[]) => {
          if (!items.length) {
            console.log('No recurring schedules configured.');
            return;
          }
          console.table(
            items.map((s) => ({
              ID: s.id,
              Name: s.event_name,
              Topic: s.topic_name,
              Cron: s.recurrence_cron,
              Submission: `${s.submission_duration_min}m`,
              Voting: `${s.voting_duration_min}m`,
            }))
          );
          if (data.usage) {
            const limit = data.usage.limit === null ? '∞' : data.usage.limit;
            console.log(`\nUsage: ${data.usage.count}/${limit} schedules`);
          }
        },
        (items: Schedule[]) => {
          items.forEach((s) => console.log(s.id));
        }
      );
    })
  );

  // Create schedule
  const createCmd = new Command('create');
  createCmd.description('Create a recurring schedule');
  createCmd.argument('<groupId>', 'Group ID');
  createCmd.requiredOption('-t, --topic <topicId>', 'Topic ID');
  createCmd.requiredOption('-n, --name <name>', 'Event name');
  createCmd.requiredOption('-c, --cron <expression>', 'Cron expression (minute hour * * day-of-week)');
  createCmd.option('-s, --submission <minutes>', 'Minutes before event to open submissions', '60');
  createCmd.option('-v, --voting <minutes>', 'Minutes before event for voting window', '30');
  addOutputOptions(createCmd);

  createCmd.action(
    wrapAction(async (groupId, options) => {
      const opts = options as OutputOptions & {
        topic: string;
        name: string;
        cron: string;
        submission: string;
        voting: string;
      };
      const token = await requireToken();

      const response = await fetch(`${API_BASE}/groups/${groupId}/schedules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicGroupId: opts.topic,
          eventName: opts.name,
          recurrenceCron: opts.cron,
          submissionDurationMin: parseInt(opts.submission),
          votingDurationMin: parseInt(opts.voting),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.upgradeRequired) {
          console.log('⬆️ Recurring events require Plus or Pro plan.');
          return;
        }
        if (error.limitReached) {
          console.log(`📊 Schedule limit reached (${error.currentCount}/${error.limit}). Upgrade to Pro for unlimited.`);
          return;
        }
        throw new Error(error.error || 'Failed to create schedule');
      }

      const data = await response.json();
      handleOutput(
        data.schedule,
        opts,
        () => console.log(`✓ Schedule created: ${data.schedule?.id}`),
        () => console.log(data.schedule?.id)
      );
    })
  );

  // Delete schedule
  const deleteCmd = new Command('delete');
  deleteCmd.description('Delete a recurring schedule');
  deleteCmd.argument('<groupId>', 'Group ID');
  deleteCmd.argument('<scheduleId>', 'Schedule ID');

  deleteCmd.action(
    wrapAction(async (groupId, scheduleId) => {
      const token = await requireToken();

      const response = await fetch(`${API_BASE}/groups/${groupId}/schedules?scheduleId=${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete schedule');
      }

      console.log('✓ Schedule deleted');
    })
  );

  cmd.addCommand(listCmd);
  cmd.addCommand(createCmd);
  cmd.addCommand(deleteCmd);

  return cmd;
}
