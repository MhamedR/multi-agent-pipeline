import {Agent} from './Agent.js';
import {ToolRegistry} from '../tools/ToolRegistry.js';
import type {ResearchReport} from '../types/ResearchReport.js';

export class ResearchAgent {
  private readonly agent: Agent;

  constructor(toolRegistry: ToolRegistry) {
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

  async research(topic: string): Promise<ResearchReport> {
    const result = await this.agent.run(`Research this topic thoroughly: ${topic}`);

    try {
      return JSON.parse(result) as ResearchReport;
    } catch {
      throw new Error('Research Agent returned invalid JSON:\n' + result);
    }
  }
}
