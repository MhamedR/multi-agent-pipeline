import {ToolRegistry} from './tools/ToolRegistry.js';
import {webSearchTool} from './tools/webSearch.js';

async function main() {
  const registry = new ToolRegistry();

  registry.register(webSearchTool);

  const tool = registry.get('web_search');

  if (!tool) {
    throw new Error('web_search tool not found');
  }

  const result = await tool.execute({
    query: 'TypeScript',
  });

  console.log(result);
}

main();
