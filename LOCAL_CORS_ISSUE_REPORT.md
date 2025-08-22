# 🚨 Local Development CORS Issue Report

## **Problem Summary**
Frontend on `localhost:3002` cannot connect to backend on `localhost:8000` due to CORS policy blocking cross-origin requests.

## **Error Details**
```
Access to fetch at 'http://localhost:8000/contests/1/enter' from origin 'http://localhost:3002' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.

POST http://localhost:8000/contests/1/enter net::ERR_FAILED 500 (Internal Server Error)
```

## **Root Cause**
The backend server is not configured to allow requests from `localhost:3002`. This affects the public contest entry functionality.

## **Impact**
- ❌ Users cannot enter contests from the public frontend
- ❌ ContestAuth.tsx failing to submit entries
- ❌ Both CORS rejection AND 500 Internal Server Error

## **Immediate Frontend Workaround**
Try running the frontend on port 3000 instead (which might be allowed):

```bash
PORT=3000 npm start
```

## **Backend Fix Required**
The backend team needs to update CORS configuration to allow `localhost:3002`:

### **Option 1: Add to allowed origins**
```python
# In FastAPI CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3002",  # ← Add this
        # ... other origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Option 2: Development wildcard**
```python
# For local development only
if os.getenv("ENVIRONMENT") == "development":
    allow_origins = ["*"]  # Allow all origins in development
else:
    allow_origins = ["http://localhost:3000", ...]
```

## **Investigation Needed**
1. **Check backend CORS config**: What origins are currently allowed?
2. **Verify backend status**: Is the server running and healthy?
3. **Check endpoint**: Does `/contests/1/enter` exist and work?
4. **Environment setup**: Are we using the right ports/URLs?

## **Testing Results**
1. ✅ **Backend health**: Server is running and healthy
2. ❌ **CORS headers**: No CORS headers present for any localhost origin
3. ❌ **Port 3000 test**: Same CORS error on `localhost:3000`
4. ❌ **Public endpoints**: `/contests/1/enter` blocked from all localhost origins

## **Confirmed Issue**
The backend CORS configuration is **NOT allowing any localhost origins** for public contest entry endpoints. This affects both:
- `localhost:3000` (standard React dev port)
- `localhost:3002` (current dev port)

## **Related Issues**
This is similar to previous CORS issues we've seen with:
- Staging environment (`staging-app.contestlet.com` ↔ `staging-api.contestlet.com`)
- Production environment

## **Priority**
🔴 **HIGH** - Blocks core contest entry functionality for local development and testing.

---
**Next Step**: Backend team needs to update CORS configuration to include `localhost:3002` in allowed origins.
