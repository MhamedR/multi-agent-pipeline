import {TestingAgent} from './agents/TestingAgent.js';

async function main() {
  const testingAgent = new TestingAgent();

  const report = await testingAgent.test(
    `
    Verify this TypeScript project.

    Inspect the files, then run appropriate type checks or tests.
    Do not modify any files.
    `.trim(),
  );

  console.log(JSON.stringify(report, null, 2));
}

main();
