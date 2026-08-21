import {ToolRegistry} from './tools/ToolRegistry.js';
import {ResearchAgent} from './agents/ResearchAgent.js';
import {DuckDuckGoProvider} from './search/DuckDuckGoProvider.js';
import {createWebSearchTool} from './tools/webSearch.js';

async function main() {
  const searchProvider = new DuckDuckGoProvider();

  const webSearchTool = createWebSearchTool(searchProvider);
  const registry = new ToolRegistry();

  registry.register(webSearchTool);

  const researchAgent = new ResearchAgent(registry);

  const report = await researchAgent.research(
    'current approaches for building AI agents with TypeScript',
  );

  console.log(JSON.stringify(report, null, 2));
}

main();
