#!/bin/bash

# Deployment script for Marico Insight Tool
echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build the client
echo "📦 Building client..."
cd client
npm install
npm run build
cd ..

# Build the server
echo "📦 Building server..."
cd server
npm install
npm run build
cd ..

echo "✅ Build completed successfully!"
echo ""
echo "🌐 Deployment options:"
echo "1. Vercel: vercel --prod"
echo "2. Railway: railway deploy"
echo "3. Render: Connect your GitHub repository"
echo "4. Docker: docker-compose up -d"
echo ""
echo "📝 Don't forget to set your environment variables:"
echo "- FRONTEND_URL (your frontend domain)"
echo "- OPENAI_API_KEY"
echo "- GEMINI_API_KEY"
echo "- Any other API keys you're using"
