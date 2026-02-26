#!/usr/bin/env node

import { Command } from 'commander';
import { createLoginCommand } from './commands/login.js';
import { createLogoutCommand } from './commands/logout.js';
import { createGroupsCommand } from './commands/groups.js';
import { createEventsCommand } from './commands/events.js';
import { createPollCommand } from './commands/poll.js';
import { createKarmaCommand } from './commands/karma.js';
import { createMeCommand } from './commands/me.js';
import { showMainMenu } from './interactive.js';

const program = new Command();

program
  .name('pikarama')
  .description('CLI for Pikarama - karma-weighted group decisions')
  .version('0.2.0');

program.addCommand(createLoginCommand());
program.addCommand(createLogoutCommand());
program.addCommand(createGroupsCommand());
program.addCommand(createEventsCommand());
program.addCommand(createPollCommand());
program.addCommand(createKarmaCommand());
program.addCommand(createMeCommand());

// Show interactive menu when no command is provided
async function main() {
  // Check if a subcommand was provided
  const args = process.argv.slice(2);
  const hasCommand = args.length > 0 && !args[0].startsWith('-');
  
  if (hasCommand) {
    // Run commander normally
    await program.parseAsync(process.argv);
  } else if (args.includes('--help') || args.includes('-h') || args.includes('--version') || args.includes('-V')) {
    // Let commander handle help/version
    await program.parseAsync(process.argv);
  } else {
    // No command - show interactive menu
    await showMainMenu();
  }
}

main().catch((error) => {
  console.error('Failed to run CLI:', error);
  process.exit(1);
});
