import type {Tool} from './Tool.js';
import {DuckDuckGoProvider} from '../search/DuckDuckGoProvider.js';

const searchProvider = new DuckDuckGoProvider();

export const webSearchTool: Tool = {
  name: 'web_search',

  description: 'Searches the web and returns relevant results.',

  parameters: {
    type: 'object',

    properties: {
      query: {
        type: 'string',
        description: 'The search query.',
      },
    },

    required: ['query'],
  },

  execute: async (args) => {
    const query = args.query;

    if (typeof query !== 'string' || query.trim() === '') {
      return 'Error: query must be a non-empty string.';
    }

    const results = await searchProvider.search(query);

    if (results.length === 0) {
      return `No results found for: ${query}`;
    }

    return results
      .map(
        (result) =>
          `Title: ${result.title}
          URL: ${result.url}
          Description: ${result.description}`,
      )
      .join('\n\n');
  },
};
