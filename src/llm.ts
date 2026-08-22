import ollama from 'ollama';
import {getTimeTool} from './tools/getTime.js';

async function main() {
  const messages = [
    {
      role: 'user',
      content: 'What time is it right now?',
    },
  ];

  const response = await ollama.chat({
    model: 'llama3.2:latest',
    messages,
    tools: [
      {
        type: 'function',
        function: {
          name: getTimeTool.name,
          description: getTimeTool.description,
        },
      },
    ],
  });

  const toolCall = response.message.tool_calls?.[0];

  if (!toolCall) {
    console.log(response.message.content);
    return;
  }

  console.log('Model requested:', toolCall.function.name);

  if (toolCall.function.name === getTimeTool.name) {
    const result = await getTimeTool.execute({});

    console.log('Tool result:', result);
    messages.push(response.message);
    messages.push({role: 'tool', content: result});

    const finalResponse = await ollama.chat({
      model: 'llama3.2:latest',
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: getTimeTool.name,
            description: getTimeTool.description,
          },
        },
      ],
    });

    console.log('Final answer:', finalResponse.message.content);
  }
}

main();
