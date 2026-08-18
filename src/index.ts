import { Agent } from "./agents/Agent.js";

async function main() {
  const researchAgent = new Agent(
    "Research Agent",
    "You research technical topics and provide accurate, useful explanations."
  );

  const result = await researchAgent.run(
    "Explain what a REST API is and why developers use it."
  );

  console.log(result);
}

main();