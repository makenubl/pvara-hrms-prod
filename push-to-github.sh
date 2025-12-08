#!/bin/bash
echo "🚀 Pushing to GitHub..."
git remote add origin https://github.com/makenubl/pvara-hrms-prod.git
git branch -M main
git push -u origin main
echo "✅ Done! Check: https://github.com/makenubl/pvara-hrms-prod"
