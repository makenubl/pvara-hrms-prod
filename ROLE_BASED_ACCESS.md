# PVARA HRMS - Role-Based Access Guide

## 🎭 User Roles & Dashboards

The PVARA HRMS system now includes role-based access control with different views for different user types.

---

## 👥 Available Roles

### 1. Admin
- **Full system access**
- Manages all employees, payroll, compliance
- Access to analytics and reports
- System settings and configuration

### 2. HR
- Employee management
- Recruitment and onboarding
- Leave and attendance management
- Payroll processing
- Compliance oversight

### 3. Manager
- Team management
- Performance reviews
- Leave approvals
- Team analytics

### 4. Employee
- Personal dashboard
- Self-service portal
- Leave requests
- Attendance tracking
- Learning & development
- Payroll view (own salary)

---

## 🔐 Test Credentials

### Admin User
```
Email:    admin@pvara.com
Password: admin123
Role:     admin
```

### Employee User
```
Email:    employee@pvara.com
Password: employee123
Role:     employee
```

---

## 📊 Dashboard Views

### Admin/HR Dashboard (`/dashboard`)
**Features:**
- Company-wide metrics
- Employee count and statistics
- Attendance overview
- Payroll summary
- Pending approvals
- Performance charts
- Recent activities
- Quick actions (Mark Attendance, Process Payroll, Create Job)

**Available to:** Admin, HR, Manager roles

### Employee Dashboard (`/dashboard`)
**Features:**
- Personal information card
- Leave balance and requests
- Attendance rate
- Pending requests status
- Tasks completed
- Today's schedule
- Payroll summary (personal)
- Learning progress
- Company announcements
- Quick clock in/out

**Available to:** Employee role

---

## 🎨 Design Consistency

All views follow the same design system:

### Color Palette
- **Primary**: Cyan (#06B6D4) to Blue (#3B82F6)
- **Secondary**: Purple (#A855F7) to Pink (#EC4899)
- **Success**: Green (#10B981) to Emerald (#059669)
- **Warning**: Orange (#F97316) to Amber (#F59E0B)
- **Danger**: Red (#EF4444) to Pink (#EC4899)

### Components
- **Glass morphism cards** with backdrop blur
- **Gradient text** for headings
- **Neon glow effects** on interactive elements
- **Smooth animations** (fade-in, slide-up)
- **Responsive grid layouts**

### Typography
- **Headings**: Bold, gradient text
- **Body**: Slate-400 for secondary text
- **Labels**: Cyan-400 for accents

---

## 🔒 Access Control

### Menu Items by Role

| Feature | Admin | HR | Manager | Employee |
|---------|-------|----|---------| ---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ (Different View) |
| Employees | ✅ | ✅ | ✅ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ✅ |
| Leave Management | ✅ | ✅ | ✅ | ✅ |
| Payroll | ✅ | ✅ | ❌ | ❌ |
| Performance | ✅ | ✅ | ✅ | ✅ |
| Recruitment | ✅ | ✅ | ❌ | ❌ |
| Learning & Development | ✅ | ✅ | ✅ | ✅ |
| Compliance | ✅ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 How to Test

### 1. Login as Admin
```
1. Go to http://localhost:5173/
2. Login with admin@pvara.com / admin123
3. You'll see the full admin dashboard with all features
4. Sidebar shows all menu items
```

### 2. Login as Employee
```
1. Logout from admin account
2. Login with employee@pvara.com / employee123
3. You'll see the personalized employee dashboard
4. Sidebar shows limited menu items
5. Notice the different layout and focus on personal information
```

### 3. Test Access Control
```
1. Login as employee
2. Try to navigate to /employees
3. You'll be redirected to /dashboard
4. This demonstrates role-based route protection
```

---

## 🛠️ Technical Implementation

### Files Modified/Created

1. **`src/pages/EmployeeDashboard.jsx`** - New employee-specific dashboard
2. **`src/App.jsx`** - Updated with role-based routing
3. **`src/layouts/Sidebar.jsx`** - Role-based menu filtering
4. **`backend/scripts/create-employee.js`** - Script to create test employee

### Key Features

#### Role-Based Routing
```jsx
// In App.jsx
const DashboardRouter = () => {
  const { user } = useAuthStore();
  
  if (user?.role === 'employee') {
    return <EmployeeDashboard />;
  }
  
  return <Dashboard />;
};
```

#### Protected Routes with Role Check
```jsx
<ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
  <Employees />
</ProtectedRoute>
```

#### Dynamic Menu Items
```jsx
// Sidebar filters menu based on user role
const menuItems = allMenuItems.filter(item => 
  item.roles.includes(userRole)
);
```

---

## 📱 Employee Dashboard Features

### Personal Information
- Profile card with employee details
- Employee ID, department, manager
- Work hours and join date
- Quick edit profile button

### Today's Schedule
- Upcoming meetings and tasks
- Time-based organization
- Status indicators
- Type badges (meeting/task)

### Leave Management
- Leave balance widget
- Recent leave requests with status
- Quick apply leave button
- Visual status badges (approved/pending/rejected)

### Payroll Information
- Current month salary breakdown
- Gross, deductions, net salary
- Next payday countdown
- Download pay slip option

### Learning Progress
- Enrolled courses
- Progress bars with percentages
- Due dates
- Quick access to learning portal

### Announcements
- Company-wide updates
- Events and important dates
- Categorized by type

### Quick Actions
- Clock in/out button
- Real-time clock display
- One-click attendance marking

---

## 🎯 Future Enhancements

### Planned Features
- [ ] Manager dashboard with team-specific views
- [ ] HR dashboard with recruitment focus
- [ ] Customizable dashboard widgets
- [ ] Dark/light theme toggle
- [ ] Mobile app view
- [ ] Push notifications
- [ ] Calendar integration
- [ ] Team collaboration features

### Additional Roles
- [ ] Finance role for payroll management
- [ ] Auditor role for compliance
- [ ] Department heads
- [ ] Project managers

---

## 📋 Creating Additional Users

### Add Employee User
```bash
node backend/scripts/create-employee.js
```

### Add Admin User
```bash
node backend/scripts/seed.js
```

### Manual User Creation
```javascript
// Use MongoDB or create a script similar to create-employee.js
const user = new User({
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@pvara.com',
  password: hashedPassword,
  role: 'manager', // admin, hr, manager, employee
  company: companyId,
  employeeId: 'EMP003',
  department: 'Sales',
  status: 'active'
});
```

---

## 🐛 Troubleshooting

### Employee can't see dashboard
- Check if user role is set to 'employee'
- Clear browser cache and localStorage
- Verify JWT token contains role information

### Menu items not showing
- Check Sidebar.jsx role configuration
- Verify user role is in allowed roles array
- Check browser console for errors

### Redirected to dashboard when accessing pages
- This is expected for restricted pages
- Only certain roles can access certain features
- Check App.jsx for route protection rules

---

## 📚 Documentation Links

- **Component Library**: `src/components/UI.jsx`
- **Auth Store**: `src/store/authStore.js`
- **API Services**: `src/services/`
- **Backend Models**: `backend/models/`
- **Route Protection**: `src/App.jsx`

---

## ✨ Design Highlights

The employee dashboard maintains visual consistency while providing a personalized experience:

- **Same glass morphism aesthetic**
- **Consistent color gradients**
- **Unified component library**
- **Responsive layout**
- **Smooth animations**
- **Professional typography**

The design adapts the complexity based on user role while maintaining the premium, modern look and feel throughout the application.
