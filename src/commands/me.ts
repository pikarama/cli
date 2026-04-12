import { Command } from 'commander';
import { addOutputOptions, getCommandOptions, handleOutput, OutputOptions } from '../output.js';
import { wrapAction } from '../errors.js';
import { requireToken } from '../utils.js';
import { getMe, MeResponse } from '../api.js';

export function createMeCommand(): Command {
  const cmd = new Command('me');
  cmd.description('Show current user info (verify which account the API token belongs to)');
  addOutputOptions(cmd);

  cmd.action(
    wrapAction(async (options) => {
      const opts = getCommandOptions<OutputOptions>(options);
      const token = await requireToken();
      const data = await getMe(token);

      handleOutput(
        data,
        opts,
        (response: MeResponse) => {
          const { user, stats } = response;
          console.log('\n👤 Current User');
          console.log('━'.repeat(40));
          console.log(`  ID:      ${user.id}`);
          console.log(`  Name:    ${user.name || '—'}`);
          console.log(`  Email:   ${user.email || '—'}`);
          if (user.created_at) {
            console.log(`  Since:   ${new Date(user.created_at).toLocaleDateString()}`);
          }
          console.log('\n📊 Stats');
          console.log('━'.repeat(40));
          console.log(`  Groups:     ${stats.groups}`);
          console.log(`  API Tokens: ${stats.api_tokens}`);
          console.log(`  Webhooks:   ${stats.webhooks}`);
          console.log('');
        },
        (response: MeResponse) => {
          // Plain output - just the user ID
          console.log(response.user.id);
        }
      );
    })
  );

  return cmd;
}
