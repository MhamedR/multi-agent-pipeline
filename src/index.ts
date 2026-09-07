import path from 'node:path';
import {Orchestrator} from './orchestrator/Orchestrator.js';
import {getMaxPipelineIterations} from './config.js';
import 'dotenv/config';

const DEFAULT_TASK = `
Create a small TypeScript package that exports an add(a: number, b: number) function
and a simple test that verifies add(2, 2) equals 4.
`.trim();

async function main() {
  const task = process.argv.slice(2).join(' ').trim() || DEFAULT_TASK;
  const workspace = path.resolve(process.cwd(), 'workspace');
  const orchestrator = new Orchestrator(workspace, getMaxPipelineIterations());
  const result = await orchestrator.run(task);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
