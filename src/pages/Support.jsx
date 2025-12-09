import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { LifeBuoy, Mail, MessageSquare, Phone, BookOpen, Clock } from 'lucide-react';
import { Card, Button } from '../components/UI';

const Support = () => {
  const channels = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Live Chat',
      desc: 'Average response time under 2 minutes during business hours.',
      badge: 'Priority',
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Support',
      desc: '24/7 global coverage with follow-the-sun routing.',
      badge: '24/7',
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Phone Hotline',
      desc: 'Dedicated CSM line for enterprise customers.',
      badge: 'Enterprise',
    },
  ];

  const resources = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Knowledge Base',
      desc: 'Implementation guides, playbooks, and troubleshooting.',
    },
    {
      icon: <LifeBuoy className="w-6 h-6" />,
      title: 'Customer Success',
      desc: 'Onboarding, QBRs, and adoption best practices.',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'SLA & Uptime',
      desc: '99.9% uptime SLA with proactive incident comms.',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Support & Success</p>
            <h1 className="text-3xl font-bold text-gray-900">We run with your team</h1>
            <p className="text-gray-600 max-w-2xl">Multi-channel support, dedicated CSMs, and enterprise SLAs to keep HR operations smooth at scale.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="bg-white border border-gray-200" onClick={() => alert('Opening SLA...')}>View SLA</Button>
            <Button onClick={() => alert('Contacting support...')}>Contact Support</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {channels.map((item) => (
            <Card key={item.title} className="border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">{item.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-blue-600">{item.badge}</p>
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {resources.map((item) => (
            <Card key={item.title} className="border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-green-600">Enterprise Coverage</p>
              <h3 className="text-xl font-bold text-gray-900">Follow-the-sun support with 30-minute P1 response</h3>
              <p className="text-gray-600 text-sm">Dedicated incident comms, scheduled maintenance windows, and proactive status updates.</p>
            </div>
            <Button onClick={() => alert('Booking call...')} className="whitespace-nowrap">Book a call</Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Support;
