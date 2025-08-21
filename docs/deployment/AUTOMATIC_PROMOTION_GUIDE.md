# 🔄 Automatic Deployment Promotion Guide

## 🚨 **Current Issue**

**Manual promotion is required** because the custom domain `app.contestlet.com` doesn't automatically point to the latest deployment from `main` branch.

## 🔍 **Why Manual Promotion is Needed**

### **What's Working:**
✅ **Auto-deployment**: `main` branch push → New deployment created  
✅ **Environment**: New deployment goes to Production environment  
✅ **Build**: Successful with correct environment variables  

### **What's NOT Working:**
❌ **Domain assignment**: `app.contestlet.com` doesn't auto-update to latest deployment

## 🎯 **Root Cause Analysis**

### **Expected Behavior:**
1. **Push to main** → ✅ Auto-deployment created
2. **New deployment** → ✅ Goes to Production environment  
3. **Custom domain** → ❌ Should auto-point to latest deployment (but doesn't)

### **Why This Happens:**
- **Default Vercel domains** (like `contestlet-frontend.vercel.app`) auto-update
- **Custom domains** often require manual configuration for auto-promotion
- **Multiple deployments** in Production environment can cause confusion

## 🔧 **Solutions to Enable Automatic Promotion**

### **Option 1: Vercel Dashboard Configuration (Recommended)**

**In Vercel Dashboard:**
1. **Go to Project Settings** → **Domains**
2. **Click on `app.contestlet.com`** 
3. **Look for "Git Branch" or "Auto-assign" settings**
4. **Ensure it's set to**: `main` branch with auto-promotion enabled
5. **Save configuration**

### **Option 2: Remove and Re-add Custom Domain**

Sometimes the domain configuration gets "stuck":
1. **Remove** `app.contestlet.com` from domains
2. **Re-add** `app.contestlet.com` 
3. **Configure** to auto-assign to `main` branch Production deployments
4. **Test** with a new push

### **Option 3: Use Production Branch Setting**

**In vercel.json** (already configured):
```json
{
  "git": {
    "productionBranch": "main"
  }
}
```

**But may need dashboard configuration** to enforce this for custom domains.

### **Option 4: Deployment Protection Settings**

**Check Deployment Protection:**
1. **Go to Settings** → **Deployment Protection**
2. **Ensure Production deployments** don't require manual approval
3. **Disable any manual gates** that might be blocking auto-promotion

## 📋 **Testing Automatic Promotion**

### **Test 1: Make a Small Change**
```bash
# Make a trivial change
echo "# Auto-promotion test $(date)" >> README.md
git add README.md
git commit -m "Test automatic promotion"
git push origin main

# Wait 2-3 minutes, then check:
# https://app.contestlet.com
# Should show the latest deployment automatically
```

### **Test 2: Check Vercel Dashboard**
1. **Go to Deployments**
2. **Look for** automatic "Promoted to Production" badges
3. **Check Domain** tab for auto-assignment logs

## 🎯 **Expected vs Current Behavior**

### **Expected (Automatic):**
```
Git Push → Auto-deployment → Auto-promotion → Domain Updated
main       ✅ Working      ❌ Manual       ✅ After promotion
```

### **Current (Manual):**
```
Git Push → Auto-deployment → Manual Promotion → Domain Updated  
main       ✅ Working      🔄 Required       ✅ Works
```

## 💡 **Quick Fixes to Try**

### **Fix 1: Dashboard Domain Settings**
1. **Settings** → **Domains** → **`app.contestlet.com`** → **Edit**
2. **Look for**: "Automatically assign to latest Production deployment"
3. **Enable** if available

### **Fix 2: Environment Priority**
1. **Settings** → **Environments** → **Production**
2. **Ensure** only `main` branch is assigned
3. **Check** auto-promotion settings

### **Fix 3: Git Integration Refresh**
```bash
# Disconnect and reconnect Git
vercel git disconnect
vercel git connect https://github.com/reed-hub/contestlet-frontend.git
```

## 🔍 **Troubleshooting Steps**

### **Step 1: Check Recent Deployments**
- Do they show "Promoted to Production" automatically?
- Or do they require manual promotion?

### **Step 2: Check Domain Configuration**
- Is `app.contestlet.com` set to track `main` branch?
- Are there any manual approval gates?

### **Step 3: Test with Vercel Default Domain**
- Does `contestlet-frontend.vercel.app` auto-update?
- If yes, the issue is custom domain configuration
- If no, the issue is broader deployment settings

## 🎊 **Ideal End State**

**Perfect Auto-deployment:**
```
Developer: git push origin main
Vercel:    ✅ Auto-build
Vercel:    ✅ Auto-deploy to Production
Vercel:    ✅ Auto-promote to app.contestlet.com
Result:    ✅ No manual intervention needed
```

## 📝 **Action Items**

1. **Check domain settings** in Vercel dashboard
2. **Look for auto-promotion configuration** 
3. **Test with a small commit** to verify automatic behavior
4. **Document** the working configuration for future reference

---

**The goal is to eliminate manual promotion and achieve full automation! 🚀**
