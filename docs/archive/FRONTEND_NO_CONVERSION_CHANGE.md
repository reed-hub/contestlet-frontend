# Frontend Timezone Conversion Removed

## 🎯 Change Summary

**The frontend NO LONGER does any timezone conversion.** All datetime values are sent to the backend exactly as the user enters them.

## 📤 What Frontend Now Sends

### **Contest Creation (`POST /admin/contests`)**
```json
{
  "name": "Summer Contest",
  "start_time": "2025-08-20T18:30:00",  // RAW USER INPUT
  "end_time": "2025-08-20T19:30:00",    // RAW USER INPUT
  // ... other fields
}
```

### **Contest Update (`PUT /admin/contests/{id}`)**
```json
{
  "name": "Updated Contest", 
  "start_time": "2025-08-20T18:30:00",  // RAW USER INPUT
  "end_time": "2025-08-20T19:30:00",    // RAW USER INPUT
  // ... other fields
}
```

## 🎯 User Experience

**User Scenario:**
- User's computer is in MST (Mountain Time)
- User's preference is set to EST (Eastern Time)  
- User enters "6:30 PM" in the interface
- **Frontend sends**: `"2025-08-20T18:30:00"` (exactly what they typed)
- **Interface shows**: "6:30 PM EST" (with timezone abbreviation)

## 🛠️ Backend Requirements

### **What Backend Must Handle:**

1. **Receive Raw Times**: Accept datetime strings like `"2025-08-20T18:30:00"`

2. **Apply Admin Timezone Context**: 
   - Get admin's timezone preference from profile/settings
   - Interpret the datetime as being in that timezone
   - Convert to UTC for storage if needed

3. **Return Times in Admin Timezone**:
   - When sending contest data back to frontend
   - Convert from UTC storage back to admin's timezone
   - Send in format: `"2025-08-20T18:30:00"` (no timezone suffix)

### **Example Backend Logic:**
```python
# When receiving from frontend
def create_contest(data):
    # data.start_time = "2025-08-20T18:30:00" (user's input)
    admin_timezone = get_admin_timezone(current_user)  # e.g., "America/New_York"
    
    # Interpret this time as being in admin's timezone
    start_time_in_tz = parse_datetime_in_timezone(data.start_time, admin_timezone)
    start_time_utc = start_time_in_tz.astimezone(timezone.utc)
    
    # Store UTC in database
    contest.start_time = start_time_utc

# When sending to frontend  
def get_contest(contest_id):
    contest = get_contest_from_db(contest_id)
    admin_timezone = get_admin_timezone(current_user)
    
    # Convert from UTC storage to admin's timezone
    start_time_in_admin_tz = contest.start_time.astimezone(admin_timezone)
    
    return {
        "start_time": start_time_in_admin_tz.strftime("%Y-%m-%dT%H:%M:%S"),
        # ... other fields
    }
```

## ✅ Expected Behavior

### **Create Contest:**
1. User enters "6:30 PM" in EST interface
2. Frontend sends `"2025-08-20T18:30:00"`  
3. Backend stores this as "6:30 PM EST" → "10:30 PM UTC"
4. User always sees "6:30 PM EST" when viewing/editing

### **Edit Contest:**
1. User sees "6:30 PM EST" (from backend)
2. User changes to "7:00 PM"
3. Frontend sends `"2025-08-20T19:00:00"`
4. Backend stores as "7:00 PM EST" → "11:00 PM UTC"
5. User sees "7:00 PM EST" after save

### **Change Timezone Preference:**
1. User changes preference from EST to PST
2. Frontend requests contest data with new timezone context
3. Backend converts "10:30 PM UTC" → "3:30 PM PST"
4. Frontend shows "3:30 PM PST" (same moment, different display)

## 🚨 Critical Points

- **No Conversion on Frontend**: Input fields show exactly what user enters
- **Backend Owns Timezone Logic**: All conversion happens server-side
- **User Preference Driven**: Admin's timezone setting determines interpretation
- **Consistent Display**: User always sees times in their selected timezone

## 📋 Implementation Checklist

- [ ] Remove any existing frontend timezone conversion
- [ ] Update contest creation to accept raw datetime strings
- [ ] Update contest editing to accept raw datetime strings  
- [ ] Implement timezone interpretation using admin preferences
- [ ] Return contest times in admin's timezone (not UTC)
- [ ] Test with different admin timezone preferences
- [ ] Verify times stay consistent when user changes timezone preference

## 🎯 Goal Achieved

**User enters 6:30 PM → User always sees 6:30 PM (in their selected timezone)**

No conversion confusion, no timezone math on frontend, perfect user experience!
