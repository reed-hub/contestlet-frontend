# 🐛 **Backend Bug Report: Image URL Field Not Updating**

## **Issue Summary**
The `image_url` field is not being properly updated when editing contests via the PUT `/admin/contests/{id}` endpoint. The backend appears to be returning stale/cached data instead of the updated values, causing the frontend to display incorrect information.

## **Severity**
**HIGH** - Core functionality broken, user data not being saved correctly

## **Environment**
- **Backend**: FastAPI (localhost:8000)
- **Frontend**: React (localhost:3000)
- **Database**: PostgreSQL/Supabase
- **Endpoint**: `PUT /admin/contests/{contest_id}`

## **Steps to Reproduce**
1. Navigate to `/admin/contests/{id}/edit` for an existing contest
2. Change the `image_url` field to a new value (e.g., video URL)
3. Save the changes
4. Observe that the form reverts to the old value

## **Expected Behavior**
- Backend should save the new `image_url` value to the database
- Backend should return the updated contest data including the new `image_url`
- Frontend should display the updated value

## **Actual Behavior**
- Backend appears to save the new value (no error returned)
- Backend returns **stale/cached data** instead of the updated data
- Frontend displays the old value, making it appear as if the update failed

## **Evidence from Debug Logs**

### **Frontend Request (Correct)**
```json
{
  "image_url": "https://cdn.midjourney.com/video/0e3196be-b179-446a-b3b0-b313cd6cf767/0.mp4",
  "sponsor_url": "",
  // ... other fields
}
```

### **Backend Response (Incorrect - Stale Data)**
```json
{
  "image_url": "https://media.cntraveler.com/photos/63e28bd99e62d3e60010ccb7/16:9/w_2560,c_limit/The%20Ritz-Carlton,%20Kapalua_Lobby%20Lanai%20with%20Firepit%20-%20The%20Ritz-Carlton%20Maui,%20Kapalua.jpg",
  "sponsor_url": null,
  // ... other fields
}
```

### **Key Observations**
- **Status**: 200 OK (no error)
- **Request**: New video URL sent correctly
- **Response**: Completely different image URL returned
- **Data Mismatch**: Backend returning data that doesn't match what was sent

## **Root Cause Analysis**

### **Possible Causes**
1. **Database Update Failure**: The UPDATE query might not be executing properly
2. **Stale Response Data**: Backend might be returning cached/old data instead of fresh database data
3. **Field Mapping Issue**: The `image_url` field might not be properly mapped in the update operation
4. **Transaction Rollback**: Update might be rolled back due to validation or constraint issues
5. **Response Serialization**: The response might be using old model instances instead of updated ones

### **Most Likely Cause**
The backend is **not actually updating the database** with the new `image_url` value, despite returning a 200 status. The response contains stale data that was loaded before the update operation.

## **Technical Details**

### **Request Details**
- **Method**: PUT
- **Endpoint**: `/admin/contests/{contest_id}`
- **Headers**: `Authorization: Bearer {token}`, `Content-Type: application/json`
- **Payload**: Contains updated `image_url` field

### **Response Details**
- **Status**: 200 OK
- **Content**: JSON with contest data
- **Issue**: `image_url` field contains old value, not the updated value

### **Database Schema**
```sql
-- Expected table structure
contests (
  id INTEGER PRIMARY KEY,
  image_url VARCHAR,  -- This field should be updated
  -- ... other fields
)
```

## **Impact**
- **User Experience**: Users cannot update contest images/videos
- **Data Integrity**: Contest data becomes inconsistent
- **Functionality**: Core contest management feature broken
- **Trust**: Users lose confidence in the system's ability to save changes

## **Affected Components**
- Contest update functionality
- Image/video URL management
- Admin contest editing workflow

## **Workarounds**
- **Frontend**: Could preserve user input and ignore backend response for `image_url`
- **User**: Must manually refresh and re-enter the URL each time

## **Recommended Fixes**

### **Immediate (High Priority)**
1. **Verify Database Updates**: Ensure the UPDATE query is actually executing
2. **Check Response Data Source**: Verify response uses fresh database data, not cached data
3. **Add Logging**: Log the actual database operations and response data

### **Short Term (Medium Priority)**
1. **Add Validation**: Verify that `image_url` field is included in update operations
2. **Response Verification**: Ensure response data matches what was sent
3. **Error Handling**: Return appropriate errors if update fails

### **Long Term (Low Priority)**
1. **Caching Strategy**: Review and fix any caching issues
2. **Data Consistency**: Implement checks to ensure data consistency
3. **Monitoring**: Add monitoring for data update operations

## **Testing Steps for Backend Team**

### **1. Database Verification**
```sql
-- Before update
SELECT image_url FROM contests WHERE id = {contest_id};

-- After update (check if value changed)
SELECT image_url FROM contests WHERE id = {contest_id};
```

### **2. Backend Logging**
- Add detailed logging for the update operation
- Log the received payload
- Log the SQL query being executed
- Log the database response
- Log the final response being sent

### **3. Response Verification**
- Verify that the response data comes from the database after the update
- Check if there are any model instances being reused/cached
- Ensure the response serialization uses fresh data

## **Files to Investigate**
- Contest update endpoint handler
- Contest model/schema definitions
- Database update operations
- Response serialization logic
- Any caching mechanisms

## **Priority**
**URGENT** - This is blocking core functionality and affecting user experience

## **Estimated Effort**
- **Investigation**: 2-4 hours
- **Fix**: 1-2 hours
- **Testing**: 1-2 hours
- **Total**: 4-8 hours

## **Contact**
- **Reported by**: Frontend Development Team
- **Date**: Current
- **Environment**: Development/Staging
- **Reproducible**: Yes, 100% of the time

---

**Note**: This bug appears to be a backend data persistence issue rather than a frontend problem. The frontend is correctly sending the data and handling the response, but the backend is not properly updating or returning the updated data.
