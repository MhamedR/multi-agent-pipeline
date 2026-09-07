import {mkdir} from 'node:fs/promises';
import {ResearchAgent} from '../agents/ResearchAgent.js';
import {CodingAgent} from '../agents/CodingAgent.js';
import {TestingAgent} from '../agents/TestingAgent.js';
import {ReviewerAgent} from '../agents/ReviewerAgent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createWebSearchTool} from '../tools/webSearch.js';
import {SearXNGProvider} from '../search/SearXNGProvider.js';
import {DuckDuckGoProvider} from '../search/DuckDuckGoProvider.js';
import {FallbackSearchProvider} from '../search/FallbackSearchProvider.js';
import {PipelineContext} from '../communication/PipelineContext.js';
import {
  codingHandoff,
  fixHandoff,
  reviewHandoff,
  testingHandoff,
} from '../communication/handoffs.js';
import {getMaxPipelineIterations, getSearxngUrl} from '../config.js';
import {errorMessage} from '../utils/json.js';
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
    private readonly maxIterations = getMaxPipelineIterations(),
  ) {
    const searchProvider = new FallbackSearchProvider([
      new SearXNGProvider(getSearxngUrl()),
      new DuckDuckGoProvider(),
    ]);
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
    context.research = await this.safeResearch(task);
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

      try {
        context.codeOutput = await this.codingAgent.code(codingPrompt);
        context.send('coding', 'orchestrator', 'Completed implementation', context.codeOutput);
      } catch (error) {
        context.codeOutput = `Coding Agent failed: ${errorMessage(error)}`;
        context.send('coding', 'orchestrator', 'Coding Agent failed', context.codeOutput);
        context.testReport = failedTest(context.codeOutput);
        continue;
      }

      const testingPrompt = testingHandoff(context);
      context.send(
        'orchestrator',
        'testing',
        'Assigned verification with implementation notes',
        testingPrompt,
      );
      context.testReport = await this.safeTest(testingPrompt);
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
      context.reviewReport = await this.safeReview(reviewPrompt);
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

  private async safeResearch(task: string): Promise<ResearchReport> {
    try {
      return await this.researchAgent.research(task);
    } catch (error) {
      const summary = `Research failed (${errorMessage(error)}). Continue using the original task.`;
      console.log(`[research] ${summary}`);
      return {
        topic: task,
        summary,
        findings: [],
        sources: [],
      };
    }
  }

  private async safeTest(prompt: string): Promise<TestReport> {
    try {
      return await this.testingAgent.test(prompt);
    } catch (error) {
      return failedTest(`Testing Agent failed: ${errorMessage(error)}`);
    }
  }

  private async safeReview(prompt: string): Promise<ReviewReport> {
    try {
      return await this.reviewerAgent.review(prompt);
    } catch (error) {
      const summary = `Reviewer Agent failed: ${errorMessage(error)}`;
      return {
        passed: false,
        summary,
        issues: [{severity: 'error', description: summary}],
        suggestions: ['Retry the review after the pipeline is healthy.'],
      };
    }
  }
}

function failedTest(summary: string): TestReport {
  return {
    passed: false,
    summary,
    commands: [],
    failures: [summary],
  };
}
