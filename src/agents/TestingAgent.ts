import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import type {TestReport} from '../types/TestReport.js';
import {createRunCommandTool} from '../tools/runCommand.js';

export class TestingAgent {
  // The underlying generic Agent handles communication with the language
  // model and manages the tool-calling loop.
  private readonly agent: Agent;
  /**
   * Creates a testing agent for the specified workspace.
   *
   * The testing agent is given a dedicated ToolRegistry so that we can
   * control exactly which operations it is allowed to perform.
   */
  constructor(workspace: string = process.cwd()) {
    // Create a separate registry for the testing agent.
    //
    // The agent is intentionally given inspection and command-execution
    // tools, but no write tool. This prevents it from modifying the
    // project while performing verification.
    const registry = new ToolRegistry();
    // Register the tools needed to inspect and verify the project.
    //
    // The testing agent can:
    // - Read files to understand the project and its configuration
    // - List files and directories to discover the project structure
    // - Run tests, type checks, lint commands, builds, or other
    //   appropriate verification commands
    //
    // Since no write tool is registered, the agent cannot directly
    // modify source code or test files.
    registry.register(createReadFileTool(workspace));
    registry.register(createListFilesTool(workspace));
    registry.register(createRunCommandTool(workspace));
    // Configure the generic Agent with a testing-specific role.
    //
    // The role tells the model how to inspect the project, choose
    // verification commands, and report the results accurately.
    this.agent = new Agent(
      'Testing Agent',
      `
        You are a software testing specialist.
        Your job is to verify an existing TypeScript project by inspecting
        files and running appropriate tests, type checks, lint checks, or
        other verification commands.
        Rules:
        - Inspect the project before deciding what to run.
        - Run appropriate tests or verification commands.
        - Do not modify source code or test files.
        - Do not invent test results.
        - Report command failures accurately.
        - A failed test or command means the verification did not pass.
        At the end, return ONLY valid JSON.
        Do not wrap the JSON in markdown code fences.
        The JSON must have this structure:
        {
          "passed": true,
          "summary": "string",
          "commands": ["string"],
          "failures": ["string"]
        }
      `.trim(),
      registry,
    );
  }
  /**
   * Verifies the workspace against the requested task.
   *
   * runJson() is used because the testing agent must return a structured
   * TestReport rather than a free-form text response.
   *
   * The generic Agent also handles retries if the model returns invalid JSON.
   */
  async test(task: string): Promise<TestReport> {
    return this.agent.runJson<TestReport>(task);
  }
}
