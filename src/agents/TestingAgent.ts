import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import {createReadFileTool} from '../tools/readFile.js';
import {createListFilesTool} from '../tools/listFiles.js';
import {createRunCommandTool} from '../tools/runCommand.js';
import type {TestReport} from '../types/TestReport.js';

export class TestingAgent {
  private readonly agent: Agent;

  constructor(workspace: string = process.cwd()) {
    const registry = new ToolRegistry();

    registry.register(createReadFileTool(workspace));
    registry.register(createListFilesTool(workspace));
    registry.register(createRunCommandTool(workspace));

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

  async test(task: string): Promise<TestReport> {
    const result = await this.agent.run(task);

    try {
      return JSON.parse(result) as TestReport;
    } catch {
      console.log('RAW TESTING AGENT RESPONSE:');

      console.log(JSON.stringify(result));

      throw new Error('Testing Agent returned invalid JSON.');
    }
  }
}
