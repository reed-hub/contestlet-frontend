#!/bin/bash

# 🔧 Fix Vercel Environment Configuration
# Redeploy staging to Preview and main to Production properly

set -e

echo "🔧 Fixing Vercel Environment Configuration..."

# Ensure we're in the right repository
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in a Node.js project directory"
    exit 1
fi

echo "📋 Current git status:"
git status --short

# Step 1: Deploy staging to Preview environment  
echo ""
echo "🧪 Step 1: Deploy staging to Preview environment"
echo "─────────────────────────────────────────────────"

git checkout staging
echo "✅ Switched to staging branch"

# Deploy staging with explicit Preview environment settings
echo "🚀 Deploying staging to Vercel Preview..."
vercel --env REACT_APP_API_BASE_URL=https://staging-api.contestlet.com --env REACT_APP_ENVIRONMENT=staging --env REACT_APP_DEBUG_MODE=true

echo "✅ Staging deployed to Preview environment"

# Step 2: Deploy main to Production environment
echo ""
echo "🏆 Step 2: Deploy main to Production environment" 
echo "─────────────────────────────────────────────────"

git checkout main
echo "✅ Switched to main branch"

# Deploy production with explicit Production environment settings
echo "🚀 Deploying main to Vercel Production..."
vercel --prod --env REACT_APP_API_BASE_URL=https://api.contestlet.com --env REACT_APP_ENVIRONMENT=production --env REACT_APP_DEBUG_MODE=false

echo "✅ Production deployed to Production environment"

# Step 3: Verification
echo ""
echo "🔍 Step 3: Verification"
echo "─────────────────────────"

echo "📊 Listing recent deployments..."
vercel ls

echo ""
echo "⚙️ Checking environment variables..."
vercel env ls

echo ""
echo "🎉 Vercel environment fix complete!"
echo ""
echo "📋 What was fixed:"
echo "✅ Staging branch now deploys to Preview environment"
echo "✅ Main branch deploys to Production environment"
echo "✅ Proper environment variables set for each"
echo "✅ No more environment mixing"
echo ""
echo "🔗 Next steps:"
echo "1. Check Vercel dashboard for proper environment separation"
echo "2. Test staging URL connects to staging backend"
echo "3. Test production URL connects to production backend"
echo "4. Verify no cross-environment contamination"

# Return to develop branch for continued development
git checkout develop
echo "🔧 Returned to develop branch for continued development"
