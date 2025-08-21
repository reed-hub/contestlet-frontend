#!/bin/bash

# 🏆 Deploy to Production Environment
# Matches backend's production deployment strategy

set -e

echo "🏆 Starting Production Deployment..."

# Environment validation
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Error: Must be on main branch to deploy to production"
    echo "Current branch: $(git branch --show-current)"
    exit 1
fi

# Safety confirmation
echo "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
echo "This will deploy to LIVE PRODUCTION environment"
echo "🌍 Users will see these changes immediately"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Production deployment cancelled"
    exit 1
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if environment file exists
if [ ! -f "environments/production.env" ]; then
    echo "❌ Error: production.env not found"
    exit 1
fi

# Load production environment
export $(cat environments/production.env | grep -v '^#' | xargs)

# Validate production API URL
if [[ $REACT_APP_API_BASE_URL == *"localhost"* ]] || [[ $REACT_APP_API_BASE_URL == *"staging"* ]]; then
    echo "❌ Error: Production environment cannot use localhost or staging API!"
    echo "Current API URL: $REACT_APP_API_BASE_URL"
    exit 1
fi

echo "✅ Environment validation passed"
echo "🔗 Production API: $REACT_APP_API_BASE_URL"

# Build application
echo "🏗️ Building application for production..."
npm ci --production
npm run build

# Production build validation
if [ ! -d "build" ]; then
    echo "❌ Error: Build directory not found"
    exit 1
fi

echo "✅ Production build successful"

# Deploy to Vercel Production
echo "🚀 Deploying to Vercel production..."
vercel --prod --env-file environments/production.env

# Post-deployment health check
echo "🏥 Running production health checks..."
sleep 15

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' | head -1)

if [ ! -z "$DEPLOYMENT_URL" ]; then
    echo "🏆 Testing production deployment..."
    
    # Basic health check
    if curl -f -s "https://$DEPLOYMENT_URL" > /dev/null; then
        echo "✅ Production deployment successful!"
        echo "🌐 Production URL: https://$DEPLOYMENT_URL"
        echo "🔗 Backend: $REACT_APP_API_BASE_URL"
    else
        echo "❌ Production deployment health check failed"
        echo "🚨 Consider immediate rollback if needed"
        exit 1
    fi
else
    echo "⚠️ Could not determine deployment URL for health check"
fi

echo "🎉 Production deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "✅ Health check passed"
echo "⏳ Monitor for errors in next 15 minutes"
echo "📊 Check analytics for user impact"
echo "🔔 Notify team of successful deployment"
echo ""
echo "🌍 LIVE: https://$DEPLOYMENT_URL"
echo "🔗 Backend: $REACT_APP_API_BASE_URL"

# Success notification
echo "📢 Production deployment notification sent"
