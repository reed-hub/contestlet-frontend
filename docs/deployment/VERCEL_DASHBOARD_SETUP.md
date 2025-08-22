# 🎯 Vercel Dashboard Setup Guide

## 🚀 **Overview**
This guide covers setting up and configuring your Vercel dashboard for the Contestlet frontend deployment.

## 📋 **Prerequisites**
- Vercel account created
- Contestlet repository connected to Vercel
- GitHub integration configured

## 🔧 **Initial Setup**

### **1. Connect Repository**
1. **Go to**: [Vercel Dashboard](https://vercel.com/dashboard)
2. **Click**: "New Project"
3. **Import**: Select your Contestlet repository
4. **Configure**: Set project name and framework

### **2. Project Configuration**
- **Framework Preset**: Create React App
- **Root Directory**: `./` (root of repository)
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

## 🌍 **Environment Variables**

### **Required Variables**
```bash
# API Configuration
REACT_APP_API_BASE_URL=https://api.contestlet.com
REACT_APP_ENVIRONMENT=production

# Feature Flags
REACT_APP_DEBUG_MODE=false
REACT_APP_MOCK_SMS=false
```

### **Staging Variables**
```bash
# Staging API
REACT_APP_API_BASE_URL=https://staging-api.contestlet.com
REACT_APP_ENVIRONMENT=staging
REACT_APP_DEBUG_MODE=true
```

### **Setting Variables**
1. **Go to**: Project Settings → Environment Variables
2. **Add Variable**: Name and value
3. **Select Environment**: Production, Preview, or Development
4. **Save**: Apply changes

## 🚀 **Deployment Settings**

### **Build Configuration**
- **Node.js Version**: 18.x or higher
- **Build Timeout**: 10 minutes
- **Max Lambda Size**: 50MB

### **Domain Configuration**
1. **Go to**: Domains section
2. **Add Domain**: `app.contestlet.com`
3. **Configure DNS**: Point to Vercel nameservers
4. **SSL**: Automatic HTTPS enabled

## 🔄 **Deployment Workflow**

### **Automatic Deployments**
- **Main Branch**: Deploys to production
- **Staging Branch**: Deploys to staging
- **Feature Branches**: Create preview deployments

### **Manual Deployments**
1. **Go to**: Deployments tab
2. **Click**: "Redeploy" for specific deployment
3. **Select**: Environment and configuration

## 📊 **Monitoring & Analytics**

### **Performance Metrics**
- **Core Web Vitals**: LCP, FID, CLS
- **Build Performance**: Build time and size
- **Runtime Performance**: Page load times

### **Error Tracking**
- **Build Errors**: Failed deployments
- **Runtime Errors**: JavaScript errors in production
- **Performance Issues**: Slow loading pages

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Build Failures**
```bash
# Check build logs
vercel logs --follow

# Local build test
npm run build
```

#### **Environment Variable Issues**
- Verify variable names start with `REACT_APP_`
- Check environment selection (Production vs Preview)
- Ensure no typos in variable values

#### **Domain Issues**
- Verify DNS configuration
- Check SSL certificate status
- Ensure domain is properly configured

### **Debug Commands**
```bash
# Check deployment status
vercel ls

# View project info
vercel inspect

# Check environment variables
vercel env ls
```

## 🔒 **Security Settings**

### **Access Control**
- **Team Members**: Add collaborators
- **Permissions**: Set role-based access
- **API Tokens**: Generate for CI/CD

### **Environment Protection**
- **Production**: Require approval for deployments
- **Staging**: Allow automatic deployments
- **Preview**: Open for testing

## 📈 **Performance Optimization**

### **Build Optimization**
- **Dependencies**: Audit and remove unused packages
- **Bundle Analysis**: Use webpack-bundle-analyzer
- **Code Splitting**: Implement lazy loading

### **Runtime Optimization**
- **CDN**: Leverage Vercel's global edge network
- **Caching**: Configure appropriate cache headers
- **Compression**: Enable gzip/brotli compression

## 🔗 **Useful Links**

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentation**: https://vercel.com/docs
- **CLI Reference**: https://vercel.com/docs/cli
- **Support**: https://vercel.com/support

## 📋 **Checklist**

- [ ] Repository connected to Vercel
- [ ] Environment variables configured
- [ ] Domain configured and SSL enabled
- [ ] Automatic deployments working
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
- [ ] Team access configured
- [ ] Security settings applied

---

**Your Vercel dashboard is now properly configured for Contestlet deployment! 🚀**
