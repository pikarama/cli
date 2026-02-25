import { Command } from 'commander';
import * as p from '@clack/prompts';
import { clearConfig } from '../config.js';
import { wrapAction } from '../errors.js';

export async function doLogout(): Promise<void> {
  await clearConfig();
  p.log.success('Logged out. Stored token removed.');
}

export function createLogoutCommand(): Command {
  const cmd = new Command('logout');
  cmd.description('Forget your stored API token');

  cmd.action(wrapAction(async () => {
    await doLogout();
  }));

  return cmd;
}
