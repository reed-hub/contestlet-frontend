#!/bin/bash

# 🧪 Deploy to Staging Environment
# Matches backend's staging deployment strategy

set -e

echo "🧪 Starting Staging Deployment..."

# Environment validation
if [ "$(git branch --show-current)" != "staging" ]; then
    echo "❌ Error: Must be on staging branch to deploy to staging"
    echo "Current branch: $(git branch --show-current)"
    exit 1
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if environment file exists
if [ ! -f "environments/staging.env" ]; then
    echo "❌ Error: staging.env not found"
    exit 1
fi

# Load staging environment
export $(cat environments/staging.env | grep -v '^#' | xargs)

# Validate staging API URL
if [[ ! $REACT_APP_API_BASE_URL == *"staging"* ]]; then
    echo "❌ Error: API URL doesn't contain 'staging' - environment mismatch!"
    echo "Current API URL: $REACT_APP_API_BASE_URL"
    exit 1
fi

echo "✅ Environment validation passed"
echo "🔗 Staging API: $REACT_APP_API_BASE_URL"

# Build application
echo "🏗️ Building application for staging..."
npm ci
npm run build

# Deploy to Vercel Preview (not Production!)
echo "🚀 Deploying to Vercel Preview environment..."
vercel --env REACT_APP_API_BASE_URL=https://staging-api.contestlet.com --env REACT_APP_ENVIRONMENT=staging

# Post-deployment health check
echo "🏥 Running health checks..."
sleep 10

# Get deployment URL (you'll need to capture this from Vercel output)
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' | head -1)

if [ ! -z "$DEPLOYMENT_URL" ]; then
    echo "🧪 Testing staging deployment..."
    
    # Basic health check
    if curl -f -s "https://$DEPLOYMENT_URL" > /dev/null; then
        echo "✅ Staging deployment successful!"
        echo "🌐 Staging URL: https://$DEPLOYMENT_URL"
        echo "🔗 Backend: $REACT_APP_API_BASE_URL"
    else
        echo "❌ Staging deployment health check failed"
        exit 1
    fi
else
    echo "⚠️ Could not determine deployment URL for health check"
fi

echo "🎉 Staging deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test staging environment thoroughly"
echo "2. Run integration tests with staging backend"
echo "3. Get QA approval before promoting to production"
echo ""
echo "🔗 Staging: https://$DEPLOYMENT_URL"
echo "🔗 Backend: $REACT_APP_API_BASE_URL"
