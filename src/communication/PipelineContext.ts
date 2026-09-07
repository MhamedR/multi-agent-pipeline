import type {ResearchReport} from '../types/ResearchReport.js';
import type {TestReport} from '../types/TestReport.js';
import type {ReviewReport} from '../types/ReviewReport.js';
import type {AgentMessage, AgentName} from './messages.js';

export type PipelineStatus = 'running' | 'passed' | 'failed';

export class PipelineContext {
  research?: ResearchReport;
  codeOutput?: string;
  testReport?: TestReport;
  reviewReport?: ReviewReport;
  iteration = 0;
  status: PipelineStatus = 'running';
  readonly messages: AgentMessage[] = [];

  constructor(readonly task: string) {}

  send(from: AgentName, to: AgentName, summary: string, body: string): void {
    this.messages.push({
      from,
      to,
      at: new Date().toISOString(),
      summary,
      body,
    });

    console.log(`[${from} → ${to}] ${summary}`);
  }
}
