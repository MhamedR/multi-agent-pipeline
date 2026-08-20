export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
