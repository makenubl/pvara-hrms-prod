import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { Shield, UserCheck, UserX, Clock, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';

const AccessReviews = () => {
  const reviews = [
    { name: 'Q4 Access Review', scope: 'Global', due: 'Due in 7 days', items: 128, status: 'In progress' },
    { name: 'EU Payroll Review', scope: 'EU', due: 'Due in 3 days', items: 42, status: 'Pending' },
  ];

  const items = [
    { user: 'Alex Wong', role: 'Admin + Payroll', region: 'Global', risk: 'SoD conflict', age: '180 days', action: 'Revoke' },
    { user: 'Priya Singh', role: 'Manager', region: 'EU', risk: 'Export access', age: '120 days', action: 'Keep' },
    { user: 'Jane Miller', role: 'HR Director', region: 'US', risk: 'None', age: '90 days', action: 'Keep' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Access Reviews</p>
            <h1 className="text-3xl font-bold text-gray-900">Quarterly Attestations & SoD</h1>
            <p className="text-gray-600 max-w-3xl">Attest or revoke access by role, region, and risk. Drive compliance with SoD guardrails and export controls.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="bg-white border border-gray-200">Upload evidence</Button>
            <Button>Start review</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <Card key={r.name} className="border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">{r.name}</p>
                  <p className="text-sm text-gray-600">{r.scope}</p>
                </div>
                <Badge variant="yellow" className="text-xs">{r.status}</Badge>
              </div>
              <p className="text-sm text-gray-600">{r.items} items • {r.due}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm">Continue</Button>
                <Button size="sm" variant="secondary" className="bg-white border border-gray-200">Export CSV</Button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <p className="font-semibold text-gray-900">Review items</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Badge variant="red">SoD risk</Badge>
              <Badge variant="blue">Export</Badge>
              <Badge variant="green">No risk</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Risk</th>
                  <th className="py-3 px-3">Age</th>
                  <th className="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-semibold text-gray-900">{item.user}</td>
                    <td className="py-3 px-3 text-gray-700">{item.role}</td>
                    <td className="py-3 px-3 text-gray-700">{item.region}</td>
                    <td className="py-3 px-3 text-gray-700">
                      {item.risk === 'SoD conflict' ? (
                        <Badge variant="red" className="text-xs">SoD</Badge>
                      ) : item.risk === 'Export access' ? (
                        <Badge variant="blue" className="text-xs">Export</Badge>
                      ) : (
                        <Badge variant="green" className="text-xs">Clean</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-700">{item.age}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" className="bg-white border border-gray-200">Keep</Button>
                        <Button size="sm" variant="danger">Revoke</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border border-gray-200 bg-amber-50 text-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">SoD highlights</h3>
          </div>
          <p className="text-sm">Resolve Admin + Payroll overlaps, and enforce dual approvals for exports in EU region.</p>
        </Card>

        <Card className="border border-gray-200 bg-green-50 text-green-800">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold">Recommendations</h3>
          </div>
          <p className="text-sm">Enable quarterly attestations, auto-expire elevated roles after 30 days, and require step-up auth for payroll actions.</p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AccessReviews;
