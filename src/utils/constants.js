// API Configuration
export const API_BASE_URL = 
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : process.env.REACT_APP_API_URL || '/api';

// Leave Types
export const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  PERSONAL: 'personal',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  UNPAID: 'unpaid',
  CASUAL: 'casual',
  COMPASSIONATE: 'compassionate',
};

// Leave Status
export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  HALF_DAY: 'half_day',
  WORK_FROM_HOME: 'work_from_home',
};

// Employee Status
export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  RETIRED: 'retired',
};

// Performance Rating
export const PERFORMANCE_RATING = {
  EXCELLENT: 5,
  VERY_GOOD: 4,
  GOOD: 3,
  SATISFACTORY: 2,
  NEEDS_IMPROVEMENT: 1,
};

// Employee Roles
export const EMPLOYEE_ROLES = {
  HR_ADMIN: 'hr_admin',
  HR_MANAGER: 'hr_manager',
  DEPARTMENT_HEAD: 'department_head',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// Designation Levels
export const DESIGNATION_LEVELS = {
  ENTRY: 'entry',
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
  MANAGER: 'manager',
  DIRECTOR: 'director',
  EXECUTIVE: 'executive',
};

// Department
export const DEPARTMENTS = [
  'Human Resources',
  'Finance',
  'Operations',
  'Marketing',
  'Sales',
  'Technology',
  'Product',
  'Customer Support',
  'Legal',
  'Compliance',
];

// Payroll Frequency
export const PAYROLL_FREQUENCY = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUALLY: 'annually',
};

// Deduction Types
export const DEDUCTION_TYPES = {
  INCOME_TAX: 'income_tax',
  PROFESSIONAL_TAX: 'professional_tax',
  PF: 'pf',
  ESI: 'esi',
  INSURANCE: 'insurance',
  LOAN: 'loan',
  ADVANCE: 'advance',
  OTHER: 'other',
};

// Allowance Types
export const ALLOWANCE_TYPES = {
  BASIC: 'basic',
  DA: 'da',
  HRA: 'hra',
  CONVEYANCE: 'conveyance',
  MEDICAL: 'medical',
  BONUS: 'bonus',
  INCENTIVE: 'incentive',
  SPECIAL: 'special',
};

// Recruitment Status
export const RECRUITMENT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  ON_HOLD: 'on_hold',
  FILLED: 'filled',
};

// Applicant Status
export const APPLICANT_STATUS = {
  APPLIED: 'applied',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  REJECTED: 'rejected',
  HIRED: 'hired',
  WITHDRAWN: 'withdrawn',
};

// Training Status
export const TRAINING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Appraisal Status
export const APPRAISAL_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

// Document Status
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
};
