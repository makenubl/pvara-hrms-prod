import toast from 'react-hot-toast';
import employeeService from '../services/employeeService';

// Common button handlers for HRMS features
export const handleAddEmployee = async (employeeData) => {
  try {
    const response = await employeeService.create(employeeData);
    toast.success('Employee added successfully!');
    return response;
  } catch (error) {
    toast.error(error.message || 'Failed to add employee');
    throw error;
  }
};

export const handleMarkAttendance = () => {
  toast.success('Attendance marked successfully!');
};

export const handleProcessPayroll = () => {
  toast.success('Payroll processing started!');
};

export const handleCreateJob = () => {
  toast.success('Create Job feature - Ready to add new job posting');
};

export const handleExportData = (type) => {
  toast.success(`Exporting ${type} data...`);
  // Simulate download
  setTimeout(() => {
    toast.success(`${type} exported successfully!`);
  }, 1000);
};

export const handleDownloadReport = (reportName) => {
  toast.loading('Generating report...', { duration: 1000 });
  setTimeout(() => {
    toast.success(`${reportName} downloaded successfully!`);
  }, 1500);
};

export const handleApprove = (type) => {
  toast.success(`${type} approved successfully!`);
};

export const handleReject = (type) => {
  toast.error(`${type} rejected!`);
};

export const handleEnroll = (programName) => {
  toast.success(`Enrolled in ${programName} successfully!`);
};

export const handleViewDetails = () => {
  toast('View details feature - Opening modal...');
};

export const handleEdit = () => {
  toast('Edit feature - Opening edit form...');
};

export const handleDelete = () => {
  toast.error('Delete confirmation required');
};

export const handleRequestLeave = () => {
  toast.success('Leave request submitted successfully!');
};

export const handleCheckIn = () => {
  const time = new Date().toLocaleTimeString();
  toast.success(`Checked in at ${time}`);
};

export const handleCheckOut = () => {
  const time = new Date().toLocaleTimeString();
  toast.success(`Checked out at ${time}`);
};
