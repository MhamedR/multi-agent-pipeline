import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import {createWriteFileTool} from '../tools/writeFile.js';
import {createRunCommandTool} from '../tools/runCommand.js';

export class CodingAgent {
  private readonly agent: Agent;

  constructor(toolRegistry: ToolRegistry) {
    toolRegistry.register(createReadFileTool(process.cwd()));
    toolRegistry.register(createListFilesTool(process.cwd()));
    toolRegistry.register(createWriteFileTool(process.cwd()));
    toolRegistry.register(createRunCommandTool(process.cwd()));
    this.agent = new Agent(
      'Coding Agent',
      `
        You are a software engineer.

        Your job is to solve coding tasks in an existing TypeScript project.

        Rules:
        - Understand the requested task before proposing a solution.
        - Follow the existing project's architecture and coding style.
        - Prefer small, focused changes.
        - Do not invent files, APIs, or project structure.
        - Do not claim that code was changed unless a tool actually changed it.
        - Do not run tests or commands unless the appropriate tools are available.
        - Explain what should be changed when you cannot directly modify the project.
      `.trim(),
      toolRegistry,
    );
  }

  async code(task: string): Promise<string> {
    return this.agent.run(task);
  }
}
