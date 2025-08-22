# ⚙️ Vercel Dashboard Environment Setup

## 🎯 Goal: Proper Environment Separation

Configure Vercel so that:
- **`main` branch** → **Production** environment → `api.contestlet.com`
- **`staging` branch** → **Preview** environment → `staging-api.contestlet.com`
- **`develop` branch** → **Local only** → `localhost:8000`

## 📊 Current Issue

Looking at your Vercel dashboard screenshot:
- ❌ Staging deployment went to **Production** environment
- ❌ No proper environment variable separation
- ❌ Branch configuration not optimized

## 🔧 Dashboard Configuration Steps

### **Step 1: Environment Variables Setup**

**Go to**: [Vercel Dashboard](https://vercel.com/matthew-reeds-projects-89c602d6/contestlet-frontend/settings/environment-variables)

#### **Production Environment Variables**
Click "Add New" and create:

```
Name: REACT_APP_API_BASE_URL
Value: https://api.contestlet.com
Environments: ✅ Production only
```

```
Name: REACT_APP_ENVIRONMENT  
Value: production
Environments: ✅ Production only
```

```
Name: REACT_APP_DEBUG_MODE
Value: false
Environments: ✅ Production only
```

#### **Preview Environment Variables**
Click "Add New" and create:

```
Name: REACT_APP_API_BASE_URL
Value: https://staging-api.contestlet.com
Environments: ✅ Preview only
```

```
Name: REACT_APP_ENVIRONMENT
Value: staging
Environments: ✅ Preview only
```

```
Name: REACT_APP_DEBUG_MODE
Value: true
Environments: ✅ Preview only
```

### **Step 2: Git Configuration**

**Go to**: [Git Settings](https://vercel.com/matthew-reeds-projects-89c602d6/contestlet-frontend/settings/git)

#### **Production Branch**
- **Set**: `main` as the production branch
- **Result**: Only `main` deploys to Production environment

#### **Preview Branches**
- **Default**: All other branches deploy to Preview
- **Include**: `staging`, feature branches, etc.

### **Step 3: Clean Up Current Deployments**

**Go to**: [Deployments](https://vercel.com/matthew-reeds-projects-89c602d6/contestlet-frontend)

1. **Find staging deployment** in Production environment
2. **Delete or demote** it from Production
3. **Redeploy staging** to Preview environment

## 🚀 Testing the Fix

### **Test Staging (Preview) Deployment**
```bash
git checkout staging
git push origin staging
# → Should deploy to Preview environment
# → Should use staging-api.contestlet.com
# → Should get preview URL like staging-abc123.vercel.app
```

### **Test Production Deployment**
```bash
git checkout main  
git push origin main
# → Should deploy to Production environment
# → Should use api.contestlet.com
# → Should get production domain
```

## 📋 Expected Vercel Dashboard After Fix

### **Environments Section Should Show:**

#### **🏆 Production**
- **Branch Tracking**: `main` only
- **Domains**: `contestlet-frontend.vercel.app` 
- **Environment Variables**: Production API URL

#### **🧪 Preview**
- **Branch Tracking**: All unassigned branches (including `staging`)
- **Domains**: `staging-abc123.vercel.app` style URLs
- **Environment Variables**: Staging API URL

#### **🔧 Development**  
- **Branch Tracking**: Accessible via CLI only
- **Domains**: No custom domains
- **Environment Variables**: Local development settings

## 🔍 Verification Checklist

After setup:

- [ ] **Production environment** only has `main` branch deployments
- [ ] **Preview environment** has `staging` branch deployments  
- [ ] **Environment variables** are properly separated
- [ ] **Staging frontend** connects to `staging-api.contestlet.com`
- [ ] **Production frontend** connects to `api.contestlet.com`
- [ ] **No cross-environment** contamination

## 🛠️ Manual Commands (If Needed)

### **Force Redeploy Staging to Preview**
```bash
git checkout staging
vercel --env REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
```

### **Force Deploy Production**
```bash  
git checkout main
vercel --prod --env REACT_APP_API_BASE_URL=https://api.contestlet.com
```

### **Check Environment Variables**
```bash
vercel env ls
# Should show different variables for Production vs Preview
```

## 🎯 Success Criteria

**You'll know it's working when:**
1. ✅ `staging` branch deploys to Preview environment
2. ✅ `main` branch deploys to Production environment  
3. ✅ Staging connects to staging backend API
4. ✅ Production connects to production backend API
5. ✅ No environment mixing occurs
6. ✅ Dashboard shows proper environment separation

---

**Once configured, your Vercel environments will perfectly match your backend three-environment strategy! 🎯**
