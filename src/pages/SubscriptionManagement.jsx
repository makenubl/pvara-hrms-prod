import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, Download, AlertCircle, Crown, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCompanyStore } from '../store/companyStore';
import { SUBSCRIPTION_PLANS } from '../utils/subscriptionPlans';
import { Card, Button, Badge, Modal } from '../components/UI';

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { subscription, setSubscription, getSubscriptionInfo } = useCompanyStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan] = useState(null);

  const currentPlan = subscription ? SUBSCRIPTION_PLANS[subscription.planId] : null;
  const subscriptionInfo = getSubscriptionInfo();

  const confirmUpgrade = () => {
    if (!selectedPlan) return;

    const newSubscription = {
      ...subscription,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      price: selectedPlan.price,
      status: 'active',
      startDate: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      limits: selectedPlan.limits,
    };

    setSubscription(newSubscription);
    setShowUpgradeModal(false);
    toast.success(`Successfully upgraded to ${selectedPlan.name}!`);
  };

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      const cancelledSubscription = {
        ...subscription,
        status: 'cancelled',
      };
      setSubscription(cancelledSubscription);
      toast.error('Subscription cancelled');
    }
  };

  const handleDownloadInvoice = (invoice) => {
    toast.success(`Downloading invoice ${invoice.id}...`);
    // In real app, download PDF invoice
  };

  // Mock billing history
  const billingHistory = [
    {
      id: 'INV-2024-001',
      date: '2024-01-15',
      amount: currentPlan?.price || 0,
      status: 'paid',
      planName: currentPlan?.name || 'N/A',
    },
    {
      id: 'INV-2023-012',
      date: '2023-12-15',
      amount: currentPlan?.price || 0,
      status: 'paid',
      planName: currentPlan?.name || 'N/A',
    },
  ];

  if (!subscription || !currentPlan) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto text-center p-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
          <p className="text-gray-600 mb-6">
            You don't have an active subscription. Choose a plan to get started.
          </p>
          <Button onClick={() => navigate('/pricing')} variant="primary">
            View Pricing Plans
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">Current Plan</h2>
                  {currentPlan.popular && (
                    <Badge className="bg-blue-100 text-blue-700">Popular</Badge>
                  )}
                  <Badge
                    className={
                      subscriptionInfo.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }
                  >
                    {subscriptionInfo.status}
                  </Badge>
                </div>
                <p className="text-gray-600">You are currently on the {currentPlan.name} plan</p>
              </div>
              <Crown className="w-12 h-12 text-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${subscription.price}
                  <span className="text-sm font-normal text-gray-600">
                    /{subscription.billingCycle}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Next Billing Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(subscription.expiresAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">{subscriptionInfo.daysRemaining} days remaining</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Plan Features</h3>
              <ul className="grid grid-cols-2 gap-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              {subscription.planId !== 'enterprise' && (
                <Button
                  onClick={() => navigate('/pricing')}
                  variant="primary"
                >
                  Upgrade Plan
                </Button>
              )}
              <Button
                onClick={handleCancelSubscription}
                variant="danger"
              >
                Cancel Subscription
              </Button>
            </div>
          </Card>

          {/* Billing History */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Billing History</h2>
            <div className="space-y-3">
              {billingHistory.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{invoice.id}</p>
                      <p className="text-sm text-gray-600">{invoice.planName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${invoice.amount}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Paid</Badge>
                    <Button
                      onClick={() => handleDownloadInvoice(invoice)}
                      variant="secondary"
                      size="sm"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Usage & Limits */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Usage & Limits</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Employees</span>
                  <span className="text-sm font-semibold text-gray-900">
                    15 / {subscription.limits.employees === -1 ? '∞' : subscription.limits.employees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: subscription.limits.employees === -1 ? '15%' : `${(15 / subscription.limits.employees) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Storage</span>
                  <span className="text-sm font-semibold text-gray-900">
                    2.4 GB / {subscription.limits.storage} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(2.4 / subscription.limits.storage) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">API Calls (this month)</span>
                  <span className="text-sm font-semibold text-gray-900">1,247</span>
                </div>
                {subscription.limits.api && (
                  <p className="text-xs text-gray-500">
                    Unlimited API access with {currentPlan.name}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
              <CreditCard className="w-6 h-6 text-gray-600" />
              <div>
                <p className="font-semibold text-gray-900">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-600">Expires 12/2025</p>
              </div>
            </div>
            <Button variant="secondary" className="w-full">
              Update Payment Method
            </Button>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <Calendar className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Need More?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upgrade to Enterprise for unlimited employees, priority support, and advanced features.
            </p>
            <Button variant="primary" className="w-full" onClick={() => navigate('/pricing')}>
              View Plans
            </Button>
          </Card>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <Modal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title={`Upgrade to ${selectedPlan.name}`}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              You are about to upgrade your subscription to the {selectedPlan.name} plan.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>New monthly price:</strong> ${selectedPlan.price}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Billing starts:</strong> Immediately
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={confirmUpgrade} variant="primary" className="flex-1">
                Confirm Upgrade
              </Button>
              <Button onClick={() => setShowUpgradeModal(false)} variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SubscriptionManagement;
