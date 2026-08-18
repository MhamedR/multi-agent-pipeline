import type {Tool} from './Tool.js';

export const getTimeTool: Tool = {
  name: 'get_time',
  description: 'Returns the current date and time.',
  execute: () => {
    return new Date().toISOString();
  },
};
