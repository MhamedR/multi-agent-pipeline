import type {Tool} from './Tool.js';

export const getTimeTool: Tool = {
  name: 'get_time',
  description: 'Returns the current date and time.',
  parameters: {type: 'object', properties: {}},
  execute: (_args) => {
    return new Date().toISOString();
  },
};
