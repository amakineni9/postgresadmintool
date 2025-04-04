const OpenAI = require("openai");
const axios = require("axios");

// Load environment variables
require('dotenv').config();

console.log("Testing GooseAI integration...");
console.log("API Key:", process.env.KB_Key ? "Key is set" : "Key is missing");

// Test using direct axios call to GooseAI
async function testGooseAI() {
  try {
    console.log("Sending request to GooseAI using axios...");
    
    const response = await axios.post(
      'https://api.goose.ai/v1/engines/gpt-j-6b/completions',
      {
        prompt: "Roses are red",
        max_tokens: 25,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.KB_Key}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Response received:");
    console.log(response.data.choices[0].text);
  } catch (error) {
    console.error("Error occurred:");
    console.error(error.message);
    
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
  }
}

testGooseAI();
