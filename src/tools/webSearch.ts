import type {Tool} from './Tool.js';
import type {SearchProvider} from '../search/SearchProvider.js';
import {errorMessage} from '../utils/json.js';

export function createWebSearchTool(searchProvider: SearchProvider): Tool {
  return {
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

      try {
        const results = await searchProvider.search(query);

        if (results.length === 0) {
          return `
                SEARCH_STATUS: NO_RESULTS
                The search provider returned no results for this query:
                "${query}"
                This does NOT prove that the topic or information does not exist.
                Try a different search query.
        `.trim();
        }

        return results
          .map(
            (result) =>
              `Title: ${result.title}
              URL: ${result.url}
              Description: ${result.description}`,
          )
          .join('\n\n');
      } catch (error) {
        return `SEARCH_STATUS: ERROR\nSearch failed for "${query}": ${errorMessage(error)}`;
      }
    },
  };
}
