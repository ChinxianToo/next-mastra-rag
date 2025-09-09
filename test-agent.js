const { createOpenAI } = require('@ai-sdk/openai');

const openai = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  compatibility: "compatible",
});

async function testModel() {
  console.log('Testing model connection...');
  try {
    const result = await openai('gpt-oss:20b').generateText({
      prompt: 'Say hello'
    });
    console.log('Model response:', result.text);
  } catch (error) {
    console.error('Model error:', error);
  }
}

testModel();
