# Winner System API Questions

## Summary
We're implementing the winner selection UI and discovered that entry status fields are `undefined`, but the backend reports "winner already selected" for contest ID 11. We need clarification on the proper way to detect and display winners.

## Current Findings
- `GET /admin/contests/{id}/entries` returns entries with `status: undefined`
- `POST /admin/contests/{id}/select-winner` returns "winner already selected" error for contest 11
- Frontend currently cannot identify which entry is the winner

## Questions for Backend Team

### 1. Winner Detection
**Q:** How should the frontend detect if a contest has a winner?
- Does `GET /admin/contests` return `winner_entry_id` field?
- Should we use a separate endpoint to get winner info?
- Are winner details included in the contest object?

### 2. Entry Status
**Q:** Why are entry `status` fields returning `undefined`?
- Should entries have status like "active", "winner", "rejected"?
- Is the status field populated after winner selection?
- Do we need to call a different endpoint to get entry statuses?

### 3. Winner Information
**Q:** When a winner is selected, what data is available?
- Winner entry ID
- Winner phone number
- Selection timestamp
- Prize information

### 4. API Response Format
**Q:** What does the `select-winner` response contain?
```json
{
  "success": true,
  "winner_entry_id": 123,
  "winner_user_phone": "+1234567890",
  "total_entries": 50
}
```

**Q:** Does `GET /admin/contests` include winner fields?
```json
{
  "id": 11,
  "name": "Contest Name",
  "active": false,
  "winner_entry_id": 123,  // ← Is this included?
  "winner_phone": "+1234567890"  // ← And this?
}
```

## Immediate Need
We need to know the correct way to:
1. Detect if contest 11 has a winner
2. Identify which entry (ID) is the winner
3. Display winner information in the UI

## Test Case
Please confirm the winner status for **Contest ID 11** - our frontend should show the winner but currently cannot detect it.

## Immediate Frontend Fix Needed
Our frontend is updated to use `contest.winner_entry_id` for winner detection, but we need to confirm:

1. **Does `GET /admin/contests` include `winner_entry_id` field?**
2. **Can you provide a sample response for a contest with a winner?**

## Current Frontend Implementation
```typescript
// We've updated the code to use:
const hasWinner = !!(contest?.winner_entry_id);
const currentWinner = entries.find(e => e.id === contest?.winner_entry_id);
```

**Next Step:** Please test contest 11 and confirm if `winner_entry_id` is included in the admin contests response.
