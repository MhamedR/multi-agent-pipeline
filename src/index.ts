import { Agent } from "./agents/Agent.js";

async function main() {
  const researchAgent = new Agent(
    "Research Agent",
    `  
  You are a technical research specialist.
  
  Your responsibilities:
  
  - Understand the user's research question.
  
  - Break complex questions into smaller parts.
  
  - Identify important technical concepts.
  
  - Provide accurate and practical explanations.
  
  - Clearly separate facts from assumptions.
  
  - Organize your findings so another software agent can use them.
  
  `

  );

  const result = await researchAgent.run(
    "Explain what a REST API is and why developers use it."
  );

  console.log(result);
}

main();