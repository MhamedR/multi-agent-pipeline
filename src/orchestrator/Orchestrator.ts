import {mkdir} from 'node:fs/promises';
import {ResearchAgent} from '../agents/ResearchAgent.js';
import {CodingAgent} from '../agents/CodingAgent.js';
import {TestingAgent} from '../agents/TestingAgent.js';
import {ReviewerAgent} from '../agents/ReviewerAgent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createWebSearchTool} from '../tools/webSearch.js';
import {SearXNGProvider} from '../search/SearXNGProvider.js';
import type {ResearchReport} from '../types/ResearchReport.js';
import type {TestReport} from '../types/TestReport.js';
import type {ReviewReport} from '../types/ReviewReport.js';

export type OrchestratorResult = {
  task: string;
  research: ResearchReport;
  code: string;
  test: TestReport;
  review: ReviewReport;
};

export class Orchestrator {
  private readonly researchAgent: ResearchAgent;
  private readonly codingAgent: CodingAgent;
  private readonly testingAgent: TestingAgent;
  private readonly reviewerAgent: ReviewerAgent;

  constructor(private readonly workspace: string) {
    const searchProvider = new SearXNGProvider(process.env.SEARXNG_URL ?? 'http://localhost:8080');
    const researchRegistry = new ToolRegistry();
    researchRegistry.register(createWebSearchTool(searchProvider));

    this.researchAgent = new ResearchAgent(researchRegistry);
    this.codingAgent = new CodingAgent(new ToolRegistry(), workspace);
    this.testingAgent = new TestingAgent(workspace);
    this.reviewerAgent = new ReviewerAgent(workspace);
  }

  async run(task: string): Promise<OrchestratorResult> {
    await mkdir(this.workspace, {recursive: true});

    console.log('[Orchestrator] Starting research');
    const research = await this.researchAgent.research(task);

    console.log('[Orchestrator] Starting implementation');
    const code = await this.codingAgent.code(
      `
      Implement this task in the project workspace.

      Task:
      ${task}

      Research summary:
      ${research.summary}
      `.trim(),
    );

    console.log('[Orchestrator] Starting tests');
    const test = await this.testingAgent.test(
      `
      Verify that this task was implemented correctly in the project workspace.

      Task:
      ${task}
      `.trim(),
    );

    console.log('[Orchestrator] Starting review');
    const review = await this.reviewerAgent.review(
      `
      Review whether this task was implemented correctly in the project workspace.

      Task:
      ${task}
      `.trim(),
    );

    console.log('[Orchestrator] Pipeline finished');

    return {task, research, code, test, review};
  }
}
