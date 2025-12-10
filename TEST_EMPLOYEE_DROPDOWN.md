# Quick Test Guide - Employee Dropdown & Organization Structure

## 🎯 What Was Fixed

1. **Employee Dropdown** - Now properly shows team members when creating KPI goals
2. **Organization Structure** - Now displays hierarchical reporting structure correctly

## ✅ Ready to Test

Both servers are running:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173

## Test 1: Employee Dropdown in KPI Goals

### Steps:
1. Open browser → http://localhost:5173
2. Login as **Manager**:
   - Email: `manager@pvara.com`
   - Password: `manager123`
3. Click **Team Performance** in left sidebar
4. Click **KPI Goals** tab
5. Click **Create Goal** button (green + button)
6. Look at **Employee** dropdown

### Expected Result ✅
The dropdown should show:
```
Select Employee
Muhammad Usman Malik (69382402de2c0b884782ffd7)
John Doe (693825d852f1934c356c445c)
```

### If It Works:
- ✅ You can select an employee
- ✅ Fill in the rest of the form
- ✅ Create a goal successfully

### If Empty:
Run this to assign employees:
```powershell
cd backend
node scripts/create-manager.js
```

## Test 2: Organization Structure

### Steps:
1. Logout from manager account
2. Login as **Admin**:
   - Email: `admin@pvara.com`
   - Password: `admin123`
3. Click **Settings** in left sidebar (gear icon)
4. Click **Organization Hierarchy** tab

### Expected Result ✅
You should see:
- Position card showing "Senior" (Engineer department)
- Level badge: "senior"
- Employee count: "1 employee"
- Edit and Delete buttons
- If position has subordinates: expand/collapse button

### Features Working:
- ✅ Position displayed in a card
- ✅ Shows department and level
- ✅ Shows employee count
- ✅ Shows subordinate count (if any)
- ✅ Root positions only (those with no manager)
- ✅ Click expand to show subordinates
- ✅ Proper tree indentation

### Add New Position:
1. Click **Add Position** button
2. Fill in:
   - Position Title: "Junior Developer"
   - Department: "Engineering"
   - Level: "junior"
   - Reports To: Select "Senior" (optional)
3. Click Submit
4. Should appear in hierarchy

## Test 3: Verify Complete Workflow

### Create Goal for Team Member:
1. Login as manager
2. Team Performance → KPI Goals → Create Goal
3. Select employee: **Muhammad Usman Malik**
4. Fill in:
   - Title: "Test Employee Assignment"
   - Description: "Testing dropdown functionality"
   - Category: "Productivity"
   - Target Value: 100
   - Unit: "%"
   - Weightage: 25
   - Start Date: 2025-01-01
   - End Date: 2025-06-30
5. Click **Create Goal**

### Expected:
- ✅ Goal created successfully
- ✅ Toast notification appears
- ✅ Goal shows in list with employee name "Muhammad Usman Malik"

## Visual Confirmation

### Employee Dropdown (BEFORE vs AFTER)

**BEFORE (Broken):**
```
Employee *
[Select Employee ▼]
(Empty - no options)
```

**AFTER (Fixed):**
```
Employee *
[Select Employee ▼]
 Muhammad Usman Malik (69382402de2c0b884782ffd7)
 John Doe (693825d852f1934c356c445c)
```

### Organization Structure (BEFORE vs AFTER)

**BEFORE (Broken):**
- All positions at same level
- No hierarchy visible
- No expand/collapse
- No employee count

**AFTER (Fixed):**
```
🏢 Senior (1 employees)
   Level: senior | 1 employee | 0 subordinates
   [Edit] [Delete]

   If expanded and has subordinates:
   └─ Junior Developer (0 employees)
      Level: junior | 0 employees
      [Edit] [Delete]
```

## Browser Console Check

Open Developer Tools (F12) → Console

When you navigate to Team Performance, you should see:
```
Found 2 team members for Sarah
```

If you see `Found 0 team members`, the filtering is still broken.

## API Test (Alternative)

If you want to test directly via API:

```powershell
# Login as manager
$body = @{email='manager@pvara.com'; password='manager123'} | ConvertTo-Json
$response = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$token = $response.token

# Get employees
$employees = Invoke-RestMethod -Uri http://localhost:5000/api/employees -Headers @{Authorization="Bearer $token"}

# Check team members
$employees | Where-Object {$_.reportsTo._id -eq $response.user._id} | ForEach-Object {
    Write-Host "$($_.firstName) $($_.lastName) reports to manager"
}
```

Expected: 2 employees shown

## Automated Test

Run the comprehensive test script:

```powershell
cd c:\Users\iusma\projects\pvara-hrms-prod\backend
node scripts/test-employee-dropdown.js
```

Expected output:
```
🎉 All tests PASSED! Both features are working.

Manager Account: ✅ Team members assigned
Organization Structure: ✅ Positions configured
Employee Filtering: ✅ Working correctly
```

## Troubleshooting

### Dropdown still empty
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check browser console for errors
4. Verify backend is running: `curl http://localhost:5000/api/health`

### Organization tree not showing
1. Make sure you're in Settings → Organization Hierarchy tab
2. Check if positions exist: `curl http://localhost:5000/api/positions/hierarchy -H "Authorization: Bearer YOUR_TOKEN"`
3. Create a position using Add Position button
4. Check browser console for errors

### Changes not applied
1. Make sure both servers were restarted
2. Clear browser cache
3. Check if you're on the right page/tab

## Success Criteria

All of these should work:

- [x] Login as manager
- [x] Navigate to Team Performance
- [x] Click Create Goal
- [x] Employee dropdown shows 2 team members
- [x] Can select an employee from dropdown
- [x] Can create a goal for selected employee
- [x] Login as admin
- [x] Navigate to Settings → Organization Hierarchy
- [x] See position(s) in hierarchy
- [x] Position shows employee count
- [x] Can expand/collapse if has subordinates
- [x] Can add new position

---

## Quick Commands Reference

**Start Backend:**
```powershell
cd c:\Users\iusma\projects\pvara-hrms-prod\backend
node server.js
```

**Start Frontend:**
```powershell
cd c:\Users\iusma\projects\pvara-hrms-prod
npm run dev
```

**Test Everything:**
```powershell
cd backend
node scripts/test-employee-dropdown.js
```

**Assign Employees to Manager:**
```powershell
cd backend
node scripts/create-manager.js
```

---

**Ready!** Open http://localhost:5173 and test both features 🚀
