# 🚨 Backend Server Not Running - Local Development

## 🔍 **Problem Identified**

The local development backend server at `localhost:8000` is not running, preventing any API connectivity.

### 📋 **Error Details**

```
GET http://localhost:8000/ net::ERR_CONNECTION_REFUSED
POST http://localhost:8000/auth/request-otp net::ERR_CONNECTION_REFUSED
```

**Translation**: No server is listening on port 8000. The backend application needs to be started.

### 🆚 **Error Type Comparison**

| Error Type | Meaning | Solution |
|------------|---------|----------|
| `ERR_CONNECTION_REFUSED` | ❌ **Server not running** | Start backend server |
| `CORS policy blocked` | ⚠️ **Server running, CORS issue** | Fix CORS configuration |
| `404 Not Found` | ⚠️ **Server running, wrong endpoint** | Check API routes |

### 🚀 **Solutions**

#### **1. Start the Backend Server**

Navigate to your backend project directory and start the server:

```bash
# Navigate to backend directory
cd /path/to/contestlet-backend

# Install dependencies (if first time)
npm install
# OR
pip install -r requirements.txt

# Start development server
npm run dev
# OR
python main.py
# OR
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### **2. Verify Backend is Running**

After starting, test the backend:

```bash
# Test health endpoint
curl http://localhost:8000/

# Expected response:
# {"message":"Welcome to Contestlet API","status":"healthy","environment":"development"}
```

#### **3. Check Port Configuration**

Ensure the backend is configured to run on port 8000:

```bash
# Backend should start with output like:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

### 🔧 **Common Startup Issues**

#### **Issue 1: Port Already in Use**
```
Error: [Errno 48] Address already in use
```
**Solution**: Kill existing process or use different port
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or start on different port
uvicorn main:app --reload --port 8001
```

#### **Issue 2: Missing Dependencies**
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution**: Install dependencies
```bash
# Python
pip install -r requirements.txt

# Node.js
npm install
```

#### **Issue 3: Environment Variables**
```
Error: Database connection failed
```
**Solution**: Set up environment variables
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### 🎯 **Frontend Impact**

When backend is not running:
- ❌ **API Health Status**: Shows "API Unavailable"
- ❌ **Admin Login**: Cannot request OTP
- ❌ **Contest Entry**: Cannot submit entries
- ❌ **All API Features**: Completely blocked

### 📋 **Development Workflow**

**Recommended startup order:**
1. **Start Backend** (localhost:8000)
2. **Start Frontend** (localhost:3002)
3. **Test Connection** (visit localhost:3002)

### 🧪 **Verification Checklist**

After starting backend:
- [ ] Backend server logs show "running on http://0.0.0.0:8000"
- [ ] `curl http://localhost:8000/` returns healthy response
- [ ] Frontend API health indicator shows green
- [ ] Admin login page loads without connection errors

### 🔗 **Related Issues**

- **If backend starts but still errors**: See [Local Development CORS Issue](./LOCAL_DEVELOPMENT_CORS_ISSUE.md)
- **If backend runs on different port**: Update frontend `REACT_APP_API_BASE_URL`
- **For staging/production issues**: See [Staging CORS Issue](./STAGING_CORS_ISSUE_REPORT.md)

### 💡 **Quick Test**

```bash
# Test if ANY process is listening on port 8000
lsof -i :8000

# If nothing is running:
# No output = backend needs to be started

# If something is running:
# Shows process details = check if it's the correct backend
```

**The backend server must be running for any local development work! 🚀**
