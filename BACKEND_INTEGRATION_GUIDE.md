# PVARA HRMS - Backend & Frontend Integration Guide

## System Overview

The PVARA HRMS is a complete Human Resource Management System with:
- **Frontend**: React 19 + Vite + Tailwind CSS (Premium Glassmorphism Design)
- **Backend**: Node.js + Express + MongoDB
- **Architecture**: Microservices-ready REST API with JWT authentication

## Current Status

### ✅ Completed Components

#### Frontend (7 HR Pages with Premium Glass Design)
1. ✅ **Employee Directory** - Full CRUD, filtering, search
2. ✅ **Leave Management** - Leave requests, balance tracking
3. ✅ **Attendance** - Calendar view, daily stats
4. ✅ **Payroll** - Salary management, processing status
5. ✅ **Performance** - Appraisals, goals, feedback
6. ✅ **Recruitment** - Job postings, applicant tracking
7. ✅ **Learning** - Course management, enrollment tracking
8. ✅ **Compliance** - Policies, audits, checklists
9. ✅ **Analytics** - Metrics, trends, department performance
10. ✅ **Settings** - Account, notifications, security, **Organization Hierarchy**

#### Backend API (Express.js + MongoDB)
1. ✅ **Auth Routes** - Registration, login, authentication
2. ✅ **Employee Routes** - CRUD, direct reports, role management
3. ✅ **Position Routes** - Hierarchy management, reporting lines
4. ✅ **Approval Routes** - Multi-level workflow approvals
5. ✅ **Database Models** - User, Position, Company, ApprovalFlow, Leave
6. ✅ **Authentication Middleware** - JWT-based auth + role-based access control
7. ✅ **MongoDB Integration** - Running and connected

### Organization Structure Features

#### Positions Management
- Create position templates with hierarchy
- Define reporting lines (position → parent position)
- Set salary ranges and job levels
- Track filled vs open positions

#### Employee Hierarchy
- Assign employees to positions
- Automatic reporting line inheritance
- View direct reports for managers
- Department and team organization

#### Approval Workflows
- Multi-level approval chains
- Route requests through reporting structure
- Support multiple request types (leave, expense, promotion, etc.)
- Comment tracking on approvals

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PVARA HRMS FRONTEND                     │
│                     (React + Vite + Tailwind)               │
├─────────────────────────────────────────────────────────────┤
│ • 10 Premium Glass-styled HR Pages                          │
│ • Zustand State Management                                  │
│ • React Router Navigation                                   │
│ • Axios HTTP Client                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    PVARA HRMS BACKEND                        │
│               (Express.js + Node.js + MongoDB)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  API Routes     │  │ Middleware      │                  │
│  ├─────────────────┤  ├─────────────────┤                  │
│  │ /auth           │  │ JWT Auth        │                  │
│  │ /employees      │  │ Role-based AC   │                  │
│  │ /positions      │  │ CORS            │                  │
│  │ /approvals      │  │ Error Handler   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌────────────────────────────────────────┐                │
│  │        Database Models (MongoDB)        │                │
│  ├────────────────────────────────────────┤                │
│  │ • User (Employees)                     │                │
│  │ • Position (Job Titles)                │                │
│  │ • Company (Organizations)              │                │
│  │ • ApprovalFlow (Workflows)             │                │
│  │ • Leave (Time Off)                     │                │
│  └────────────────────────────────────────┘                │
│                                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │   MongoDB Database     │
        │                        │
        │ ✓ Collections:         │
        │   - users              │
        │   - positions          │
        │   - companies          │
        │   - approvalflows      │
        │   - leaves             │
        └────────────────────────┘
```

## Role-Based Access Control Matrix

| Action | Admin | HR | Manager | Employee |
|--------|-------|----|---------| ---------|
| View All Employees | ✓ | ✓ | ✓(reports only) | ✗ |
| Create Employee | ✓ | ✓ | ✗ | ✗ |
| Edit Employee | ✓ | ✓ | ✗(self only) | ✗ |
| Create Position | ✓ | ✓ | ✗ | ✗ |
| Edit Position | ✓ | ✓ | ✗ | ✗ |
| View Hierarchy | ✓ | ✓ | ✓ | ✓ |
| Approve Requests | ✓ | ✓ | ✓(self) | ✗ |
| Submit Leave | ✓ | ✓ | ✓ | ✓ |
| View Analytics | ✓ | ✓ | ✓(dept) | ✓(self) |
| Manage Settings | ✓ | ✗ | ✗ | ✗ |

## Data Flow Example: Leave Request with Approvals

```
1. EMPLOYEE submits leave request
   ↓
   POST /api/approvals
   {
     "requestType": "leave",
     "requester": "emp_id",
     "approvers": ["manager_id", "hr_id"]
   }
   ↓
2. MANAGER gets notification
   MANAGER approves
   PUT /api/approvals/{id}/approve { status: "approved" }
   ↓
3. System routes to HR for level 2 approval
   ↓
4. HR approves
   PUT /api/approvals/{id}/approve { status: "approved" }
   ↓
5. Leave request automatically approved
   Status updated in Leave collection
   ↓
6. EMPLOYEE notified (future: email + in-app)
```

## Running the Full System

### Terminal 1: Frontend Development Server
```bash
cd /Users/ubl/pvara-hrms
npm run dev
# Runs on http://localhost:5173
```

### Terminal 2: Backend API Server
```bash
cd /Users/ubl/pvara-hrms/backend
npm run dev
# Runs on http://localhost:5000
```

### Terminal 3: MongoDB (if not already running)
```bash
mongod --dbpath /path/to/db
```

## API Quick Reference

### Authentication
```bash
# Register
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "companyName": "PVARA Inc",
  "companyEmail": "company@pvara.com",
  "adminFirstName": "John",
  "adminLastName": "Doe",
  "adminEmail": "admin@pvara.com",
  "password": "SecurePassword123"
}

# Login
POST http://localhost:5000/api/auth/login
{
  "email": "admin@pvara.com",
  "password": "SecurePassword123"
}

# Response includes token
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Positions
```bash
# Get all positions with hierarchy
GET http://localhost:5000/api/positions/hierarchy
Authorization: Bearer {token}

# Create position
POST http://localhost:5000/api/positions
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Senior Developer",
  "department": "Engineering",
  "level": "senior",
  "reportsTo": "position_id_here"
}
```

### Employees
```bash
# List all employees
GET http://localhost:5000/api/employees
Authorization: Bearer {token}

# Create employee
POST http://localhost:5000/api/employees
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "position": "position_id",
  "role": "employee",
  "department": "Engineering",
  "salary": 95000
}

# Get direct reports for manager
GET http://localhost:5000/api/employees/{managerId}/reports
Authorization: Bearer {token}
```

### Approvals
```bash
# Get pending approvals for current user
GET http://localhost:5000/api/approvals/pending/me
Authorization: Bearer {token}

# Approve/reject request
PUT http://localhost:5000/api/approvals/{approvalId}/approve
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "comment": "Looks good to me"
}
```

## Environment Configuration

### Backend .env
```
MONGODB_URI=mongodb://localhost:27017/pvara-hrms
JWT_SECRET=your-secret-key-change-in-production
PORT=5000
NODE_ENV=development
```

### Frontend axios config
```javascript
// src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

## Frontend Integration Points

The frontend should:

1. **Store JWT token** after login/registration
```javascript
// In auth store (Zustand)
const authStore = create((set) => ({
  token: localStorage.getItem('authToken'),
  setToken: (token) => {
    localStorage.setItem('authToken', token);
    set({ token });
  }
}));
```

2. **Add token to all API requests**
```javascript
// In axios interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

3. **Fetch and display hierarchy in Settings**
```javascript
// In Settings.jsx
useEffect(() => {
  fetchHierarchy();
}, []);

const fetchHierarchy = async () => {
  try {
    const response = await api.get('/positions/hierarchy');
    setPositions(response.data);
  } catch (error) {
    console.error('Failed to fetch hierarchy', error);
  }
};
```

## Testing Workflow

1. **Register Company**
   - Frontend: Sign up page → creates Company + Admin user
   - Backend: POST /api/auth/register → returns JWT token

2. **Create Organization Structure**
   - Navigate to Settings → Organization tab
   - Add positions: CEO → CTO → Engineering Manager
   - Add positions: CEO → COO → HR Manager

3. **Add Employees**
   - Navigate to Employees page
   - Add Employee: assign to position
   - Employee inherits reporting line from position

4. **Test Approval Flow**
   - As Employee: Submit leave request
   - Backend creates ApprovalFlow with Manager as approver
   - As Manager: View pending approvals
   - Approve/reject request
   - System routes to next approver (if multi-level)

5. **View Analytics**
   - Analytics page shows org-wide metrics
   - Department breakdown
   - Engagement scores
   - Attrition rates

## Common Issues & Solutions

### Issue: CORS errors
**Solution**: Ensure backend has CORS enabled for frontend origin
```javascript
// backend/server.js
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

### Issue: JWT token expired
**Solution**: Implement token refresh
```javascript
// backend/routes/auth.js
// Add refresh token endpoint
POST /api/auth/refresh-token
```

### Issue: MongoDB connection refused
**Solution**: Ensure MongoDB is running
```bash
# Check if MongoDB is running
lsof -i :27017
# Start MongoDB
mongod --dbpath /path/to/db
```

## Next Steps

1. **Frontend Integration**
   - Connect login/registration pages to backend
   - Implement token storage and axios interceptors
   - Fetch real data for all pages

2. **Complete CRUD Operations**
   - Implement create/update/delete for positions and employees
   - Add form validation on frontend
   - Show success/error notifications

3. **Approval Workflow UI**
   - Create approval pending view
   - Implement approve/reject buttons
   - Show approval chain history

4. **Email Notifications** (Future)
   - Send emails on leave requests
   - Notify approvers
   - Send approval confirmations

5. **Analytics & Reports** (Future)
   - Connect Charts to real data
   - Generate PDF reports
   - Export functionality

6. **Payroll Processing** (Future)
   - Salary calculations
   - Tax deductions
   - Pay stub generation

## Documentation Files

- `/backend/README.md` - Complete API documentation
- `/backend/models/` - Database schema definitions
- `/backend/routes/` - API endpoint implementations
- `/backend/middleware/auth.js` - Authentication logic
- `/src/pages/Settings.jsx` - Organization hierarchy UI

## Support & Contribution

For issues or enhancements:
1. Check existing documentation
2. Review API responses for error details
3. Check console/server logs for debugging
4. Ensure token is valid and not expired
5. Verify MongoDB is running and connected
