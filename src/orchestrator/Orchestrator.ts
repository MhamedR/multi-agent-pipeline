import {mkdir} from 'node:fs/promises';
import {ResearchAgent} from '../agents/ResearchAgent.js';
import {CodingAgent} from '../agents/CodingAgent.js';
import {TestingAgent} from '../agents/TestingAgent.js';
import {ReviewerAgent} from '../agents/ReviewerAgent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createWebSearchTool} from '../tools/webSearch.js';
import {SearXNGProvider} from '../search/SearXNGProvider.js';
import {PipelineContext} from '../communication/PipelineContext.js';
import {
  codingHandoff,
  fixHandoff,
  reviewHandoff,
  testingHandoff,
} from '../communication/handoffs.js';
import type {AgentMessage} from '../communication/messages.js';
import type {PipelineStatus} from '../communication/PipelineContext.js';
import type {ResearchReport} from '../types/ResearchReport.js';
import type {TestReport} from '../types/TestReport.js';
import type {ReviewReport} from '../types/ReviewReport.js';

export type OrchestratorResult = {
  task: string;
  status: PipelineStatus;
  iterations: number;
  research: ResearchReport;
  code: string;
  test: TestReport | undefined;
  review: ReviewReport | undefined;
  messages: AgentMessage[];
};

export class Orchestrator {
  private readonly researchAgent: ResearchAgent;
  private readonly codingAgent: CodingAgent;
  private readonly testingAgent: TestingAgent;
  private readonly reviewerAgent: ReviewerAgent;

  constructor(
    private readonly workspace: string,
    private readonly maxIterations = 3,
  ) {
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

    const context = new PipelineContext(task);

    context.send('orchestrator', 'research', 'Assigned research task', task);
    context.research = await this.researchAgent.research(task);
    context.send('research', 'orchestrator', 'Completed research report', context.research.summary);

    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      context.iteration = iteration;

      const codingPrompt = iteration === 1 ? codingHandoff(context) : fixHandoff(context);
      context.send(
        'orchestrator',
        'coding',
        iteration === 1
          ? 'Assigned implementation with research'
          : `Assigned fix for iteration ${iteration}`,
        codingPrompt,
      );
      context.codeOutput = await this.codingAgent.code(codingPrompt);
      context.send('coding', 'orchestrator', 'Completed implementation', context.codeOutput);

      const testingPrompt = testingHandoff(context);
      context.send(
        'orchestrator',
        'testing',
        'Assigned verification with implementation notes',
        testingPrompt,
      );
      context.testReport = await this.testingAgent.test(testingPrompt);
      context.send(
        'testing',
        'orchestrator',
        context.testReport.passed ? 'Tests passed' : 'Tests failed',
        context.testReport.summary,
      );

      if (!context.testReport.passed) {
        context.send(
          'orchestrator',
          'coding',
          'Routing failed tests back to the Coding Agent',
          context.testReport.summary,
        );
        continue;
      }

      const reviewPrompt = reviewHandoff(context);
      context.send('orchestrator', 'reviewer', 'Assigned review with test results', reviewPrompt);
      context.reviewReport = await this.reviewerAgent.review(reviewPrompt);
      context.send(
        'reviewer',
        'orchestrator',
        context.reviewReport.passed ? 'Review passed' : 'Review failed',
        context.reviewReport.summary,
      );

      if (context.reviewReport.passed) {
        context.status = 'passed';
        break;
      }

      context.send(
        'orchestrator',
        'coding',
        'Routing failed review back to the Coding Agent',
        context.reviewReport.summary,
      );
    }

    if (context.status !== 'passed') {
      context.status = 'failed';
    }

    return {
      task,
      status: context.status,
      iterations: context.iteration,
      research: context.research,
      code: context.codeOutput ?? '',
      test: context.testReport,
      review: context.reviewReport,
      messages: context.messages,
    };
  }
}
