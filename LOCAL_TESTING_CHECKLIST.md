# ✅ COMPREHENSIVE LOCAL TESTING CHECKLIST

**Date:** December 9, 2025  
**Application:** PVARA HRMS  
**Scope:** Complete end-to-end verification  
**Environment:** Local (localhost)

---

## 🎯 PRE-TEST REQUIREMENTS

### Servers Status
- [ ] Backend running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:5174`
- [ ] MongoDB connected (check: `curl http://localhost:5000/api/health`)
- [ ] No error messages in either terminal

### Browser Setup
- [ ] Open `http://localhost:5174` in browser
- [ ] Press F12 to open DevTools
- [ ] Go to Console tab (to see any JavaScript errors)
- [ ] Go to Network tab (to see API calls)

---

## SECTION 1️⃣: AUTHENTICATION FLOW

### Test 1.1: Login Page Loads
- [ ] URL shows `http://localhost:5174/login` or `http://localhost:5174`
- [ ] Page displays "PVARA" logo
- [ ] See "Welcome Back" heading
- [ ] Two input fields visible: Email and Password
- [ ] "Sign In" button visible
- [ ] "Contact admin" link visible

**Expected:** Beautiful login page with no errors

---

### Test 1.2: Try Login with Test Account

**First attempt:** Try to login with `admin@pvara.com` / `admin123`

**If login succeeds:**
- [ ] Page redirects to Dashboard
- [ ] URL changes to `/dashboard`
- [ ] You can see company/employee data
- [ ] Email shows in top-right user menu
- [ ] **Proceed to Section 2**

**If login fails (Invalid credentials):**
- [ ] You'll see error message: "Invalid email or password"
- [ ] You're still on login page
- [ ] This means test account doesn't exist
- [ ] **Proceed to Test 1.3 to register**

**Check Console:** F12 → Console tab
- [ ] No red errors (warnings are OK)
- [ ] Should see successful API call to `/api/auth/login` in Network tab

---

### Test 1.3: Register if Account Doesn't Exist

If the test account doesn't exist, you need to register a new company:

1. Look for "Contact admin" link on login page → Click it
2. Or navigate to registration URL if available
3. Fill in registration form:
   ```
   Company Name: PVARA Test Inc
   Company Email: test@pvara-test.com
   Admin First Name: Test
   Admin Last Name: Admin
   Admin Email: admin@pvara.com
   Password: admin123
   ```
4. Click "Register" button

**Expected:**
- [ ] Registration form validates inputs
- [ ] Click Register → success message appears
- [ ] Redirects to Dashboard
- [ ] New account is now logged in

**Check Console:** F12 → Console tab
- [ ] No red errors
- [ ] See successful POST to `/api/auth/register`

---

## SECTION 2️⃣: DASHBOARD

### Test 2.1: Dashboard Loads Correctly

Once logged in (either via login or registration):

- [ ] Page title shows "PVARA" or "Dashboard"
- [ ] Sidebar visible on left with menu items
- [ ] Top navigation bar visible
- [ ] Main content area shows dashboard content

### Test 2.2: Stat Cards Display

You should see 4 stat cards with data:

- [ ] **Total Employees:** Shows a number (may be 0 if new company)
- [ ] **Active Employees:** Shows a number
- [ ] **Attendance Rate:** Shows percentage or dash
- [ ] **Monthly Payroll:** Shows amount or currency

**Note:** Numbers may be 0 or small if new company - that's OK, just need to SEE the cards

### Test 2.3: Charts and Widgets

- [ ] "Pending Approvals" section visible
- [ ] "Recent Activity" section visible
- [ ] Charts render without errors (may show empty if no data)

### Test 2.4: Navigation Buttons

Look for quick action buttons (may say):
- [ ] "Add Employee" button
- [ ] "View Approvals" button
- [ ] Other action buttons

**Just verify they exist.** Don't need to click yet.

**Check Console:**
- [ ] No red errors in F12 → Console
- [ ] Should see API calls in Network tab

---

## SECTION 3️⃣: EMPLOYEES PAGE

### Test 3.1: Navigate to Employees

1. Click "Employees" in sidebar (or similar)
2. Wait for page to load

**Expected:**
- [ ] URL changes to `/employees`
- [ ] Page title shows "Employees" or similar
- [ ] Page loads without hanging or errors

### Test 3.2: Employee List Page Elements

- [ ] Search box present at top
- [ ] Filter dropdowns present (Department, Status)
- [ ] "Add Employee" button visible
- [ ] Table or list of employees visible (even if empty)
- [ ] Action buttons visible in table (Edit, Delete, View)

### Test 3.3: Check Employee Data

**If existing employees show:**
- [ ] Employee names visible
- [ ] Email addresses visible
- [ ] Department visible
- [ ] Status visible (active/inactive/etc)
- [ ] Numbers make sense

**If no employees yet:**
- [ ] That's OK - empty state is normal for new company
- [ ] Continue to Test 3.4 to add one

**Check Console:**
- [ ] No red errors
- [ ] Should see GET `/api/employees` in Network tab
- [ ] Response should be valid JSON (even if empty array)

---

## SECTION 4️⃣: ADD EMPLOYEE (CRITICAL TEST)

### Test 4.1: Open Add Employee Modal

1. Click "Add Employee" button
2. Modal/form should pop up

**Expected:**
- [ ] Modal appears with title "Add Employee" or similar
- [ ] Form fields visible:
  - [ ] First Name field
  - [ ] Last Name field
  - [ ] Email field
  - [ ] Password field
  - [ ] Phone field
  - [ ] Department dropdown
  - [ ] Position dropdown
  - [ ] Role dropdown
  - [ ] Joining Date picker
  - [ ] Salary field
- [ ] "Save" or "Submit" button visible
- [ ] "Cancel" button visible

### Test 4.2: Fill Out the Form

Fill in exactly these values:

```
First Name: Test
Last Name: Employee
Email: test.employee@pvara.com
Password: password123
Phone: 03001234567
Department: IT (or first option in dropdown)
Position: (select any option from dropdown)
Role: employee
Joining Date: Today's date
Salary: 50000
```

**Expected:**
- [ ] All fields accept input
- [ ] Dropdowns open and show options
- [ ] Date picker works
- [ ] No validation errors appear yet

### Test 4.3: Submit the Form

1. Click "Save" button
2. Wait for response

**Expected:**
- [ ] Form validates (check for red error messages)
- [ ] If validation passes → modal closes
- [ ] You see green toast notification: "Employee created successfully" or similar
- [ ] You're back at Employees list page

**If validation fails:**
- [ ] See red error messages under fields
- [ ] Modal stays open
- [ ] Fix errors and try again

**Check Console:**
- [ ] No red JavaScript errors (warnings OK)
- [ ] See POST `/api/employees` in Network tab
- [ ] Response should show newly created employee with _id

---

## SECTION 5️⃣: VERIFY EMPLOYEE APPEARS (Critical)

### Test 5.1: New Employee in List

After saving, check employees list:

- [ ] "Test Employee" (or your name) appears in the table
- [ ] Email shows as "test.employee@pvara.com"
- [ ] Department shows as "IT"
- [ ] Status shows as "active"
- [ ] Can see Edit/Delete/View buttons

**This proves the employee was created successfully.**

---

## SECTION 6️⃣: DATABASE PERSISTENCE TEST ⭐ (MOST CRITICAL)

### Test 6.1: Refresh the Page

This is the **most important test** - it proves data persists to MongoDB:

1. Make sure "Test Employee" is visible in the list
2. Press **F5** to refresh the entire page
3. Wait for page to reload completely
4. Look at the employee list again

**Expected: ✅ CORRECT BEHAVIOR**
- [ ] Page reloads
- [ ] "Test Employee" is STILL in the list
- [ ] All employee details match what you entered
- [ ] **This proves database persistence works**

**If employee disappears: ❌ WRONG BEHAVIOR**
- [ ] Employee doesn't appear after refresh
- [ ] This means data is NOT persisting to MongoDB
- [ ] This is a critical issue that must be fixed

**REPORT THIS RESULT BACK IMMEDIATELY** - it determines if system is ready

---

## SECTION 7️⃣: EMPLOYEE OPERATIONS

### Test 7.1: Edit Employee

1. Click "Edit" button on "Test Employee" row
2. Modal should pop up with pre-filled data
3. Change something (e.g., phone number)
4. Click "Save"
5. Verify changes appear in list

**Expected:**
- [ ] Edit modal shows all current data
- [ ] Can modify fields
- [ ] Save works and shows success message
- [ ] Changes visible in list

### Test 7.2: View Employee Details

1. Click "View" or the employee name
2. Should see full employee details (modal or page)
3. Check all information is there

**Expected:**
- [ ] Employee details modal/page opens
- [ ] Shows all fields correctly
- [ ] Can close modal/go back

### Test 7.3: Delete Employee (Optional)

1. Click "Delete" on employee row
2. Should show confirmation dialog
3. Confirm deletion
4. Employee should disappear from list

**Expected:**
- [ ] Confirmation dialog appears: "Are you sure?"
- [ ] Click yes → employee deactivated
- [ ] Employee marked as inactive or disappears from active list

---

## SECTION 8️⃣: OTHER CRITICAL PAGES

### Test 8.1: Check Each Page for Errors

Visit each page and check F12 Console for red errors:

**For each page:**
1. Click the page in sidebar
2. Wait for load
3. Press F12 → Console tab
4. Look for red error messages (warnings OK)
5. Mark below

| Page | Loads OK | Errors | Notes |
|------|----------|--------|-------|
| Dashboard | ☐ | ☐ | |
| Employees | ☐ | ☐ | |
| Leave Management | ☐ | ☐ | |
| Attendance | ☐ | ☐ | |
| Payroll | ☐ | ☐ | |
| Performance | ☐ | ☐ | |
| Recruitment | ☐ | ☐ | |
| Analytics | ☐ | ☐ | |
| Settings | ☐ | ☐ | |
| Compliance | ☐ | ☐ | |
| Admin | ☐ | ☐ | |

### Test 8.2: Check Console for Critical Errors

Open F12 → Console tab and look for:

- ❌ RED errors (show as red X icon)
- ⚠️ YELLOW warnings (show as yellow triangle) - these are usually OK
- 📋 BLUE info (these are fine)

**Count the red errors:**
- [ ] 0 red errors found → ✅ Good
- [ ] 1-2 red errors → ⚠️ Investigate (may be minor)
- [ ] 3+ red errors → ❌ Problem

---

## SECTION 9️⃣: BUTTON INTERACTIVITY

### Test 9.1: Settings Page - Save Button

1. Navigate to Settings page
2. Look for "Personal Information" section
3. Find "Save Changes" button
4. Click it

**Expected:**
- [ ] Button is clickable (not disabled)
- [ ] Click → Toast notification appears (success or info message)
- [ ] No console errors

### Test 9.2: Try Other Buttons

Try clicking a few other buttons on different pages:

- [ ] "Add" buttons open modals
- [ ] "Export" buttons show feedback (toast/alert)
- [ ] "Delete" buttons show confirmation
- [ ] Search/Filter buttons work

**Expected:** All buttons respond to clicks with some feedback

---

## FINAL VERIFICATION CHECKLIST

Mark each as Pass ✅ or Fail ❌:

```
AUTHENTICATION
☐ Login page loads
☐ Can login or register
☐ Dashboard loads after login

EMPLOYEE MANAGEMENT  
☐ Employees page loads
☐ Can add new employee
☐ New employee appears in list
☐ NEW EMPLOYEE PERSISTS AFTER REFRESH (CRITICAL)
☐ Can edit employee
☐ Can view employee details

PAGE STABILITY
☐ Dashboard page - no errors
☐ Employees page - no errors
☐ Settings page - no errors
☐ Other pages load OK
☐ No critical console errors

INTERACTIVITY
☐ Buttons respond to clicks
☐ Forms submit data
☐ Success/error messages show

DATABASE
☐ Data persists after page refresh
☐ MongoDB queries work
☐ Employee CRUD operations all work
```

---

## DECISION MATRIX

**IF ALL CHECKS PASS ✅**
```
Result: ✅ READY TO PUSH TO GITHUB
Confidence: 99%
Next: Commit and push to main branch
```

**IF PERSISTENCE TEST FAILS ❌**
```
Result: ❌ DO NOT PUSH
Issue: Data not persisting to MongoDB
Action: Need to investigate and fix database persistence
```

**IF CONSOLE HAS CRITICAL ERRORS ❌**
```
Result: ⚠️ REVIEW ERRORS
Action: Evaluate error severity
- If minor: May be able to push
- If critical: Fix before pushing
```

**IF BUTTONS DON'T WORK ❌**
```
Result: ❌ DO NOT PUSH
Issue: Form/button functionality broken
Action: Need to investigate and fix interactivity
```

---

## HOW TO REPORT

When you're done testing, provide:

1. **Screenshots** (optional but helpful):
   - Login page
   - Dashboard
   - Employees page with test employee
   - After refresh (showing persistence)

2. **Text Report:**
   ```
   ✅ Servers running: YES/NO
   ✅ Can login: YES/NO
   ✅ Dashboard loads: YES/NO
   ✅ Can add employee: YES/NO
   ✅ Employee appears: YES/NO
   ✅ PERSISTS AFTER REFRESH: YES/NO (CRITICAL)
   
   Pages with errors: [list any]
   Console errors: [describe any red errors]
   
   Overall Status: READY / NOT READY
   ```

3. **Any Errors Encountered:**
   - Copy exact error messages from console
   - Describe what happened
   - Screenshot if possible

---

## ESTIMATED TIME

- Full testing: **15-20 minutes**
- Per section: **1-2 minutes**
- Critical test (persistence): **1 minute**

---

## ✅ YOU'RE READY!

Now go run these tests locally and report back with results. I'm standing by to give final go/no-go based on your findings.

**Remember:** The persistence test (Section 6) is the most critical. If that passes, we're in great shape.

Let me know what you find! 🚀
