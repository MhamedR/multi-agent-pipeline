import ollama from "ollama";

export class Agent {
  constructor(
    public name: string,
    public role: string
  ) {}

  async run(task: string): Promise<string> {
    const response = await ollama.chat({
      model: "llama3.2:latest",
      messages: [
        {
          role: "system",
          content: `You are ${this.name}.
Your role is: ${this.role}`,
        },
        {
          role: "user",
          content: task,
        },
      ],
    });

    return response.message.content;
  }
}