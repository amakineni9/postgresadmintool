require('dotenv').config();
const { Pool } = require('pg');

// Create a connection to the searchdata database
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: 'searchdata',
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Sample data for topics, notes, and tags
const topics = [
  {
    title: 'Model Context Protocol (MCP)',
    description: 'A comprehensive guide to Model Context Protocol, its principles, and implementation in modern AI systems.',
    tags: ['MCP', 'AI', 'context', 'protocol', 'LLM'],
    notes: [
      'Model Context Protocol (MCP) is a framework that defines how AI models interpret and process contextual information. It establishes standards for context handling, memory management, and information retrieval in large language models.',
      'Key components of MCP include:\n1. Context window management\n2. Token optimization\n3. Memory hierarchies\n4. Information retrieval mechanisms\n5. Prompt engineering standards',
      'Useful resources for learning MCP:\n- [Anthropic Claude Context Window](https://www.anthropic.com/news/claude-2-1)\n- [OpenAI Context Window Documentation](https://platform.openai.com/docs/models)\n- [Google Gemini Context Handling](https://ai.google.dev/gemini-api/docs)',
      'Best practices for MCP implementation:\n1. Prioritize critical information at the beginning and end of context\n2. Use structured formats for better parsing\n3. Implement efficient token usage strategies\n4. Develop clear retrieval mechanisms for external knowledge'
    ]
  },
  {
    title: 'GenAI Tools and Frameworks',
    description: 'Overview of the most powerful and popular GenAI tools and frameworks available for developers and businesses.',
    tags: ['GenAI', 'tools', 'frameworks', 'development', 'AI'],
    notes: [
      'Popular GenAI Development Frameworks:\n1. Hugging Face Transformers - [https://huggingface.co/](https://huggingface.co/)\n2. LangChain - [https://www.langchain.com/](https://www.langchain.com/)\n3. LlamaIndex - [https://www.llamaindex.ai/](https://www.llamaindex.ai/)\n4. Semantic Kernel - [https://github.com/microsoft/semantic-kernel](https://github.com/microsoft/semantic-kernel)',
      'GenAI Tools for Content Creation:\n1. Midjourney - [https://www.midjourney.com/](https://www.midjourney.com/) - Image generation\n2. Runway - [https://runwayml.com/](https://runwayml.com/) - Video generation\n3. ElevenLabs - [https://elevenlabs.io/](https://elevenlabs.io/) - Voice synthesis\n4. Jasper - [https://www.jasper.ai/](https://www.jasper.ai/) - Text generation',
      'Enterprise GenAI Platforms:\n1. Microsoft Azure OpenAI Service\n2. Google Vertex AI\n3. AWS Bedrock\n4. Anthropic Claude API\n5. NVIDIA NeMo',
      'Open Source GenAI Tools:\n1. Ollama - [https://ollama.ai/](https://ollama.ai/)\n2. LocalAI - [https://localai.io/](https://localai.io/)\n3. LMStudio - [https://lmstudio.ai/](https://lmstudio.ai/)\n4. Text Generation WebUI - [https://github.com/oobabooga/text-generation-webui](https://github.com/oobabooga/text-generation-webui)'
    ]
  },
  {
    title: 'GenAI Models Comparison',
    description: 'Detailed comparison of leading generative AI models, their capabilities, limitations, and use cases.',
    tags: ['GenAI', 'models', 'LLM', 'comparison', 'AI'],
    notes: [
      'OpenAI Models:\n1. GPT-4o - Latest multimodal model with enhanced capabilities\n2. GPT-4 Turbo - High performance with 128K context window\n3. GPT-3.5 Turbo - Cost-effective for many applications\n\nStrengths: Excellent reasoning, instruction following, and creative content generation\nWeaknesses: Closed source, potential for hallucinations',
      'Anthropic Models:\n1. Claude 3 Opus - Highest capability model\n2. Claude 3 Sonnet - Balanced performance and cost\n3. Claude 3 Haiku - Fastest, most efficient model\n\nStrengths: Strong in safety, reasoning, and long context handling (up to 200K tokens)\nWeaknesses: Less available tooling compared to OpenAI',
      'Google Models:\n1. Gemini Ultra - Most capable Google model\n2. Gemini Pro - Balanced performance\n3. Gemini Nano - On-device model\n\nStrengths: Strong multimodal capabilities and knowledge\nWeaknesses: Still catching up to GPT-4 in some reasoning tasks',
      'Open Source Models:\n1. Llama 3 (Meta) - Strong open source foundation model\n2. Mistral Large - Competitive with closed source models\n3. Cohere Command R+ - Specialized for enterprise use\n4. Falcon (Technology Innovation Institute) - Open weights model\n\nStrengths: Customizable, can be run locally, no data sharing\nWeaknesses: Generally behind closed source models in capabilities'
    ]
  },
  {
    title: 'GitHub Copilot and Agentic Workflows',
    description: 'Resources and best practices for using GitHub Copilot and implementing agentic workflows in development.',
    tags: ['Copilot', 'GitHub', 'agentic', 'workflow', 'development'],
    notes: [
      'GitHub Copilot Resources:\n1. Official Documentation - [https://docs.github.com/en/copilot](https://docs.github.com/en/copilot)\n2. GitHub Copilot X - [https://github.com/features/preview/copilot-x](https://github.com/features/preview/copilot-x)\n3. Copilot for CLI - [https://github.com/github/gh-copilot](https://github.com/github/gh-copilot)\n4. Copilot Labs - [https://githubnext.com/projects/copilot-labs/](https://githubnext.com/projects/copilot-labs/)',
      'Best Practices for GitHub Copilot:\n1. Write clear comments to guide generation\n2. Use //-style comments for inline suggestions\n3. Start with function signatures and docstrings\n4. Review and test generated code thoroughly\n5. Learn keyboard shortcuts for accepting/rejecting suggestions',
      'Agentic Workflow Concepts:\n1. Autonomous agents - Systems that can perform tasks with minimal human intervention\n2. Agent orchestration - Coordinating multiple specialized agents\n3. Tool use - Enabling AI to use external tools and APIs\n4. Planning and decomposition - Breaking complex tasks into manageable steps\n5. Self-improvement - Agents that can learn from feedback and improve over time',
      'Windsurf Agentic Workflows:\nWindsurf is a cutting-edge agentic IDE that implements AI Flow paradigm, enabling seamless collaboration between developers and AI agents. Key features include:\n1. Context-aware coding assistance\n2. Autonomous task execution\n3. Multi-agent collaboration\n4. Integrated knowledge management\n5. Adaptive learning from user interactions'
    ]
  },
  {
    title: 'Prompt Engineering Techniques',
    description: 'Advanced prompt engineering techniques for getting the best results from generative AI models.',
    tags: ['prompt engineering', 'LLM', 'AI', 'techniques', 'GenAI'],
    notes: [
      'Core Prompt Engineering Principles:\n1. Be specific and clear in your instructions\n2. Provide context and examples\n3. Use structured formats when appropriate\n4. Break complex tasks into steps\n5. Specify the desired output format',
      'Advanced Techniques:\n1. Chain-of-Thought (CoT) - Guide the model through reasoning steps\n2. Few-Shot Learning - Provide examples of desired inputs and outputs\n3. Role Prompting - Assign a specific role to the AI\n4. Self-Consistency - Generate multiple solutions and find consensus\n5. ReAct (Reasoning + Acting) - Combine reasoning with actions',
      'Prompt Templates:\n1. Task-specific templates - Customized for different use cases\n2. System prompts - Setting overall behavior and constraints\n3. User prompts - Specific instructions for immediate tasks\n4. Function calling prompts - Structured for tool use\n5. Evaluation prompts - For assessing outputs',
      'Resources for Learning Prompt Engineering:\n1. OpenAI Cookbook - [https://cookbook.openai.com/](https://cookbook.openai.com/)\n2. Anthropic\'s Prompt Engineering Guide - [https://docs.anthropic.com/claude/docs/introduction-to-prompting](https://docs.anthropic.com/claude/docs/introduction-to-prompting)\n3. Prompt Engineering Guide - [https://www.promptingguide.ai/](https://www.promptingguide.ai/)\n4. Learn Prompting - [https://learnprompting.org/](https://learnprompting.org/)'
    ]
  }
];

// Function to insert a topic with its tags and notes
async function insertTopic(topic) {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Insert topic
    const topicResult = await client.query(
      'INSERT INTO topics(title, description) VALUES($1, $2) RETURNING id',
      [topic.title, topic.description]
    );
    
    const topicId = topicResult.rows[0].id;
    
    // Insert tags and create relationships
    for (const tagName of topic.tags) {
      // Insert tag if it doesn't exist
      const tagResult = await client.query(
        'INSERT INTO tags(name) VALUES($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
        [tagName]
      );
      
      const tagId = tagResult.rows[0].id;
      
      // Create relationship between topic and tag
      await client.query(
        'INSERT INTO topic_tags(topic_id, tag_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
        [topicId, tagId]
      );
    }
    
    // Insert notes
    for (const noteContent of topic.notes) {
      await client.query(
        'INSERT INTO notes(topic_id, content) VALUES($1, $2)',
        [topicId, noteContent]
      );
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Successfully inserted topic: ${topic.title}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error inserting topic ${topic.title}:`, error);
  } finally {
    client.release();
  }
}

// Main function to seed the database
async function seedDatabase() {
  console.log('Starting to seed knowledge base...');
  
  for (const topic of topics) {
    await insertTopic(topic);
  }
  
  console.log('Finished seeding knowledge base!');
  pool.end();
}

// Run the seeding function
seedDatabase().catch(err => {
  console.error('Error seeding database:', err);
  pool.end();
});
