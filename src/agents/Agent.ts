import ollama from 'ollama';
import {ToolRegistry} from '../tools/ToolRegistry.js';

export class Agent {
  constructor(
    public name: string,
    public role: string,
    private toolRegistry: ToolRegistry,
  ) {}

  async run(task: string): Promise<string> {
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

    while (true) {
      const response = await ollama.chat({
        model: 'llama3.2:latest',
        messages,

        tools: this.toolRegistry.getAll().map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
          },
        })),
      });

      messages.push(response.message);

      const toolCall = response.message.tool_calls?.[0];

      if (!toolCall) {
        return response.message.content;
      }

      const tool = this.toolRegistry.get(toolCall.function.name);

      if (!tool) {
        throw new Error(`Tool "${toolCall.function.name}" was requested but not found.`);
      }

      const result = await tool.execute();

      messages.push({
        role: 'tool',
        content: result,
      });
    }
  }
}
