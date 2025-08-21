# 🗑️ FEATURE REQUEST: Admin Contest Deletion API

## 📋 Overview

**Request**: Implement a comprehensive contest deletion API endpoint that allows admins to completely remove contests and ALL associated data without leaving any dependencies or artifacts.

**Priority**: High  
**Complexity**: Medium  
**Impact**: Admin workflow improvement, data management

## 🎯 Current Situation

- **Frontend**: Delete functionality implemented with modal confirmation
- **Backend**: Missing `DELETE /admin/contests/{id}` endpoint  
- **Status**: Frontend returns `405 (Method Not Allowed)`

## 🔧 Required Implementation

### **1. API Endpoint**

```http
DELETE /admin/contests/{id}
Authorization: Bearer {admin_token}
```

### **2. Response Specification**

#### **Success Response (200)**
```json
{
  "status": "success",
  "message": "Contest deleted successfully",
  "deleted_contest_id": 123,
  "cleanup_summary": {
    "entries_deleted": 45,
    "notifications_deleted": 12,
    "files_removed": 3,
    "dependencies_cleared": 8
  }
}
```

#### **Error Responses**
```json
// 401 Unauthorized
{
  "status": "error",
  "message": "Authentication required",
  "error_code": "AUTH_REQUIRED"
}

// 403 Forbidden  
{
  "status": "error",
  "message": "Admin access required",
  "error_code": "ADMIN_ONLY"
}

// 404 Not Found
{
  "status": "error", 
  "message": "Contest not found",
  "error_code": "CONTEST_NOT_FOUND"
}

// 409 Conflict
{
  "status": "error",
  "message": "Cannot delete contest with active entries",
  "error_code": "HAS_ACTIVE_ENTRIES",
  "details": {
    "entry_count": 45,
    "last_entry_date": "2025-01-15T14:30:00Z"
  }
}

// 500 Internal Server Error
{
  "status": "error",
  "message": "Failed to delete contest",
  "error_code": "DELETE_FAILED"
}
```

## 🧹 **CRITICAL: Complete Cleanup Requirements**

### **Database Tables to Clean**

1. **Primary Deletion**:
   ```sql
   DELETE FROM contests WHERE id = {contest_id}
   ```

2. **Entry Cleanup**:
   ```sql
   DELETE FROM entries WHERE contest_id = {contest_id}
   ```

3. **Notification Cleanup**:
   ```sql
   DELETE FROM notifications WHERE contest_id = {contest_id}
   ```

4. **Winner Records** (if applicable):
   ```sql
   DELETE FROM winners WHERE contest_id = {contest_id}
   ```

5. **Analytics/Logs** (if applicable):
   ```sql
   DELETE FROM contest_analytics WHERE contest_id = {contest_id}
   DELETE FROM admin_actions WHERE contest_id = {contest_id}
   ```

### **File System Cleanup**

- **Upload cleanup**: Remove any contest-related uploaded files
- **Generated files**: Remove any cached/generated content
- **Logs**: Clean contest-specific log entries (optional)

### **Memory/Cache Cleanup**

- **Redis/Cache**: Clear any cached contest data
- **Session data**: Remove any active contest sessions
- **Background jobs**: Cancel any pending contest-related tasks

## 🔒 **Security & Safety Requirements**

### **1. Administrative Authorization**
```python
@admin_required
@require_permissions(['delete_contests'])
def delete_contest(contest_id: int, admin_user: User):
    # Implementation
```

### **2. Validation Checks**
- ✅ Verify admin authentication
- ✅ Verify contest exists  
- ✅ Check for business rule violations
- ✅ Validate no critical dependencies

### **3. Soft Delete Option** (Recommended)
Consider implementing soft delete for audit trail:
```python
# Option 1: Hard delete (immediate removal)
contest.delete()

# Option 2: Soft delete (recommended)
contest.deleted_at = datetime.utcnow()
contest.active = False
contest.save()
```

### **4. Audit Logging**
```python
log_admin_action(
    admin_id=admin_user.id,
    action="DELETE_CONTEST",
    resource_id=contest_id,
    details={
        "contest_name": contest.name,
        "entries_count": entry_count,
        "deletion_type": "hard|soft"
    }
)
```

## ⚠️ **Business Logic Considerations**

### **1. Deletion Rules**
- **Allow deletion if**:
  - Contest is in "Scheduled" status (not started)
  - Contest is "Ended" and no winner selected
  - Contest is "Inactive" 
  - Admin has override permissions

- **Prevent deletion if**:
  - Contest is currently "Active" with participants
  - Contest has winner selected and notifications sent
  - Legal/compliance requirements prevent deletion

### **2. Confirmation Requirements**
- Frontend provides double confirmation modal
- Backend can require additional verification for high-impact deletions

### **3. Cascade Behavior**
```python
# Recommended cascade order:
1. Cancel any pending notifications
2. Delete all contest entries  
3. Delete all contest notifications
4. Delete contest analytics/logs
5. Delete the contest record
6. Clean file system artifacts
7. Clear cache/memory
```

## 💡 **Implementation Suggestions**

### **1. Database Transaction**
```python
@transaction.atomic
def delete_contest(contest_id: int):
    try:
        # All deletions in single transaction
        # Rollback if any step fails
        pass
    except Exception as e:
        # Transaction auto-rollback
        raise DeleteError(f"Failed to delete contest: {e}")
```

### **2. Background Processing** (Optional)
For contests with large amounts of data:
```python
# Immediate response
response = {"status": "accepted", "deletion_job_id": "job_123"}

# Background cleanup
celery_task.delay(contest_id, admin_id)
```

### **3. Validation Helper**
```python
def can_delete_contest(contest: Contest) -> Tuple[bool, str]:
    if contest.status == "active":
        return False, "Cannot delete active contest"
    
    if contest.winner_selected and contest.notifications_sent:
        return False, "Cannot delete contest with completed winner process"
    
    return True, "OK"
```

## 🧪 **Testing Requirements**

### **Unit Tests**
- ✅ Admin authentication validation
- ✅ Contest existence validation  
- ✅ Business rule enforcement
- ✅ Complete data cleanup verification
- ✅ Error handling for partial failures

### **Integration Tests**
- ✅ End-to-end deletion workflow
- ✅ Database consistency after deletion
- ✅ No orphaned records remain
- ✅ File system cleanup verification

### **Security Tests**
- ✅ Non-admin users cannot delete
- ✅ Cannot delete other admin's contests (if applicable)
- ✅ SQL injection protection
- ✅ Authorization bypass attempts

## 📊 **Success Criteria**

1. **API Endpoint**: `DELETE /admin/contests/{id}` returns proper responses
2. **Complete Cleanup**: Zero orphaned records or artifacts remain
3. **Error Handling**: Proper HTTP status codes and error messages
4. **Security**: Only authorized admins can delete contests
5. **Audit Trail**: All deletions logged for compliance
6. **Performance**: Deletion completes within reasonable time
7. **Frontend Integration**: Frontend delete functionality works seamlessly

## 🔄 **Frontend Integration Notes**

The frontend is already prepared for this API:

```typescript
// Frontend implementation ready in: src/utils/adminApi.ts
export async function deleteContest(contestId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/contests/${contestId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAdminToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  return handleApiResponse(response);
}
```

## 🎯 **Expected Timeline**

- **Development**: 1-2 days
- **Testing**: 1 day  
- **Code Review**: 0.5 days
- **Deployment**: 0.5 days

**Total**: ~3-4 days

## 📞 **Questions for Backend Team**

1. **Soft vs Hard Delete**: Preference for implementation approach?
2. **Background Processing**: Should large deletions be queued?
3. **Audit Requirements**: What level of audit logging is needed?
4. **File Storage**: Are there contest-related files that need cleanup?
5. **Business Rules**: Any additional constraints on contest deletion?

---

**This feature will complete the admin contest management workflow and provide a clean, professional deletion experience with proper data hygiene.** 🚀
