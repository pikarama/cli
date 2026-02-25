#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('pikarama')
  .description('CLI for Pikarama - karma-weighted group decisions')
  .version('0.0.1');

program
  .command('login')
  .description('Store your API token')
  .action(() => {
    console.log('🚧 Coming soon! Get your token at https://www.pikarama.com/settings');
  });

program
  .command('groups')
  .description('List your groups')
  .action(() => {
    console.log('🚧 Coming soon!');
  });

program
  .command('events')
  .description('List active events')
  .action(() => {
    console.log('🚧 Coming soon!');
  });

program
  .command('poll')
  .description('Create a quick poll')
  .argument('<topic-id>', 'Topic ID')
  .argument('<question>', 'Poll question')
  .option('-o, --option <option>', 'Poll option (repeat for multiple)', (val, acc: string[]) => [...acc, val], [])
  .action((topicId, question, options) => {
    console.log('🚧 Coming soon!');
    console.log(`Would create poll: "${question}" in topic ${topicId}`);
    console.log(`Options: ${options.option.join(', ')}`);
  });

program
  .command('karma')
  .description('View your karma')
  .action(() => {
    console.log('🚧 Coming soon!');
  });

program.parse();
