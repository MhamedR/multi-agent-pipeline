import ollama from 'ollama';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import type {Tool} from '../tools/Tool.js';
import {getOllamaModel} from '../config.js';
import {errorMessage, tryParseJson} from '../utils/json.js';
import 'dotenv/config';

const MAX_TOOL_ROUNDS = 20;
const MAX_TOOL_RESULT_CHARS = 12_000;

export class Agent {
  constructor(
    public name: string,
    public role: string,
    private toolRegistry: ToolRegistry,
  ) {}

  async run(task: string): Promise<string> {
    const model = getOllamaModel();
    const tools = this.toolRegistry.getAll().map((tool: Tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const messages = [
      {
        role: 'system',
        content: `
                You are ${this.name}.
                Your role:
                ${this.role}
                Follow your role when completing tasks.
                Use available tools when they are useful.
                Do not invent tool results.
        `.trim(),
      },
      {
        role: 'user',
        content: task,
      },
    ];

    for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
      let response;
      try {
        response = await ollama.chat({
          model,
          messages,
          ...(tools.length > 0 ? {tools} : {}),
        });
      } catch (error) {
        throw new Error(`${this.name} failed to call the model "${model}": ${errorMessage(error)}`);
      }

      messages.push(response.message);

      const toolCalls = response.message.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const content = response.message.content?.trim();
        return content && content.length > 0
          ? response.message.content
          : `${this.name} finished without a text response.`;
      }

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const tool = this.toolRegistry.get(toolName);

        if (!tool) {
          messages.push({
            role: 'tool' as const,
            content: `Error: tool "${toolName}" was requested but not found.`,
          });
          continue;
        }

        console.log(`Executing tool: ${toolName}`, toolCall.function.arguments);

        let result: string;
        try {
          result = await tool.execute(toolCall.function.arguments);
        } catch (error) {
          result = `Error executing tool "${toolName}": ${errorMessage(error)}`;
        }

        if (result.length > MAX_TOOL_RESULT_CHARS) {
          result = `${result.slice(0, MAX_TOOL_RESULT_CHARS)}\n...[truncated]`;
        }

        messages.push({role: 'tool' as const, content: result});
      }
    }

    throw new Error(`${this.name} exceeded the maximum of ${MAX_TOOL_ROUNDS} tool-call rounds.`);
  }

  async runJson<T>(task: string, retries = 2): Promise<T> {
    let lastResponse = '';

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const prompt =
        attempt === 0
          ? task
          : `${task}

Your previous reply was not valid JSON.
Return ONLY a JSON object. Do not wrap it in markdown.

Previous reply:
${lastResponse}`;

      lastResponse = await this.run(prompt);
      const parsed = tryParseJson<T>(lastResponse);

      if (parsed.ok) {
        return parsed.value;
      }
    }

    throw new Error(
      `${this.name} returned invalid JSON after ${retries + 1} attempts:\n${lastResponse}`,
    );
  }
}
