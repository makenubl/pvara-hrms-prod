import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useCompanyStore } from './store/companyStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeePerformance from './pages/EmployeePerformance';
import SupervisorPerformance from './pages/SupervisorPerformance';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import Payroll from './pages/Payroll';
import Performance from './pages/Performance';
import Recruitment from './pages/Recruitment';
import Learning from './pages/Learning';
import Compliance from './pages/Compliance';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import OrganizationChart from './pages/OrganizationChart';
import ChairmanOverview from './pages/ChairmanOverview';
import ChairmanOverviewSimple from './pages/ChairmanOverviewSimple';
import TasksABTesting from './pages/TasksABTesting';
import ChangePassword from './pages/ChangePassword';
import MyTasks from './pages/MyTasks';
import Worklog from './pages/Worklog';
import TaskManagement from './pages/TaskManagement';

// Role-based Dashboard Router
const DashboardRouter = () => {
  const { user } = useAuthStore();
  
  // Show employee dashboard for 'employee' role, admin dashboard for others
  if (user?.role === 'employee') {
    return <EmployeeDashboard />;
  }
  
  return <Dashboard />;
};

// Helper function to get default landing page based on user role
const getDefaultRoute = (user) => {
  // Chairman, admin, and handler roles go to Chairperson Tasks Dashboard
  const chairmanRoles = ['admin', 'chairman', 'executive', 'director'];
  if (chairmanRoles.includes(user?.role)) {
    return '/tasks-ab';
  }
  
  // Employees default to My Tasks
  if (user?.role === 'employee') {
    return '/my-tasks';
  }
  
  // Other roles (manager, hr, hod, teamlead) go to dashboard
  return '/dashboard';
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user } = useAuthStore();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified, check if user has permission
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
};

// Public Route Wrapper (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  
  if (token) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
};

function App() {
  const { applyTheme, currentCompany } = useCompanyStore();

  // Apply theme on mount and when company changes
  useEffect(() => {
    if (currentCompany?.branding) {
      applyTheme();
    }
  }, [currentCompany, applyTheme]);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Entry point - Login */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Protected HRMS Routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>}
        />
        <Route
          path="/employees"
          element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}><Employees /></ProtectedRoute>}
        />
        <Route
          path="/attendance"
          element={<ProtectedRoute><Attendance /></ProtectedRoute>}
        />
        <Route
          path="/leaves"
          element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>}
        />
        <Route
          path="/payroll"
          element={<ProtectedRoute><Payroll /></ProtectedRoute>}
        />
        <Route
          path="/performance"
          element={<ProtectedRoute><Performance /></ProtectedRoute>}
        />
        <Route
          path="/recruitment"
          element={<ProtectedRoute><Recruitment /></ProtectedRoute>}
        />
        <Route
          path="/learning"
          element={<ProtectedRoute><Learning /></ProtectedRoute>}
        />
        <Route
          path="/compliance"
          element={<ProtectedRoute><Compliance /></ProtectedRoute>}
        />
        <Route
          path="/analytics"
          element={<ProtectedRoute><Analytics /></ProtectedRoute>}
        />
        <Route
          path="/chairman"
          element={<Navigate to="/tasks-ab" replace />}
        />
        <Route
          path="/chairman-simple"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'executive', 'director']}><ChairmanOverviewSimple /></ProtectedRoute>}
        />
        <Route
          path="/chairman-detailed"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'executive', 'director']}><ChairmanOverview /></ProtectedRoute>}
        />
        <Route
          path="/task-management"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'executive', 'director', 'manager', 'hr', 'hod', 'teamlead']}><TaskManagement /></ProtectedRoute>}
        />
        <Route
          path="/tasks-ab"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'executive', 'director']}><TasksABTesting /></ProtectedRoute>}
        />
        <Route
          path="/my-tasks"
          element={<ProtectedRoute><MyTasks /></ProtectedRoute>}
        />
        <Route
          path="/worklog"
          element={<ProtectedRoute><Worklog /></ProtectedRoute>}
        />
        <Route
          path="/change-password"
          element={<ProtectedRoute><ChangePassword onSuccess={() => window.location.href = '/dashboard'} /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>}
        />
        <Route
          path="/my-performance"
          element={<ProtectedRoute allowedRoles={['employee']}><EmployeePerformance /></ProtectedRoute>}
        />
        <Route
          path="/team-performance"
          element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr']}><SupervisorPerformance /></ProtectedRoute>}
        />
        <Route
          path="/organization"
          element={<ProtectedRoute><OrganizationChart /></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />

        {/* Catch-all redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
