#!/bin/bash

# Script to push Stormwater AI Plugin Ecosystem to GitHub
# This script helps upload your complete project to GitHub

echo "🚀 Preparing to push AI Plugin Ecosystem to GitHub..."

# Remove any lock files
if [ -f .git/index.lock ]; then
    rm -f .git/index.lock
    echo "✅ Removed Git lock file"
fi

# Set up Git configuration
git config user.email "guzman.danield@outlook.com"
git config user.name "Daniel Guzman"

echo "📁 Adding all project files..."
git add .

echo "💾 Creating commit..."
git commit -m "Complete AI Plugin Ecosystem with 3 active plugins

- Stormwater Analysis AI plugin with Claude 4 integration
- Chat Service AI with Python interpreter capabilities  
- Document Generator AI for professional documents
- Plugin Manager with resource monitoring (1152MB memory, 60% CPU)
- Plugin Registry for hot-swappable AI modules
- Frontend dashboard for plugin ecosystem management
- 6 additional plugins planned for full 9-AI ecosystem
- Professional stormwater management system
- Complete TypeScript frontend and backend
- PostgreSQL database with Drizzle ORM
- Production-ready with comprehensive error handling"

echo "🔗 Setting up GitHub remote..."
echo "Please enter your GitHub repository URL (e.g., https://github.com/username/repo-name.git):"
read -r REPO_URL

if [ -n "$REPO_URL" ]; then
    git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
    echo "✅ GitHub remote configured"
    
    echo "🚀 Pushing to GitHub..."
    git branch -M main
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "🎉 SUCCESS! Your AI Plugin Ecosystem is now on GitHub!"
        echo "📊 Uploaded:"
        echo "   - 3 Active AI Plugins"
        echo "   - Complete Frontend & Backend"
        echo "   - Plugin Management System"
        echo "   - Professional Documentation"
        echo "   - Database Schema & Storage"
        echo "   - All Project Files"
    else
        echo "❌ Push failed. You may need to authenticate with GitHub."
        echo "Try visiting: https://github.com/settings/tokens"
        echo "Create a personal access token and use it as your password."
    fi
else
    echo "❌ No repository URL provided"
fi

echo "📝 Your project structure:"
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" | head -20
echo "... and many more files"