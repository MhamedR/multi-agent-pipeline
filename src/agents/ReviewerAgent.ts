import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import {createRunCommandTool} from '../tools/runCommand.js';
import type {ReviewReport} from '../types/ReviewReport.js';

export class ReviewerAgent {
  private readonly agent: Agent;

  constructor(workspace: string = process.cwd()) {
    const registry = new ToolRegistry();

    registry.register(createReadFileTool(workspace));
    registry.register(createListFilesTool(workspace));
    registry.register(createRunCommandTool(workspace));

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

  async review(task: string): Promise<ReviewReport> {
    const result = await this.agent.run(task);

    try {
      return JSON.parse(result) as ReviewReport;
    } catch {
      console.log('RAW REVIEWER AGENT RESPONSE:');
      console.log(JSON.stringify(result));

      throw new Error('Reviewer Agent returned invalid JSON.');
    }
  }
}
