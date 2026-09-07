import {ReviewerAgent} from './agents/ReviewerAgent.js';

async function main() {
  const reviewerAgent = new ReviewerAgent();

  const report = await reviewerAgent.review(
    `
    Review this TypeScript project.

    Check whether the code is clear, consistent, and ready to use.
    Do not modify any files.
    `.trim(),
  );

  console.log(JSON.stringify(report, null, 2));
}

main();
