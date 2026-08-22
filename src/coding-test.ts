import {CodingAgent} from './agents/CodingAgent.js';
import {ToolRegistry} from './tools/ToolRegistry.js';

async function main() {
  const registry = new ToolRegistry();
  const codingAgent = new CodingAgent(registry);

  const result = await codingAgent.code(
    `
Create a file named coding-agent-test.txt.

The file must contain exactly:

Hello from the Coding Agent.

Use the write_file tool to create the file.

Do not modify any other files.
  `.trim(),
  );

  console.log(result);
}

main();
