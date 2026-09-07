import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import {createWriteFileTool} from '../tools/writeFile.js';
import {createRunCommandTool} from '../tools/runCommand.js';

export class CodingAgent {
  private readonly agent: Agent;

  constructor(toolRegistry: ToolRegistry, workspace: string = process.cwd()) {
    toolRegistry.register(createReadFileTool(workspace));
    toolRegistry.register(createListFilesTool(workspace));
    toolRegistry.register(createWriteFileTool(workspace));
    toolRegistry.register(createRunCommandTool(workspace));
    this.agent = new Agent(
      'Coding Agent',
      `
        You are a software engineer.

        Your job is to implement coding tasks in the project workspace.

        Rules:
        - Understand the requested task before proposing a solution.
        - If the workspace already has a project, follow its architecture and style.
        - If the workspace is empty, create a minimal TypeScript project for the task.
        - Prefer small, focused changes.
        - Do not invent files, APIs, or project structure that you did not create.
        - Do not claim that code was changed unless a tool actually changed it.
        - Do not run tests unless asked to implement them.
        - Explain what should be changed when you cannot directly modify the project.
      `.trim(),
      toolRegistry,
    );
  }

  async code(task: string): Promise<string> {
    return this.agent.run(task);
  }
}
