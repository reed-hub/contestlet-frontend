# 🌍 Environment Workflow Guide

## 🎯 **Overview**
This guide covers the complete environment workflow for Contestlet frontend development, from local development to production deployment.

## 🏗️ **Environment Architecture**

### **Environment Types**
```
Development → Staging → Production
     ↓           ↓         ↓
  localhost   staging   production
    3000      domain    domain
```

### **Environment Flow**
```
Local Dev → Staging → Production
   ↓         ↓         ↓
Feature → Testing → Live
Branch → Branch → Branch
```

## 🔧 **Local Development Environment**

### **Configuration**
```bash
# .env.local
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
```

### **Features**
- ✅ **Hot Reload**: Instant code updates
- ✅ **Debug Mode**: Full error details
- ✅ **Mock SMS**: Safe SMS testing
- ✅ **Local API**: Direct backend connection
- ✅ **Development Tools**: Full debugging capabilities

### **Workflow**
1. **Code Changes**: Edit files in `src/`
2. **Auto Reload**: Browser updates automatically
3. **API Testing**: Connect to local backend
4. **Debug**: Use browser DevTools and console

## 🧪 **Staging Environment**

### **Configuration**
```bash
# Staging environment variables
REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
REACT_APP_ENVIRONMENT=staging
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
```

### **Features**
- ✅ **Production Build**: Optimized for performance
- ✅ **Staging API**: Test with staging backend
- ✅ **Debug Enabled**: Full error reporting
- ✅ **Mock SMS**: Safe testing environment
- ✅ **Team Testing**: Share with team members

### **Workflow**
1. **Push to Staging**: `git push origin staging`
2. **Auto Deploy**: Vercel deploys automatically
3. **Team Testing**: Test new features
4. **Bug Fixes**: Iterate and improve
5. **Production Ready**: Validate functionality

## 🚀 **Production Environment**

### **Configuration**
```bash
# Production environment variables
REACT_APP_API_BASE_URL=https://api.contestlet.com
REACT_APP_ENVIRONMENT=production
REACT_APP_DEBUG_MODE=false
REACT_APP_MOCK_SMS=false
```

### **Features**
- ✅ **Production Build**: Fully optimized
- ✅ **Live API**: Production backend
- ✅ **Real SMS**: Actual SMS functionality
- ✅ **Performance**: Optimized for users
- ✅ **Security**: Production-grade security

### **Workflow**
1. **Staging Validation**: Ensure staging works
2. **Merge to Main**: `git checkout main && git merge staging`
3. **Auto Deploy**: Vercel deploys to production
4. **Live Testing**: Verify production functionality
5. **Monitor**: Watch for any issues

## 🔄 **Development Workflow**

### **Feature Development**
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Develop locally
npm start
# Make changes, test locally

# 3. Commit changes
git add .
git commit -m "Add new feature"

# 4. Push to staging
git push origin feature/new-feature
```

### **Staging Testing**
```bash
# 1. Merge to staging
git checkout staging
git merge feature/new-feature

# 2. Deploy to staging
git push origin staging
# Vercel auto-deploys

# 3. Test in staging
# Visit staging URL and test functionality
```

### **Production Deployment**
```bash
# 1. Validate staging
# Ensure everything works in staging

# 2. Merge to main
git checkout main
git merge staging

# 3. Deploy to production
git push origin main
# Vercel auto-deploys to production
```

## 🌍 **Environment Variables**

### **Variable Naming Convention**
```bash
# All variables must start with REACT_APP_
REACT_APP_API_BASE_URL=...
REACT_APP_ENVIRONMENT=...
REACT_APP_DEBUG_MODE=...
```

### **Environment-Specific Values**

#### **Development**
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
```

#### **Staging**
```bash
REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
REACT_APP_ENVIRONMENT=staging
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
```

#### **Production**
```bash
REACT_APP_API_BASE_URL=https://api.contestlet.com
REACT_APP_ENVIRONMENT=production
REACT_APP_DEBUG_MODE=false
REACT_APP_MOCK_SMS=false
```

## 🔧 **Environment Detection**

### **Frontend Environment Logic**
```typescript
// utils/environment.ts
export const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = process.env.REACT_APP_ENVIRONMENT;
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  
  // Default to development for local development
  return 'development';
};

export const isProduction = () => getEnvironment() === 'production';
export const isStaging = () => getEnvironment() === 'staging';
export const isDevelopment = () => getEnvironment() === 'development';
```

### **API Configuration**
```typescript
// utils/api.ts
export const getApiBaseUrl = (): string => {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return 'https://api.contestlet.com';
    case 'staging':
      return 'https://staging-api.contestlet.com';
    case 'development':
    default:
      return 'http://localhost:8000';
  }
};
```

## 🚨 **Environment-Specific Behavior**

### **Development Mode**
- **Debug Logging**: Full console logging
- **Error Details**: Complete error information
- **Mock SMS**: Use test OTP codes
- **Hot Reload**: Instant code updates
- **Local API**: Direct backend connection

### **Staging Mode**
- **Debug Logging**: Full console logging
- **Error Details**: Complete error information
- **Mock SMS**: Use test OTP codes
- **Production Build**: Optimized performance
- **Staging API**: Test backend integration

### **Production Mode**
- **Debug Logging**: Minimal logging
- **Error Details**: Limited error information
- **Real SMS**: Actual SMS functionality
- **Production Build**: Fully optimized
- **Production API**: Live backend

## 🔒 **Security Considerations**

### **Environment Isolation**
- **Development**: Local only, no external access
- **Staging**: Limited external access, test data
- **Production**: Full external access, live data

### **Data Handling**
- **Development**: Mock/test data only
- **Staging**: Test data, no production data
- **Production**: Live user data, proper security

### **API Security**
- **Development**: Localhost CORS allowed
- **Staging**: Staging domain CORS only
- **Production**: Production domain CORS only

## 📊 **Environment Monitoring**

### **Health Checks**
```bash
# Development
curl http://localhost:3000

# Staging
curl https://staging-app.contestlet.com

# Production
curl https://app.contestlet.com
```

### **API Connectivity**
```bash
# Development
curl http://localhost:8000/health

# Staging
curl https://staging-api.contestlet.com/health

# Production
curl https://api.contestlet.com/health
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Environment Variable Problems**
```bash
# Check environment variables
echo $REACT_APP_ENVIRONMENT

# Verify in browser console
console.log(process.env.REACT_APP_ENVIRONMENT)
```

#### **API Connection Issues**
```bash
# Check API URL
console.log(process.env.REACT_APP_API_BASE_URL)

# Test API connectivity
curl $REACT_APP_API_BASE_URL/health
```

#### **Build Failures**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check environment
npm run build
```

## 📋 **Environment Checklist**

### **Development Setup**
- [ ] Local environment configured
- [ ] Backend API running
- [ ] Hot reload working
- [ ] API connectivity verified
- [ ] Debug tools configured

### **Staging Setup**
- [ ] Staging branch created
- [ ] Environment variables set
- [ ] Auto-deployment working
- [ ] Staging API connected
- [ ] Team testing enabled

### **Production Setup**
- [ ] Main branch protected
- [ ] Production variables set
- [ ] Auto-deployment working
- [ ] Production API connected
- [ ] Monitoring enabled

## 🔗 **Useful Commands**

```bash
# Environment management
npm run start:dev      # Start development
npm run start:staging  # Start with staging config
npm run start:prod     # Start with production config

# Build commands
npm run build:dev      # Build for development
npm run build:staging  # Build for staging
npm run build:prod     # Build for production

# Environment checks
npm run env:check      # Verify environment config
npm run env:validate   # Validate environment variables
```

---

**Your environment workflow is now properly configured and ready for development! 🚀**

**Follow this workflow to ensure smooth development, testing, and deployment across all environments.**
