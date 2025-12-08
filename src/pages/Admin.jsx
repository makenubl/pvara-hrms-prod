import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { Shield, Users, Key, Activity, Lock } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';

const Admin = () => {
  const roles = [
    { name: 'Admin', permissions: 42, desc: 'Full platform control' },
    { name: 'HR Manager', permissions: 28, desc: 'People ops, payroll, compliance' },
    { name: 'People Partner', permissions: 18, desc: 'Employee support, reviews, L&D' },
    { name: 'Manager', permissions: 12, desc: 'Team approvals, performance, hiring' },
    { name: 'Employee', permissions: 8, desc: 'Self-service, time off, learning' },
  ];

  const audit = [
    { actor: 'Jane Miller', action: 'Updated payroll cycle for EU', time: '2m ago' },
    { actor: 'Alex Wong', action: 'Approved 3 vendor access requests', time: '18m ago' },
    { actor: 'Priya Singh', action: 'Rotated API key: finance-svc', time: '1h ago' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Governance</p>
            <h1 className="text-3xl font-bold text-gray-900">Admin & Access Control</h1>
            <p className="text-gray-600 max-w-2xl">Enterprise-grade RBAC, audit trails, and least-privilege defaults for safer scale.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="bg-white border border-gray-200">Download policy</Button>
            <Button>New role</Button>
          </div>
        </div>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Role presets</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.name} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-900">{role.name}</p>
                  <Badge variant="blue" className="text-xs">{role.permissions} perms</Badge>
                </div>
                <p className="text-sm text-gray-600">{role.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Just-in-time access</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Time-bound roles, approval chains, and session recording for sensitive actions.</p>
            <Button size="sm">Configure JIT</Button>
          </Card>
          <Card className="border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">SSO & MFA</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Enforce SSO, WebAuthn, step-up auth for payroll/PII, and IP allowlists.</p>
            <Button size="sm">Manage identity</Button>
          </Card>
        </div>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Audit log</h3>
          </div>
          <div className="space-y-3">
            {audit.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold">
                    {item.actor.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.actor}</p>
                    <p className="text-sm text-gray-600">{item.action}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 whitespace-nowrap">{item.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Admin;
