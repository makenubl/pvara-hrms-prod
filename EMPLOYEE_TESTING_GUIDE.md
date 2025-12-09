# Employee Management Testing Guide - 100% Complete Test Suite

## Prerequisites
- MongoDB running on `localhost:27017`
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:5174`
- User logged in with HR or Admin role

## Quick Start - What to Do Right Now

### Step 1: Verify Backend is Running
```bash
# Check backend health
curl http://localhost:5000/api/health
# Should respond: {"message":"Server is running"}
```

### Step 2: Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for any errors (should be clean)

### Step 3: Navigate to Employee Directory
1. Log in if not already
2. Click "Employees" in sidebar or navigate to `/employees`

---

## TEST SUITE 1: Employee List Display

### Test 1.1: Page Loads Correctly
- **Action**: Navigate to `/employees` page
- **Expected**: 
  - Page title shows "Employee Directory"
  - Console shows "✅ Employees fetched: [...]" with data
  - Employee count displays (e.g., "Total Employees: 5")
  - Table loads with columns: ID, Name, Email, Department, Status, Actions
- **Debug**: If not working, check console for API errors

### Test 1.2: Employee Data Populates
- **Action**: Look at the employee table
- **Expected**: 
  - At least one employee shows in the list
  - Employee data includes: ID, Name, Email, Department, Status
  - Each row has View, Edit, and Delete action buttons
- **Debug**: If 0 employees shown, check:
  - Browser console for API response
  - Backend: `db.users.find({})` should show employees
  - Check user.company matches employee.company in DB

### Test 1.3: Stats Cards Display Correctly
- **Action**: Check the 4 stat cards below search
- **Expected**: 
  - "Total Employees" shows correct count
  - "Active" shows employees with status='active'
  - "On Leave" shows employees with status='on_leave'
  - "Departments" shows unique department count
- **Debug**: If numbers are wrong, check employee status values in DB

---

## TEST SUITE 2: Add Employee Feature

### Test 2.1: Open Add Modal
- **Action**: Click "Add Employee" button (top right)
- **Expected**:
  - Modal opens with title "Add New Employee"
  - Form has these fields: First Name, Last Name, Email, Password, Phone, Department, Position, Role, Joining Date, Salary
  - All required fields marked with red asterisk (*)
  - Console shows no errors
- **Debug**: If modal doesn't open, check onClick handler in Employees.jsx

### Test 2.2: Position Dropdown Loads
- **Action**: Click "Position" dropdown in form
- **Expected**:
  - Console shows "✅ Positions fetched: [...]" with position list
  - Dropdown displays list of positions (title and department)
  - At least one position available to select
- **Debug**: If dropdown empty:
  - Check `/api/positions` returns data
  - Check user.company matches position.company
  - Check positions exist in DB: `db.positions.find({})`

### Test 2.3: Form Validation Works
- **Action**: Click "Submit" without filling form
- **Expected**:
  - Error messages appear under each required field
  - Toast shows "Please fix the errors below"
  - Modal stays open
- **Debug**: Check validateForm() function in AddEmployeeModal.jsx

### Test 2.4: Add Employee Successfully
- **Action**: Fill form with valid data and submit
  - First Name: "John"
  - Last Name: "Smith"
  - Email: "john.smith@test.com" (must be unique)
  - Password: "password123"
  - Phone: "+1234567890"
  - Department: "Engineering"
  - Position: (select from dropdown)
  - Role: "employee"
  - Joining Date: (today or past date)
  - Salary: "50000"
- **Expected**:
  - Console shows "📤 Submitting employee data: {...}"
  - Console shows "✅ Employee created successfully: {...}"
  - Toast shows "Employee added successfully!"
  - Modal closes
  - New employee appears in table
  - Total employee count increases by 1
- **Debug**: If fails:
  - Check console for API error details
  - Verify email is unique (not duplicate)
  - Check backend `/api/employees` POST logs
  - Check MongoDB: `db.users.find({email: "john.smith@test.com"})`

### Test 2.5: Duplicate Email Prevention
- **Action**: Try to add employee with same email as existing employee
- **Expected**:
  - Toast shows error: "Email already exists" or similar
  - Employee NOT added to database
  - Modal stays open
- **Debug**: Check backend validation in POST /employees route

---

## TEST SUITE 3: Edit Employee Feature

### Test 3.1: Open Edit Modal
- **Action**: Click Edit (pencil icon) on any employee in table
- **Expected**:
  - Console shows "👁️ Employee selected for edit: {...}"
  - Edit modal opens with title "Edit Employee"
  - Form is pre-populated with employee data
  - Console shows "✅ Positions fetched: [...]"
- **Debug**: If modal doesn't open:
  - Check handleEditClick function
  - Check selectedEmployee state updates
  - Check EditEmployeeModal receives props

### Test 3.2: Form Pre-Population
- **Action**: Look at form fields after Edit modal opens
- **Expected**:
  - First Name: filled with employee's first name
  - Last Name: filled with employee's last name
  - Email: filled with employee's email
  - Phone: filled with employee's phone
  - Department: matches employee's department
  - Position: shows employee's position title (selected)
  - Role: matches employee's role
  - Joining Date: shows employee's joining date in YYYY-MM-DD format
  - Salary: shows employee's salary
- **Debug**: If fields empty:
  - Check useEffect in EditEmployeeModal that populates form
  - Check employee._id is correct
  - Check console for position object structure (might be {_id, title} or just string)

### Test 3.3: Edit Employee Data
- **Action**: Change one field (e.g., salary from 50000 to 60000) and submit
- **Expected**:
  - Console shows "📤 Submitting edit data for employee: [ID] {...}"
  - Console shows "✅ Employee updated successfully: {...}"
  - Toast shows "Employee updated successfully!"
  - Modal closes
  - Table updates to show new value (may need to refresh)
  - Employee count stays same
- **Debug**: If fails:
  - Check backend PUT /employees/:id logs
  - Check data being sent matches backend expectations
  - Check user has 'hr' or 'admin' role (required for edit)

### Test 3.4: Position Change in Edit
- **Action**: Change position field to different position and submit
- **Expected**:
  - Position updates successfully
  - Employee record shows new position in table/details
- **Debug**: If position doesn't update:
  - Check position field value is ObjectId, not string
  - Check position dropdown value handling

---

## TEST SUITE 4: Delete Employee Feature

### Test 4.1: Delete Button Click
- **Action**: Click Delete (trash icon) on any employee
- **Expected**:
  - Confirmation dialog appears: "Are you sure you want to deactivate this employee?"
  - Two buttons: Cancel and OK
- **Debug**: If confirmation doesn't appear, check handleDeleteClick function

### Test 4.2: Cancel Deletion
- **Action**: Click Cancel in confirmation dialog
- **Expected**:
  - Dialog closes
  - Employee remains in list
  - No API call made
- **Debug**: Check window.confirm handling

### Test 4.3: Confirm Deletion
- **Action**: Click OK in confirmation dialog
- **Expected**:
  - Console shows API call made to DELETE /employees/:id
  - Toast shows "Employee deactivated successfully!"
  - Employee disappears from "Active" count (status changes to 'inactive')
  - Employee may still show in list but with status="inactive"
  - Total employee count may decrease or stay same depending on filtering
- **Debug**: If fails:
  - Check backend DELETE route
  - Check user has 'hr' or 'admin' role
  - Check MongoDB: employee status should be 'inactive'

### Test 4.4: Deactivated Employee Status
- **Action**: Look at deactivated employee in list (if visible)
- **Expected**:
  - Status badge shows "inactive" in red
  - Employee excluded from "Active" count
- **Debug**: Check status filter logic

---

## TEST SUITE 5: View Employee Details

### Test 5.1: Click View Button
- **Action**: Click View (eye icon) on any employee
- **Expected**:
  - Modal opens showing "Employee Details"
  - Details include: Avatar, Name, Role, Status badge
  - Information grid shows: ID, Email, Phone, Department, Joining Date, Salary
  - "Edit" button at bottom
- **Debug**: If modal doesn't open, check onClick handler

### Test 5.2: Edit from Details Modal
- **Action**: Click "Edit" button in details modal
- **Expected**:
  - Details modal closes
  - Edit modal opens immediately
  - Form pre-populated with employee data
- **Debug**: Check modal transition logic

---

## TEST SUITE 6: Search & Filter

### Test 6.1: Search by Name
- **Action**: Type employee name in search box (e.g., "John")
- **Expected**:
  - Table filters to show only employees with "John" in first or last name
  - Employee count updates to filtered count
  - Employee list updates in real-time
- **Debug**: Check search filter logic in filteredEmployees

### Test 6.2: Search by Email
- **Action**: Type email in search box (e.g., "john@test.com")
- **Expected**:
  - Table filters to show only employee with matching email
- **Debug**: Check email filter in search

### Test 6.3: Filter by Department
- **Action**: Select department from "All Departments" dropdown (e.g., "Engineering")
- **Expected**:
  - Table shows only employees in selected department
  - Count updates
  - Works with search (if search term entered, both apply)
- **Debug**: Check filterDept logic

### Test 6.4: Filter by Status
- **Action**: Select status from "All Status" dropdown (e.g., "Active")
- **Expected**:
  - Table shows only employees with selected status
  - Works with department and search filters
- **Debug**: Check filterStatus logic

### Test 6.5: Clear Filters
- **Action**: Clear search, select "All Departments" and "All Status"
- **Expected**:
  - Table shows all employees again
  - Counts match totals

---

## TEST SUITE 7: Data Integrity

### Test 7.1: Employee Data Persistence
- **Action**: Add employee → Close browser → Reopen browser → Go to employees
- **Expected**:
  - Employee still in list
  - Data not lost
- **Debug**: Check MongoDB persistence

### Test 7.2: Multiple Edit Cycles
- **Action**: Edit same employee multiple times with different values
- **Expected**:
  - Each edit updates correctly
  - No data corruption
  - Final values match last edit
- **Debug**: Check update logic

### Test 7.3: Unique Email Enforcement
- **Action**: Try to edit employee's email to another employee's email
- **Expected**:
  - Error shown (might be on submit or backend validation)
  - Email not changed
- **Debug**: Check email unique constraint in backend

---

## TEST SUITE 8: Error Handling

### Test 8.1: Network Error Handling
- **Action**: 
  1. Open DevTools Network tab
  2. Check "Offline" in DevTools
  3. Try to fetch employees or add new one
- **Expected**:
  - Toast shows error message
  - Console shows error logs
  - App doesn't crash
- **Debug**: Check error handling in service calls

### Test 8.2: Invalid Data Handling
- **Action**: Try edge cases:
  - Very long names (100+ characters)
  - Special characters in fields
  - Negative salary
- **Expected**:
  - Either accepted and stored, or validation error shown
  - No crashes
- **Debug**: Check field validation limits

### Test 8.3: Authorization Error
- **Action**: 
  1. Log in as employee (non-HR/Admin role)
  2. Try to add/edit/delete employee
- **Expected**:
  - Permission denied error shown
  - Action not allowed
- **Debug**: Check backend authorize middleware

---

## TEST SUITE 9: Performance

### Test 9.1: Load Time
- **Action**: Navigate to employees page and time page load
- **Expected**:
  - Page loads in under 2 seconds
  - No noticeable lag
- **Debug**: Check API response time, consider pagination if 100+ employees

### Test 9.2: Large Data Sets
- **Action**: Manually add 20+ employees to database
- **Expected**:
  - Page still loads and filters work
  - No crashes or significant slowdown
- **Debug**: Consider adding pagination if not present

---

## Console Output Checklist

When everything is working, you should see in console:
```
✅ Employees fetched: Array(5)
✅ Positions fetched: Array(3)
👁️ Employee selected for edit: Object {_id, firstName, ...}
📤 Submitting employee data: Object {...}
✅ Employee created successfully: Object {...}
📤 Submitting edit data for employee: [ID] Object {...}
✅ Employee updated successfully: Object {...}
```

## API Endpoints Summary

All endpoints require `Authorization: Bearer [token]` header (added automatically by apiClient)

```
GET    /api/employees              - Get all employees for company
GET    /api/employees/:id          - Get single employee details
POST   /api/employees              - Create new employee (HR/Admin only)
PUT    /api/employees/:id          - Update employee (HR/Admin only)
DELETE /api/employees/:id          - Deactivate employee (HR/Admin only)
GET    /api/employees/:id/reports  - Get employee's direct reports
GET    /api/positions              - Get all positions for company
POST   /api/positions              - Create position (HR/Admin only)
PUT    /api/positions/:id          - Update position (HR/Admin only)
DELETE /api/positions/:id          - Delete position (HR/Admin only)
```

## Database Collections to Check

```bash
# View all employees in current company
db.users.find({company: ObjectId("...")})

# View specific employee
db.users.findOne({email: "john.smith@test.com"})

# View all positions
db.positions.find({company: ObjectId("...")})

# Count employees by status
db.users.find({company: ObjectId("..."), status: "active"}).count()
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 0 employees shown | API returns empty array | Check user.company matches employees |
| Edit modal doesn't open | selectedEmployee state not set | Check handleEditClick and state updates |
| Position dropdown empty | positionService.getAll() fails | Check /api/positions responds with data |
| Add/Edit fails silently | User doesn't have HR/Admin role | Check user role in localStorage |
| Delete button greyed out | Authorization issue | Verify user is HR or Admin |
| Form validation errors but looks correct | Email already exists | Use unique email addresses |
| Data not persisting after refresh | Check MongoDB connection | Verify MongoDB is running |

## Next Steps After All Tests Pass

1. Test with multiple users simultaneously
2. Test across different browsers
3. Test mobile responsiveness
4. Load test with large dataset (1000+ employees)
5. Check browser console for performance warnings
6. Verify no sensitive data in console logs
7. Test keyboard navigation and accessibility

---

**Last Updated**: Today  
**Status**: Ready for comprehensive testing
