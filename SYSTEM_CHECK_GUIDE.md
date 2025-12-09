# 🧪 FINAL SYSTEM CHECK - STEP-BY-STEP GUIDE

This document will guide you through the actual testing of PVARA HRMS. Follow these steps EXACTLY and report what you see.

**Important:** Keep DevTools open (F12) with Console tab visible during ALL tests.

---

## STEP 1: VERIFY ACCOUNT EXISTS

### Option A: Login with existing test account
1. Go to http://localhost:5174
2. You should see Login page
3. Try to login with:
   - Email: `admin@pvara.com`
   - Password: `admin123`

**What should happen:**
- ✅ If credentials accepted → Login succeeds, redirects to Dashboard
- ❌ If "Invalid email or password" → Account doesn't exist, go to Step 2

**REPORT BACK:** Did login succeed or fail?

---

## STEP 2: IF LOGIN FAILED - REGISTER NEW ACCOUNT

If the account doesn't exist, we need to register a company first.

1. Look for "Contact admin" or "Sign up" link on login page
2. Click it to access registration
3. Fill in company registration form:
   ```
   Company Name: PVARA Test
   Company Email: admin@pvara-test.com
   Admin First Name: Admin
   Admin Last Name: Test
   Admin Email: admin@pvara.com
   Password: admin123
   ```
4. Click "Register"

**What should happen:**
- ✅ Registration succeeds
- ✅ Token stored in localStorage
- ✅ Redirects to Dashboard

**REPORT BACK:** Did registration succeed? Any errors in console?

---

## STEP 3: VERIFY DASHBOARD LOADS

Once logged in, you should be on Dashboard.

**Check these:**
1. [ ] Page title says "Dashboard"
2. [ ] Top left shows company name
3. [ ] Top right shows your email / user menu
4. [ ] Four stat cards visible: Total Employees, Active This Month, Attendance Rate, Monthly Payroll
5. [ ] Stat numbers display (don't need to be real, just display something)
6. [ ] No red errors in console (F12 → Console tab)

**REPORT BACK:**
- Page loaded fully? (Y/N)
- Any errors in console? (If yes, copy-paste the error message)
- Can you see employee count? (What number shows?)

---

## STEP 4: NAVIGATE TO EMPLOYEES PAGE

1. Click on "Employees" in sidebar
2. Wait for page to load
3. You should see:
   - Search box
   - Filter dropdowns (Department, Status)
   - "Add Employee" button
   - Table of employees (may be empty)

**Check these:**
- [ ] Page loaded without errors
- [ ] Search box functional
- [ ] Filters present
- [ ] Add button visible
- [ ] No console errors

**REPORT BACK:**
- Page loaded? (Y/N)
- Any console errors? (If yes, describe them)
- How many employees show? (0, or actual count?)

---

## STEP 5: TEST ADD EMPLOYEE

1. Click "Add Employee" button
2. Modal should pop up with form
3. Fill in form:
   ```
   First Name: Test
   Last Name: Employee
   Email: test.employee@pvara.com
   Password: password123
   Phone: 03001234567
   Department: IT (or any dropdown option)
   Position: (select first one from dropdown)
   Role: employee
   Joining Date: (today's date)
   Salary: 50000
   ```
4. Click "Save" button
5. You should see green success toast notification

**REPORT BACK:**
- Modal opened? (Y/N)
- Form filled without issues? (Y/N)
- Got success message? (Y/N)
- Any errors? (If yes, describe)

---

## STEP 6: VERIFY EMPLOYEE APPEARS IN LIST

After saving, the modal should close and you should see "Test Employee" in the table.

**Check these:**
- [ ] Modal closed
- [ ] New employee "Test Employee" appears in table
- [ ] Employee email shows correctly
- [ ] Can see action buttons (Edit, Delete, View)

**REPORT BACK:**
- Does new employee appear in list? (Y/N)
- Can you see all details? (Y/N)

---

## STEP 7: CRITICAL TEST - REFRESH PAGE (PERSISTENCE)

This is the most important test.

1. Press **F5** to refresh the page
2. Wait for page to fully reload
3. Check if "Test Employee" is still in the list

**REPORT BACK:**
- Did employee persist after refresh? (Y/N) ← **THIS IS CRITICAL**
- If NO → Data not persisting to database (MAJOR ISSUE)
- If YES → Everything working correctly ✅

---

## STEP 8: TEST OTHER PAGES (QUICK CHECK)

Visit these pages and verify no console errors:
1. [ ] Dashboard - no errors
2. [ ] Employees - no errors
3. [ ] Leave Management - no errors
4. [ ] Payroll - no errors
5. [ ] Settings - no errors
6. [ ] Analytics - no errors

For each page:
- Just load it
- Open F12 → Console
- Look for red error messages
- If all clear, mark as ✅

**REPORT BACK:**
- Which pages have console errors? (List any)
- Which pages load cleanly? (List them)

---

## STEP 9: TEST A BUTTON OPERATION

Go to Settings page and test Save button:

1. Navigate to Settings page
2. Look for "Personal Information" section
3. You should see "Save Changes" button
4. Click it
5. You should see a toast notification (success or otherwise)

**REPORT BACK:**
- Did clicking the button do something? (Y/N)
- Did you see a notification? (Y/N)
- Any console errors? (Y/N)

---

## FINAL CHECKLIST

Answer these questions for final sign-off:

```
Login: ✅ Y / ❌ N
Dashboard loads: ✅ Y / ❌ N
Employees page loads: ✅ Y / ❌ N
Can add employee: ✅ Y / ❌ N
New employee appears: ✅ Y / ❌ N
Employee persists after refresh: ✅ Y / ❌ N (THIS IS CRITICAL)
No major console errors: ✅ Y / ❌ N
Other pages load cleanly: ✅ Y / ❌ N
Buttons respond to clicks: ✅ Y / ❌ N

OVERALL READY FOR LAUNCH? ✅ Y / ❌ N
```

---

## IF ANYTHING FAILS

If any step fails, REPORT:
1. **Which step failed?** (Step number)
2. **What was supposed to happen?**
3. **What actually happened?**
4. **Any error messages?** (Copy-paste them exactly)
5. **What's in browser console?** (F12 → Console tab, copy errors)

**Example of good report:**
```
Step 7 (Refresh test) FAILED
Expected: Employee "Test Employee" should still appear after F5 refresh
Actual: Employee list is empty after refresh
Console error: "Failed to fetch /api/employees" - 500 server error
```

---

## INTERPRETATION

**If ALL tests pass:** 🎉 **READY TO LAUNCH TO GITHUB** ✅

**If persistence test (Step 7) fails:** ❌ **DO NOT PUSH** - Database issue needs fixing

**If console errors appear:** ⚠️ **EVALUATE** - Some might be warnings, some might be critical

**If buttons don't work:** ❌ **DO NOT PUSH** - Form functionality broken

---

## READY TO TEST?

Please run through ALL 9 steps above and report the results back to me. I'll use your answers to give final sign-off.

**Time estimate:** 10-15 minutes total

**Critical section:** Step 7 (Refresh test) - this is the real validation

Let me know what you find! 🔍
