import { Command } from 'commander';
import { addOutputOptions, handleOutput, OutputOptions } from '../output.js';
import { wrapAction } from '../errors.js';
import { requireToken, extractList, extractResource } from '../utils.js';
import {
  EventSummary,
  EventDetail,
  Submission,
  listEvents,
  getEvent,
  createEvent,
  submitPick,
  voteForSubmission,
  advanceEvent,
} from '../api.js';
import {
  selectEvent,
  selectGroup,
  selectTopic,
  selectSubmission,
  promptText,
  promptConfirm,
  p,
} from '../interactive.js';

export function createEventsCommand(): Command {
  const cmd = new Command('events');
  cmd.description('Manage events');
  cmd.option('-s, --status <status>', 'Filter events by status (submitting, voting, completed)');
  addOutputOptions(cmd);

  cmd.action(
    wrapAction(async (options) => {
      const opts = options as OutputOptions & { status?: string };
      const token = await requireToken();
      const payload = await listEvents(token, opts.status);
      const events = extractList<EventSummary>(payload, ['events', 'data']);

      // Interactive mode: select event and show details
      if (!opts.json && !opts.quiet && events.length > 0) {
        const eventId = await selectEvent(token, opts.status);
        if (eventId) {
          const detail = await getEvent(token, eventId);
          const event = extractResource<EventDetail>(detail, ['event']);
          showEventDetails(event);
          
          // Offer actions based on status
          if (event.status === 'submitting') {
            const doSubmit = await promptConfirm('Submit a pick?');
            if (doSubmit) {
              const pick = await promptText('Your pick', 'Enter your choice...');
              if (pick) {
                await submitPick(token, eventId, pick);
                p.log.success('Pick submitted!');
              }
            }
          } else if (event.status === 'voting' && event.submissions?.length) {
            const doVote = await promptConfirm('Cast a vote?');
            if (doVote) {
              const submissionId = await selectSubmission(event.submissions);
              if (submissionId) {
                await voteForSubmission(token, eventId, submissionId);
                p.log.success('Vote cast!');
              }
            }
          }
        }
        return;
      }

      handleOutput(
        events,
        opts,
        (items: EventSummary[]) => {
          if (!items.length) {
            console.log('No events found.');
            return;
          }
          console.table(
            items.map((event) => ({
              ID: event.id,
              Name: event.name ?? 'Untitled',
              Topic: event.topic?.name ?? event.group?.name ?? 'Unknown',
              Status: event.status ?? 'Unknown',
            }))
          );
        },
        (items: EventSummary[]) => {
          items.forEach((event) => console.log(event.id));
        }
      );
    })
  );

  const showCmd = cmd.command('show [eventId]').description('Show event details');
  addOutputOptions(showCmd);
  showCmd.action(
    wrapAction(async (eventId, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      // Interactive: select event if not provided
      let id = eventId ? String(eventId) : null;
      if (!id && !opts.json && !opts.quiet) {
        id = await selectEvent(token);
      }
      if (!id) return;

      const payload = await getEvent(token, id);
      const event = extractResource<EventDetail>(payload, ['event']);

      handleOutput(
        event,
        opts,
        (value: EventDetail) => showEventDetails(value),
        (value: EventDetail) => console.log(value.id)
      );
    })
  );

  const createCmd = cmd
    .command('create [topicId] [name]')
    .description('Create a new event in a topic');
  addOutputOptions(createCmd);
  createCmd.action(
    wrapAction(async (topicId, name, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let topicValue = topicId ? String(topicId) : null;
      let eventName = name ? String(name) : null;

      // Interactive mode
      if (!opts.json && !opts.quiet) {
        if (!topicValue) {
          p.intro('Create new event');
          const groupId = await selectGroup(token);
          if (!groupId) return;
          topicValue = await selectTopic(token, groupId);
          if (!topicValue) return;
        }
        if (!eventName) {
          eventName = await promptText('Event name', 'Friday Movie Night...');
          if (!eventName) return;
        }
      }

      if (!topicValue || !eventName) {
        console.error('Usage: pikarama events create <topicId> <name>');
        return;
      }

      const payload = await createEvent(token, topicValue, eventName);
      const event = extractResource<EventDetail>(payload, ['event']);

      handleOutput(
        event,
        opts,
        (value: EventDetail) => p.log.success(`Created event "${value.name}" (${value.id})`),
        (value: EventDetail) => console.log(value.id)
      );
    })
  );

  const submitCmd = cmd
    .command('submit [eventId] [pick]')
    .description('Submit a pick for an event');
  addOutputOptions(submitCmd);
  submitCmd.action(
    wrapAction(async (eventId, pick, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let id = eventId ? String(eventId) : null;
      let pickValue = pick ? String(pick) : null;

      // Interactive mode
      if (!opts.json && !opts.quiet) {
        if (!id) {
          id = await selectEvent(token, 'submitting');
        }
        if (!id) return;
        if (!pickValue) {
          pickValue = await promptText('Your pick', 'Enter your choice...');
        }
      }

      if (!id || !pickValue) {
        console.error('Usage: pikarama events submit <eventId> <pick>');
        return;
      }

      await submitPick(token, id, pickValue);
      if (!opts.quiet) p.log.success('Pick submitted!');
    })
  );

  const voteCmd = cmd
    .command('vote [eventId] [submissionId]')
    .description('Vote for a submission');
  addOutputOptions(voteCmd);
  voteCmd.action(
    wrapAction(async (eventId, submissionId, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let id = eventId ? String(eventId) : null;
      let submission = submissionId ? String(submissionId) : null;

      // Interactive mode
      if (!opts.json && !opts.quiet) {
        if (!id) {
          id = await selectEvent(token, 'voting');
        }
        if (!id) return;
        
        if (!submission) {
          const detail = await getEvent(token, id);
          const event = extractResource<EventDetail>(detail, ['event']);
          if (event.submissions?.length) {
            submission = await selectSubmission(event.submissions);
          }
        }
      }

      if (!id || !submission) {
        console.error('Usage: pikarama events vote <eventId> <submissionId>');
        return;
      }

      await voteForSubmission(token, id, submission);
      if (!opts.quiet) p.log.success('Vote cast!');
    })
  );

  const advanceCmd = cmd
    .command('advance [eventId]')
    .description('Advance an event to the next phase');
  addOutputOptions(advanceCmd);
  advanceCmd.action(
    wrapAction(async (eventId, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let id = eventId ? String(eventId) : null;

      // Interactive mode
      if (!id && !opts.json && !opts.quiet) {
        id = await selectEvent(token, 'submitting,voting');
      }
      if (!id) {
        console.error('Usage: pikarama events advance <eventId>');
        return;
      }

      await advanceEvent(token, id);
      if (!opts.quiet) p.log.success('Event advanced!');
    })
  );

  return cmd;
}

function showEventDetails(event: EventDetail): void {
  console.log();
  console.log(`📋 ${event.name ?? 'Untitled'}`);
  console.log(`   Status: ${event.status ?? 'Unknown'}`);
  console.log(`   Topic:  ${event.topic?.name ?? 'Unknown'}`);
  if (event.submissions && event.submissions.length) {
    console.log('   Submissions:');
    event.submissions.forEach((submission: Submission) => {
      const owner = submission.by ?? submission.user?.name ?? 'Unknown';
      const votes = submission.voteCount ?? submission.votes ?? 0;
      const winner = submission.isWinner ? ' 🏆' : '';
      console.log(`     • ${submission.title ?? '—'} (by ${owner}, votes: ${votes})${winner}`);
    });
  } else {
    console.log('   Submissions: None yet');
  }
  console.log();
}
