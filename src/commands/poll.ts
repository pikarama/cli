import { Command } from 'commander';
import { addOutputOptions, handleOutput, OutputOptions } from '../output.js';
import { wrapAction, CliError } from '../errors.js';
import { requireToken, extractResource } from '../utils.js';
import { createPoll, PollResult, PollOption } from '../api.js';
import { selectGroup, selectTopic, promptText, multiText, p } from '../interactive.js';

function collectOption(value: string, previous: string[]) {
  return previous.concat(value);
}

interface PollCommandOptions extends OutputOptions {
  option?: string[];
}

export function createPollCommand(): Command {
  const cmd = new Command('poll');
  cmd.description('Create a quick poll');
  cmd.argument('[topicId]', 'Topic ID');
  cmd.argument('[question]', 'Poll question');
  cmd.option('-o, --option <option>', 'Poll option (repeat for multiple)', collectOption, []);
  addOutputOptions(cmd);

  cmd.action(
    wrapAction(async (topicId, question, options) => {
      const opts = options as PollCommandOptions;
      const token = await requireToken();
      
      let topicValue = topicId ? String(topicId) : null;
      let pollQuestion = question ? String(question) : null;
      let choices = opts.option ?? [];

      // Interactive mode
      if (!opts.json && !opts.quiet) {
        if (!topicValue) {
          p.intro('📊 Create a poll');
          const groupId = await selectGroup(token);
          if (!groupId) return;
          topicValue = await selectTopic(token, groupId);
          if (!topicValue) return;
        }
        
        if (!pollQuestion) {
          pollQuestion = await promptText('Poll question', 'Where should we eat?');
          if (!pollQuestion) return;
        }
        
        if (choices.length < 2) {
          choices = await multiText('Add poll options (minimum 2)', 2);
          if (choices.length < 2) {
            throw new CliError('Please provide at least two poll options.');
          }
        }
      }

      if (!topicValue || !pollQuestion) {
        console.error('Usage: pikarama poll <topicId> <question> --option "A" --option "B"');
        return;
      }
      
      if (choices.length < 2) {
        throw new CliError('Please provide at least two poll options.');
      }

      const payload = await createPoll(token, topicValue, pollQuestion, choices);
      const poll = extractResource<PollResult>(payload, ['poll', 'event']);

      handleOutput(
        poll,
        opts,
        (value: PollResult) => {
          p.log.success(`Poll created! (${value.id ?? 'unknown id'})`);
          console.log(`\n📊 ${pollQuestion}`);
          if (value.options?.length) {
            value.options.forEach((option: PollOption, index: number) => {
              console.log(`   ${index + 1}. ${option.label ?? option.id ?? 'Option'}`);
            });
          } else {
            choices.forEach((choice, index) => {
              console.log(`   ${index + 1}. ${choice}`);
            });
          }
          console.log();
        },
        (value: PollResult) => {
          if (value.id) console.log(value.id);
        }
      );
    })
  );

  return cmd;
}
