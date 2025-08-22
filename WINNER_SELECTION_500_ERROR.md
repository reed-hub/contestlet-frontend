# 🚨 Winner Selection 500 Error Report

## 📊 **Error Details**

**Endpoint:** `POST staging-api.contestlet.com/admin/contests/8/select-winner`  
**Status:** `500 Internal Server Error`  
**Environment:** Staging  
**Contest ID:** 8  
**Frontend Location:** `ContestEntries.tsx:362:15`  
**Error Message:** `Winner selection error: Error: Internal server error`

## 🔍 **Frontend Request Details**

The frontend is making a POST request to select a winner for an ended contest:

```javascript
// ContestEntries.tsx line ~362
const response = await fetch(`${apiBaseUrl}/admin/contests/${contestId}/select-winner`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
});

if (!response.ok) {
  throw new Error('Internal server error'); // This is where the error occurs
}
```

## 🎯 **Expected Behavior**

1. Contest should be in "ended" status
2. Contest should have entries to select from
3. Backend should randomly select a winner
4. Winner should be saved to database
5. Contest status should update to "complete"
6. Response should return winner details

## 🔍 **Investigation Needed**

### **Backend Logs**
Please check staging backend logs for:
- Any exceptions during winner selection for contest 8
- Database constraint violations
- Validation errors
- Stack traces around the time of the request

### **Database State**
Please verify:
1. **Contest 8 exists** and is in correct state
2. **Contest 8 has entries** to select from
3. **Database schema** supports winner selection fields
4. **No foreign key constraints** preventing winner updates

### **API Validation**
Check if:
1. Contest status is properly "ended" 
2. Admin authentication is valid
3. Contest has required fields for winner selection
4. No race conditions with concurrent requests

## 🔧 **Possible Root Causes**

1. **Missing Entries**: Contest 8 has no entries to select winner from
2. **Database Schema**: Winner-related fields missing or misconfigured  
3. **Status Validation**: Contest not properly marked as "ended"
4. **Constraint Violations**: Database constraints preventing winner update
5. **Algorithm Error**: Winner selection logic has bugs
6. **Transaction Issues**: Database transaction failing during winner save

## 📋 **Debugging Steps**

1. Check staging backend logs for contest 8 winner selection attempts
2. Query database for contest 8 details and entry count
3. Verify contest 8 status and timestamps
4. Test winner selection endpoint with different contests
5. Check database schema for winner-related fields

## 🎯 **Expected Resolution**

- Fix backend winner selection logic
- Ensure proper error handling and logging
- Return meaningful error messages instead of generic 500
- Validate contest state before attempting winner selection

---

**Reported:** $(date)  
**Environment:** Staging  
**Frontend Version:** Latest staging deployment (703a0c3)
