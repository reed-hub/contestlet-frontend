# 🏠 Local Staging Setup Guide

## 🎯 **Overview**
This guide covers setting up a local staging environment for Contestlet frontend development and testing.

## 📋 **Prerequisites**
- Node.js 18+ installed
- npm or yarn package manager
- Git repository cloned
- Backend API running locally

## 🔧 **Initial Setup**

### **1. Clone Repository**
```bash
git clone https://github.com/your-org/contestlet-frontend.git
cd contestlet-frontend
```

### **2. Install Dependencies**
```bash
npm install
# or
yarn install
```

### **3. Environment Configuration**
Create `.env.local` file in root directory:
```bash
# Local Development Environment
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
```

## 🚀 **Running the Application**

### **Development Server**
```bash
npm start
# or
yarn start
```

**Default URL**: http://localhost:3000

### **Alternative Ports**
If port 3000 is busy:
```bash
# Use different port
PORT=3002 npm start
# or
yarn start --port 3002
```

## 🌍 **Environment Configuration**

### **Development Environment**
```bash
# .env.development
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
REACT_APP_ENABLE_LOGGING=true
```

### **Local Staging Environment**
```bash
# .env.staging.local
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=staging
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_SMS=true
REACT_APP_ENABLE_LOGGING=true
```

## 🔗 **Backend Integration**

### **Local Backend Setup**
1. **Start Backend**: Run your FastAPI backend on port 8000
2. **Verify Health**: Check `http://localhost:8000/health`
3. **CORS Configuration**: Ensure localhost origins are allowed

### **API Endpoints**
- **Health Check**: `GET /health`
- **Contests**: `GET /contests/active`
- **Authentication**: `POST /auth/request-otp`

## 🧪 **Testing Configuration**

### **Mock SMS Mode**
```typescript
// In development, use mock OTP code
const MOCK_OTP_CODE = '123456';

// Test phone numbers
const TEST_PHONES = [
  '18187958204',  // Admin phone
  '5551234567',   // Test user phone
];
```

### **Test Data**
```json
{
  "test_contest": {
    "name": "Local Test Contest",
    "description": "Contest for local development testing",
    "start_time": "2025-01-20T10:00:00Z",
    "end_time": "2025-01-27T10:00:00Z"
  }
}
```

## 🔧 **Development Tools**

### **Available Scripts**
```bash
# Development
npm start          # Start development server
npm test           # Run test suite
npm run build      # Build for production
npm run eject      # Eject from Create React App

# Additional tools
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### **Debug Configuration**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

## 🌐 **Browser Configuration**

### **Chrome DevTools**
1. **Open DevTools**: F12 or Ctrl+Shift+I
2. **Console**: View logs and errors
3. **Network**: Monitor API calls
4. **Application**: Check localStorage and session

### **Mobile Testing**
```bash
# Expose local server to network
npx serve -s build -l 3000 --host 0.0.0.0

# Access from mobile device
http://YOUR_LOCAL_IP:3000
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm start
```

#### **API Connection Issues**
```bash
# Check backend status
curl http://localhost:8000/health

# Verify CORS configuration
curl -H "Origin: http://localhost:3000" http://localhost:8000/health
```

#### **Build Errors**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

### **Debug Commands**
```bash
# Check environment variables
echo $REACT_APP_API_BASE_URL

# Verify package versions
npm list react react-dom

# Check build output
npm run build
```

## 📊 **Performance Monitoring**

### **Development Metrics**
- **Bundle Size**: Monitor with webpack-bundle-analyzer
- **Build Time**: Track build performance
- **Hot Reload**: Measure development iteration speed

### **Runtime Performance**
- **Page Load**: Use React DevTools Profiler
- **API Calls**: Monitor network performance
- **Memory Usage**: Check for memory leaks

## 🔒 **Security Considerations**

### **Local Development**
- **Environment Variables**: Never commit `.env.local`
- **API Keys**: Use mock/development keys only
- **CORS**: Allow localhost origins in development
- **HTTPS**: Not required for localhost

### **Data Handling**
- **Test Data**: Use mock data, not production data
- **User Input**: Sanitize all user inputs
- **API Calls**: Validate API responses

## 📋 **Setup Checklist**

- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment file created
- [ ] Backend API running
- [ ] Development server started
- [ ] API connectivity verified
- [ ] Test data configured
- [ ] Debug tools configured
- [ ] Browser testing setup
- [ ] Performance monitoring enabled

## 🔗 **Useful Links**

- **Local Development**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

**Your local staging environment is now ready for development! 🚀**

**Start coding with hot reload, full debugging capabilities, and local API integration.**
