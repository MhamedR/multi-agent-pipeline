import type {SearchProvider, SearchResult} from './SearchProvider.js';
import {errorMessage} from '../utils/json.js';

export class FallbackSearchProvider implements SearchProvider {
  constructor(private readonly providers: SearchProvider[]) {}

  async search(query: string): Promise<SearchResult[]> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        const results = await provider.search(query);
        if (results.length > 0) {
          return results;
        }
      } catch (error) {
        errors.push(errorMessage(error));
      }
    }

    if (errors.length > 0) {
      throw new Error(`All search providers failed: ${errors.join('; ')}`);
    }

    return [];
  }
}
