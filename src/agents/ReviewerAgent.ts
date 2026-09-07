import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import {createRunCommandTool} from '../tools/runCommand.js';
import type {ReviewReport} from '../types/ReviewReport.js';
export class ReviewerAgent {
  // The underlying generic Agent handles communication with the language
  // model and manages the tool-calling loop.
  private readonly agent: Agent;
  /**
   * Creates a reviewer agent for the specified workspace.
   *
   * The reviewer creates its own ToolRegistry instead of receiving one.
   * This allows us to control exactly which tools the reviewer can access.
   */
  constructor(workspace: string = process.cwd()) {
    // Create a separate registry specifically for the reviewer.
    //
    // The reviewer intentionally does not receive a write-file tool.
    // This ensures its tools are limited to inspecting and evaluating
    // the existing project rather than modifying it.
    const registry = new ToolRegistry();
    // Register the read-only/project-inspection tools.
    //
    // The reviewer can:
    // - Read source files
    // - List files and directories
    // - Run commands such as type checks or other inspection commands
    //
    // No write tool is registered, so the reviewer cannot directly modify
    // source code or test files through the available tools.
    registry.register(createReadFileTool(workspace));
    registry.register(createListFilesTool(workspace));
    registry.register(createRunCommandTool(workspace));
    // Configure the generic Agent with a review-specific role.
    //
    // The role defines what the reviewer should inspect, what constitutes
    // a failing review, and the format of the final report.
    this.agent = new Agent(
      'Reviewer Agent',
      `
        You are a code reviewer.
        Your job is to review an existing TypeScript project for correctness,
        quality, and completeness against the requested task.
        Rules:
        - Inspect the relevant files before judging the work.
        - Check that the implementation matches the requested task.
        - Look for bugs, missing error handling, and unclear structure.
        - Do not modify source code or test files.
        - Do not invent issues that are not supported by the files you read.
        - Treat severity "error" as something that must be fixed before pass.
        - The review fails if any issue has severity "error".
        At the end, return ONLY valid JSON.
        Do not wrap the JSON in markdown code fences.
        The JSON must have this structure:
        {
          "passed": true,
          "summary": "string",
          "issues": [
            {
              "severity": "error",
              "file": "string",
              "description": "string"
            }
          ],
          "suggestions": ["string"]
        }
      `.trim(),
      registry,
    );
  }
  /**
   * Reviews the workspace against the requested task.
   *
   * runJson() is used because the reviewer must return a structured
   * ReviewReport rather than a free-form text response.
   *
   * The generic Agent also handles retries if the model produces invalid JSON.
   */
  async review(task: string): Promise<ReviewReport> {
    return this.agent.runJson<ReviewReport>(task);
  }
}
