import ollama from "ollama";

async function main() {
  const response = await ollama.chat({
    model: "llama3.2:latest",
    messages: [
      {
        role: "user",
        content: "Explain what a TypeScript class is in one sentence.",
      },
    ],
  });

  console.log(response.message.content);
}

main();