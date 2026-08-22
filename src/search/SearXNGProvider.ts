import type {SearchProvider, SearchResult} from './SearchProvider.js';

export class SearXNGProvider implements SearchProvider {
  constructor(private readonly baseUrl: string) {}

  async search(query: string): Promise<SearchResult[]> {
    const url = new URL('/search', this.baseUrl);

    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SearXNG search failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    return (data.results ?? [])
      .slice(0, 5)
      .map((result: {title?: string; url?: string; content?: string}): SearchResult => ({
        title: result.title ?? query,
        url: result.url ?? '',
        description: result.content ?? '',
      }));
  }
}
