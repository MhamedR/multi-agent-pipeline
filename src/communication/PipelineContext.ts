import type {ResearchReport} from '../types/ResearchReport.js';
import type {TestReport} from '../types/TestReport.js';
import type {ReviewReport} from '../types/ReviewReport.js';
import type {AgentMessage, AgentName} from '../types/Messages.js';

// Represents the overall state of the pipeline.
export type PipelineStatus = 'running' | 'passed' | 'failed';
export class PipelineContext {
  // Research results produced by the Research Agent.
  // This is optional because research may not have been completed yet.
  research?: ResearchReport;
  // Free-form notes returned by the Coding Agent after implementation.
  codeOutput?: string;
  // Results from the Testing Agent, including executed commands
  // and any failures that were detected.
  testReport?: TestReport;
  // Results from the Reviewer Agent, including issues and suggestions.
  reviewReport?: ReviewReport;
  // Tracks how many times the pipeline has gone through a fix iteration.
  // Starts at 0 because the first implementation is not considered a fix.
  iteration = 0;
  // Tracks the current overall state of the pipeline.
  // A new pipeline starts in the "running" state.
  status: PipelineStatus = 'running';
  // Stores a history of messages exchanged between pipeline agents.
  // This provides a record of what each stage communicated to another.
  readonly messages: AgentMessage[] = [];
  /**
   * Creates a new pipeline context for a task.
   *
   * The task is readonly because the original task should remain unchanged
   * throughout the entire pipeline.
   */
  constructor(readonly task: string) {}
  /**
   * Records a message sent from one agent to another.
   *
   * Messages are stored in the context so the pipeline has a history of
   * agent communication. A short summary is also logged to the console
   * for visibility while the pipeline is running.
   *
   * @param from Agent sending the message.
   * @param to Agent receiving the message.
   * @param summary Short description displayed in the console.
   * @param body Full message content passed between agents.
   */
  send(from: AgentName, to: AgentName, summary: string, body: string): void {
    // Store the complete message in the pipeline history.
    this.messages.push({
      from,
      to,
      at: new Date().toISOString(),
      summary,
      body,
    });
    // Log a concise version of the communication so we can follow
    // the pipeline's progress while it is executing.
    console.log(`[${from} → ${to}] ${summary}`);
  }
}
