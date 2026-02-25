import { Command } from 'commander';
import { addOutputOptions, handleOutput, OutputOptions } from '../output.js';
import { wrapAction } from '../errors.js';
import { requireToken, extractList, extractResource } from '../utils.js';
import { Group, listGroups, getGroup, createGroup, joinGroup } from '../api.js';
import { selectGroup, promptText, p } from '../interactive.js';

export function createGroupsCommand(): Command {
  const cmd = new Command('groups');
  cmd.description('Manage your Pikarama groups');
  addOutputOptions(cmd);

  cmd.action(
    wrapAction(async (options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      const payload = await listGroups(token);
      const groups = extractList<Group>(payload, ['groups', 'data']);

      // Interactive mode: select a group and show details
      if (!opts.json && !opts.quiet && groups.length > 0) {
        const groupId = await selectGroup(token);
        if (groupId) {
          const detail = await getGroup(token, groupId);
          const group = extractResource<Group>(detail, ['group']);
          showGroupDetails(group);
        }
        return;
      }

      handleOutput(
        groups,
        opts,
        (items: Group[]) => {
          if (!items.length) {
            console.log('No groups found.');
            return;
          }
          console.table(
            items.map((group) => ({
              ID: group.id,
              Name: group.name ?? 'Untitled',
              Members: group.members_count ?? '—',
            }))
          );
        },
        (items: Group[]) => {
          if (!items.length) return;
          items.forEach((group) => console.log(group.id));
        }
      );
    })
  );

  const showCmd = cmd
    .command('show [groupId]')
    .description('Show details about a specific group');
  addOutputOptions(showCmd);
  showCmd.action(
    wrapAction(async (groupId, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let id = groupId ? String(groupId) : null;
      if (!id && !opts.json && !opts.quiet) {
        id = await selectGroup(token);
      }
      if (!id) return;

      const payload = await getGroup(token, id);
      const group = extractResource<Group>(payload, ['group']);

      handleOutput(
        group,
        opts,
        (value: Group) => showGroupDetails(value),
        (value: Group) => console.log(value.id)
      );
    })
  );

  const createCmd = cmd.command('create [name]').description('Create a new group');
  addOutputOptions(createCmd);
  createCmd.action(
    wrapAction(async (name, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let groupName = name ? String(name) : null;
      
      if (!groupName && !opts.json && !opts.quiet) {
        p.intro('Create new group');
        groupName = await promptText('Group name', 'Friday Night Crew');
      }
      
      if (!groupName) {
        console.error('Usage: pikarama groups create <name>');
        return;
      }

      const payload = await createGroup(token, { name: groupName });
      const group = extractResource<Group>(payload, ['group']);

      handleOutput(
        group,
        opts,
        (value: Group) => {
          p.log.success(`Created group "${value.name}" (${value.id})`);
          if (value.invite_code) {
            console.log(`\n📨 Invite code: ${value.invite_code}`);
            console.log(`   Share: https://www.pikarama.com/join/${value.invite_code}\n`);
          }
        },
        (value: Group) => console.log(value.id)
      );
    })
  );

  const joinCmd = cmd.command('join [code]').description('Join a group via an invite code');
  addOutputOptions(joinCmd);
  joinCmd.action(
    wrapAction(async (code, options) => {
      const opts = options as OutputOptions;
      const token = await requireToken();
      
      let inviteCode = code ? String(code) : null;
      
      if (!inviteCode && !opts.json && !opts.quiet) {
        inviteCode = await promptText('Invite code', 'ABC123');
      }
      
      if (!inviteCode) {
        console.error('Usage: pikarama groups join <code>');
        return;
      }

      const payload = await joinGroup(token, inviteCode);
      const group = extractResource<Group>(payload, ['group']);

      handleOutput(
        group,
        opts,
        (value: Group) => p.log.success(`Joined "${value.name}"!`),
        (value: Group) => console.log(value.id)
      );
    })
  );

  return cmd;
}

function showGroupDetails(group: Group): void {
  console.log();
  console.log(`👥 ${group.name ?? 'Untitled'}`);
  console.log(`   ID: ${group.id}`);
  if (typeof group.members_count === 'number') {
    console.log(`   Members: ${group.members_count}`);
  }
  if (group.invite_code) {
    console.log(`   Invite: ${group.invite_code}`);
  }
  console.log();
}
