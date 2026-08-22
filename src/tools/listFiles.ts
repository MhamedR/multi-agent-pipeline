import {readdir} from 'node:fs/promises';
import type {Tool} from './Tool.js';

export function createListFilesTool(): Tool {
  return {
    name: 'list_files',
    description: 'Lists files and directories in a project directory.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory to inspect.',
        },
      },

      required: ['path'],
    },

    execute: async (args) => {
      const path = args.path;

      if (typeof path !== 'string' || path.trim() === '') {
        return 'Error: path must be a non-empty string.';
      }

      try {
        const entries = await readdir(path, {withFileTypes: true});

        return entries
          .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
          .join('\n');
      } catch (error) {
        return `Error listing directory "${path}": ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  };
}
