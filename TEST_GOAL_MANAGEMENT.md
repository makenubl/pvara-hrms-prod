# Quick Test Guide - Team Performance Goal Management

## ✅ All Systems Running
- Backend: http://localhost:5000 (Port 5000)
- Frontend: http://localhost:5173 (Port 5173)
- MongoDB: localhost:27017

## Test the Fixes

### 1. Test Create Goal ✅

1. Open browser: http://localhost:5173
2. Login as manager:
   - Email: `manager@pvara.com`
   - Password: `manager123`
3. Click **Team Performance** in sidebar
4. Click **KPI Goals** tab
5. Click **Create Goal** button (green button with + icon)
6. Verify:
   - ✅ Modal opens
   - ✅ X button in top right corner works (closes modal)
   - ✅ Employee dropdown shows 2 team members:
     - Muhammad Usman Malik
     - John Doe

7. Fill in the form:
   - Employee: Select "Muhammad Usman Malik"
   - Goal Title: "Test New Feature"
   - Description: "Testing goal creation"
   - Category: "Productivity" (default)
   - Target Value: 50
   - Unit: "tasks"
   - Weightage: 20
   - Start Date: 2025-01-01
   - End Date: 2025-06-30

8. Click **Create Goal**
9. Verify:
   - ✅ Success toast appears
   - ✅ Modal closes
   - ✅ New goal appears in the list
   - ✅ Shows employee name "Muhammad Usman Malik"

### 2. Test Edit Goal ✅

1. Find the goal you just created (or any existing goal)
2. Click the **blue Edit button** (pencil icon) on the right side
3. Verify:
   - ✅ Modal opens with title "Edit KPI Goal"
   - ✅ All fields are pre-filled with current values
   - ✅ Employee dropdown shows selected employee

4. Make changes:
   - Change Title to: "Updated Test Feature"
   - Change Target Value to: 75
   - Change Weightage to: 30

5. Click **Update Goal**
6. Verify:
   - ✅ Success toast appears
   - ✅ Modal closes
   - ✅ Goal card shows updated values
   - ✅ New title "Updated Test Feature"
   - ✅ New target "75 tasks"
   - ✅ New weightage "30%"

### 3. Test Delete Goal ✅

1. Find a goal you want to delete
2. Click the **red Delete button** (trash icon)
3. Verify:
   - ✅ Confirmation dialog appears
   - ✅ Asking "Are you sure you want to delete this goal?"

4. Click **OK** to confirm
5. Verify:
   - ✅ Success toast appears
   - ✅ Goal is removed from the list immediately

### 4. Test Cancel/Close ✅

1. Click **Create Goal**
2. Start filling in the form (don't submit)
3. Click **X** button or **Cancel** button
4. Verify:
   - ✅ Modal closes
   - ✅ Form is not submitted

5. Click **Create Goal** again
6. Verify:
   - ✅ Form is empty (reset)
   - ✅ No leftover data from previous attempt

### 5. Test Edit Mode State ✅

1. Click Edit on a goal
2. Modal opens with data
3. Click **Cancel**
4. Click **Create Goal** (not Edit)
5. Verify:
   - ✅ Modal title is "Create KPI Goal" (not "Edit")
   - ✅ Form is empty
   - ✅ Button says "Create Goal" (not "Update")

## Expected Behavior

### Goal List Display
Each goal card should show:
- Title (e.g., "Complete Project Deliverables")
- Status badge (blue "active" or gray "completed")
- Category badge (purple, e.g., "Productivity")
- Description text
- Employee name
- Target value and unit
- Weightage percentage
- Date range (MMM DD - MMM DD, YYYY)
- **Edit button** (blue pencil icon)
- **Delete button** (red trash icon)

### Modal Behavior
- Opens with smooth animation
- Semi-transparent dark overlay
- Centered on screen
- Scrollable if content is tall
- X button in top right
- Cancel button at bottom
- Proper form validation

### Employee Dropdown
Manager should see:
- "Select Employee" placeholder
- Muhammad Usman Malik (69382402de2c0b884782ffd7)
- John Doe (693825d852f1934c356c445c)

If no employees show:
- Run: `cd backend && node scripts/create-manager.js`

## Troubleshooting

### Modal doesn't open
```powershell
# Check browser console (F12)
# Look for JavaScript errors
# Verify frontend is running
curl http://localhost:5173
```

### No employees in dropdown
```powershell
# Test the API directly
curl http://localhost:5000/api/employees -H "Authorization: Bearer YOUR_TOKEN"

# Re-create manager assignments
cd backend
node scripts/create-manager.js
```

### Can't create goal
```powershell
# Check backend logs
# Verify backend is running
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"manager@pvara.com\",\"password\":\"manager123\"}"
```

### Edit doesn't save
```powershell
# Run the automated test
cd backend
node scripts/test-goal-creation.js

# Should show all ✅ if backend is working
```

### Delete doesn't work
- Check browser console for errors
- Verify you clicked "OK" in confirmation
- Backend might be down - check with `curl http://localhost:5000/api/health`

## What You Should See

### Before (Problem)
- ❌ X button doesn't work (missing icon)
- ❌ No way to edit goals
- ❌ No way to delete goals
- ❌ Employee dropdown might be empty

### After (Fixed)
- ✅ X button closes modal
- ✅ Blue edit button on each goal
- ✅ Edit opens modal with pre-filled data
- ✅ Red delete button with confirmation
- ✅ Employee dropdown shows team members
- ✅ Create and Update work correctly
- ✅ Proper state management (edit mode vs create mode)

## Test Data Available

### Existing Goals
Manager already has **12 goals** for testing:
- 10 active goals (current period)
- 2 completed goals (Q4 2024)
- 5 goals per employee

### Employees with Goals
1. **Muhammad Usman Malik** - 5 active + 1 completed
2. **John Doe** - 5 active + 1 completed

## Success Criteria

All these should work:
- [x] Create new goal
- [x] Employee dropdown populated
- [x] Modal X button works
- [x] Edit goal (pencil icon)
- [x] Form pre-fills with current data
- [x] Update saves changes
- [x] Delete goal (trash icon)
- [x] Confirmation dialog appears
- [x] Goal removed after confirmation
- [x] Cancel/Close resets form
- [x] Modal title changes based on mode
- [x] Button text changes based on mode

---

**Ready to test!** Open http://localhost:5173 and login as manager@pvara.com / manager123
