import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import type {ResearchReport} from '../types/ResearchReport.js';

export class ResearchAgent {
  // The underlying generic Agent handles communication with the language
  // model and execution of any tools provided by the ToolRegistry.
  private readonly agent: Agent;

  /**
   * Creates a research-focused agent.
   *
   * The ResearchAgent does not define or execute research tools itself.
   * Instead, it receives a ToolRegistry containing the tools it is allowed
   * to use and passes that registry to the generic Agent.
   */
  constructor(toolRegistry: ToolRegistry) {
    // Configure the generic Agent with a research-specific name and role.
    //
    // The role acts as the system prompt and defines how the model should
    // perform research and how the final result must be formatted.
    this.agent = new Agent(
      'Research Agent',
      `
      You are a technical research specialist.

      Your job is to research technical topics using available tools.

      Rules:
      - Use web_search when external information is needed.
      - Perform multiple searches when necessary.
      - Do not invent libraries, frameworks, APIs, or sources.
      - Treat "no results" as "the search failed to find information",
        NOT as proof that something does not exist.
      - Prefer reliable and relevant sources.
      - At the end, return ONLY valid JSON.
      - Do not wrap the JSON in markdown code fences.

      The JSON must have this structure:

      {
        "topic": "string",
        "summary": "string",
        "findings": [
          {
            "claim": "string",
            "explanation": "string",
            "sources": ["URL"]
          }
        ],
        "sources": [
          {
            "title": "string",
            "url": "string",
            "description": "string"
          }
        ]
      }
      `.trim(),
      toolRegistry,
    );
  }

  /**
   * Researches a technical topic and returns a structured research report.
   *
   * runJson() is used instead of run() because the research agent is expected
   * to return data matching the ResearchReport TypeScript type.
   *
   * The generic Agent is also responsible for retrying the request if the
   * model returns invalid JSON.
   */
  async research(topic: string): Promise<ResearchReport> {
    return this.agent.runJson<ResearchReport>(`Research this topic thoroughly: ${topic}`);
  }
}
