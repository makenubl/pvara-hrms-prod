import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle, Clock, Plus, Download } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table } from '../components/UI';
import toast from 'react-hot-toast';

const Compliance = () => {
  const [activeTab, setActiveTab] = useState('policies');
  const [policies, setPolicies] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      console.log('📤 Fetching compliance data...');
      const policiesResponse = await fetch('http://localhost:5000/api/compliance', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const auditsResponse = await fetch('http://localhost:5000/api/compliance/audits', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const policiesData = await policiesResponse.json();
      const auditsData = await auditsResponse.json();
      
      setPolicies(policiesData || []);
      setAudits(auditsData || []);
      console.log('✅ Compliance data loaded:', policiesData?.length || 0, 'policies,', auditsData?.length || 0, 'audits');
    } catch (err) {
      console.error('❌ Error fetching compliance data:', err);
      setError(err.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const policyColumns = [
    {
      key: 'name',
      label: 'Policy Name',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value}</p>
          <p className="text-xs text-slate-400">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      render: (value) => <span className="text-slate-200">{value}</span>,
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      render: (value) => <span className="text-slate-300">{value}</span>,
    },
    {
      key: 'acknowledgments',
      label: 'Acknowledgments',
      render: (value) => <span className="text-white font-bold">{value}%</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={value === 'active' ? 'green' : 'yellow'}>{value}</Badge>,
    },
  ];

  const auditColumns = [
    {
      key: 'title',
      label: 'Audit Name',
      render: (value) => <span className="font-semibold text-white">{value}</span>,
    },
    {
      key: 'department',
      label: 'Department',
      render: (value) => <span className="text-slate-200">{value}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (value) => <span className="text-slate-300">{value}</span>,
    },
    {
      key: 'findings',
      label: 'Findings',
      render: (value) => (
        <span className={value > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge
          variant={
            value === 'completed'
              ? 'green'
              : value === 'in-progress'
              ? 'blue'
              : 'gray'
          }
        >
          {value}
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Compliance
            </h1>
            <p className="text-slate-400 mt-2">Manage policies, audits, and compliance tracking</p>
          </div>
          <Button onClick={() => alert('Exporting policies...')} className="flex items-center gap-2">
            <Plus size={20} />
            New Policy
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Active Policies</p>
                <p className="text-2xl font-black text-white mt-1">
                  {policies.filter((p) => p.status === 'active').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Completed Audits</p>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  {audits.filter((a) => a.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Pending Audits</p>
                <p className="text-2xl font-black text-amber-300 mt-1">
                  {audits.filter((a) => a.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['policies', 'audits'].map((tab) => (
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

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Compliance Policies</h3>
              <Download size={18} className="text-slate-400" />
            </div>
            <Table columns={policyColumns} data={policies} />
          </Card>
        )}

        {/* Audits Tab */}
        {activeTab === 'audits' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Compliance Audits</h3>
            <Table columns={auditColumns} data={audits} />
          </Card>
        )}

        {/* Compliance Checklist */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Compliance Checklist</h3>
          <div className="space-y-3">
            {[
              { item: 'Anti-Money Laundering Compliance', completed: true },
              { item: 'Export Control Regulations', completed: true },
              { item: 'Environmental Compliance', completed: false },
              { item: 'Data Retention Policy', completed: true },
              { item: 'Whistleblower Program', completed: false },
            ].map((check, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                <input
                  type="checkbox"
                  checked={check.completed}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-white/20 accent-cyan-400"
                />
                <span className="text-slate-200">{check.item}</span>
                {check.completed && <CheckCircle size={16} className="ml-auto text-emerald-400" />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Compliance;
