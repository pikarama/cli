import { Command } from 'commander';
import * as p from '@clack/prompts';
import { CliError, wrapAction } from '../errors.js';
import { setToken } from '../config.js';
import { listGroups } from '../api.js';

export async function doLogin(): Promise<void> {
  const token = await p.text({
    message: 'API token',
    placeholder: 'pk_...',
    validate: (value) => {
      if (!value) return 'API token cannot be empty';
      if (!value.startsWith('pk_')) return 'Token should start with pk_';
    },
  });

  if (p.isCancel(token)) {
    p.cancel('Cancelled');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Validating token...');

  try {
    await listGroups(token as string);
    await setToken(token as string);
    spinner.stop('✅ Token saved! You are now logged in.');
  } catch (error) {
    spinner.stop('Failed');
    throw error;
  }
}

export function createLoginCommand(): Command {
  const cmd = new Command('login');
  cmd.description('Store your API token');

  cmd.action(wrapAction(async () => {
    await doLogin();
  }));

  return cmd;
}
