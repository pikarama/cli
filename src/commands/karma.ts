import { Command } from 'commander';
import { addOutputOptions, handleOutput, OutputOptions } from '../output.js';
import { wrapAction } from '../errors.js';
import { requireToken, extractList } from '../utils.js';
import { getKarma, KarmaEntry } from '../api.js';

export function createKarmaCommand(): Command {
  const cmd = new Command('karma');
  cmd.description('View karma standings');
  cmd.argument('[groupId]', 'Optional group ID to filter karma');
  addOutputOptions(cmd);

  cmd.action(
    wrapAction(async (groupId, options) => {
      const groupValue = typeof groupId === 'undefined' ? undefined : String(groupId);
      const opts = options as OutputOptions;
      const token = await requireToken();
      const payload = await getKarma(token, groupValue);
      const entries = extractList<KarmaEntry>(payload, ['karma', 'entries', 'data']);

      handleOutput(
        entries,
        opts,
        (items: KarmaEntry[]) => {
          if (!items.length) {
            console.log('No karma data available.');
            return;
          }
          console.table(
            items.map((entry) => ({
              ID: entry.id ?? entry.topic?.id ?? entry.group?.id ?? '—',
              Name: entry.name ?? entry.topic?.name ?? entry.group?.name ?? '—',
              Karma: entry.karma ?? '—',
            }))
          );
        },
        (items: KarmaEntry[]) => {
          items.forEach((entry) => {
            const id = entry.id ?? entry.topic?.id ?? entry.group?.id ?? entry.name;
            if (id) {
              console.log(id);
            }
          });
        }
      );
    })
  );

  return cmd;
}
