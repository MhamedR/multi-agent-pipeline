import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {Tool} from './Tool.js';

const execFileAsync = promisify(execFile);

export function createRunCommandTool(workspace: string): Tool {
  return {
    name: 'run_command',
    description: 'Runs a command inside the project workspace.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute.',
        },
      },

      required: ['command'],
    },

    execute: async (args) => {
      const command = args.command;

      if (typeof command !== 'string' || command.trim() === '') {
        return 'Error: command must be a non-empty string.';
      }

      try {
        const {stdout, stderr} = await execFileAsync('/bin/sh', ['-c', command], {
          cwd: workspace,
          maxBuffer: 1024 * 1024,
        });

        return [stdout ? `STDOUT:\n${stdout}` : '', stderr ? `STDERR:\n${stderr}` : '']
          .filter(Boolean)
          .join('\n');
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'stdout' in error && 'stderr' in error) {
          const commandError = error as {
            stdout?: string;
            stderr?: string;
          };

          return [
            'COMMAND_FAILED',
            commandError.stdout ? `STDOUT:\n${commandError.stdout}` : '',
            commandError.stderr ? `STDERR:\n${commandError.stderr}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        }

        return `Error running command: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  };
}
