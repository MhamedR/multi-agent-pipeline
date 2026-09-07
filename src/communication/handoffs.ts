import type {PipelineContext} from './PipelineContext.js';
/**
 * Builds the prompt passed from the research stage to the Coding Agent.
 *
 * The handoff includes the original task plus the research summary,
 * findings, and sources so the Coding Agent can use the research as
 * implementation guidance.
 */
export function codingHandoff(context: PipelineContext): string {
  const research = context.research;
  // Convert each research finding into a readable bullet point.
  // If no research was produced, provide a clear fallback message.
  const findings =
    research?.findings
      .map(
        (finding) =>
          `- ${finding.claim}: ${finding.explanation} (sources: ${finding.sources.join(', ')})`,
      )
      .join('\n') ?? 'No research findings were provided.';
  // Convert the research sources into a simple title + URL list.
  // This gives the Coding Agent access to the references used during research.
  const sources =
    research?.sources.map((source) => `- ${source.title}: ${source.url}`).join('\n') ??
    'No sources were provided.';
  // Build the complete implementation prompt.
  //
  // The research is provided as guidance, but the Coding Agent is explicitly
  // told to implement only what the original task requires.
  return `
          Implement this task in the project workspace.
          Task:
          ${context.task}
          Research summary:
          ${research?.summary ?? 'No research summary was provided.'}
          Key findings:
          ${findings}
          Sources:
          ${sources}
          Use the research as guidance, but implement only what the task requires.
            `.trim();
}
/**
 * Builds the prompt passed from the Coding Agent to the Testing Agent.
 *
 * The Testing Agent receives the original task and the Coding Agent's notes,
 * then independently inspects the workspace and runs appropriate verification
 * commands.
 */
export function testingHandoff(context: PipelineContext): string {
  return `
          Verify that this task was implemented correctly in the project workspace.
          Task:
          ${context.task}
          Implementation notes from the Coding Agent:
          ${context.codeOutput ?? 'The Coding Agent did not provide notes.'}
          Inspect the files and run the most appropriate verification commands.
          Do not modify files.
            `.trim();
}
/**
 * Builds the prompt passed from the Testing Agent to the Reviewer Agent.
 *
 * The reviewer receives both the original task and the latest testing
 * results so it can evaluate the implementation with knowledge of any
 * verification failures.
 */
export function reviewHandoff(context: PipelineContext): string {
  const test = context.testReport;
  // Format test failures as a readable bullet list.
  // If there are no failures, explicitly report "None".
  const failures = test?.failures.length
    ? test.failures.map((item) => `- ${item}`).join('\n')
    : 'None';
  // Build the review prompt with the implementation notes and test report.
  return `
          Review whether this task was implemented correctly in the project workspace.
          Task:
          ${context.task}
          Implementation notes from the Coding Agent:
          ${context.codeOutput ?? 'The Coding Agent did not provide notes.'}
          Testing report:
          - passed: ${test?.passed ?? 'unknown'}
          - summary: ${test?.summary ?? 'No testing summary was provided.'}
          - commands: ${test?.commands.join(', ') ?? 'none'}
          - failures:
          ${failures}
          Inspect the code quality and completeness against the original task.
          Do not modify files.
            `.trim();
}
/**
 * Builds the prompt used when the pipeline needs another fix iteration.
 *
 * The Coding Agent receives the latest testing and review results so it can
 * address the specific problems found in the previous implementation.
 */
export function fixHandoff(context: PipelineContext): string {
  const test = context.testReport;
  const review = context.reviewReport;
  // Format test failures as bullet points for the Coding Agent.
  const testFailures = test?.failures.length
    ? test.failures.map((item) => `- ${item}`).join('\n')
    : 'None';
  // Format review issues with their severity and affected file.
  //
  // If an issue does not specify a file, "project" is used as the location.
  const reviewIssues = review?.issues.length
    ? review.issues
        .map((issue) => `- [${issue.severity}] ${issue.file ?? 'project'}: ${issue.description}`)
        .join('\n')
    : 'None';
  // Build the fix prompt using the results from both verification stages.
  //
  // Including the iteration number helps the agent understand that this is
  // a subsequent attempt rather than the initial implementation.
  return `
          Fix the project so the original task passes tests and review.
          This is fix iteration ${context.iteration}.
          Task:
          ${context.task}
          Research summary:
          ${context.research?.summary ?? 'No research summary was provided.'}
          Previous implementation notes:
          ${context.codeOutput ?? 'None'}
          Latest test report:
          - passed: ${test?.passed ?? 'unknown'}
          - summary: ${test?.summary ?? 'No testing summary was provided.'}
          - failures:
          ${testFailures}
          Latest review report:
          - passed: ${review?.passed ?? 'not reviewed yet'}
          - summary: ${review?.summary ?? 'No review summary was provided.'}
          - issues:
          ${reviewIssues}
          Rules:
          - Fix the reported test failures and review errors.
          - Keep changes small and focused.
          - Do not rewrite unrelated files.
            `.trim();
}
