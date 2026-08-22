import {readFile} from 'node:fs/promises';
import type {Tool} from './Tool.js';
import {resolveWorkspacePath} from './workspace.js';

export function createReadFileTool(workspace: string): Tool {
  return {
    name: 'read_file',
    description: 'Reads the contents of a file from the project workspace.',
    parameters: {
      type: 'object',

      properties: {
        path: {
          type: 'string',
          description: 'The path of the file to read, relative to the workspace.',
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
        const filePath = resolveWorkspacePath(workspace, path);

        return await readFile(filePath, 'utf-8');
      } catch (error) {
        return `Error reading file "${path}": ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  };
}
