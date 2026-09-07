import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {Tool} from './Tool.js';

// Convert execFile's callback-based API into a Promise-based function.
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
      // Validate the command before attempting to execute it.
      if (typeof command !== 'string' || command.trim() === '') {
        return 'Error: command must be a non-empty string.';
      }
      try {
        // Run the command from the configured workspace.
        // Limit output size and execution time to avoid runaway processes.
        const {stdout, stderr} = await execFileAsync('/bin/sh', ['-c', command], {
          cwd: workspace,
          maxBuffer: 1024 * 1024,
          timeout: 60_000,
        });
        // Combine stdout and stderr into a single result for the agent.
        const output = [stdout ? `STDOUT:\n${stdout}` : '', stderr ? `STDERR:\n${stderr}` : '']
          .filter(Boolean)
          .join('\n');
        return output.length > 0 ? output : 'Command succeeded with no output.';
      } catch (error) {
        // Commands can fail while still producing useful stdout/stderr.
        // Preserve that output so the agent can understand what went wrong.
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
