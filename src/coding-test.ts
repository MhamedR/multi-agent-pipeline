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
    
    Then run "cat coding-agent-test.txt" using the run_command tool
    to verify the file contents.
    
    Do not modify any other files.
    `.trim(),
  );

  console.log(result);
}

main();
