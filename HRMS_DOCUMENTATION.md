# PVARA HRMS - Frontend Documentation

## 🎯 Overview

**PVARA HRMS** (Human Resource Management System) is a comprehensive, enterprise-grade HR management solution built with modern frontend technologies. The system provides complete HR operations management from employee lifecycle to analytics and compliance.

**Version:** 1.0.0  
**Status:** Production Ready Frontend - Ready for Backend Integration  
**Built With:** React 19, Vite, Tailwind CSS, Zustand, React Router, Recharts

## 🏗️ Project Structure

```
pvara-hrms/
├── src/
│   ├── pages/              # Main HRMS modules
│   │   ├── Login.jsx       # Authentication
│   │   ├── Dashboard.jsx   # Main dashboard
│   │   ├── Employees.jsx   # Employee management
│   │   ├── Attendance.jsx  # Attendance tracking
│   │   ├── LeaveManagement.jsx  # Leave management
│   │   ├── Payroll.jsx     # Salary & compensation
│   │   ├── Performance.jsx # Performance management
│   │   ├── Recruitment.jsx # Job postings & applicants
│   │   ├── Learning.jsx    # Training & development
│   │   ├── Compliance.jsx  # Policies & documentation
│   │   ├── Analytics.jsx   # HR analytics & reports
│   │   └── Settings.jsx    # System settings
│   ├── layouts/            # Layout components
│   │   ├── MainLayout.jsx
│   │   ├── Sidebar.jsx
│   │   └── Header.jsx
│   ├── components/         # Reusable UI components
│   │   └── UI.jsx         # Card, Button, Badge, Modal, etc.
│   ├── store/             # Global state management (Zustand)
│   │   ├── authStore.js
│   │   └── appStore.js
│   ├── utils/             # Utility functions
│   │   ├── constants.js   # All constants & enums
│   │   ├── dateUtils.js   # Date/time utilities
│   │   ├── formatters.js  # String formatting
│   │   └── validation.js  # Form validation
│   ├── services/          # API integration layer
│   ├── context/           # React context (if needed)
│   ├── hooks/             # Custom hooks
│   ├── assets/            # Images, icons, fonts
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles (Tailwind)
├── public/                # Static assets
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 📦 Core Modules

### 1. **Dashboard** 📊
- Executive overview of HR metrics
- Key performance indicators
- Recent activities and pending approvals
- Quick action buttons
- Data visualization with charts

### 2. **Employee Management** 👥
- Complete employee directory
- Employee profiles and records
- Search and filtering capabilities
- Employee details modal
- Bulk operations support
- Organizational hierarchy view

### 3. **Attendance & Time Tracking** 📅
- Daily attendance marking
- Calendar view of attendance patterns
- Check-in/check-out tracking
- Multiple attendance statuses
  - Present
  - Absent
  - Late
  - Half Day
  - Work From Home
- Attendance reports

### 4. **Leave Management** 🏖️
- Leave request submission
- Leave balance tracking
- Multiple leave types
  - Annual Leave
  - Sick Leave
  - Personal Leave
  - Casual Leave
  - Maternity/Paternity Leave
  - Unpaid Leave
- Leave approval workflow
- Leave calendar
- Company leave policies

### 5. **Payroll & Compensation** 💰
- Salary structure management
- Payslip generation and viewing
- Deductions tracking (Income Tax, PF, ESI, etc.)
- Allowances management (DA, HRA, Conveyance, etc.)
- Payroll processing
- Salary history
- Tax calculations

### 6. **Performance Management** ⭐
- **Appraisals**
  - Performance ratings (1-5 stars)
  - Appraisal cycles
  - Manager ratings
  
- **Goals & OKRs**
  - Goal setting and tracking
  - Progress monitoring
  - Goal alignment
  
- **360-Degree Feedback**
  - Multi-rater feedback
  - Anonymous feedback option
  - Feedback compilation

### 7. **Recruitment** 🎯
- Job posting management
- Applicant tracking system (ATS)
- Multiple applicant statuses
  - Applied
  - Screening
  - Interview
  - Offer
  - Hired
- Interview scheduling
- Offer management
- Applicant ratings

### 8. **Learning & Development** 📚
- Training program management
- Course enrollment
- Progress tracking
- Certification management
- Skill development paths
- Training completion tracking

### 9. **Compliance & Documentation** 📋
- HR policy management
- Document verification
- Multiple policy types
  - Code of Conduct
  - Data Privacy
  - Anti-Harassment
  - Health & Safety
  - etc.
- Audit trail logging
- Compliance tracking
- Document expiry management

### 10. **Analytics & Reports** 📈
- HR metrics dashboard
- Employee growth trends
- Department distribution
- Turnover and hiring analytics
- Performance distribution
- Custom report generation
- Data export capabilities

### 11. **Settings** ⚙️
- Company information
- Regional settings
- Notification preferences
- Security settings
- Two-factor authentication
- Password management
- Active sessions management

## 🎨 UI Components

### Available Components (in `components/UI.jsx`)

- **Card** - Reusable card container
- **Button** - Multiple variants (primary, secondary, danger, success, ghost)
- **Badge** - Status badges with color variants
- **Alert** - Info, success, warning, error alerts
- **Modal** - Dialog box component
- **Input** - Text input with validation
- **Select** - Dropdown select field
- **Table** - Data table with columns
- **Pagination** - Pagination controls
- **Tabs** - Tab navigation
- **Stat** - Statistics card component

### Styling
- **Framework:** Tailwind CSS 4.1
- **Colors:** Custom color palette with blue primary
- **Responsive:** Mobile-first design
- **Dark Mode:** Ready for implementation

## 🔐 Authentication & Authorization

### Auth Store (Zustand)
```javascript
- login(email, password)
- logout()
- setUser(user)
- setToken(token)
- setRole(role)
- setPermissions(permissions)
```

### Role-Based Access Control
- HR Admin
- HR Manager
- Department Head
- Manager
- Employee

### Permissions
- view_employees
- manage_employees
- approve_leave
- manage_payroll
- And more...

## 📊 State Management

### Zustand Stores

**authStore.js**
- User authentication state
- Token management
- Role and permissions
- Mock login implementation

**appStore.js**
- Sidebar toggle
- Theme settings
- Notifications
- Current company

## 🛠️ Utilities

### Constants (`utils/constants.js`)
- Leave types, statuses
- Attendance statuses
- Employee statuses
- Performance ratings
- Departments
- Payroll frequencies
- Document statuses
- And more...

### Date Utilities (`utils/dateUtils.js`)
- formatDate()
- calculateDaysDifference()
- getMonthlyCalendar()
- getWorkingDays()
- getAge()
- getYearsOfService()
- isUpcomingBirthday()
- getQuarter()

### Formatters (`utils/formatters.js`)
- formatCurrency()
- formatNumber()
- formatPercentage()
- truncateText()
- capitalizeWords()
- getInitials()
- formatPhoneNumber()
- formatFileSize()
- slugify()

### Validation (`utils/validation.js`)
- validateEmail()
- validatePhone()
- validatePassword()
- validatePAN()
- validateAadhar()
- validateEmployeeID()
- validateUAN()
- validateDate()
- validateURL()
- getValidationErrors()

## 🚀 Running the Application

### Installation
```bash
cd pvara-hrms
npm install
```

### Development
```bash
npm run dev
```
- Runs on `http://localhost:4173`
- Hot Module Reload enabled
- Auto-refresh on file changes

### Build
```bash
npm run build
```
- Optimized production build
- Minified assets
- Tree-shaking enabled

### Preview
```bash
npm run preview
```
- Preview production build locally

## 🔗 API Integration Points

The frontend is ready for backend integration. Key areas:

### Authentication
- `/api/auth/login` - User login
- `/api/auth/logout` - User logout
- `/api/auth/refresh` - Token refresh

### Employees
- `GET /api/employees` - Fetch all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance` - Fetch attendance records
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out

### Leaves
- `GET /api/leaves` - Fetch leave requests
- `POST /api/leaves/request` - Request leave
- `PUT /api/leaves/:id/approve` - Approve leave
- `PUT /api/leaves/:id/reject` - Reject leave

### Payroll
- `GET /api/payroll/payslips` - Fetch payslips
- `POST /api/payroll/process` - Process payroll
- `GET /api/payroll/structure` - Get salary structure

### Performance
- `GET /api/performance/appraisals` - Fetch appraisals
- `POST /api/performance/appraisals` - Create appraisal
- `GET /api/performance/goals` - Fetch goals
- `GET /api/performance/feedback` - Fetch 360 feedback

### Recruitment
- `GET /api/recruitment/jobs` - Fetch job postings
- `GET /api/recruitment/applicants` - Fetch applicants
- `POST /api/recruitment/applicants/:id/stage` - Update applicant stage

### Learning & Development
- `GET /api/learning/programs` - Fetch training programs
- `POST /api/learning/enroll` - Enroll in program
- `GET /api/learning/enrollments` - Fetch user enrollments

### Compliance
- `GET /api/compliance/policies` - Fetch policies
- `GET /api/compliance/documents` - Fetch documents
- `GET /api/compliance/audit-logs` - Fetch audit logs

## 📱 Responsive Design

- **Mobile:** 320px and up
- **Tablet:** 768px and up
- **Desktop:** 1024px and up
- Sidebar collapses on mobile
- Touch-friendly buttons and inputs
- Optimized table for mobile view

## 🎯 Features Ready for Backend Integration

✅ Complete UI for all modules  
✅ Form validation and error handling  
✅ State management setup  
✅ API service layer structure  
✅ Protected routes implementation  
✅ Mock data for demonstration  
✅ Responsive design  
✅ Accessibility considerations  
✅ Error boundaries  
✅ Loading states  

## 🔄 Data Flow

```
User Input
    ↓
Form Validation
    ↓
API Service Call
    ↓
Zustand Store Update
    ↓
Component Re-render
    ↓
UI Update
```

## 🚦 Mock Login Credentials

**Email:** demo@hrms.com  
**Password:** demo123

(Replace with actual authentication when backend is ready)

## 📋 Next Steps for Backend Integration

1. **API Service Layer**
   - Create API client using axios
   - Implement endpoint functions
   - Error handling

2. **Authentication**
   - Connect to backend auth endpoints
   - JWT token management
   - Auto-refresh token logic

3. **Data Fetching**
   - Replace mock data with API calls
   - Implement loading and error states
   - Pagination and filtering

4. **Form Submission**
   - Connect forms to API endpoints
   - Validation feedback
   - Success/error messages

5. **Real-time Features**
   - WebSocket implementation (if needed)
   - Real-time notifications
   - Live updates

6. **Testing**
   - Unit tests for utilities
   - Integration tests for components
   - E2E tests with Playwright

## 📚 Best Practices Implemented

- ✅ Component modularity
- ✅ Reusable UI components
- ✅ Utility functions
- ✅ State management separation
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states
- ✅ Form validation
- ✅ Protected routes
- ✅ Clean code structure

## 🐛 Known Limitations

- Mock data is hardcoded
- No real backend integration yet
- Notifications are demo only
- File uploads not implemented
- Export functionality is UI only

## 📞 Support & Documentation

For questions or issues:
1. Check the component documentation
2. Review utility functions
3. Check mock data structure
4. Review state management

## 📄 License

© 2025 PVARA. All rights reserved.

---

**Ready for Enterprise Deployment!**
