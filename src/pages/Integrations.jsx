import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { Plug, Webhook, KeyRound, Slack, Github, Zap, Cloud, Database } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';

const Integrations = () => {
  const integrations = [
    { name: 'Slack', icon: <Slack className="w-5 h-5" />, status: 'Live', desc: 'Approvals, alerts, and HR bot in Slack.' },
    { name: 'Workday', icon: <Cloud className="w-5 h-5" />, status: 'Live', desc: 'HR data sync and payroll exports.' },
    { name: 'BambooHR', icon: <LeafIcon />, status: 'Live', desc: 'Employee records and PTO sync.' },
    { name: 'Greenhouse', icon: <Plug className="w-5 h-5" />, status: 'Beta', desc: 'ATS to PVARA candidate conversion.' },
    { name: 'Lever', icon: <Plug className="w-5 h-5" />, status: 'Beta', desc: 'Hiring pipeline to onboarding flows.' },
    { name: 'Okta', icon: <ShieldIcon />, status: 'Live', desc: 'SCIM/SSO for identity lifecycle.' },
  ];

  const webhooks = [
    { name: 'Employee created', url: 'https://hooks.company.com/pvara/employee', secret: '•••••••a9c', status: 'Active' },
    { name: 'Payroll processed', url: 'https://hooks.company.com/pvara/payroll', secret: '•••••••b4k', status: 'Active' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Platform & Extensibility</p>
            <h1 className="text-3xl font-bold text-gray-900">Integrations, API, and Webhooks</h1>
            <p className="text-gray-600 max-w-2xl">Enterprise-grade integrations, API keys, and event webhooks to embed PVARA into your stack.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="bg-white border border-gray-200">View docs</Button>
            <Button>New API key</Button>
          </div>
        </div>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Featured integrations</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {integrations.map((item) => (
              <div key={item.name} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold">
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">{item.icon}</div>
                    {item.name}
                  </div>
                  <Badge variant={item.status === 'Live' ? 'green' : 'yellow'} className="text-xs">{item.status}</Badge>
                </div>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">API keys</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Rotate secrets, scope per service, and enforce IP allowlists.</p>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="font-semibold">finance-svc</p>
                  <p className="text-gray-500">Created 3 days ago • Read/Write</p>
                </div>
                <Button size="sm" variant="secondary">Rotate</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="font-semibold">analytics-ro</p>
                  <p className="text-gray-500">Created 1 day ago • Read</p>
                </div>
                <Button size="sm" variant="secondary">Rotate</Button>
              </div>
            </div>
          </Card>

          <Card className="border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Webhook className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Webhooks</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Replay protection, signing secrets, and delivery history.</p>
            <div className="space-y-3 text-sm text-gray-700">
              {webhooks.map((hook) => (
                <div key={hook.name} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{hook.name}</p>
                    <Badge variant="blue" className="text-xs">{hook.status}</Badge>
                  </div>
                  <p className="text-gray-500 text-xs break-all">{hook.url}</p>
                  <p className="text-gray-500 text-xs">Secret: {hook.secret}</p>
                </div>
              ))}
              <Button size="sm" className="w-full">Add webhook</Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

// Minimal placeholder icons for BambooHR and Okta
const LeafIcon = () => (
  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 21c8 0 14-6 14-14V3a2 2 0 0 0-2-2h-4C7 1 3 5 3 10v11z" />
    <path d="M9 10h6" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default Integrations;
