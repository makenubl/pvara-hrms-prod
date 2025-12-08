import React, { useState } from 'react';
import { Briefcase, MapPin, Users, Clock, Plus, Eye, Heart } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table } from '../components/UI';
import { RECRUITMENT_STATUS, APPLICANT_STATUS } from '../utils/constants';

const Recruitment = () => {
  const [activeTab, setActiveTab] = useState('jobs');

  const [jobs] = useState([
    {
      id: 1,
      title: 'Senior React Developer',
      department: 'Engineering',
      location: 'Remote',
      postedDate: '2025-11-20',
      applicants: 24,
      status: 'open',
    },
    {
      id: 2,
      title: 'UX/UI Designer',
      department: 'Design',
      location: 'New York',
      postedDate: '2025-11-25',
      applicants: 18,
      status: 'open',
    },
    {
      id: 3,
      title: 'Product Manager',
      department: 'Product',
      location: 'San Francisco',
      postedDate: '2025-10-15',
      applicants: 32,
      status: 'closed',
    },
  ]);

  const [applicants] = useState([
    {
      id: 1,
      name: 'Alice Johnson',
      jobTitle: 'Senior React Developer',
      appliedDate: '2025-12-01',
      status: 'interview',
      rating: 4.5,
    },
    {
      id: 2,
      name: 'Bob Smith',
      jobTitle: 'UX/UI Designer',
      appliedDate: '2025-12-02',
      status: 'screening',
      rating: 4.0,
    },
    {
      id: 3,
      name: 'Carol Davis',
      jobTitle: 'Senior React Developer',
      appliedDate: '2025-11-28',
      status: 'rejected',
      rating: 3.5,
    },
  ]);

  const jobColumns = [
    {
      key: 'title',
      label: 'Job Title',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value}</p>
          <p className="text-xs text-slate-400">{row.department}</p>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (value) => (
        <div className="flex items-center gap-1 text-slate-200">
          <MapPin size={14} /> {value}
        </div>
      ),
    },
    {
      key: 'applicants',
      label: 'Applicants',
      render: (value) => <span className="text-white font-bold">{value}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={value === 'open' ? 'green' : 'gray'}>{value}</Badge>,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Recruitment
            </h1>
            <p className="text-slate-400 mt-2">Manage job openings and applicants</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            New Job Opening
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Open Positions</p>
                <p className="text-2xl font-black text-white mt-1">
                  {jobs.filter((j) => j.status === 'open').length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Applicants</p>
                <p className="text-2xl font-black text-blue-300 mt-1">{jobs.reduce((sum, j) => sum + j.applicants, 0)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">In Progress</p>
                <p className="text-2xl font-black text-amber-300 mt-1">
                  {applicants.filter((a) => a.status === 'interview').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['jobs', 'applicants'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm transition-all ${
                activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Job Openings</h3>
            <Table columns={jobColumns} data={jobs} />
          </Card>
        )}

        {/* Applicants Tab */}
        {activeTab === 'applicants' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Applicants Pipeline</h3>
            <div className="space-y-3">
              {applicants.map((app) => (
                <div key={app.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{app.name}</p>
                      <p className="text-sm text-slate-300">{app.jobTitle}</p>
                      <p className="text-xs text-slate-400 mt-1">Applied on {app.appliedDate}</p>
                    </div>
                    <Badge
                      variant={
                        app.status === 'interview'
                          ? 'green'
                          : app.status === 'screening'
                          ? 'blue'
                          : 'red'
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Recruitment;
