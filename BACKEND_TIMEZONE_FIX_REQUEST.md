# 🚨 Backend Timezone Fix Request - Winner Selection Error

## Issue
**Error**: `"can't compare offset-naive and offset-aware datetimes"` when selecting contest winners

**Location**: Winner selection endpoint (`POST /admin/contests/{id}/select-winner`)

**Impact**: Admins cannot select winners, blocking contest completion

---

## Root Cause
The backend is comparing datetime objects with inconsistent timezone information:
- **Offset-naive**: Datetime without timezone info (e.g., `"2025-08-20T19:15:00"`)
- **Offset-aware**: Datetime with timezone info (e.g., `"2025-08-20T19:15:00+00:00"`)

---

## Expected Fix
Ensure all datetime comparisons use consistent timezone handling:

### Option 1: Convert all to UTC (Recommended)
```python
# Before comparison, ensure all datetimes are UTC
from datetime import datetime, timezone

def ensure_utc(dt):
    if dt.tzinfo is None:
        # Naive datetime - treat as UTC
        return dt.replace(tzinfo=timezone.utc)
    else:
        # Aware datetime - convert to UTC
        return dt.astimezone(timezone.utc)

# Use in winner selection logic
current_time = ensure_utc(datetime.now())
contest_end = ensure_utc(contest.end_time)
```

### Option 2: Strip timezone info consistently
```python
# Remove timezone info from all datetimes before comparison
def strip_timezone(dt):
    return dt.replace(tzinfo=None) if dt.tzinfo else dt

# Use in winner selection logic
current_time = strip_timezone(datetime.now())
contest_end = strip_timezone(contest.end_time)
```

---

## Files to Check
- Winner selection endpoint logic
- Contest status calculation functions
- Any datetime comparison in contest validation

---

## Test Case
1. Create contest with end time in the past
2. Attempt to select winner
3. Should succeed without timezone errors

---

**Priority**: High - Blocks core contest functionality  
**Frontend Status**: Ready to test once backend fix is deployed
