import {readdir} from 'node:fs/promises';
import type {Tool} from './Tool.js';
import {resolveWorkspacePath} from './workspace.js';

export function createListFilesTool(workspace: string): Tool {
  return {
    name: 'list_files',
    description: 'Lists files and directories inside the project workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path relative to the workspace.',
        },
      },
    },

    execute: async (args) => {
      const path = typeof args.path === 'string' ? args.path : '.';

      try {
        const directoryPath = resolveWorkspacePath(workspace, path);

        const entries = await readdir(directoryPath, {
          withFileTypes: true,
        });

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
