import {mkdir, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {Tool} from './Tool.js';
import {resolveWorkspacePath} from './workspace.js';

export function createWriteFileTool(workspace: string): Tool {
  return {
    name: 'write_file',
    description: 'Writes content to a file in the project workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the file to write, relative to the workspace.',
        },
        content: {
          type: 'string',
          description: 'The exact content to write to the file.',
        },
      },
      required: ['path', 'content'],
    },

    execute: async (args) => {
      const path = args.path;
      const content = args.content;

      if (typeof path !== 'string' || path.trim() === '') {
        return 'Error: path must be a non-empty string.';
      }

      if (typeof content !== 'string') {
        return 'Error: content must be a string.';
      }

      try {
        const filePath = resolveWorkspacePath(workspace, path);

        await mkdir(dirname(filePath), {recursive: true});
        await writeFile(filePath, content, 'utf-8');

        return `Successfully wrote file "${path}".`;
      } catch (error) {
        return `Error writing file "${path}": ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  };
}
