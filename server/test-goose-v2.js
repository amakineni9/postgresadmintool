// This script uses the older version of the OpenAI SDK to match the Python example
// First, install the older version with: npm install openai@3.2.1

const dotenv = require('dotenv');
dotenv.config();

// Get API key from environment
const apiKey = process.env.KB_Key;
console.log(`API Key available: ${apiKey ? 'Yes' : 'No'}`);

// Import the older version of OpenAI
const { Configuration, OpenAIApi } = require('openai');

// Configure OpenAI with GooseAI
const configuration = new Configuration({
  apiKey: apiKey,
  basePath: 'https://api.goose.ai/v1'
});

const openai = new OpenAIApi(configuration);

async function testGooseAI() {
  try {
    // Create a completion
    console.log('\nGenerating completion...');
    const prompt = 'Once upon a time there was a Goose. ';
    console.log(`Prompt: ${prompt}`);
    
    const completion = await openai.createCompletion(
      'gpt-j-6b',
      {
        prompt: prompt,
        max_tokens: 160
      }
    );

    // Print the completion
    console.log('\nCompletion result:');
    console.log(completion.data.choices[0].text);
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testGooseAI();
