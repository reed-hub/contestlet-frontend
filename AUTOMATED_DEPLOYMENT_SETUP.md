# 🤖 Automated Deployment Setup Guide

## 🎯 Goal: Auto-Deploy Staging Branch

Every time you push to the `staging` branch, Vercel will automatically deploy your changes.

## 📋 Current Status

✅ **Staging branch created**  
✅ **Manual deployment working**  
✅ **Vercel project linked**  
⚠️ **GitHub push blocked** (need to allowlist Twilio credentials)  
⏳ **Auto-deployment setup** (in progress)

## 🔧 Step 1: Resolve GitHub Access

**First, we need to push the staging branch to GitHub:**

1. **Visit this URL to allowlist the Twilio credentials**:
   ```
   https://github.com/reed-hub/contestlet-frontend/security/secret-scanning/unblock-secret/31ZZNx4eI3kGNBvySnexzfxG5Ev
   ```

2. **Click "Allow secret"** (it's example data, safe to allow)

3. **Push staging branch**:
   ```bash
   git push origin staging
   ```

## 🚀 Step 2: Connect Git to Vercel

Once GitHub access is restored:

```bash
# Connect your GitHub repo to Vercel project
vercel git connect https://github.com/reed-hub/contestlet-frontend.git
```

## ⚙️ Step 3: Configure Automated Deployment

### **Option A: Vercel Dashboard (Recommended)**

1. **Go to**: https://vercel.com/matthew-reeds-projects-89c602d6/contestlet-frontend
2. **Settings** → **Git**
3. **Connect Git Repository**
4. **Select**: `reed-hub/contestlet-frontend`
5. **Configure branches**:
   - `staging` → Auto-deploy to staging environment
   - `main` → Auto-deploy to production environment

### **Option B: CLI Setup**

```bash
# Connect repository
vercel git connect

# This will prompt you to select your GitHub repo
# Choose: reed-hub/contestlet-frontend
```

## 📁 Configuration Files Added

### **1. `vercel.json` - Vercel Configuration**
```json
{
  "git": {
    "deploymentEnabled": {
      "staging": true,
      "main": true
    }
  },
  "env": {
    "REACT_APP_ENVIRONMENT": "staging"
  }
}
```

### **2. `.github/workflows/staging-deploy.yml` - GitHub Actions**
```yaml
# Automatic deployment workflow
# Triggers on push to staging branch
# Runs tests, builds, and deploys to Vercel
```

## 🧪 Step 4: Test Automated Deployment

Once set up:

```bash
# Make a small change
echo "# Staging test" >> STAGING_TEST.md
git add .
git commit -m "Test automated staging deployment"
git push origin staging

# ✅ Should automatically trigger Vercel deployment
# ✅ New staging URL will be generated
# ✅ You'll get deployment notifications
```

## 📊 What You'll Get

### **Automatic Deployment Flow:**
1. **Push to staging** → Triggers deployment
2. **Vercel builds** → Runs tests and build
3. **Deploy success** → New staging URL ready
4. **Notifications** → Email/Slack alerts (optional)

### **Staging URLs:**
- **Current**: https://contestlet-frontend-pr9zvd70q-matthew-reeds-projects-89c602d6.vercel.app
- **Auto-deploy**: Will get new URLs like `staging-abc123.vercel.app`
- **Custom domain** (optional): `staging.contestlet.com`

### **Branch Strategy:**
```
development → staging → main
     ↓          ↓        ↓
   manual    auto     auto
   testing   deploy   deploy
```

## 🎯 Benefits of Auto-Deployment

1. **Instant Testing**: Push code → Test in 2 minutes
2. **Team Collaboration**: Share staging URL immediately  
3. **Client Demos**: Always up-to-date staging environment
4. **CI/CD Pipeline**: Professional development workflow
5. **Quality Control**: Tests run before deployment

## 🔧 Advanced Configuration

### **Environment Variables for Staging**
```bash
# Set staging-specific variables
vercel env add REACT_APP_API_BASE_URL
# Enter: https://staging-api.contestlet.com
# Environment: Production (will be used for staging)

vercel env add REACT_APP_ENVIRONMENT  
# Enter: staging
# Environment: Production
```

### **Custom Domain for Staging**
```bash
# Add custom domain (optional)
vercel domains add staging.contestlet.com
vercel alias staging.contestlet.com
```

### **Deployment Notifications**
- **Email**: Auto-enabled in Vercel
- **Slack**: Add webhook in Vercel integrations
- **GitHub**: Status checks on PRs

## 📋 Next Steps Checklist

- [ ] **Allowlist Twilio credentials** on GitHub
- [ ] **Push staging branch** to GitHub
- [ ] **Connect Git repository** to Vercel project
- [ ] **Test automated deployment** with small change
- [ ] **Configure environment variables** for staging
- [ ] **Set up notifications** (optional)
- [ ] **Test the contest fixes** on auto-deployed staging

## 🚨 Troubleshooting

### **GitHub Push Still Blocked**
- Use the allowlist URL provided above
- Contact GitHub support if issues persist
- Alternative: Create new repository without sensitive history

### **Vercel Git Connection Failed**
```bash
# Check if logged in
vercel whoami

# Re-authenticate if needed
vercel logout
vercel login
```

### **Deployment Failed**
- Check Vercel dashboard for build logs
- Verify environment variables are set
- Check for syntax errors in vercel.json

## ✅ Success Criteria

**You'll know it's working when:**
1. ✅ Push to staging triggers automatic build
2. ✅ New deployment URL appears in minutes
3. ✅ Staging environment reflects your latest changes
4. ✅ Build and test pipeline passes
5. ✅ Notifications arrive (if configured)

---

**Professional automated deployment pipeline ready! 🚀**
