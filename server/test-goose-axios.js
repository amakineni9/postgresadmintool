const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Get API key from environment
const apiKey = process.env.KB_Key;
console.log(`API Key available: ${apiKey ? 'Yes' : 'No'}`);

async function testGooseAI() {
  try {
    // Create a completion using direct axios call
    console.log('\nGenerating completion...');
    const prompt = 'Once upon a time there was a Goose. ';
    console.log(`Prompt: ${prompt}`);
    
    const response = await axios({
      method: 'post',
      url: 'https://api.goose.ai/v1/engines/gpt-j-6b/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        prompt: prompt,
        max_tokens: 160
      }
    });

    // Print the completion
    console.log('\nCompletion result:');
    console.log(response.data.choices[0].text);
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testGooseAI();
