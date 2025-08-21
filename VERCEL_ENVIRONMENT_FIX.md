# 🔧 Vercel Environment Configuration Fix

## 🚨 Current Issue

Our staging deployment went to **Production** environment instead of **Preview**. This defeats the purpose of having separate environments.

**Current Vercel Setup (WRONG):**
- Production: Mixed staging + production deployments ❌
- Preview: All unassigned branches ❌  
- Development: CLI only ❌

**Desired Vercel Setup (CORRECT):**
- Production: `main` branch only → Production backend ✅
- Preview: `staging` branch only → Staging backend ✅
- Development: Local only (no Vercel deployment) ✅

## 🎯 Vercel Environment Strategy

### **Production Environment**
- **Branch**: `main` only
- **API**: `https://api.contestlet.com` (production backend)
- **Domain**: `contestlet-frontend.vercel.app` (primary domain)
- **Purpose**: Live user traffic

### **Preview Environment**  
- **Branch**: `staging` only
- **API**: `https://staging-api.contestlet.com` (staging backend)
- **Domain**: `staging-abc123.vercel.app` (preview URLs)
- **Purpose**: QA testing, integration testing

### **Development Environment**
- **Branch**: `develop` (local only)
- **API**: `http://localhost:8000` (local backend)
- **Domain**: `localhost:3000` (local development)
- **Purpose**: Feature development

## 🔧 Fix Steps Required

### **Step 1: Configure Vercel Environment Variables**

#### **Production Environment Variables**
```
REACT_APP_API_BASE_URL=https://api.contestlet.com
REACT_APP_ENVIRONMENT=production
REACT_APP_DEBUG_MODE=false
```

#### **Preview Environment Variables**
```  
REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
REACT_APP_ENVIRONMENT=staging
REACT_APP_DEBUG_MODE=true
```

### **Step 2: Update Branch Configuration**

#### **Production Branch Settings**
- Only `main` branch deploys to Production
- All other branches deploy to Preview

#### **Preview Branch Settings**
- `staging` branch gets staging environment variables
- Other feature branches get development-like settings

### **Step 3: Update Deployment Commands**

#### **Staging Deployment (to Preview)**
```bash
# Deploy staging to Preview environment
vercel --env REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
```

#### **Production Deployment**
```bash
# Deploy main to Production environment  
vercel --prod --env REACT_APP_API_BASE_URL=https://api.contestlet.com
```

## 🛠️ Implementation Plan

### **A. Clean Up Current Deployments**
1. Delete incorrect staging deployment from Production
2. Redeploy staging to Preview environment
3. Ensure main branch goes to Production only

### **B. Configure Environment Variables**
1. Set Production environment variables for `main` branch
2. Set Preview environment variables for `staging` branch  
3. Test environment variable inheritance

### **C. Update Deployment Scripts**
1. Fix `deploy-staging.sh` to use Preview environment
2. Fix `deploy-production.sh` to use Production environment
3. Add environment validation

### **D. Test Full Workflow**
1. Deploy `staging` → Preview environment
2. Deploy `main` → Production environment
3. Verify API connections are correct

## 📋 Vercel Dashboard Actions Needed

### **Environment Variables Setup**
1. **Go to**: Vercel Dashboard → Project Settings → Environment Variables
2. **Production Variables**:
   - `REACT_APP_API_BASE_URL`: `https://api.contestlet.com`
   - `REACT_APP_ENVIRONMENT`: `production`
   - **Apply to**: Production only
3. **Preview Variables**:
   - `REACT_APP_API_BASE_URL`: `https://staging-api.contestlet.com`  
   - `REACT_APP_ENVIRONMENT`: `staging`
   - **Apply to**: Preview only

### **Git Integration Setup**
1. **Go to**: Settings → Git
2. **Production Branch**: Set to `main` only
3. **Preview Branches**: All other branches (including `staging`)
4. **Auto-Deploy**: Enable for both Production and Preview

## 🎯 Expected Result After Fix

### **Staging Workflow**
```bash
git push origin staging
# → Deploys to Vercel Preview environment  
# → Uses staging-api.contestlet.com
# → Gets preview URL like staging-abc123.vercel.app
```

### **Production Workflow**
```bash
git push origin main
# → Deploys to Vercel Production environment
# → Uses api.contestlet.com  
# → Gets production URL contestlet-frontend.vercel.app
```

### **Development Workflow**
```bash
# Local only - no Vercel deployment
npm start
# → localhost:3000 → localhost:8000
```

## 🔍 Verification Steps

After implementing the fix:

1. **Check staging deployment**:
   - Should be in Preview environment
   - Should connect to staging-api.contestlet.com
   - Should have preview URL

2. **Check production deployment**:
   - Should be in Production environment only
   - Should connect to api.contestlet.com
   - Should have production domain

3. **Test environment isolation**:
   - Staging frontend → Staging backend only
   - Production frontend → Production backend only
   - No cross-environment contamination

---

**This fix will establish proper environment separation in Vercel to match our backend strategy! 🎯**
