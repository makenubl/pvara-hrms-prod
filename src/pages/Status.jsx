import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { Activity, Server, Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, Badge } from '../components/UI';

const Status = () => {
  const services = [
    { name: 'API', status: 'Operational', icon: Server },
    { name: 'Web App', status: 'Operational', icon: CheckCircle },
    { name: 'Auth', status: 'Operational', icon: Shield },
    { name: 'Notifications', status: 'Operational', icon: Activity },
  ];

  const incidents = [
    {
      id: '2025-12-08-1',
      severity: 'minor',
      title: 'Delayed webhooks in EU region',
      time: 'Resolved • 45m',
      detail: 'Autoscaling event caused queue delays; capacity increased.',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-600">Trust & Reliability</p>
            <h1 className="text-3xl font-bold text-gray-900">Status & Uptime</h1>
            <p className="text-gray-600 max-w-2xl">99.9% uptime SLA, proactive comms, and real-time visibility across all services.</p>
          </div>
          <Card className="border border-gray-200 bg-green-50 text-green-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6" />
              <div>
                <p className="text-sm font-semibold">All systems operational</p>
                <p className="text-xs text-green-700/80">Last updated just now</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <Card key={svc.name} className="border border-gray-200 text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{svc.name}</p>
                  <p className="text-sm text-green-600">{svc.status}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-900">Past Incidents</h3>
          </div>
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-4 rounded-lg border border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="yellow" className="text-xs">{incident.severity}</Badge>
                  <div>
                    <p className="font-semibold text-gray-900">{incident.title}</p>
                    <p className="text-sm text-gray-600">{incident.detail}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 whitespace-nowrap">{incident.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Status;
