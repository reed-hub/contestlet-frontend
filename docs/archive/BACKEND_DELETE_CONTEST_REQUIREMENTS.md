# Backend Requirements: Contest Deletion Feature

## 🚨 Issue
The frontend contest deletion feature is implemented but the backend is returning `405 Method Not Allowed` for `DELETE /admin/contests/{contest_id}`.

## 🛠️ Required Backend Implementation

### **New API Endpoint**
```python
@router.delete("/admin/contests/{contest_id}")
async def delete_contest(
    contest_id: int,
    current_user: User = Depends(require_admin_role)
):
    """
    Delete a contest and all associated data.
    
    Args:
        contest_id: ID of the contest to delete
        current_user: Admin user making the request
        
    Returns:
        {"success": True, "message": "Contest deleted successfully"}
        
    Raises:
        HTTPException: 404 if contest not found
        HTTPException: 409 if contest cannot be deleted (has entries, etc.)
        HTTPException: 403 if user not admin
    """
```

### **Expected Response Format**
```json
{
  "success": true,
  "message": "Contest deleted successfully"
}
```

### **Error Responses**
```json
// Contest not found
{
  "detail": "Contest not found",
  "status_code": 404
}

// Contest has entries (optional protection)
{
  "detail": "Cannot delete contest with existing entries",
  "status_code": 409
}

// Not admin user
{
  "detail": "Admin access required",
  "status_code": 403
}
```

## 🔐 Security Considerations

### **Admin Authorization**
- ✅ Require admin JWT token
- ✅ Verify user has admin role
- ✅ Log deletion actions for audit trail

### **Data Integrity Options**
Choose one approach:

**Option A: Hard Delete (Simple)**
```sql
-- Delete all related data
DELETE FROM contest_entries WHERE contest_id = ?;
DELETE FROM contests WHERE id = ?;
```

**Option B: Soft Delete (Recommended)**
```sql
-- Mark as deleted, preserve data
UPDATE contests SET 
  deleted_at = NOW(),
  active = false 
WHERE id = ?;
```

**Option C: Protected Delete (Safest)**
```python
# Only allow deletion if no entries exist
entry_count = db.query(ContestEntry).filter(
    ContestEntry.contest_id == contest_id
).count()

if entry_count > 0:
    raise HTTPException(
        status_code=409,
        detail=f"Cannot delete contest with {entry_count} entries"
    )
```

## 📋 Implementation Checklist

### **Backend Tasks**
- [ ] Add `DELETE /admin/contests/{contest_id}` endpoint
- [ ] Implement admin authorization check
- [ ] Choose deletion strategy (hard/soft/protected)
- [ ] Add error handling for edge cases
- [ ] Add audit logging for deletion actions
- [ ] Update API documentation

### **Database Tasks**
- [ ] Add `deleted_at` column if using soft deletes
- [ ] Add database constraints/cascades as needed
- [ ] Test deletion with existing contest data

### **Testing Tasks**
- [ ] Test deletion with admin token
- [ ] Test deletion with regular user (should fail)
- [ ] Test deletion of non-existent contest
- [ ] Test deletion of contest with entries (if protected)

## 🚀 Frontend Implementation Status
- ✅ Delete button UI in contest list
- ✅ Delete button UI in edit contest page
- ✅ Confirmation modal with warnings
- ✅ API error handling (405 specifically handled)
- ✅ Loading states and user feedback
- ✅ State management (removes from list on success)

## 🔗 Related Files
- Frontend API: `src/utils/adminApi.ts`
- Frontend UI: `src/pages/AdminContests.tsx`, `src/pages/EditContest.tsx`
- Modal Component: `src/components/ConfirmationModal.tsx`

## 💡 Recommended Implementation

```python
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

@router.delete("/admin/contests/{contest_id}")
async def delete_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    # Find the contest
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    # Optional: Check if contest has entries
    entry_count = db.query(ContestEntry).filter(
        ContestEntry.contest_id == contest_id
    ).count()
    
    if entry_count > 0:
        raise HTTPException(
            status_code=409, 
            detail=f"Cannot delete contest with {entry_count} existing entries"
        )
    
    # Delete the contest (and cascade to entries if no protection)
    db.delete(contest)
    db.commit()
    
    # Log the action
    logger.info(f"Admin user {current_user.id} deleted contest {contest_id}")
    
    return {
        "success": True,
        "message": "Contest deleted successfully"
    }
```

## 🎯 Once Implemented
The frontend will immediately work with the new endpoint. Users will see:
- ✅ Successful deletion with redirect
- ✅ Proper error messages for edge cases
- ✅ Real-time list updates
- ✅ Clear confirmation dialogs
