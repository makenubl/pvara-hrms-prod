import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { Globe2, ShieldCheck, Lock, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button } from '../components/UI';

const RolesMatrix = () => {
  const regions = ['Global', 'EU', 'US', 'APAC'];
  const roles = [
    { name: 'Admin', perms: ['All permissions', 'Identity', 'Billing', 'Audit'] },
    { name: 'HR Director', perms: ['Policies', 'Comp Bands', 'Approvals'] },
    { name: 'Regional HR', perms: ['Employees', 'Leave/Time', 'Local Compliance'] },
    { name: 'Payroll Manager', perms: ['Payroll Runs', 'GL Export', 'Disbursements'] },
    { name: 'Manager', perms: ['Approvals', 'Team View', 'Performance Inputs'] },
    { name: 'Employee', perms: ['Self Service', 'Leave', 'Pay/Benefits'] },
  ];

  const risk = [
    { title: 'Segregation of Duties', detail: 'Payroll + Approver + Admin combined' },
    { title: 'High-risk Exports', detail: 'Unmasked PII export for non-admins' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Access Governance</p>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions Matrix</h1>
            <p className="text-gray-600 max-w-3xl">Region-scoped RBAC with SoD guardrails and export controls for compliant global operations.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="bg-white border border-gray-200">Export matrix</Button>
            <Button>New role</Button>
          </div>
        </div>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Globe2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Region scope</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <Badge key={r} variant="blue" className="cursor-pointer">{r}</Badge>
            ))}
          </div>
        </Card>

        <Card className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Key permissions</th>
                  <th className="py-3 px-3">Data export</th>
                  <th className="py-3 px-3">SoD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr key={role.name} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-semibold text-gray-900">{role.name}</td>
                    <td className="py-3 px-3 text-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {role.perms.map((p) => (
                          <Badge key={p} variant="gray" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-700">Masked exports only</td>
                    <td className="py-3 px-3 text-gray-700">No conflicts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-900">Controls</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="font-semibold text-gray-900">Export control</p>
              <p>Mask PII for non-admins, watermark downloads, log all exports.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="font-semibold text-gray-900">SoD guardrails</p>
              <p>Block payroll + approver + admin combo; force approval chains.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="font-semibold text-gray-900">Region scoping</p>
              <p>Limit role scopes by entity/region; enforce residency rules.</p>
            </div>
          </div>
        </Card>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900">Risks detected</h3>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            {risk.map((r, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">{r.title}</p>
                  <p>{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm">Resolve conflicts</Button>
            <Button size="sm" variant="secondary" className="bg-white border border-gray-200">Schedule review</Button>
          </div>
        </Card>

        <Card className="border border-gray-200 bg-green-50 text-green-800">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold">Recommendations</h3>
          </div>
          <p className="text-sm">Enable step-up auth for payroll actions, enforce masked exports for Managers, and enable quarterly access reviews.</p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RolesMatrix;
