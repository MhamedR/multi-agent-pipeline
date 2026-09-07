import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import {createWriteFileTool} from '../tools/writeFile.js';
import {createRunCommandTool} from '../tools/runCommand.js';

export class CodingAgent {
  // The underlying generic Agent is responsible for communicating with the
  // language model and managing the tool-calling loop.
  private readonly agent: Agent;

  /**
   * Creates a coding-focused agent and registers the tools it needs
   * to work with the project workspace.
   *
   * @param toolRegistry Registry used to store and access available tools.
   * @param workspace Directory where the coding agent is allowed to work.
   *                  Defaults to the current working directory.
   */
  constructor(toolRegistry: ToolRegistry, workspace: string = process.cwd()) {
    // Register the tools that give the agent access to the workspace.
    //
    // The agent can:
    // - Read existing files
    // - List files and directories
    // - Create or modify files
    // - Run shell commands
    //
    // Each tool receives the workspace so that its operations are scoped
    // to the project the agent is working on.
    toolRegistry.register(createReadFileTool(workspace));
    toolRegistry.register(createListFilesTool(workspace));
    toolRegistry.register(createWriteFileTool(workspace));
    toolRegistry.register(createRunCommandTool(workspace));

    // Configure the generic Agent with a coding-specific name and role.
    //
    // The role acts as the system prompt and tells the model how it should
    // behave when completing coding tasks.
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

  /**
   * Executes a coding task using the configured coding agent.
   *
   * The task is passed to the underlying Agent, which decides whether
   * it needs to inspect files, modify files, or run commands using the
   * registered workspace tools.
   */
  async code(task: string): Promise<string> {
    return this.agent.run(task);
  }
}
