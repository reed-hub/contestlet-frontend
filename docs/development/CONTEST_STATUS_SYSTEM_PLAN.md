# 🎯 Contest Status System Refactor Plan

## 📋 **Current Problems**

### **Frontend Issues:**
1. **Confusing UI**: "Contest is active (can accept entries)" checkbox doesn't reflect actual lifecycle
2. **Inconsistent Logic**: Status calculated client-side with timezone issues
3. **Missing States**: No "paused" or "complete" status representation
4. **Manual Control**: Admins manually toggle "active" instead of system managing lifecycle

### **Backend Issues:**
1. **Boolean Active Flag**: Simple `active: true/false` doesn't capture full lifecycle
2. **Status Calculation**: Frontend calculates status instead of backend providing it
3. **Winner Integration**: Status doesn't reflect winner selection state
4. **No Pause Support**: No way to temporarily pause active contests

---

## 🚀 **New Status System Design**

### **5-State Contest Lifecycle:**

```typescript
type ContestStatus = 
  | 'scheduled'  // start/end in future
  | 'active'     // started, accepting entries 
  | 'paused'     // temporarily stopped, can resume
  | 'ended'      // time expired, no winner selected
  | 'complete'   // winner selected and notified
```

### **Status Rules:**
```typescript
const getContestStatus = (contest: Contest): ContestStatus => {
  const now = new Date();
  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);
  
  // Time-based checks first
  if (now < start) return 'scheduled';
  if (now > end && contest.winner_entry_id) return 'complete';
  if (now > end && !contest.winner_entry_id) return 'ended';
  
  // Active period checks
  if (contest.is_paused) return 'paused';
  return 'active';
};
```

---

## 🔧 **Frontend Changes Required**

### **1. Remove Active Checkbox from UI**

**Files to Update:**
- `src/pages/EditContest.tsx` - Remove checkbox (lines 644-656)
- `src/components/ImportCampaignModal.tsx` - Remove checkbox (lines 314-325)

### **2. Update Status Display Logic**

**File: `src/pages/AdminContests.tsx`**
```typescript
// Replace current getStatusText/getStatusColor functions
const getStatusInfo = (contest: Contest) => {
  const status = getContestStatus(contest);
  
  const statusConfig = {
    scheduled: { text: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    active: { text: 'Active', color: 'bg-green-100 text-green-800' },
    paused: { text: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    ended: { text: 'Ended', color: 'bg-red-100 text-red-800' },
    complete: { text: 'Complete', color: 'bg-gray-100 text-gray-800' }
  };
  
  return statusConfig[status];
};
```

### **3. Update Status Filter Options**

**File: `src/pages/AdminContests.tsx`**
```typescript
// Update filter dropdown (lines 471-476)
<option value="scheduled">Scheduled</option>
<option value="active">Active</option>
<option value="paused">Paused</option>
<option value="ended">Ended</option>
<option value="complete">Complete</option>
```

### **4. Add Pause/Resume Controls**

**File: `src/pages/ContestEntries.tsx`**
```typescript
// Add pause/resume buttons for active contests
const PauseResumeButton = ({ contest, onUpdate }) => {
  if (contest.status !== 'active' && contest.status !== 'paused') return null;
  
  return (
    <button
      onClick={() => handlePauseResume(contest.id, contest.status)}
      className={`px-4 py-2 rounded-md text-sm font-medium ${
        contest.status === 'active' 
          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          : 'bg-green-100 text-green-800 hover:bg-green-200'
      }`}
    >
      {contest.status === 'active' ? '⏸️ Pause Contest' : '▶️ Resume Contest'}
    </button>
  );
};
```

### **5. Update Winner Selection Logic**

**File: `src/pages/ContestEntries.tsx`**
```typescript
// Update canSelectWinner logic (line 456)
const canSelectWinner = contest?.status === 'ended';
```

---

## 🗄️ **Backend Changes Required**

### **1. Database Schema Updates**

```sql
-- Add new columns to contests table
ALTER TABLE contests 
ADD COLUMN status VARCHAR(20) DEFAULT 'scheduled',
ADD COLUMN is_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN paused_at TIMESTAMP NULL,
ADD COLUMN paused_by VARCHAR(100) NULL;

-- Create index for status queries
CREATE INDEX idx_contests_status ON contests(status);

-- Update existing contests to have proper status
UPDATE contests SET 
  status = CASE 
    WHEN start_time > NOW() THEN 'scheduled'
    WHEN end_time < NOW() AND winner_entry_id IS NOT NULL THEN 'complete'
    WHEN end_time < NOW() AND winner_entry_id IS NULL THEN 'ended'
    WHEN active = TRUE THEN 'active'
    ELSE 'scheduled'
  END;
```

### **2. API Response Updates**

**Update Contest Object:**
```json
{
  "id": 1,
  "name": "Contest Name",
  "start_time": "2025-01-20T18:00:00Z",
  "end_time": "2025-01-21T18:00:00Z",
  "status": "active",           // ← NEW: calculated status
  "is_paused": false,          // ← NEW: pause state
  "paused_at": null,           // ← NEW: when paused
  "paused_by": null,           // ← NEW: who paused
  "winner_entry_id": null,
  "winner_selected_at": null,
  "active": true               // ← DEPRECATED: keep for compatibility
}
```

### **3. New API Endpoints**

```python
# Add to admin routes
@admin_router.put("/contests/{contest_id}/pause")
async def pause_contest(contest_id: int, admin_user: dict = Depends(verify_admin)):
    """Pause an active contest"""
    # Set is_paused = TRUE, paused_at = NOW(), paused_by = admin_user
    pass

@admin_router.put("/contests/{contest_id}/resume") 
async def resume_contest(contest_id: int, admin_user: dict = Depends(verify_admin)):
    """Resume a paused contest"""
    # Set is_paused = FALSE, extend end_time if needed
    pass
```

### **4. Status Calculation Logic**

```python
def calculate_contest_status(contest) -> str:
    """Calculate contest status based on time and state"""
    now = datetime.utcnow()
    
    # Time-based status first
    if now < contest.start_time:
        return 'scheduled'
    
    if now > contest.end_time:
        if contest.winner_entry_id:
            return 'complete'
        else:
            return 'ended'
    
    # Active period status
    if contest.is_paused:
        return 'paused'
    
    return 'active'

# Apply to all contest queries
def get_contest_with_status(contest_id: int):
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    contest.status = calculate_contest_status(contest)
    return contest
```

---

## 📝 **Implementation Plan**

### **Phase 1: Backend Foundation** 
1. **Database Migration**: Add status columns
2. **API Updates**: Return calculated status in all contest endpoints
3. **Pause/Resume**: Implement pause/resume endpoints
4. **Status Logic**: Add server-side status calculation

### **Phase 2: Frontend Updates**
1. **Remove Checkboxes**: Remove "active" checkboxes from Edit and Import
2. **Update Display**: Use new status values for colors/text
3. **Add Controls**: Add pause/resume buttons for active contests
4. **Update Filters**: Add new status options to filter dropdown

### **Phase 3: Migration & Testing**
1. **Data Migration**: Update existing contests with proper status
2. **Compatibility**: Keep `active` field for backward compatibility
3. **Testing**: Verify all status transitions work correctly
4. **Documentation**: Update API docs with new status system

---

## 🎯 **Benefits of New System**

✅ **Clear Lifecycle**: Status reflects actual contest state
✅ **Better UX**: Admins understand what each status means
✅ **Pause Support**: Can temporarily stop contests
✅ **Winner Integration**: Status reflects completion state
✅ **Server Authority**: Backend calculates status consistently
✅ **Timezone Safe**: Status calculation happens server-side

---

## 🚨 **Breaking Changes**

⚠️ **For Frontend:**
- Remove `active` checkbox from UI
- Update status filtering logic
- Change winner selection conditions

⚠️ **For Backend:**
- Add required database columns
- Update all contest endpoints to include status
- Implement pause/resume functionality

---

## 📋 **Next Steps**

1. **Review this plan** with backend team
2. **Coordinate database migration** timing  
3. **Implement backend changes** first
4. **Update frontend** to use new status system
5. **Test status transitions** thoroughly
6. **Deploy with migration** plan
