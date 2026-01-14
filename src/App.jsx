import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useCompanyStore } from './store/companyStore';

// Loading spinner component for lazy loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load all pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const EmployeePerformance = lazy(() => import('./pages/EmployeePerformance'));
const SupervisorPerformance = lazy(() => import('./pages/SupervisorPerformance'));
const Employees = lazy(() => import('./pages/Employees'));
const Attendance = lazy(() => import('./pages/Attendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Performance = lazy(() => import('./pages/Performance'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Learning = lazy(() => import('./pages/Learning'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const OrganizationChart = lazy(() => import('./pages/OrganizationChart'));
const ChairmanOverview = lazy(() => import('./pages/ChairmanOverview'));
const ChairmanOverviewSimple = lazy(() => import('./pages/ChairmanOverviewSimple'));
const TasksABTesting = lazy(() => import('./pages/TasksABTesting'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const Worklog = lazy(() => import('./pages/Worklog'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const MyDependencies = lazy(() => import('./pages/MyDependencies'));
const Reports = lazy(() => import('./pages/Reports'));
const Storage = lazy(() => import('./pages/Storage'));

// ERP / Finance Module Pages
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const ChartOfAccounts = lazy(() => import('./pages/ChartOfAccounts'));
const BudgetManagement = lazy(() => import('./pages/BudgetManagement'));
const Vendors = lazy(() => import('./pages/Vendors'));
const JournalEntries = lazy(() => import('./pages/JournalEntries'));
const BankPayments = lazy(() => import('./pages/BankPayments'));
const FinancialReports = lazy(() => import('./pages/FinancialReports'));

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
      <Suspense fallback={<PageLoader />}>
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
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'executive', 'director', 'manager', 'hr', 'hod', 'teamlead', 'employee']}><TaskManagement /></ProtectedRoute>}
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
          path="/my-dependencies"
          element={<ProtectedRoute><MyDependencies /></ProtectedRoute>}
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
        <Route
          path="/reports"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman']}><Reports /></ProtectedRoute>}
        />
        <Route
          path="/storage"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'executive', 'director', 'manager', 'hr']}><Storage /></ProtectedRoute>}
        />

        {/* Finance / ERP Module Routes */}
        <Route
          path="/finance"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><FinanceDashboard /></ProtectedRoute>}
        />
        <Route
          path="/finance/chart-of-accounts"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><ChartOfAccounts /></ProtectedRoute>}
        />
        <Route
          path="/finance/budgets"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><BudgetManagement /></ProtectedRoute>}
        />
        <Route
          path="/finance/vendors"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><Vendors /></ProtectedRoute>}
        />
        <Route
          path="/finance/journal-entries"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><JournalEntries /></ProtectedRoute>}
        />
        <Route
          path="/finance/journal-entries/new"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><JournalEntries openNew /></ProtectedRoute>}
        />
        <Route
          path="/finance/bank-payments"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><BankPayments /></ProtectedRoute>}
        />
        <Route
          path="/finance/reports"
          element={<ProtectedRoute allowedRoles={['admin', 'chairman', 'finance', 'accountant']}><FinancialReports /></ProtectedRoute>}
        />

        {/* Catch-all redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
