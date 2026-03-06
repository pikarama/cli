import * as p from '@clack/prompts';
import { listGroups, listEvents, getGroup, getEvent, createEvent, createPoll, submitPick, voteForSubmissions, advanceEvent, getKarma, listSchedules, createSchedule, deleteSchedule, ApiError, Schedule } from './api.js';
import { getConfig } from './config.js';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

// ============ Main Menu ============

export async function showMainMenu(): Promise<void> {
  const config = await getConfig();
  
  if (!config?.token) {
    p.log.warn('Not logged in. Please run: pikarama login');
    const shouldLogin = await p.confirm({ message: 'Login now?' });
    if (p.isCancel(shouldLogin) || !shouldLogin) {
      return;
    }
    // Import dynamically to avoid circular deps
    const { doLogin } = await import('./commands/login.js');
    await doLogin();
    return showMainMenu();
  }

  while (true) {
    const action = await p.select({
      message: '🎯 Pikarama — What would you like to do?',
      options: [
        { value: 'groups', label: '👥 Browse Groups', hint: 'View groups, topics, and members' },
        { value: 'events', label: '📋 Browse Events', hint: 'View and manage events' },
        { value: 'new_event', label: '➕ Create Event', hint: 'Start a new decision' },
        { value: 'poll', label: '📊 Create Poll', hint: 'Quick poll with preset options' },
        { value: 'repeat', label: '🔄 Repeat Event', hint: 'Rerun a past event' },
        { value: 'schedules', label: '📅 Schedules', hint: 'Manage recurring events (Plus/Pro)' },
        { value: 'karma', label: '⭐ View Karma', hint: 'Check karma standings' },
        { value: 'logout', label: '🚪 Logout', hint: 'Clear saved credentials' },
        { value: 'exit', label: '← Exit' },
      ],
    });

    if (p.isCancel(action) || action === 'exit') {
      p.outro('Goodbye! 👋');
      return;
    }

    switch (action) {
      case 'groups':
        await browseGroups(config.token);
        break;
      case 'events':
        await browseEvents(config.token);
        break;
      case 'new_event':
        await createEventFlow(config.token);
        break;
      case 'poll':
        await createPollFlow(config.token);
        break;
      case 'repeat':
        await repeatEventFlow(config.token);
        break;
      case 'schedules':
        await browseSchedules(config.token);
        break;
      case 'karma':
        await showKarma(config.token);
        break;
      case 'logout':
        const { doLogout } = await import('./commands/logout.js');
        doLogout();
        return;
    }
  }
}

// ============ Groups Flow ============

async function browseGroups(token: string): Promise<void> {
  const response = await listGroups(token) as { groups?: Array<{ id: string; name: string; memberCount?: number }> };
  const groups = response.groups || [];

  if (!groups.length) {
    p.log.warn('No groups found. Create one at pikarama.com');
    return;
  }

  while (true) {
    const options: SelectOption[] = [
      { value: '_back', label: '← Back to main menu' },
      ...groups.map(g => ({
        value: g.id,
        label: g.name,
        hint: g.memberCount ? `${g.memberCount} members` : undefined,
      })),
    ];

    const groupId = await p.select({
      message: '👥 Select a group',
      options,
    });

    if (p.isCancel(groupId) || groupId === '_back') {
      return;
    }

    await browseGroupDetails(token, groupId as string);
  }
}

async function browseGroupDetails(token: string, groupId: string): Promise<void> {
  const response = await getGroup(token, groupId) as { 
    group?: { 
      id: string;
      name: string;
      topics?: Array<{ id: string; name: string; icon?: string }>;
      members?: Array<{ id: string; name: string }>;
    } 
  };
  const group = response.group;

  if (!group) {
    p.log.error('Group not found');
    return;
  }

  while (true) {
    const action = await p.select({
      message: `📁 ${group.name}`,
      options: [
        { value: '_back', label: '← Back to groups' },
        { value: 'topics', label: '📋 Browse Topics', hint: `${group.topics?.length || 0} topics` },
        { value: 'events', label: '📅 View Events', hint: 'Active events in this group' },
        { value: 'karma', label: '⭐ Group Karma', hint: 'Karma standings for this group' },
      ],
    });

    if (p.isCancel(action) || action === '_back') {
      return;
    }

    switch (action) {
      case 'topics':
        await browseTopics(token, groupId, group.topics || []);
        break;
      case 'events':
        await browseEvents(token, groupId);
        break;
      case 'karma':
        await showKarma(token, groupId);
        break;
    }
  }
}

async function browseTopics(token: string, groupId: string, topics: Array<{ id: string; name: string; icon?: string }>): Promise<void> {
  if (!topics.length) {
    // Fetch topics if not provided
    const topicsResponse = await fetch(`https://www.pikarama.com/api/v1/groups/${groupId}/topics`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()) as { topics?: Array<{ id: string; name: string; icon?: string }> };
    topics = topicsResponse.topics || [];
  }

  if (!topics.length) {
    p.log.warn('No topics in this group. Create one at pikarama.com');
    return;
  }

  while (true) {
    const options: SelectOption[] = [
      { value: '_back', label: '← Back' },
      ...topics.map(t => ({
        value: t.id,
        label: `${t.icon || '📋'} ${t.name}`,
      })),
    ];

    const topicId = await p.select({
      message: '📋 Select a topic',
      options,
    });

    if (p.isCancel(topicId) || topicId === '_back') {
      return;
    }

    await browseTopicActions(token, topicId as string, topics.find(t => t.id === topicId)?.name || 'Topic');
  }
}

async function browseTopicActions(token: string, topicId: string, topicName: string): Promise<void> {
  while (true) {
    const action = await p.select({
      message: `📋 ${topicName}`,
      options: [
        { value: '_back', label: '← Back to topics' },
        { value: 'create_event', label: '➕ Create Event', hint: 'Start a new decision' },
        { value: 'create_poll', label: '📊 Create Poll', hint: 'Quick poll with preset options' },
      ],
    });

    if (p.isCancel(action) || action === '_back') {
      return;
    }

    switch (action) {
      case 'create_event':
        await createEventFlow(token, topicId);
        break;
      case 'create_poll':
        await createPollFlow(token, topicId);
        break;
    }
  }
}

// ============ Schedules Flow ============

async function browseSchedules(token: string): Promise<void> {
  // First select a group
  const groupId = await selectGroup(token);
  if (!groupId) return;

  while (true) {
    let schedules: Schedule[] = [];
    let upgradeRequired = false;

    try {
      const response = await listSchedules(token, groupId);
      schedules = response.schedules || [];
      upgradeRequired = response.upgradeRequired || false;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        p.log.warn('⬆️ Recurring events require Plus or Pro plan.');
        p.log.info(`Upgrade at: https://www.pikarama.com/groups/${groupId}/settings/billing`);
        return;
      }
      throw error;
    }

    if (upgradeRequired) {
      p.log.warn('⬆️ Recurring events require Plus or Pro plan.');
      p.log.info(`Upgrade at: https://www.pikarama.com/groups/${groupId}/settings/billing`);
      return;
    }

    const options: SelectOption[] = [
      { value: '_back', label: '← Back to main menu' },
      { value: '_create', label: '➕ Create Schedule', hint: 'Set up a new recurring event' },
    ];

    if (schedules.length) {
      schedules.forEach((s) => {
        const icon = s.topic_icon || '📋';
        const status = s.recurrence_active ? '🟢' : '⏸️';
        options.push({
          value: s.id,
          label: `${status} ${icon} ${s.event_name}`,
          hint: formatCron(s.recurrence_cron),
        });
      });
    } else {
      p.log.info('No recurring schedules configured yet.');
    }

    const selected = await p.select({
      message: '📅 Schedules',
      options,
    });

    if (p.isCancel(selected) || selected === '_back') {
      return;
    }

    if (selected === '_create') {
      await createScheduleFlow(token, groupId);
      continue;
    }

    // Selected a schedule - show actions
    const schedule = schedules.find((s) => s.id === selected);
    if (schedule) {
      await scheduleActionsFlow(token, groupId, schedule);
    }
  }
}

async function createScheduleFlow(token: string, groupId: string): Promise<void> {
  // Fetch topics for this group
  const response = await getGroup(token, groupId) as {
    group?: { topics?: Array<{ id: string; name: string; icon?: string }> };
  };
  const topics = response.group?.topics || [];

  if (!topics.length) {
    p.log.warn('No topics in this group. Create one at pikarama.com first.');
    return;
  }

  // Select topic
  const topicOptions: SelectOption[] = topics.map((t) => ({
    value: t.id,
    label: `${t.icon || '📋'} ${t.name}`,
  }));

  const topicId = await p.select({
    message: 'Select topic for recurring events',
    options: topicOptions,
  });

  if (p.isCancel(topicId)) return;

  // Event name
  const eventName = await p.text({
    message: 'Event name',
    placeholder: 'e.g., Movie Friday',
  });

  if (p.isCancel(eventName) || !eventName) return;

  // Schedule preset or custom
  const scheduleChoice = await p.select({
    message: 'When should this recur?',
    options: [
      { value: '0 18 * * 5', label: '🎬 Every Friday 6pm', hint: 'Movie night classic' },
      { value: '0 12 * * 0', label: '🍳 Every Sunday noon', hint: 'Weekend brunch' },
      { value: '0 19 * * 1-5', label: '🍽️ Weekdays 7pm', hint: 'Dinner decisions' },
      { value: '0 10 * * 6', label: '☕ Every Saturday 10am', hint: 'Weekend morning' },
      { value: '_custom', label: '⚙️ Custom cron', hint: 'Enter your own schedule' },
    ],
  });

  if (p.isCancel(scheduleChoice)) return;

  let cron = scheduleChoice as string;

  if (scheduleChoice === '_custom') {
    const customCron = await p.text({
      message: 'Cron expression (minute hour * * day)',
      placeholder: '0 18 * * 5 = Friday 6pm',
    });

    if (p.isCancel(customCron) || !customCron) return;
    cron = customCron as string;
  }

  // Timing options
  const submissionMin = await p.text({
    message: 'Submission window (minutes before event)',
    initialValue: '60',
    placeholder: '60',
  });

  if (p.isCancel(submissionMin)) return;

  const votingMin = await p.text({
    message: 'Voting window (minutes before event)',
    initialValue: '30',
    placeholder: '30',
  });

  if (p.isCancel(votingMin)) return;

  const spinner = p.spinner();
  spinner.start('Creating schedule...');

  try {
    const result = await createSchedule(token, groupId, {
      topicGroupId: topicId as string,
      eventName: eventName as string,
      recurrenceCron: cron,
      submissionDurationMin: parseInt(submissionMin as string) || 60,
      votingDurationMin: parseInt(votingMin as string) || 30,
    });
    spinner.stop(`Schedule created! (${result.schedule?.id || 'unknown'})`);
  } catch (error) {
    spinner.stop('Failed');
    if (error instanceof ApiError) {
      const body = error.body as { upgradeRequired?: boolean; limitReached?: boolean; currentCount?: number; limit?: number; error?: string };
      if (body?.upgradeRequired) {
        p.log.warn('⬆️ Recurring events require Plus or Pro plan.');
      } else if (body?.limitReached) {
        p.log.warn(`📊 Schedule limit reached (${body.currentCount}/${body.limit}). Upgrade to Pro for unlimited.`);
      } else {
        p.log.error(body?.error || error.message);
      }
    } else {
      p.log.error(`${error instanceof Error ? error.message : error}`);
    }
  }
}

async function scheduleActionsFlow(token: string, groupId: string, schedule: Schedule): Promise<void> {
  while (true) {
    const status = schedule.recurrence_active ? '🟢 Active' : '⏸️ Paused';
    
    const action = await p.select({
      message: `📅 ${schedule.event_name} (${status})`,
      options: [
        { value: '_back', label: '← Back to schedules' },
        { value: 'view', label: '👁️ View Details', hint: 'See schedule configuration' },
        { value: 'delete', label: '🗑️ Delete', hint: 'Remove this schedule' },
      ],
    });

    if (p.isCancel(action) || action === '_back') {
      return;
    }

    switch (action) {
      case 'view':
        showScheduleDetails(schedule);
        break;
      case 'delete':
        const confirmed = await p.confirm({ message: `Delete schedule "${schedule.event_name}"?` });
        if (p.isCancel(confirmed) || !confirmed) break;
        
        try {
          await deleteSchedule(token, groupId, schedule.id);
          p.log.success('Schedule deleted');
          return; // Go back to schedule list
        } catch (error) {
          p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
        }
        break;
    }
  }
}

function showScheduleDetails(schedule: Schedule): void {
  p.log.info(`\n📅 ${schedule.event_name}`);
  p.log.info(`Topic: ${schedule.topic_icon || '📋'} ${schedule.topic_name}`);
  p.log.info(`Schedule: ${formatCron(schedule.recurrence_cron)}`);
  p.log.info(`Cron: ${schedule.recurrence_cron}`);
  p.log.info(`Submission window: ${schedule.submission_duration_min} minutes`);
  p.log.info(`Voting window: ${schedule.voting_duration_min} minutes`);
  p.log.info(`Status: ${schedule.recurrence_active ? '🟢 Active' : '⏸️ Paused'}`);
  if (schedule.next_run) {
    p.log.info(`Next run: ${schedule.next_run}`);
  }
}

function formatCron(cron: string): string {
  // Basic cron to human-readable
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;

  const [minute, hour, , , dayOfWeek] = parts;
  const days: Record<string, string> = {
    '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed',
    '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
    '*': 'Daily', '1-5': 'Weekdays', '0,6': 'Weekends',
  };

  const dayText = days[dayOfWeek] || dayOfWeek;
  const timeText = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  return `${dayText} @ ${timeText}`;
}

// ============ Events Flow ============

async function browseEvents(token: string, groupId?: string): Promise<void> {
  const response = await listEvents(token) as { 
    events?: Array<{ id: string; name: string; status: string; topic?: { name: string; icon?: string }; group?: { id: string } }> 
  };
  let events = response.events || [];

  // Filter by group if specified
  if (groupId) {
    events = events.filter(e => e.group?.id === groupId);
  }

  if (!events.length) {
    p.log.warn('No active events found.');
    return;
  }

  while (true) {
    const options: SelectOption[] = [
      { value: '_back', label: '← Back' },
      ...events.map(e => {
        const topicInfo = e.topic?.icon || e.topic?.name ? ` (${e.topic?.icon || ''} ${e.topic?.name || ''})` : '';
        const statusEmoji = e.status === 'submitting' ? '📝' : e.status === 'voting' ? '🗳️' : '✅';
        return {
          value: e.id,
          label: `${statusEmoji} ${e.name}${topicInfo}`,
        };
      }),
    ];

    const eventId = await p.select({
      message: '📅 Select an event',
      options,
    });

    if (p.isCancel(eventId) || eventId === '_back') {
      return;
    }

    await browseEventActions(token, eventId as string);
  }
}

async function browseEventActions(token: string, eventId: string): Promise<void> {
  const response = await getEvent(token, eventId) as {
    event?: {
      id: string;
      name: string;
      status: string;
      isPoll?: boolean;
      topic?: { id: string; name: string };
      submissions?: Array<{ id: string; title?: string; by?: string; votes?: number }>;
      pollOptions?: Array<{ id: string; label: string; votes?: number }>;
    }
  };
  const event = response.event;

  if (!event) {
    p.log.error('Event not found');
    return;
  }

  while (true) {
    const statusEmoji = event.status === 'submitting' ? '📝' : event.status === 'voting' ? '🗳️' : '✅';
    
    const options: SelectOption[] = [
      { value: '_back', label: '← Back to events' },
    ];

    if (event.status === 'submitting' && !event.isPoll) {
      options.push({ value: 'submit', label: '📝 Submit Pick(s)', hint: 'Add your suggestions' });
    }

    if (event.status === 'voting') {
      options.push({ value: 'vote', label: '🗳️ Vote', hint: 'Cast your vote(s)' });
    }

    if (event.status === 'submitting' || event.status === 'voting') {
      options.push({ value: 'advance', label: '⏭️ Advance Phase', hint: 'Move to next phase' });
    }

    if (event.status === 'completed') {
      options.push({ value: 'repeat', label: '🔄 Repeat Event', hint: 'Start this event again' });
    }

    options.push({ value: 'view', label: '👁️ View Details', hint: 'See submissions and votes' });

    const action = await p.select({
      message: `${statusEmoji} ${event.name} (${event.status})`,
      options,
    });

    if (p.isCancel(action) || action === '_back') {
      return;
    }

    switch (action) {
      case 'submit':
        await submitPicksFlow(token, eventId);
        break;
      case 'vote':
        await voteFlow(token, eventId, event.submissions || [], event.pollOptions || []);
        break;
      case 'advance':
        await advanceEventFlow(token, eventId);
        break;
      case 'repeat':
        if (event.topic?.id) {
          try {
            const result = await createEvent(token, event.topic.id, event.name) as {
              event?: { id?: string };
            };
            p.log.success(`Event "${event.name}" repeated! (${result.event?.id || 'unknown'})`);
          } catch (error) {
            p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
          }
        } else {
          p.log.error('Cannot repeat: missing topic information.');
        }
        break;
      case 'view':
        showEventDetails(event);
        break;
    }
  }
}

function showEventDetails(event: { name: string; status: string; submissions?: Array<{ title?: string; by?: string; votes?: number }>; pollOptions?: Array<{ label: string; votes?: number }> }): void {
  p.log.info(`\n📋 ${event.name}`);
  p.log.info(`Status: ${event.status}`);
  
  if (event.submissions?.length) {
    p.log.info('\nSubmissions:');
    event.submissions.forEach((s, i) => {
      p.log.info(`  ${i + 1}. ${s.title || 'Untitled'} ${s.by ? `(by ${s.by})` : ''} ${s.votes !== undefined ? `— ${s.votes} votes` : ''}`);
    });
  }

  if (event.pollOptions?.length) {
    p.log.info('\nPoll Options:');
    event.pollOptions.forEach((o, i) => {
      p.log.info(`  ${i + 1}. ${o.label} ${o.votes !== undefined ? `— ${o.votes} votes` : ''}`);
    });
  }
}

// ============ Action Flows ============

async function createEventFlow(token: string, topicId?: string): Promise<void> {
  if (!topicId) {
    const selected = await selectTopic(token);
    if (!selected) return;
    topicId = selected;
  }

  const name = await p.text({
    message: 'Event name',
    placeholder: 'e.g., Movie Night',
  });

  if (p.isCancel(name) || !name) {
    return;
  }

  try {
    const result = await createEvent(token, topicId, name as string) as {
      event?: { id?: string; name?: string };
      link?: string;
    };
    const eventId = result.event?.id || 'unknown';
    const eventName = result.event?.name || name;
    p.log.success(`Event created! (${eventId})`);
    p.log.info(`\n🎯 ${eventName}`);
    if (result.link) {
      p.log.info(`🔗 ${result.link}`);
    }
  } catch (error) {
    p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function createPollFlow(token: string, topicId?: string): Promise<void> {
  if (!topicId) {
    const selected = await selectTopic(token);
    if (!selected) return;
    topicId = selected;
  }

  const name = await p.text({
    message: 'Poll question',
    placeholder: 'e.g., Where should we eat?',
  });

  if (p.isCancel(name) || !name) {
    return;
  }

  p.log.info('Enter poll options (minimum 2, leave empty when done):');
  const options: string[] = [];
  
  while (true) {
    const option = await p.text({
      message: `Option ${options.length + 1}`,
      placeholder: options.length >= 2 ? '(leave empty to finish)' : 'Enter option',
    });

    if (p.isCancel(option)) {
      return;
    }

    if (!option && options.length >= 2) {
      break;
    }

    if (option) {
      options.push(option as string);
    } else if (options.length < 2) {
      p.log.warn('Need at least 2 options');
    }
  }

  try {
    const result = await createPoll(token, topicId, name as string, options) as {
      event?: { id?: string; name?: string };
      link?: string;
    };
    const eventId = result.event?.id || 'unknown';
    const eventName = result.event?.name || name;
    p.log.success(`Poll created! (${eventId})`);
    p.log.info(`\n📊 ${eventName}`);
    options.forEach((opt, i) => {
      p.log.info(`   ${i + 1}. ${opt}`);
    });
    if (result.link) {
      p.log.info(`\n🔗 ${result.link}`);
    }
  } catch (error) {
    p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function repeatEventFlow(token: string): Promise<void> {
  // Get completed events
  const response = await listEvents(token, 'completed') as {
    events?: Array<{
      id: string;
      name: string;
      status: string;
      topic?: { id: string; name: string; icon?: string };
      group?: { id: string; name: string };
    }>;
  };
  const completedEvents = response.events || [];

  if (!completedEvents.length) {
    p.log.warn('No completed events to repeat. Create a new event first.');
    return;
  }

  // Get active events to filter out duplicates
  const activeResponse = await listEvents(token, 'submitting,voting') as {
    events?: Array<{ name: string; topic?: { id: string } }>;
  };
  const activeEvents = activeResponse.events || [];
  const activeSet = new Set(activeEvents.map(e => `${e.topic?.id}:${e.name}`));

  // Filter out events that already have an active version
  const availableEvents = completedEvents.filter(e =>
    !activeSet.has(`${e.topic?.id}:${e.name}`)
  );

  if (!availableEvents.length) {
    p.log.warn('All past events already have active versions. Create a new event instead.');
    return;
  }

  const options: SelectOption[] = [
    { value: '_back', label: '← Back' },
    ...availableEvents.slice(0, 15).map(e => {
      const icon = e.topic?.icon || '🎯';
      const topicName = e.topic?.name || '';
      const groupName = e.group?.name || '';
      return {
        value: `${e.topic?.id}|${e.name}`,
        label: `${icon} ${e.name} (${topicName} • ${groupName})`,
      };
    }),
  ];

  const selected = await p.select({
    message: '🔄 Select an event to repeat',
    options,
  });

  if (p.isCancel(selected) || selected === '_back') {
    return;
  }

  const [topicId, eventName] = (selected as string).split('|');

  try {
    const result = await createEvent(token, topicId, eventName) as {
      event?: { id?: string };
    };
    p.log.success(`Event "${eventName}" repeated! (${result.event?.id || 'unknown'})`);
  } catch (error) {
    p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function submitPicksFlow(token: string, eventId: string): Promise<void> {
  p.log.info('Enter your picks (leave empty when done):');
  const picks: string[] = [];

  while (true) {
    const pick = await p.text({
      message: `Pick ${picks.length + 1}`,
      placeholder: picks.length >= 1 ? '(leave empty to finish)' : 'e.g., The Matrix',
    });

    if (p.isCancel(pick)) {
      return;
    }

    if (!pick && picks.length >= 1) {
      break;
    }

    if (pick) {
      picks.push(pick as string);
    } else if (picks.length < 1) {
      p.log.warn('Enter at least one pick');
    }
  }

  const spinner = p.spinner();
  spinner.start('Submitting picks...');

  try {
    for (const title of picks) {
      await submitPick(token, eventId, title);
    }
    spinner.stop(`Submitted ${picks.length} pick(s)!`);
  } catch (error) {
    spinner.stop('Failed');
    p.log.error(`${error instanceof Error ? error.message : error}`);
  }
}

async function voteFlow(
  token: string, 
  eventId: string, 
  submissions: Array<{ id: string; title?: string; by?: string }>,
  pollOptions: Array<{ id: string; label: string }>
): Promise<void> {
  const items = submissions.length 
    ? submissions.map(s => ({ value: s.id, label: s.title || 'Untitled', hint: s.by }))
    : pollOptions.map(o => ({ value: o.id, label: o.label }));

  if (!items.length) {
    p.log.warn('Nothing to vote on yet.');
    return;
  }

  const selected = await p.multiselect({
    message: 'Select your vote(s)',
    options: items,
    required: true,
  });

  if (p.isCancel(selected)) {
    return;
  }

  const spinner = p.spinner();
  spinner.start('Casting votes...');

  try {
    await voteForSubmissions(token, eventId, selected as string[]);
    spinner.stop(`Cast ${(selected as string[]).length} vote(s)!`);
  } catch (error) {
    spinner.stop('Failed');
    if (error instanceof ApiError && error.status === 409) {
      p.log.warn('Already voted for all selected options.');
    } else {
      p.log.error(`${error instanceof Error ? error.message : error}`);
    }
  }
}

async function advanceEventFlow(token: string, eventId: string): Promise<void> {
  const confirm = await p.confirm({
    message: 'Advance to next phase?',
  });

  if (p.isCancel(confirm) || !confirm) {
    return;
  }

  try {
    await advanceEvent(token, eventId);
    p.log.success('Event advanced!');
  } catch (error) {
    p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function showKarma(token: string, groupId?: string): Promise<void> {
  try {
    const response = await getKarma(token, groupId) as { 
      karma?: Array<{ 
        weight?: number; 
        topic?: { id?: string; name?: string; icon?: string };
        group?: { id?: string; name?: string };
      }> 
    };
    const karma = response.karma || [];

    if (!karma.length) {
      p.log.info('No karma data yet. Win some decisions to earn karma!');
      return;
    }

    p.log.info('\n⭐ Your Karma:');
    karma.forEach((k) => {
      const icon = k.topic?.icon || '📋';
      const topic = k.topic?.name || 'Unknown topic';
      const group = k.group?.name ? ` (${k.group.name})` : '';
      p.log.info(`  ${icon} ${topic}${group} — ${k.weight || 0} karma`);
    });
  } catch (error) {
    p.log.error(`Failed: ${error instanceof Error ? error.message : error}`);
  }
}

// ============ Simple Selectors (for CLI commands) ============

export async function selectGroup(token: string): Promise<string | null> {
  const response = await listGroups(token) as { groups?: Array<{ id: string; name: string; memberCount?: number }> };
  const groups = response.groups || [];
  
  if (!groups.length) {
    p.log.warn('No groups found. Create one at pikarama.com');
    return null;
  }

  const options: SelectOption[] = groups.map(g => ({
    value: g.id,
    label: g.name,
    hint: g.memberCount ? `${g.memberCount} members` : undefined,
  }));

  const result = await p.select({
    message: 'Select a group',
    options,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as string;
}

export async function selectTopic(token: string, groupId?: string): Promise<string | null> {
  // First select group if not provided
  if (!groupId) {
    const selectedGroup = await selectGroup(token);
    if (!selectedGroup) return null;
    groupId = selectedGroup;
  }

  const response = await getGroup(token, groupId) as { 
    group?: { 
      topics?: Array<{ id: string; name: string; icon?: string }> 
    } 
  };
  
  let topics = response.group?.topics || [];
  
  if (!topics.length) {
    const topicsResponse = await fetch(`https://www.pikarama.com/api/v1/groups/${groupId}/topics`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()) as { topics?: Array<{ id: string; name: string; icon?: string }> };
    topics = topicsResponse.topics || [];
  }

  if (!topics.length) {
    p.log.warn('No topics in this group. Create one at pikarama.com');
    return null;
  }

  // Auto-select if only one topic (common for free plans)
  if (topics.length === 1) {
    const topic = topics[0];
    p.log.info(`Using topic: ${topic.icon || '📋'} ${topic.name}`);
    return topic.id;
  }

  const options: SelectOption[] = topics.map(t => ({
    value: t.id,
    label: `${t.icon || '📋'} ${t.name}`,
  }));

  const result = await p.select({
    message: 'Select a topic',
    options,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as string;
}

export async function selectEvent(token: string, status?: string): Promise<string | null> {
  const response = await listEvents(token, status) as { 
    events?: Array<{ id: string; name: string; status: string; topic?: { name: string; icon?: string } }> 
  };
  const events = response.events || [];

  if (!events.length) {
    p.log.warn('No active events found.');
    return null;
  }

  const options: SelectOption[] = events.map(e => {
    const topicInfo = e.topic?.icon || e.topic?.name ? ` (${e.topic?.icon || ''} ${e.topic?.name || ''})` : '';
    const statusEmoji = e.status === 'submitting' ? '📝' : e.status === 'voting' ? '🗳️' : '✅';
    return {
      value: e.id,
      label: `${statusEmoji} ${e.name}${topicInfo}`,
    };
  });

  const result = await p.select({
    message: 'Select an event',
    options,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as string;
}

export async function selectSubmission(
  submissions: Array<{ id: string; title?: string; by?: string }>
): Promise<string | null> {
  if (!submissions.length) {
    p.log.warn('No submissions to choose from.');
    return null;
  }

  const options: SelectOption[] = submissions.map(s => ({
    value: s.id,
    label: s.title || 'Untitled',
    hint: s.by ? `by ${s.by}` : undefined,
  }));

  const result = await p.select({
    message: 'Vote for',
    options,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as string;
}

export async function selectMultipleSubmissions(
  submissions: Array<{ id: string; title?: string; by?: string }>
): Promise<string[] | null> {
  if (!submissions.length) {
    p.log.warn('No submissions to choose from.');
    return null;
  }

  const options = submissions.map(s => ({
    value: s.id,
    label: s.title || 'Untitled',
    hint: s.by ? `by ${s.by}` : undefined,
  }));

  const result = await p.multiselect({
    message: 'Vote for (select multiple)',
    options,
    required: true,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as string[];
}

export async function promptText(message: string, placeholder?: string): Promise<string | null> {
  const result = await p.text({
    message,
    placeholder,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as string;
}

export async function promptConfirm(message: string): Promise<boolean> {
  const result = await p.confirm({
    message,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result as boolean;
}

export async function multiText(message: string, minItems = 2): Promise<string[]> {
  const items: string[] = [];
  
  p.log.info(message);
  
  while (true) {
    const item = await p.text({
      message: `Option ${items.length + 1}`,
      placeholder: items.length >= minItems ? '(leave empty to finish)' : 'Enter option',
    });

    if (p.isCancel(item)) {
      p.cancel('Cancelled');
      process.exit(0);
    }

    if (!item && items.length >= minItems) {
      break;
    }

    if (item) {
      items.push(item as string);
    }
  }

  return items;
}

export { p };
