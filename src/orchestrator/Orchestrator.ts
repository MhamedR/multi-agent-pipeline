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
import type {AgentMessage} from '../types/Messages.js';
import type {PipelineStatus} from '../communication/PipelineContext.js';
import type {ResearchReport} from '../types/ResearchReport.js';
import type {TestReport} from '../types/TestReport.js';
import type {ReviewReport} from '../types/ReviewReport.js';
/**
 * Represents the final result returned by the orchestrator after the
 * multi-agent pipeline has completed.
 */
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
  // Each agent is responsible for one stage of the development pipeline.
  private readonly researchAgent: ResearchAgent;
  private readonly codingAgent: CodingAgent;
  private readonly testingAgent: TestingAgent;
  private readonly reviewerAgent: ReviewerAgent;
  /**
   * Creates and configures all agents used by the pipeline.
   *
   * @param workspace Directory where the coding, testing, and review agents
   *                  will inspect or modify the project.
   * @param maxIterations Maximum number of implementation/fix iterations.
   */
  constructor(
    private readonly workspace: string,
    private readonly maxIterations = getMaxPipelineIterations(),
  ) {
    // Create a search provider with a fallback strategy.
    //
    // SearXNG is attempted first. If it cannot provide results, the
    // DuckDuckGo provider can be used as a fallback.
    const searchProvider = new FallbackSearchProvider([
      new SearXNGProvider(getSearxngUrl()),
      new DuckDuckGoProvider(),
    ]);
    // Create a dedicated tool registry for the Research Agent.
    //
    // The research agent only needs access to web search, unlike the
    // Coding, Testing, and Reviewer agents which work with the workspace.
    const researchRegistry = new ToolRegistry();
    researchRegistry.register(createWebSearchTool(searchProvider));
    // Create each specialized agent.
    //
    // Each agent receives only the tools appropriate for its role.
    this.researchAgent = new ResearchAgent(researchRegistry);
    this.codingAgent = new CodingAgent(new ToolRegistry(), workspace);
    this.testingAgent = new TestingAgent(workspace);
    this.reviewerAgent = new ReviewerAgent(workspace);
  }
  /**
   * Runs the complete multi-agent development pipeline.
   *
   * The normal flow is:
   *
   *   Research → Coding → Testing → Review
   *                         ↑          |
   *                         └── Fix ──┘
   *
   * If testing or review fails, the process loops back to the Coding Agent
   * with information about the problems that need to be fixed.
   */
  async run(task: string): Promise<OrchestratorResult> {
    // Make sure the workspace exists before any agent attempts to access it.
    await mkdir(this.workspace, {recursive: true});
    // Create the shared state object used throughout the pipeline.
    const context = new PipelineContext(task);
    // -------------------------
    // Research stage
    // -------------------------
    // Record the task assignment before starting the research.
    context.send('orchestrator', 'research', 'Assigned research task', task);
    // Research failures are handled safely so that a failed search does not
    // prevent the Coding Agent from attempting the original task.
    context.research = await this.safeResearch(task);
    // Record the research result in the communication history.
    context.send('research', 'orchestrator', 'Completed research report', context.research.summary);
    // -------------------------
    // Implementation loop
    // -------------------------
    //
    // The Coding Agent may need several attempts if tests or review fail.
    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      context.iteration = iteration;
      // The first iteration uses the research handoff.
      // Later iterations use the fix handoff, which contains the latest
      // test failures and review issues.
      const codingPrompt = iteration === 1 ? codingHandoff(context) : fixHandoff(context);
      context.send(
        'orchestrator',
        'coding',
        iteration === 1
          ? 'Assigned implementation with research'
          : `Assigned fix for iteration ${iteration}`,
        codingPrompt,
      );
      // -------------------------
      // Coding stage
      // -------------------------
      try {
        // Ask the Coding Agent to implement the task or fix the problems
        // discovered during the previous iteration.
        context.codeOutput = await this.codingAgent.code(codingPrompt);
        // Save the Coding Agent's response in the communication history.
        context.send('coding', 'orchestrator', 'Completed implementation', context.codeOutput);
      } catch (error) {
        // A coding failure should not crash the entire orchestrator.
        // Instead, convert it into a failed test result so the pipeline
        // can continue to the next fix iteration.
        context.codeOutput = `Coding Agent failed: ${errorMessage(error)}`;
        context.send('coding', 'orchestrator', 'Coding Agent failed', context.codeOutput);
        context.testReport = failedTest(context.codeOutput);
        continue;
      }
      // -------------------------
      // Testing stage
      // -------------------------
      // Build a testing prompt containing the original task and the
      // implementation notes from the Coding Agent.
      const testingPrompt = testingHandoff(context);
      context.send(
        'orchestrator',
        'testing',
        'Assigned verification with implementation notes',
        testingPrompt,
      );
      // Run tests and verification commands. If the Testing Agent itself
      // fails, safeTest() converts that failure into a failed TestReport.
      context.testReport = await this.safeTest(testingPrompt);
      context.send(
        'testing',
        'orchestrator',
        context.testReport.passed ? 'Tests passed' : 'Tests failed',
        context.testReport.summary,
      );
      // If testing failed, do not proceed to code review.
      //
      // The next iteration will send the test failures back to the
      // Coding Agent through fixHandoff().
      if (!context.testReport.passed) {
        context.send(
          'orchestrator',
          'coding',
          'Routing failed tests back to the Coding Agent',
          context.testReport.summary,
        );
        continue;
      }
      // -------------------------
      // Review stage
      // -------------------------
      // Only review implementations that have passed testing.
      const reviewPrompt = reviewHandoff(context);
      context.send('orchestrator', 'reviewer', 'Assigned review with test results', reviewPrompt);
      // Run the code review. A reviewer failure is represented as a failed
      // review so that the Coding Agent can address it in the next iteration.
      context.reviewReport = await this.safeReview(reviewPrompt);
      context.send(
        'reviewer',
        'orchestrator',
        context.reviewReport.passed ? 'Review passed' : 'Review failed',
        context.reviewReport.summary,
      );
      // If both testing and review have passed, the pipeline is complete.
      if (context.reviewReport.passed) {
        context.status = 'passed';
        break;
      }
      // The review found problems, so route the review summary back to the
      // Coding Agent for the next fix iteration.
      context.send(
        'orchestrator',
        'coding',
        'Routing failed review back to the Coding Agent',
        context.reviewReport.summary,
      );
    }
    // If the loop ended without a successful review, the pipeline failed.
    //
    // This can happen when the maximum number of iterations is reached.
    if (context.status !== 'passed') {
      context.status = 'failed';
    }
    // Return a snapshot of the pipeline's final state.
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
  /**
   * Runs the Research Agent while preventing research failures from
   * terminating the entire pipeline.
   *
   * If research fails, an empty research report is returned so that the
   * Coding Agent can continue using the original task.
   */
  private async safeResearch(task: string): Promise<ResearchReport> {
    try {
      return await this.researchAgent.research(task);
    } catch (error) {
      const summary = `Research failed (${errorMessage(error)}). Continue using the original task.`;
      console.log(`[research] ${summary}`);
      // Return a valid but empty report so the rest of the pipeline
      // can continue normally.
      return {
        topic: task,
        summary,
        findings: [],
        sources: [],
      };
    }
  }
  /**
   * Runs the Testing Agent and converts unexpected agent failures into
   * a standard failed TestReport.
   */
  private async safeTest(prompt: string): Promise<TestReport> {
    try {
      return await this.testingAgent.test(prompt);
    } catch (error) {
      // Treat an unavailable or failed Testing Agent as a failed test
      // rather than allowing the exception to terminate the pipeline.
      return failedTest(`Testing Agent failed: ${errorMessage(error)}`);
    }
  }
  /**
   * Runs the Reviewer Agent and converts unexpected failures into a
   * structured failed review.
   */
  private async safeReview(prompt: string): Promise<ReviewReport> {
    try {
      return await this.reviewerAgent.review(prompt);
    } catch (error) {
      const summary = `Reviewer Agent failed: ${errorMessage(error)}`;
      // A reviewer failure is represented as an "error" issue so that
      // the pipeline cannot incorrectly mark the implementation as passed.
      return {
        passed: false,
        summary,
        issues: [{severity: 'error', description: summary}],
        suggestions: ['Retry the review after the pipeline is healthy.'],
      };
    }
  }
}
/**
 * Creates a standardized failed TestReport.
 *
 * This is used when the Testing Agent itself fails, ensuring that the
 * orchestrator can treat an agent failure in the same way as a failed
 * verification command.
 */
function failedTest(summary: string): TestReport {
  return {
    passed: false,
    summary,
    commands: [],
    failures: [summary],
  };
}
