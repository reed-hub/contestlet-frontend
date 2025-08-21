# 🚀 Staging Deployment Guide

## 📋 Overview

This guide covers deploying the Contestlet frontend to a staging environment for testing before production deployment.

## 🌐 Branch Strategy

### **Main Branches:**
- **`main`**: Production-ready code
- **`staging`**: Testing environment (this branch)
- **`development`**: Active development work

### **Workflow:**
1. **Development** → `development` branch
2. **Testing** → `staging` branch  
3. **Production** → `main` branch

## 🏗️ Staging Environment Setup

### **Option 1: Vercel (Recommended - Easy)**

#### **1. Connect Repository to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy staging branch
vercel --prod --branch staging
```

#### **2. Environment Variables**
Add to Vercel dashboard:
```env
REACT_APP_API_BASE_URL=https://your-staging-api.herokuapp.com
NODE_ENV=production
```

#### **3. Custom Domain** (Optional)
- Staging URL: `contestlet-staging.vercel.app`
- Custom domain: `staging.contestlet.com`

---

### **Option 2: Netlify**

#### **1. Connect Repository**
1. Go to [Netlify](https://netlify.com)
2. "New site from Git" → Connect your GitHub repo
3. Branch to deploy: `staging`
4. Build command: `npm run build`
5. Publish directory: `build`

#### **2. Environment Variables**
```env
REACT_APP_API_BASE_URL=https://your-staging-api.herokuapp.com
```

---

### **Option 3: Traditional Server (VPS/AWS/DigitalOcean)**

#### **1. Server Setup**
```bash
# On your staging server
git clone https://github.com/your-username/contestlet-frontend.git
cd contestlet-frontend
git checkout staging

# Install dependencies
npm install

# Build for production
npm run build

# Serve with nginx/apache
```

#### **2. Nginx Configuration**
```nginx
server {
    listen 80;
    server_name staging.contestlet.com;
    
    root /var/www/contestlet-frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (optional)
    location /api/ {
        proxy_pass https://your-staging-api.herokuapp.com/;
    }
}
```

---

### **Option 4: Docker Deployment**

#### **1. Create Dockerfile**
```dockerfile
# Multi-stage build
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . ./
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **2. Deploy to Staging Server**
```bash
# Build and deploy
docker build -t contestlet-frontend-staging .
docker run -d -p 3000:80 --name contestlet-staging contestlet-frontend-staging
```

## 🔧 Environment Configuration

### **Staging Environment Variables**

Create `.env.staging`:
```env
# API Configuration
REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
REACT_APP_ENVIRONMENT=staging

# Debug Settings
REACT_APP_DEBUG_MODE=true
GENERATE_SOURCEMAP=true

# Analytics (Optional)
REACT_APP_GA_TRACKING_ID=staging-tracking-id
```

### **Build Scripts**

Update `package.json`:
```json
{
  "scripts": {
    "build:staging": "REACT_APP_ENVIRONMENT=staging npm run build",
    "deploy:staging": "npm run build:staging && vercel --prod --branch staging"
  }
}
```

## 🧪 Testing Workflow

### **1. Deploy to Staging**
```bash
# Switch to staging branch
git checkout staging

# Merge latest changes from main
git merge main

# Push to trigger staging deployment
git push origin staging
```

### **2. Test Features**
- ✅ Contest creation and editing
- ✅ Timezone handling (different browser timezones)
- ✅ Contest deletion functionality  
- ✅ Winner selection process
- ✅ SMS notifications (if configured)
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Authentication flows

### **3. Promote to Production**
```bash
# After staging tests pass
git checkout main
git merge staging
git push origin main
```

## 🔗 Backend Integration

### **Staging API Setup**
Ensure your staging environment connects to a staging backend:

```env
# Frontend staging → Backend staging
REACT_APP_API_BASE_URL=https://contestlet-backend-staging.herokuapp.com

# Or if using same backend with staging data
REACT_APP_API_BASE_URL=https://api.contestlet.com/staging
```

### **Cross-Origin Setup**
Backend staging CORS configuration:
```python
# Backend staging environment
CORS_ALLOWED_ORIGINS = [
    "https://contestlet-staging.vercel.app",
    "https://staging.contestlet.com",
    "http://localhost:3000"  # For development
]
```

## 📊 Monitoring & Testing

### **Staging Testing Checklist**
- [ ] Contest CRUD operations
- [ ] Timezone conversion accuracy
- [ ] Delete functionality with cleanup
- [ ] Winner selection and SMS
- [ ] Authentication (admin and user)
- [ ] Responsive design
- [ ] Performance testing
- [ ] Error handling
- [ ] API integration

### **Tools for Testing**
- **Browser DevTools**: Check console errors
- **Lighthouse**: Performance auditing
- **BrowserStack**: Cross-browser testing  
- **Postman**: API endpoint testing

## 🚀 Quick Deploy Commands

### **Option A: Vercel (Fastest)**
```bash
# First time setup
vercel --prod --branch staging

# Subsequent deployments  
git push origin staging  # Auto-deploys
```

### **Option B: Traditional Server**
```bash
# On staging server
cd /var/www/contestlet-frontend
git pull origin staging
npm install
npm run build
sudo systemctl restart nginx
```

### **Option C: Docker**
```bash
# Build and deploy
docker build -t contestlet-staging .
docker stop contestlet-staging || true
docker rm contestlet-staging || true
docker run -d -p 3000:80 --name contestlet-staging contestlet-staging
```

## 🎯 Benefits of Staging

1. **Safe Testing**: Test features without affecting production
2. **Client Preview**: Share staging URL for feedback
3. **Integration Testing**: Test with staging backend/APIs
4. **Performance Testing**: Test under production-like conditions
5. **Bug Detection**: Catch issues before production deployment

## 🔧 Next Steps

1. **Choose deployment option** (Vercel recommended for simplicity)
2. **Set up environment variables** for staging API
3. **Configure automated deployment** from staging branch
4. **Test the contest status fix** we just implemented
5. **Verify delete functionality** works with backend API

---

**Staging environment allows safe testing of the timezone fixes and delete functionality before production deployment!** 🎯
