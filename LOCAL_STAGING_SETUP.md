# 🏠 Local Staging Setup Guide

## 🎯 Quick Local Testing Setup

Since we're having GitHub push protection issues, here's how to test the staging build locally while we resolve the repository access:

## 🚀 Option 1: Local Staging Build

### **1. Create Staging Environment File**
```bash
# Create staging environment
cp .env .env.staging

# Edit staging config
cat > .env.staging << EOF
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=staging
GENERATE_SOURCEMAP=true
EOF
```

### **2. Build and Test Staging Locally**
```bash
# Build staging version
npm run build

# Serve locally with staging environment
npx serve -s build -l 3001

# Or use a simple Python server
cd build && python -m http.server 3001
```

### **3. Test Staging Build**
- **URL**: http://localhost:3001
- **Environment**: Production build with staging config
- **Backend**: Connect to your local backend on port 8000

## 🧪 Option 2: Staging Port Setup

### **Run on Different Port for Testing**
```bash
# Terminal 1: Start backend (port 8000)
cd ../contestlet-backend  # Navigate to backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend staging (port 3001)
cd contestlet-frontend
PORT=3001 npm start
```

### **Access URLs:**
- **Development**: http://localhost:3000 (normal dev)
- **Staging**: http://localhost:3001 (staging test)
- **Backend**: http://localhost:8000 (API)

## 🔧 Testing the Recent Fixes

### **Test Contest Winner Selection Fix**
1. **Go to**: http://localhost:3001/admin/contests
2. **Click "View Details/Entries"** on a contest
3. **Check Debug Info**: Should show:
   - Contest Status: 🔴 Inactive (if past end time)
   - Has Ended (Time Check): ✅ Yes
   - Can Select Winner: ✅ Yes
4. **Test Winner Selection**: Button should be enabled

### **Test Contest Deletion Feature**  
1. **Go to**: http://localhost:3001/admin/contests
2. **Click Delete** on any contest
3. **Verify**: Should work (no more 405 errors)
4. **Check**: Contest disappears with cleanup summary

### **Test Timezone Handling**
1. **Edit a contest**: Set time to 5:00 PM
2. **Save**: Time should remain 5:00 PM (no jumping)
3. **Contest List**: Times should display in your timezone

## 📊 Local Testing Checklist

- [ ] Contest creation and editing
- [ ] Timezone display consistency
- [ ] Winner selection for ended contests
- [ ] Contest deletion functionality
- [ ] Responsive design
- [ ] Error handling
- [ ] Authentication flows

## 🌐 When Ready for Remote Staging

### **GitHub Access Resolution**
1. **Use the allowlist URL**: https://github.com/reed-hub/contestlet-frontend/security/secret-scanning/unblock-secret/31ZZNx4eI3kGNBvySnexzfxG5Ev
2. **Allow the Twilio secret** (it's example data, safe to allow)
3. **Push staging branch**: `git push origin staging`

### **Quick Deploy Options**

#### **Vercel (Recommended)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy current directory
vercel --prod

# Custom staging URL
vercel --prod --branch staging
```

#### **Netlify**
```bash
# Install Netlify CLI  
npm install -g netlify-cli

# Deploy build folder
npm run build
netlify deploy --prod --dir build
```

## 🎯 Immediate Next Steps

1. **Test locally** with the staging setup above
2. **Verify contest fixes** are working properly
3. **Resolve GitHub access** using the allowlist URL
4. **Push staging branch** once access is restored
5. **Set up remote staging** deployment

## 🔍 Debug the Contest Issue

**Priority**: Test if the contest winner selection fix works:

```bash
# Start staging environment
PORT=3001 npm start

# Navigate to contest with entries
# Check if "Select Random Winner" is now enabled
# Verify debug info shows correct end time logic
```

**Expected Result**: Contest should be recognized as ended and allow winner selection.

---

**This local staging setup lets you test all recent fixes immediately while we resolve the GitHub repository access!** 🚀
