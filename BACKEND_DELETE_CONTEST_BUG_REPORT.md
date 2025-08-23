# 🐛 Backend Bug Report: Contest Deletion Fails

## **Issue Description**
Contest deletion is failing with a database constraint violation when trying to delete contests that have associated SMS templates.

## **Error Details**
```
Error: Failed to delete contest: (sqlite3.IntegrityError) NOT NULL constraint failed: sms_templates.contest_id
[SQL: UPDATE sms_templates SET contest_id=?, updated_at=? WHERE sms_templates.id = ?]
[parameters: [(None, '2025-08-22 21:57:58.828833', 7), (None, '2025-08-22 21:57:58.828842', 8), (None, '2025-08-22 21:57:58.828844', 9)]]
```

## **Root Cause**
The backend is attempting to set `contest_id` to `NULL` in the `sms_templates` table before deleting the contest, but the `contest_id` field has a NOT NULL constraint.

## **Expected Behavior**
When deleting a contest, the backend should either:
1. **Delete related SMS templates first** (recommended - CASCADE DELETE)
2. **Set a valid contest_id** if templates should be reassigned
3. **Handle foreign key relationships properly** before deletion

## **Current Backend Code Issue**
The backend appears to be doing:
```python
# This is failing - setting contest_id to None
UPDATE sms_templates SET contest_id=None WHERE sms_templates.id = ?
```

## **Recommended Fix**
```python
# Option 1: Delete related templates first (CASCADE)
def delete_contest(contest_id: int):
    # Delete related SMS templates first
    db.query(SmsTemplate).filter(SmsTemplate.contest_id == contest_id).delete()
    
    # Then delete the contest
    db.query(Contest).filter(Contest.id == contest_id).delete()
    db.commit()

# Option 2: Use proper CASCADE DELETE in database schema
# ALTER TABLE sms_templates ADD CONSTRAINT fk_contest 
# FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
```

## **Impact**
- ✅ Contest creation works
- ✅ Contest editing works  
- ❌ Contest deletion fails
- ❌ Admin cannot remove test contests

## **Priority**
**Medium** - Blocks admin cleanup of test contests, but doesn't affect core functionality.

## **Testing Steps**
1. Create a contest with SMS templates
2. Attempt to delete the contest
3. Verify deletion succeeds without constraint violations

## **Frontend Status**
Frontend is working correctly - the error is entirely on the backend side.

---

**Reported by**: Frontend Team  
**Date**: August 22, 2025  
**Environment**: Local Development (localhost:8000)
