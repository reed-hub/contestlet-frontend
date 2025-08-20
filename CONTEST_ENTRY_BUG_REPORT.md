# 🐛 Contest Entry Bug Report

## Issue Summary
Contest entry fails with **"Contest has ended"** error, despite contest appearing as **"Active"** in admin panel.

## Reproduction Steps
1. Create contest via `/admin/contests/new` 
2. Contest shows as **"Active"** in admin panel (`/admin/contests`)
3. Attempt to enter contest via frontend (`/enter/{contest_id}`)
4. **Result**: 400 Bad Request with `"detail": "Contest has ended"`

## Evidence

### Admin Panel Shows "Active"
- Contest ID 3: Status = **"Active"**
- Contest ID 2: Status = **"Active"** 

### Frontend API Response
```bash
POST /contests/3/enter
Status: 400 Bad Request
Response: {
  "detail": "Contest has ended"
}
```

### Console Logs
```
ContestAuth.tsx:143 Entering contest: 3
ContestAuth.tsx:144 API URL: http://localhost:8000/contests/3/enter
ContestAuth.tsx:156 Contest entry response: {
  status: 400, 
  data: { detail: "Contest has ended" }
}
```

## Root Cause Analysis
**Date/Time Logic Mismatch** between:
- **Admin API**: Shows contest as "Active" 
- **Entry API**: Validates contest as "ended"

## Possible Issues
1. **Timezone differences** between frontend/backend
2. **Different date validation logic** in admin vs. entry endpoints
3. **Server time vs. contest end_time comparison** issue
4. **Default contest dates** from frontend might be problematic

## Request
Please check:
1. **Contest ID 3 actual start/end times** in database
2. **Server timezone** and current time
3. **Contest status calculation** logic in both admin and entry endpoints
4. **Date comparison logic** in `/contests/{id}/enter` endpoint

## Expected Behavior
If admin panel shows contest as "Active", users should be able to enter that contest.

---
**Frontend Team**: Ready to test once backend confirms the date/time validation logic is aligned.
