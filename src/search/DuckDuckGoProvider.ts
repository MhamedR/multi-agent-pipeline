import type {SearchProvider, SearchResult} from './SearchProvider.js';

export class DuckDuckGoProvider implements SearchProvider {
  async search(query: string): Promise<SearchResult[]> {
    const url = new URL('https://api.duckduckgo.com/');

    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');

    const response = await fetch(url, {signal: AbortSignal.timeout(15_000)});

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    const results: SearchResult[] = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        description: data.AbstractText,
      });
    }

    for (const topic of data.RelatedTopics ?? []) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text,
          url: topic.FirstURL,
          description: topic.Text,
        });
      }

      if (results.length >= 5) {
        break;
      }
    }

    return results;
  }
}
