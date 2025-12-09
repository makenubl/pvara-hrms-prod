# 🧪 PVARA HRMS - Comprehensive Testing Checklist

**Date:** December 9, 2025  
**Testing URL:** http://localhost:5174  
**Backend URL:** http://localhost:5000

---

## ✅ PRE-TEST SETUP

- [ ] Backend running on port 5000
- [ ] MongoDB connected
- [ ] Frontend running on port 5174
- [ ] Browser console open (F12)
- [ ] Network tab open in DevTools

---

## 🔐 1. LOGIN PAGE

**URL:** `/login`

### Fields to Test:
- [ ] Email field accepts input
- [ ] Password field accepts input (hidden)
- [ ] "Remember me" checkbox toggles
- [ ] Login button clickable
- [ ] "Forgot password?" link present
- [ ] "Sign up" link present

### Functionality:
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Token stored in localStorage after login
- [ ] Redirects to Dashboard after successful login
- [ ] Error messages display for failed login

### Test Credentials:
```
Email: admin@pvara.com
Password: admin123
```

**Console Checks:**
- [ ] No errors in console
- [ ] "✅ Login successful" or similar log
- [ ] API call to `/api/auth/login` in Network tab

---

## 📊 2. DASHBOARD

**URL:** `/`

### Data Display:
- [ ] Total Employees count (from backend)
- [ ] Active This Month count
- [ ] Attendance Rate percentage
- [ ] Monthly Payroll amount (PKR)

### Charts:
- [ ] Attendance Trends chart renders
- [ ] Performance Overview chart renders
- [ ] Chart data loads without errors

### Quick Actions Buttons:
- [ ] "Add Employee" button → navigates to /employees
- [ ] "Mark Attendance" button → navigates to /attendance
- [ ] "Process Payroll" button → navigates to /payroll
- [ ] "Create Job" button → navigates to /recruitment

### Widgets:
- [ ] Pending Approvals list displays
- [ ] "View All Approvals" button → navigates to /approvals
- [ ] Recent Activity list displays
- [ ] "View Activity Log" button → navigates to /analytics

### Date Range Filter:
- [ ] Dropdown shows: This Week, This Month, This Quarter, This Year
- [ ] Selecting different ranges (functionality may be pending)

**Console Checks:**
- [ ] "✅ Dashboard: Employees loaded: X" appears
- [ ] No errors related to data fetching
- [ ] API call to `/api/employees` successful

---

## 👥 3. EMPLOYEES PAGE

**URL:** `/employees`

### Data Display:
- [ ] Total Employees count
- [ ] Active count
- [ ] On Leave count
- [ ] Departments count
- [ ] Employee table loads with data
- [ ] Employee count shows: (X) in table header

### Search & Filters:
- [ ] Search box accepts text input
- [ ] Search filters employees by name/email/ID
- [ ] Department filter dropdown works
- [ ] Status filter dropdown works (All, Active, On Leave, Inactive, Suspended)
- [ ] Filters update table in real-time

### Table Columns:
- [ ] Avatar/Photo displays
- [ ] Name displays
- [ ] Employee ID displays
- [ ] Department displays
- [ ] Role/Position displays
- [ ] Status badge displays with correct color
- [ ] Actions column (Edit/Delete buttons) displays

### Add Employee:
- [ ] "Add Employee" button opens modal
- [ ] Modal form displays all fields:
  - [ ] First Name (required)
  - [ ] Last Name (required)
  - [ ] Email (required, validated)
  - [ ] Phone (validated format)
  - [ ] Department dropdown
  - [ ] Position/Role field
  - [ ] Join Date picker
  - [ ] Salary field (number)
  - [ ] Status dropdown
- [ ] "Add Employee" submit button works
- [ ] Success toast appears after adding
- [ ] Table refreshes with new employee
- [ ] Modal closes after successful add
- [ ] Cancel button closes modal without saving

### Edit Employee:
- [ ] Edit button (pencil icon) opens edit modal
- [ ] Modal pre-fills with employee data
- [ ] All fields are editable
- [ ] "Save Changes" button updates employee
- [ ] Success toast appears after editing
- [ ] Table refreshes with updated data
- [ ] Cancel button closes modal without saving

### Delete Employee:
- [ ] Delete button (trash icon) shows confirmation
- [ ] Confirmation dialog appears
- [ ] "Yes" deletes employee
- [ ] Success toast appears after deletion
- [ ] Table refreshes without deleted employee
- [ ] "No" cancels deletion

### View Employee Details:
- [ ] Clicking on employee row opens details panel/modal
- [ ] Employee details display correctly:
  - [ ] Full name
  - [ ] Employee ID
  - [ ] Email
  - [ ] Phone
  - [ ] Department
  - [ ] Position
  - [ ] Join Date
  - [ ] Status
  - [ ] Salary
- [ ] Close button works

**Console Checks:**
- [ ] "✅ Employees fetched: [...]" appears
- [ ] "✅ Employee added successfully" after add
- [ ] "✅ Employee updated successfully" after edit
- [ ] "✅ Employee deleted" after delete
- [ ] API calls to `/api/employees` in Network tab
- [ ] No errors in console

---

## 📈 4. ANALYTICS PAGE

**URL:** `/analytics`

### Metrics Display:
- [ ] Total Employees count (same as Dashboard)
- [ ] Active Employees count
- [ ] On Leave count
- [ ] Inactive count
- [ ] All metrics with trend indicators (+X%)

### Date Range Filter:
- [ ] Week, Month, Quarter, Year buttons toggle
- [ ] Active button highlighted
- [ ] Selecting changes date range (may affect future charts)

### Department Performance Table:
- [ ] Table displays all departments
- [ ] Columns: Department, Employees, Engagement, Attrition
- [ ] Employee count per department matches actual data
- [ ] All rows display correctly

### Charts Section:
- [ ] Hiring Trends chart (if implemented)
- [ ] Engagement by Level chart (if implemented)
- [ ] Charts render without errors

### Export Button:
- [ ] "Export Report" button clickable
- [ ] Toast notification appears (functionality may be pending)

**Console Checks:**
- [ ] "✅ Analytics: Employees loaded: X" appears
- [ ] Employee count matches Dashboard and Employees page
- [ ] No errors in console

---

## 💼 5. RECRUITMENT PAGE

**URL:** `/recruitment`

### Tabs:
- [ ] "Jobs" tab active by default
- [ ] "Applicants" tab clickable
- [ ] Tabs switch content correctly

### Stats Display:
- [ ] Open Positions count
- [ ] Total Applicants count
- [ ] In Progress count (interviews)

### Jobs Tab:
- [ ] Job openings table loads
- [ ] Columns: Job Title, Location, Applicants, Status
- [ ] Status badges show correct color (open=green, closed=gray)
- [ ] Department shows under job title
- [ ] All jobs display from backend

### Applicants Tab:
- [ ] Applicants list displays
- [ ] Each card shows:
  - [ ] Applicant name
  - [ ] Job title applied for
  - [ ] Applied date
  - [ ] Status badge (interview=green, screening=blue, rejected=red)
- [ ] All applicants load from backend

### New Job Opening Button:
- [ ] "New Job Opening" button clickable
- [ ] Action triggered (modal or navigation)

**Console Checks:**
- [ ] "✅ Recruitment data loaded: X jobs, X applicants" appears
- [ ] API calls to `/api/recruitment/jobs` and `/api/recruitment/applicants`
- [ ] Fallback data shows if backend returns empty
- [ ] No errors in console

---

## 💰 6. PAYROLL PAGE

**URL:** `/payroll`

### Filter Controls:
- [ ] Month selector dropdown works
- [ ] Status filter: All, Processed, Pending, On Hold
- [ ] Filters update payslip list

### Stats Display:
- [ ] Total Payroll amount (PKR)
- [ ] Processed count
- [ ] Pending count

### Payslips Table/List:
- [ ] Employee names display
- [ ] Employee IDs display
- [ ] Month shows correctly
- [ ] Status badge (processed=green, pending=yellow)
- [ ] Base Salary (PKR)
- [ ] Allowances (PKR)
- [ ] Deductions (PKR)
- [ ] Net Salary (PKR)
- [ ] Processed Date (or null for pending)

### Actions:
- [ ] "View Payslip" or "Download" buttons work
- [ ] "Process Payroll" button (if present) clickable

**Console Checks:**
- [ ] "✅ Payslips loaded: X" appears
- [ ] API call to `/api/payroll?month=X`
- [ ] Fallback data shows if backend returns empty
- [ ] All currency values in PKR format
- [ ] No errors in console

---

## 📋 7. COMPLIANCE PAGE

**URL:** `/compliance`

### Policies Section:
- [ ] Policies list/table displays
- [ ] Each policy shows:
  - [ ] Policy name
  - [ ] Category (Data Protection, Ethics, Safety, etc.)
  - [ ] Version number
  - [ ] Last Updated date
  - [ ] Status badge (active=green, under-review=yellow)
  - [ ] Acknowledgments count

### Audits Section:
- [ ] Audits list displays (if implemented)
- [ ] Audit details show correctly

### Actions:
- [ ] "Add Policy" button (if present) works
- [ ] Policy cards/rows clickable for details

**Console Checks:**
- [ ] "✅ Compliance policies loaded: X" appears
- [ ] API call to `/api/compliance`
- [ ] Fallback data shows if backend returns empty
- [ ] No errors in console

---

## ⭐ 8. PERFORMANCE PAGE

**URL:** `/performance`

### Tabs:
- [ ] "Appraisals" tab active by default
- [ ] Other tabs (Goals, Reviews) if present

### Appraisals Table:
- [ ] Employee names display
- [ ] Employee IDs display
- [ ] Star ratings render (1-5 stars)
- [ ] Numerical rating shows (e.g., 4.5)
- [ ] Status badge (completed=green, pending=yellow)
- [ ] Evaluator name displays
- [ ] Completed date (or null for pending)

### Actions:
- [ ] "New Appraisal" button (if present) works
- [ ] View/Edit buttons on appraisals work

**Console Checks:**
- [ ] "✅ Performance data loaded: X" appears
- [ ] API call to `/api/performance/reviews`
- [ ] Fallback data shows if backend returns empty
- [ ] No errors in console

---

## 📅 9. ATTENDANCE PAGE

**URL:** `/attendance`

### View Mode Toggle:
- [ ] "List" view button
- [ ] "Calendar" view button (if implemented)
- [ ] Switches between views

### Stats Display:
- [ ] Present count
- [ ] Absent count
- [ ] Late count
- [ ] Work From Home count

### Attendance Records List/Table:
- [ ] Employee ID displays
- [ ] Employee name displays
- [ ] Date displays
- [ ] Status icon and badge:
  - [ ] Present (green checkmark)
  - [ ] Absent (red X)
  - [ ] Late (yellow alert)
  - [ ] Work From Home (purple clock)
- [ ] Check-in time displays
- [ ] Check-out time displays (or null)
- [ ] Department displays

### Actions:
- [ ] "Mark Attendance" button works
- [ ] Date selector (if present) changes records

**Console Checks:**
- [ ] "✅ Attendance data loaded: X" appears
- [ ] API call to `/api/attendance/records`
- [ ] Fallback data shows if backend returns empty
- [ ] No errors in console

---

## 🏖️ 10. LEAVE MANAGEMENT PAGE

**URL:** `/leave-management`

### Leave Balance Widget:
- [ ] Available days displays
- [ ] Used days displays
- [ ] Balance calculates correctly (Available - Used)

### Leave Records/Requests:
- [ ] Leave requests list displays
- [ ] Each request shows:
  - [ ] Employee name (if admin view)
  - [ ] Leave type (Annual, Sick, Personal, Casual)
  - [ ] Start date
  - [ ] End date
  - [ ] Number of days
  - [ ] Status badge (pending, approved, rejected)
  - [ ] Reason/notes

### Actions:
- [ ] "Apply for Leave" button opens form
- [ ] Leave form fields:
  - [ ] Leave Type dropdown
  - [ ] Start Date picker
  - [ ] End Date picker
  - [ ] Reason textarea
  - [ ] Submit button
- [ ] Form validation works
- [ ] Submit creates new leave request
- [ ] Success toast appears

### Pending Approvals (if manager/admin):
- [ ] Pending leaves list displays
- [ ] Approve button works
- [ ] Reject button works
- [ ] Status updates after action

**Console Checks:**
- [ ] "✅ Leave balance loaded: {...}" appears
- [ ] API call to `/api/leaves/balance`
- [ ] Fallback data shows if backend returns empty
- [ ] No errors in console

---

## ⚙️ 11. SETTINGS PAGE

**URL:** `/settings`

### Profile Tab:
- [ ] First Name field (pre-filled from auth store)
- [ ] Last Name field (pre-filled from auth store)
- [ ] Email field (pre-filled from auth store)
- [ ] Phone field (pre-filled from auth store)
- [ ] Department field (pre-filled from auth store)
- [ ] All fields editable
- [ ] "Save Changes" button works
- [ ] Success toast after save

### Notifications Tab:
- [ ] Email notifications toggle
- [ ] Push notifications toggle
- [ ] SMS notifications toggle
- [ ] Weekly digest toggle
- [ ] Toggles save state

### Security Tab:
- [ ] Current password field
- [ ] New password field
- [ ] Confirm password field
- [ ] "Change Password" button works
- [ ] Password validation (min length, etc.)

### Positions Tab (if admin):
- [ ] Positions list displays
- [ ] Add new position button works
- [ ] Edit/Delete position buttons work

**Console Checks:**
- [ ] User data loads from auth store
- [ ] No hardcoded "John Doe" data
- [ ] API calls for updates work
- [ ] No errors in console

---

## 📚 12. LEARNING PAGE

**URL:** `/learning`

### Tabs:
- [ ] "Courses" tab active by default
- [ ] "Enrollments" tab clickable

### Courses Tab:
- [ ] Courses list/cards display
- [ ] Each course shows:
  - [ ] Course title
  - [ ] Instructor name
  - [ ] Category
  - [ ] Number of enrollees
  - [ ] Star rating
  - [ ] Status badge (active, upcoming)

### Enrollments Tab:
- [ ] Employee enrollments list displays
- [ ] Each enrollment shows:
  - [ ] Employee name
  - [ ] Course name
  - [ ] Enrolled date
  - [ ] Progress percentage
  - [ ] Status (in-progress, completed)

### Actions:
- [ ] "Add Course" button works
- [ ] Course cards clickable for details
- [ ] Enroll button (if present) works

**Console Checks:**
- [ ] Course data loads (currently hardcoded)
- [ ] No errors in console

---

## 🧭 13. NAVIGATION & LAYOUT

### Sidebar:
- [ ] All menu items visible
- [ ] Dashboard link works
- [ ] Employees link works
- [ ] Analytics link works
- [ ] Recruitment link works
- [ ] Payroll link works
- [ ] Compliance link works
- [ ] Performance link works
- [ ] Attendance link works
- [ ] Leave Management link works
- [ ] Learning link works
- [ ] Settings link works
- [ ] Active page highlighted
- [ ] Sidebar collapsible (if implemented)

### Header:
- [ ] Company logo/name displays
- [ ] Search bar (if implemented) works
- [ ] Notifications icon displays
- [ ] User avatar/menu displays
- [ ] User dropdown shows:
  - [ ] User name
  - [ ] Profile link
  - [ ] Settings link
  - [ ] Logout button
- [ ] Logout works and clears token

### Responsive Design:
- [ ] Page works on desktop (1920x1080)
- [ ] Page works on laptop (1366x768)
- [ ] Page works on tablet (768x1024)
- [ ] Sidebar adapts on smaller screens
- [ ] Tables scroll horizontally on small screens

---

## 🔍 14. GENERAL FUNCTIONALITY

### Toast Notifications:
- [ ] Success toasts appear (green)
- [ ] Error toasts appear (red)
- [ ] Loading toasts appear
- [ ] Toasts auto-dismiss after ~3 seconds
- [ ] Multiple toasts stack correctly

### Loading States:
- [ ] Spinner/loader shows while fetching data
- [ ] "Loading..." text appears
- [ ] Page doesn't break during loading

### Error States:
- [ ] Error messages display when API fails
- [ ] User-friendly error text
- [ ] Retry options (if implemented)
- [ ] Doesn't crash on error

### Data Refresh:
- [ ] Page refresh preserves auth state
- [ ] Data refetches on page load
- [ ] Changes persist after page refresh
- [ ] No data loss

---

## 🔒 15. AUTHENTICATION & AUTHORIZATION

### Protected Routes:
- [ ] Accessing pages without login redirects to /login
- [ ] Token expiry redirects to login
- [ ] Invalid token shows error

### Role-Based Access (if implemented):
- [ ] Admin sees all features
- [ ] HR Manager sees relevant features
- [ ] Employee sees limited features
- [ ] Proper permission checks

---

## 🐛 16. CONSOLE ERRORS CHECK

**Open Browser Console (F12) and check for:**

- [ ] No red errors in Console tab
- [ ] No 404 errors in Network tab
- [ ] No CORS errors
- [ ] No authentication errors (401/403)
- [ ] No database connection errors
- [ ] All API calls return 200 status
- [ ] No React warnings (keys, deprecations, etc.)
- [ ] No memory leaks warnings

### Expected Console Logs:
```
✅ Dashboard: Employees loaded: X
✅ Analytics: Employees loaded: X
✅ Employees fetched: [...]
✅ Recruitment data loaded: X jobs, X applicants
✅ Payslips loaded: X
✅ Compliance policies loaded: X
✅ Performance data loaded: X
✅ Attendance data loaded: X
✅ Leave balance loaded: {...}
```

---

## 📊 17. DATABASE PERSISTENCE TEST

### Add Employee Test:
1. [ ] Add new employee with name "Test User 123"
2. [ ] Note the employee ID
3. [ ] Refresh the page (Ctrl+R or Cmd+R)
4. [ ] Check employee still exists in table
5. [ ] Open MongoDB Compass/CLI and verify employee in database

### Update Employee Test:
1. [ ] Edit an existing employee
2. [ ] Change their department to "Testing"
3. [ ] Save changes
4. [ ] Refresh the page
5. [ ] Verify department change persisted
6. [ ] Check in MongoDB that change is saved

### Delete Employee Test:
1. [ ] Delete "Test User 123"
2. [ ] Refresh the page
3. [ ] Verify employee is gone
4. [ ] Check MongoDB that record is deleted

---

## 📝 18. CROSS-PAGE CONSISTENCY TEST

### Employee Count Test:
1. [ ] Note employee count on Dashboard
2. [ ] Navigate to Analytics page
3. [ ] Verify employee count matches Dashboard
4. [ ] Navigate to Employees page
5. [ ] Verify count in table header matches
6. [ ] All three pages show SAME count

### Department Count Test:
1. [ ] Check departments on Employees page
2. [ ] Check departments on Analytics page
3. [ ] Verify same departments appear
4. [ ] Verify same employee distribution per department

---

## ✅ FINAL CHECKLIST

- [ ] All pages load without errors
- [ ] All forms submit successfully
- [ ] All buttons perform expected actions
- [ ] All data displays correctly
- [ ] All filters work
- [ ] All searches work
- [ ] All modals open/close properly
- [ ] All API calls succeed
- [ ] All data persists to database
- [ ] All pages show consistent data
- [ ] Console has no errors
- [ ] Network tab shows successful API calls
- [ ] Application is production-ready

---

## 🚀 NEXT STEPS AFTER TESTING

1. [ ] Document any bugs found
2. [ ] Fix critical issues
3. [ ] Commit all changes
4. [ ] Push to GitHub
5. [ ] Deploy to production (if ready)

---

**Testing Started:** _________  
**Testing Completed:** _________  
**Total Issues Found:** _________  
**Critical Issues:** _________  
**Status:** [ ] PASS / [ ] FAIL

---

*Happy Testing! 🎉*
