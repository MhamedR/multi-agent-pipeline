import type {PipelineContext} from './PipelineContext.js';

export function codingHandoff(context: PipelineContext): string {
  const research = context.research;

  const findings =
    research?.findings
      .map(
        (finding) =>
          `- ${finding.claim}: ${finding.explanation} (sources: ${finding.sources.join(', ')})`,
      )
      .join('\n') ?? 'No research findings were provided.';

  const sources =
    research?.sources.map((source) => `- ${source.title}: ${source.url}`).join('\n') ??
    'No sources were provided.';

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

export function reviewHandoff(context: PipelineContext): string {
  const test = context.testReport;
  const failures = test?.failures.length
    ? test.failures.map((item) => `- ${item}`).join('\n')
    : 'None';

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

export function fixHandoff(context: PipelineContext): string {
  const test = context.testReport;
  const review = context.reviewReport;
  const testFailures = test?.failures.length
    ? test.failures.map((item) => `- ${item}`).join('\n')
    : 'None';
  const reviewIssues = review?.issues.length
    ? review.issues
        .map((issue) => `- [${issue.severity}] ${issue.file ?? 'project'}: ${issue.description}`)
        .join('\n')
    : 'None';

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
