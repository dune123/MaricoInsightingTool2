import OpenAI from "openai";

// Azure OpenAI configuration
console.log("🔧 Configuring Azure OpenAI...");

// Check for required Azure OpenAI environment variables
const requiredEnvVars = [
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT', 
  'AZURE_OPENAI_DEPLOYMENT_NAME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required Azure OpenAI environment variables:");
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error("\nPlease set the following environment variables in your .env file:");
  console.error("AZURE_OPENAI_API_KEY=your_azure_openai_api_key");
  console.error("AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com");
  console.error("AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name");
  console.error("AZURE_OPENAI_API_VERSION=2024-02-15-preview (optional)");
  throw new Error("Azure OpenAI configuration is missing. Please set the required environment variables.");
}

// Create Azure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  defaultQuery: { 
    'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' 
  },
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_API_KEY,
  },
});

// Use the deployment name as the model
const MODEL = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

console.log("✅ Azure OpenAI configured successfully");
console.log(`   Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
console.log(`   Deployment: ${MODEL}`);
console.log(`   API Version: ${process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'}`);

export { openai, MODEL };

