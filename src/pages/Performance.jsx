import React, { useState, useEffect } from 'react';
import { Star, Target, TrendingUp, Plus, Filter } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table, Input, Stat } from '../components/UI';
import { PERFORMANCE_RATING, APPRAISAL_STATUS } from '../utils/constants';
import toast from 'react-hot-toast';

const PerformanceManagement = () => {
  const [activeTab, setActiveTab] = useState('appraisals');
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      console.log('📤 Fetching performance data...');
      const response = await fetch('http://localhost:5000/api/performance/reviews', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setAppraisals(data || []);
      console.log('✅ Performance data loaded:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error fetching performance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const appraisalColumns = [
    {
      key: 'name',
      label: 'Employee',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value}</p>
          <p className="text-xs text-slate-400">{row.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={16}
              className={i < Math.floor(value) ? 'fill-amber-300 text-amber-300' : 'text-slate-400'}
            />
          ))}
          <span className="text-white font-semibold ml-2">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={value === 'completed' ? 'green' : 'yellow'}>{value}</Badge>,
    },
    {
      key: 'evaluator',
      label: 'Evaluator',
      render: (value) => <span className="text-slate-200">{value}</span>,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Performance Management
            </h1>
            <p className="text-slate-400 mt-2">Track and evaluate employee performance</p>
          </div>
          <Button onClick={() => alert('Exporting reviews...')} className="flex items-center gap-2">
            <Plus size={20} />
            New Appraisal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Avg Rating</p>
                <p className="text-2xl font-black text-amber-300 mt-1">
                  {(appraisals.reduce((sum, a) => sum + a.rating, 0) / appraisals.length).toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-amber-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Completed</p>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  {appraisals.filter((a) => a.status === 'completed').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Pending</p>
                <p className="text-2xl font-black text-amber-300 mt-1">
                  {appraisals.filter((a) => a.status === 'pending').length}
                </p>
              </div>
              <Target className="w-8 h-8 text-amber-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['appraisals', 'goals', 'feedback'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm transition-all ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Appraisals Table */}
        {activeTab === 'appraisals' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Appraisals</h3>
            <Table columns={appraisalColumns} data={appraisals} />
          </Card>
        )}

        {/* Goals Section */}
        {activeTab === 'goals' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Performance Goals</h3>
            <div className="space-y-3">
              {appraisals.map((emp) => (
                <div key={emp.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{emp.name}</p>
                      <p className="text-sm text-slate-300 mt-1">Q4 2025 Performance Goals</p>
                    </div>
                    <Badge variant="blue">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Feedback Section */}
        {activeTab === 'feedback' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">360 Feedback</h3>
            <div className="space-y-3">
              {appraisals.slice(0, 2).map((emp) => (
                <div key={emp.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="font-medium text-white">{emp.name}</p>
                  <p className="text-sm text-slate-300 mt-2">{emp.comment || 'Feedback pending...'}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default PerformanceManagement;
