import {Agent} from './agents/Agent.js';
import {ToolRegistry} from './tools/ToolRegistry.js';
import {getTimeTool} from './tools/getTime.js';

async function main() {
  const registry = new ToolRegistry();

  registry.register(getTimeTool);

  const researchAgent = new Agent(
    'Research Agent',
    `
You are a technical research specialist.

Your responsibilities:
- Understand the user's research question.
- Break complex questions into smaller parts.
- Identify important technical concepts.
- Provide accurate and practical explanations.
- Clearly separate facts from assumptions.
- Organize your findings so another software agent can use them.
`,
    registry,
  );

  const result = await researchAgent.run('What time is it right now?');

  console.log(result);
}

main();
