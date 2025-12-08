#!/bin/bash

# PVARA HRMS - Vercel Deployment Setup Script
# Run this after pushing to GitHub to ensure Vercel can deploy

echo "🚀 PVARA HRMS Vercel Deployment Setup"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please update with your actual values:"
    echo "   - MONGODB_URI (MongoDB Atlas connection string)"
    echo "   - JWT_SECRET (random string, min 20 chars)"
    echo ""
fi

# Verify GitHub is connected
echo "🔗 Checking GitHub connection..."
REMOTE=$(git remote -v | grep origin | head -1)
echo "✅ GitHub remote: $REMOTE"
echo ""

# Show current branch
BRANCH=$(git branch --show-current)
echo "📌 Current branch: $BRANCH"
echo ""

# Check for uncommitted changes
echo "📋 Checking for uncommitted changes..."
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  Uncommitted changes found. Commit them before deploying:"
    git status --short
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click 'Add New' → 'Project'"
echo "3. Click 'Import Git Repository'"
echo "4. Select 'pvara-hrms' repository"
echo "5. Add Environment Variables:"
echo "   - MONGODB_URI: Your MongoDB Atlas connection string"
echo "   - JWT_SECRET: Your secret key"
echo "   - NODE_ENV: production"
echo "6. Click 'Deploy'"
echo ""
echo "📖 For detailed instructions, see VERCEL_DEPLOYMENT_GUIDE.md"
