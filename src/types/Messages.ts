export type AgentName = 'orchestrator' | 'research' | 'coding' | 'testing' | 'reviewer';

export type AgentMessage = {
  from: AgentName;
  to: AgentName;
  at: string;
  summary: string;
  body: string;
};
