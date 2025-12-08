# PVARA HRMS Backend API

Backend API for the PVARA HRMS (Human Resource Management System) built with Node.js, Express, and MongoDB.

## Architecture Overview

### Database Models

1. **Company** - Organization/Company Information
   - Contains company details and subscription info
   - Links to admin user

2. **User** - Employees
   - Employee data including position, reporting line, and role
   - Roles: `admin`, `hr`, `manager`, `employee`
   - Status: `active`, `inactive`, `on_leave`, `suspended`

3. **Position** - Job Positions/Titles
   - Position templates with hierarchy
   - Reports to another position (creating reporting lines)
   - Salary ranges and department info
   - Can have multiple employees filling same position

4. **ApprovalFlow** - Workflow Management
   - Multi-level approval system
   - Supports different request types (leave, expense, equipment, promotion, etc.)
   - Tracks approvers and their decisions

5. **Leave** - Leave Requests
   - Employee leave applications
   - Linked to approval flow for multi-level approvals
   - Different leave types (sick, annual, maternity, etc.)

### API Endpoints

#### Authentication (`/api/auth`)
- `POST /register` - Register new company and admin
- `POST /login` - Login with email/password
- `GET /me` - Get current user details

#### Employees (`/api/employees`)
- `GET /` - List all employees
- `GET /:id` - Get employee details
- `GET /:id/reports` - Get direct reports for a manager
- `POST /` - Create new employee (HR/Admin only)
- `PUT /:id` - Update employee
- `DELETE /:id` - Deactivate employee (soft delete)

#### Positions (`/api/positions`)
- `GET /` - List all positions
- `GET /hierarchy` - Get organizational hierarchy
- `GET /:id` - Get position details
- `POST /` - Create position (HR/Admin only)
- `PUT /:id` - Update position
- `DELETE /:id` - Delete position (Admin only)

#### Approval Flows (`/api/approvals`)
- `POST /` - Create approval flow
- `GET /` - List all approval flows
- `GET /pending/me` - Get pending approvals for current user
- `PUT /:id/approve` - Approve/reject request

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB 4.4+ (local or Atlas)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

3. **Start server**
   ```bash
   npm run dev    # Development with hot reload
   npm start      # Production
   ```

Server runs on `http://localhost:5000`

## Role-Based Access Control

### Roles
1. **Admin** - Full system access, can manage all users and settings
2. **HR** - Can create positions, add employees, manage workflows
3. **Manager** - Can view direct reports, approve requests
4. **Employee** - Can submit requests, view own data

### Permission Matrix
```
                    Admin    HR    Manager    Employee
View Employees       ✓       ✓        ✓(own)     ✗
Create Employees     ✓       ✓         ✗         ✗
Create Positions     ✓       ✓         ✗         ✗
Approve Requests     ✓       ✓         ✓(own)     ✗
View Hierarchy       ✓       ✓         ✓          ✓
```

## Organizational Hierarchy

### How it Works

1. **Positions** define the organizational structure
   - CEO → CTO → Engineering Manager → Engineers
   - CEO → COO → HR Manager
   - CEO → CFO

2. **Employees** are assigned to positions
   - Automatically inherit reporting line from position
   - Multiple people can hold same position

3. **Approval Flows** use reporting lines
   - Requests route through approval chain
   - Supports multi-level approvals
   - Each approver can comment and accept/reject

### Example Workflow

```javascript
// 1. Create positions with hierarchy
POST /api/positions
{
  "title": "Senior Developer",
  "department": "Engineering",
  "reportsTo": "606f1a12c1d2e3f4g5h6i7j8", // Engineering Manager position ID
  "level": "senior",
  "salary_range_min": 80000,
  "salary_range_max": 120000
}

// 2. Add employees to positions
POST /api/employees
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "position": "606f1a12c1d2e3f4g5h6i7j8", // Position ID
  "role": "employee"
}

// 3. Create approval flow for leave request
POST /api/approvals
{
  "requestType": "leave",
  "requestId": "leave_request_id",
  "requester": "employee_id",
  "approvers": ["manager_id", "hr_id"] // Multi-level approval
}

// 4. Approve at each level
PUT /api/approvals/606f1a12c1d2e3f4g5h6i7j8/approve
{
  "status": "approved",
  "comment": "Approved"
}
```

## Database Schema

### User Schema
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  department: String,
  position: ObjectId (ref: Position),
  reportsTo: ObjectId (ref: User),
  role: String (enum: admin, hr, manager, employee),
  status: String (enum: active, inactive, on_leave, suspended),
  joiningDate: Date,
  salary: Number,
  avatar: String (URL),
  company: ObjectId (ref: Company),
  createdAt: Date,
  updatedAt: Date
}
```

### Position Schema
```javascript
{
  title: String,
  department: String,
  description: String,
  reportsTo: ObjectId (ref: Position),
  level: String (enum: executive, senior, mid, junior),
  salary_range_min: Number,
  salary_range_max: Number,
  status: String (enum: active, inactive),
  company: ObjectId (ref: Company),
  createdAt: Date,
  updatedAt: Date
}
```

### ApprovalFlow Schema
```javascript
{
  requestType: String,
  requestId: ObjectId,
  requester: ObjectId (ref: User),
  approvers: [{
    approver: ObjectId (ref: User),
    level: Number,
    status: String (enum: pending, approved, rejected),
    comment: String,
    approvedAt: Date
  }],
  currentLevel: Number,
  status: String (enum: pending, approved, rejected),
  company: ObjectId (ref: Company),
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration

The frontend connects to this API using axios. Set the API base URL in your frontend environment:

```javascript
// src/services/api.js
const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Testing the API

### Register Company
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "PVARA Inc",
    "companyEmail": "company@pvara.com",
    "adminFirstName": "John",
    "adminLastName": "Doe",
    "adminEmail": "admin@pvara.com",
    "password": "securepassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pvara.com",
    "password": "securepassword123"
  }'
```

### Get Employees
```bash
curl -X GET http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Production Deployment

1. **Set secure JWT_SECRET**
   ```bash
   export JWT_SECRET=your-very-secure-random-string-here
   ```

2. **Use MongoDB Atlas or self-hosted MongoDB**
   ```bash
   export MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/pvara-hrms
   ```

3. **Set NODE_ENV**
   ```bash
   export NODE_ENV=production
   ```

4. **Deploy to Heroku, AWS, or your preferred platform**

## Error Handling

All endpoints return consistent error responses:

```javascript
{
  "message": "Error description",
  "code": "ERROR_CODE" // optional
}
```

## Security Considerations

1. **Passwords** - Hashed with bcrypt (10 salt rounds)
2. **JWT** - 7-day expiration
3. **CORS** - Configured for frontend origin
4. **Authentication** - All endpoints require valid JWT token
5. **Authorization** - Role-based access control on protected endpoints

## Future Enhancements

- [ ] Email notifications
- [ ] Real-time WebSocket updates
- [ ] Analytics and reporting
- [ ] Employee self-service portal
- [ ] Performance review workflows
- [ ] Time tracking integration
- [ ] Payroll processing
- [ ] Benefits management
