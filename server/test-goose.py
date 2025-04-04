import os
import openai
import dotenv

# Load environment variables
dotenv.load_dotenv()

# Get API key from environment
api_key = os.getenv("KB_Key")
print(f"API Key available: {'Yes' if api_key else 'No'}")

# Configure OpenAI with GooseAI
openai.api_key = api_key
openai.api_base = "https://api.goose.ai/v1"

try:
    # List Engines (Models)
    print("Listing available engines...")
    engines = openai.Engine.list()
    
    # Print all engines IDs
    print("Available engines:")
    for engine in engines.data:
        print(f"- {engine.id}")

    # Create a completion
    print("\nGenerating completion...")
    prompt = "Once upon a time there was a Goose. "
    print(f"Prompt: {prompt}")
    
    completion = openai.Completion.create(
        engine="gpt-j-6b",
        prompt=prompt,
        max_tokens=160,
        stream=False)  # Set to False for testing

    # Print the completion
    print("\nCompletion result:")
    print(completion.choices[0].text)

except Exception as e:
    print(f"\nError: {e}")
