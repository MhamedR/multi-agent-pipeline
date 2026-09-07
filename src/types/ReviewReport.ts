export type ReviewIssue = {
  severity: 'error' | 'warning' | 'info';
  file?: string;
  description: string;
};

export type ReviewReport = {
  passed: boolean;
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
};
