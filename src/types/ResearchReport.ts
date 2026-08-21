export interface ResearchSource {
  title: string;
  url: string;
  description: string;
}

export interface ResearchFinding {
  claim: string;
  explanation: string;
  sources: string[];
}

export interface ResearchReport {
  topic: string;
  summary: string;
  findings: ResearchFinding[];
  sources: ResearchSource[];
}
