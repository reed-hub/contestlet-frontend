# 🌍 Three-Environment Frontend Workflow

## 🎯 Environment Alignment with Backend

Our frontend now perfectly aligns with the backend's three-environment strategy:

```
Environment    Branch    Frontend URL              Backend API
────────────────────────────────────────────────────────────────
Development   develop   localhost:3000            localhost:8000
Staging        staging   vercel-staging-url.app    staging-api.contestlet.com
Production     main      vercel-production.app     api.contestlet.com
```

## 🔧 Development Workflow

### **🏠 Local Development (develop branch)**
```bash
# Switch to develop branch
git checkout develop

# Copy development environment
cp environments/development.env .env

# Start development
npm start
# → Connects to localhost:8000 backend
# → Full debugging enabled
# → Mock services active
```

### **🧪 Staging Testing (staging branch)**
```bash
# Merge develop to staging
git checkout staging
git merge develop

# Deploy to staging
./scripts/deploy-staging.sh
# → Auto-deploys to Vercel staging
# → Connects to staging-api.contestlet.com
# → Limited debugging, real-like testing
```

### **🏆 Production Release (main branch)**
```bash
# Merge staging to main (after QA approval)
git checkout main
git merge staging

# Deploy to production
./scripts/deploy-production.sh  
# → Auto-deploys to Vercel production
# → Connects to api.contestlet.com
# → No debugging, full monitoring
```

## 🛡️ Environment Safety Rules

### **✅ Safe Environment Connections**
- ✅ `develop` branch → `localhost:8000` (development backend)
- ✅ `staging` branch → `staging-api.contestlet.com` (staging backend)  
- ✅ `main` branch → `api.contestlet.com` (production backend)

### **❌ NEVER Mix Environments**
- ❌ Development frontend → Production backend
- ❌ Production frontend → Development backend
- ❌ Staging frontend → Production backend
- ❌ Any cross-environment contamination

### **🔒 Environment Validation**
Our deployment scripts automatically validate:
- ✅ Correct branch for environment
- ✅ Correct API URL for environment
- ✅ No localhost in production
- ✅ No production API in development

## 📦 Environment Configurations

### **Development Environment**
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
REACT_APP_SHOW_DEBUG_INFO=true
REACT_APP_MOCK_SMS=true
```

### **Staging Environment**
```env
REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
REACT_APP_ENVIRONMENT=staging
REACT_APP_DEBUG_MODE=false
REACT_APP_SHOW_DEBUG_INFO=true
REACT_APP_MOCK_SMS=false
```

### **Production Environment**
```env
REACT_APP_API_BASE_URL=https://api.contestlet.com
REACT_APP_ENVIRONMENT=production
REACT_APP_DEBUG_MODE=false
REACT_APP_SHOW_DEBUG_INFO=false
REACT_APP_MOCK_SMS=false
```

## 🚀 Deployment Commands

### **Manual Deployment**
```bash
# Development (local only)
npm start

# Staging deployment
git checkout staging
./scripts/deploy-staging.sh

# Production deployment  
git checkout main
./scripts/deploy-production.sh
```

### **Automated Deployment**
- **Staging**: Auto-deploys on push to `staging` branch
- **Production**: Auto-deploys on push to `main` branch
- **Development**: Local only, no auto-deployment

## 🧪 Testing Workflow

### **Development Testing**
```bash
git checkout develop
npm start
# Test with local backend
# Rapid iteration and debugging
```

### **Staging Testing**
```bash
# Deploy to staging
git checkout staging
git merge develop
./scripts/deploy-staging.sh

# Test staging environment
# Integration testing with staging backend
# QA validation before production
```

### **Production Validation**
```bash
# Deploy to production (after staging approval)
git checkout main
git merge staging
./scripts/deploy-production.sh

# Monitor production health
# Verify live environment working
```

## 📊 Current Status

### **✅ Completed Setup**
- Three-environment branch structure created
- Environment configuration files ready
- Deployment scripts with safety checks
- Vercel configuration updated
- Environment validation implemented

### **🔧 Ready for Use**
- **develop** branch: Active for development (current)
- **staging** branch: Ready for staging deployment
- **main** branch: Ready for production deployment

### **📋 Next Steps**
1. **Start development** on `develop` branch ✅ (current)
2. **Test fixes locally** with local backend
3. **Deploy to staging** when ready for QA
4. **Deploy to production** after staging approval

## 🎯 Benefits Achieved

### **🛡️ Environment Safety**
- No accidental production contamination
- Automated environment validation
- Clear separation of concerns

### **🚀 Professional Workflow**
- Matches backend three-environment strategy
- Safe promotion path: develop → staging → main
- Automated deployment with health checks

### **👥 Team Collaboration**
- Clear environment responsibilities
- Consistent deployment process
- Easy handoff between development stages

---

**Three-environment frontend workflow aligned with backend! 🌍🚀**

**Current Status: Ready for development on `develop` branch** ✅
