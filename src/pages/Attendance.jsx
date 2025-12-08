import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table } from '../components/UI';
import { getMonthlyCalendar, formatDate } from '../utils/dateUtils';

const Attendance = () => {
  const [viewMode, setViewMode] = useState('list');
  const [selectedMonth] = useState(new Date());

  const [attendanceRecords] = useState([
    {
      id: 1,
      employeeId: 'EMP001',
      name: 'John Doe',
      date: '2025-12-08',
      status: 'present',
      checkIn: '09:00 AM',
      checkOut: '05:30 PM',
      department: 'Technology',
    },
    {
      id: 2,
      employeeId: 'EMP002',
      name: 'Jane Smith',
      date: '2025-12-08',
      status: 'present',
      checkIn: '09:15 AM',
      checkOut: '05:45 PM',
      department: 'Human Resources',
    },
    {
      id: 3,
      employeeId: 'EMP003',
      name: 'Bob Johnson',
      date: '2025-12-08',
      status: 'absent',
      checkIn: null,
      checkOut: null,
      department: 'Finance',
    },
    {
      id: 4,
      employeeId: 'EMP004',
      name: 'Sarah Williams',
      date: '2025-12-08',
      status: 'late',
      checkIn: '10:30 AM',
      checkOut: '05:15 PM',
      department: 'Marketing',
    },
    {
      id: 5,
      employeeId: 'EMP005',
      name: 'Michael Brown',
      date: '2025-12-08',
      status: 'work_from_home',
      checkIn: '08:45 AM',
      checkOut: '06:00 PM',
      department: 'Technology',
    },
  ]);

  const statusIcons = {
    present: <CheckCircle className="w-5 h-5 text-emerald-300" />,
    absent: <XCircle className="w-5 h-5 text-rose-300" />,
    late: <AlertCircle className="w-5 h-5 text-amber-300" />,
    half_day: <AlertCircle className="w-5 h-5 text-blue-300" />,
    work_from_home: <Clock className="w-5 h-5 text-purple-300" />,
  };

  const statusColors = {
    present: 'green',
    absent: 'red',
    late: 'yellow',
    half_day: 'blue',
    work_from_home: 'purple',
  };

  const monthDays = getMonthlyCalendar(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);

  const todayAttendance = attendanceRecords.filter(
    (r) => r.date === formatDate(new Date(), 'yyyy-MM-dd')
  );

  const columns = [
    {
      key: 'name',
      label: 'Employee Name',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value}</p>
          <p className="text-xs text-slate-400">{row.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          {statusIcons[value]}
          <Badge variant={statusColors[value]}>{value.replace('_', ' ')}</Badge>
        </div>
      ),
    },
    {
      key: 'checkIn',
      label: 'Check In',
      render: (value) => <span className="font-medium text-white">{value || '-'}</span>,
    },
    {
      key: 'checkOut',
      label: 'Check Out',
      render: (value) => <span className="font-medium text-white">{value || '-'}</span>,
    },
    {
      key: 'department',
      label: 'Department',
      render: (value) => <span className="text-slate-200">{value}</span>,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header with gradient */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Attendance Management
            </h1>
            <p className="text-slate-400 mt-2">Track and manage employee attendance</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            Mark Attendance
          </Button>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-slate-300 text-sm">Total Present</p>
            <p className="text-2xl font-black text-white mt-1">
              {attendanceRecords.filter((r) => r.status === 'present').length}
            </p>
          </Card>
          <Card>
            <p className="text-slate-300 text-sm">Absent</p>
            <p className="text-2xl font-black text-white mt-1">
              {attendanceRecords.filter((r) => r.status === 'absent').length}
            </p>
          </Card>
          <Card>
            <p className="text-slate-300 text-sm">Late</p>
            <p className="text-2xl font-black text-white mt-1">
              {attendanceRecords.filter((r) => r.status === 'late').length}
            </p>
          </Card>
          <Card>
            <p className="text-slate-300 text-sm">Work From Home</p>
            <p className="text-2xl font-black text-white mt-1">
              {attendanceRecords.filter((r) => r.status === 'work_from_home').length}
            </p>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
        </div>

        {viewMode === 'list' ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Today's Attendance</h3>
              <p className="text-sm text-slate-300">{formatDate(new Date())}</p>
            </div>
            <Table columns={columns} data={todayAttendance} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <h3 className="font-semibold text-white mb-4">
                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-bold text-slate-300 text-sm p-2">
                    {day}
                  </div>
                ))}
                {monthDays.map((day) => (
                  <div
                    key={day.toDateString()}
                    className="aspect-square border border-white/20 rounded-lg p-2 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <p className="text-xs font-semibold text-white">{day.getDate()}</p>
                    <div className="mt-1 text-xs text-slate-400">
                      {Math.floor(Math.random() * 80)}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Legends */}
            <Card>
              <h3 className="font-semibold text-white mb-4">Legend</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-300 rounded"></div>
                  <span className="text-sm text-slate-200">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-rose-300 rounded"></div>
                  <span className="text-sm text-slate-200">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-300 rounded"></div>
                  <span className="text-sm text-slate-200">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-300 rounded"></div>
                  <span className="text-sm text-slate-200">Work From Home</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
                <h4 className="font-semibold text-white">Quick Stats</h4>
                <div>
                  <p className="text-sm text-slate-300">Average Attendance</p>
                  <p className="text-2xl font-bold text-cyan-400">94%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">This Month</p>
                  <p className="text-lg font-bold text-white">22/22 days</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Attendance;
