import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SUBSCRIPTION_PLANS, PAYMENT_CYCLES } from '../utils/subscriptionPlans';
import { useCompanyStore } from '../store/companyStore';
import { Card, Button, Badge } from '../components/UI';

const Pricing = () => {
  const navigate = useNavigate();
  const { setSubscription } = useCompanyStore();
  const [billingCycle, setBillingCycle] = useState(PAYMENT_CYCLES.MONTHLY);

  const handleSelectPlan = (plan) => {
    // Create subscription object
    const subscription = {
      planId: plan.id,
      planName: plan.name,
      status: plan.id === 'trial' ? 'trial' : 'active',
      price: billingCycle === PAYMENT_CYCLES.ANNUAL ? plan.priceAnnual : plan.price,
      billingCycle,
      startDate: new Date().toISOString(),
      expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString(),
      limits: plan.limits,
    };

    setSubscription(subscription);
    
    if (plan.id === 'trial') {
      toast.success('14-day free trial activated!');
      navigate('/onboarding');
    } else {
      toast.success(`${plan.name} plan selected! Proceeding to payment...`);
      // In real app, redirect to payment gateway
      setTimeout(() => {
        navigate('/onboarding');
      }, 1500);
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'trial':
        return <Zap className="w-8 h-8" />;
      case 'starter':
        return <Building2 className="w-8 h-8" />;
      case 'professional':
        return <Crown className="w-8 h-8" />;
      case 'enterprise':
        return <Building2 className="w-8 h-8" />;
      default:
        return <Building2 className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start with a 14-day free trial. No credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle(PAYMENT_CYCLES.MONTHLY)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingCycle === PAYMENT_CYCLES.MONTHLY
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle(PAYMENT_CYCLES.ANNUAL)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingCycle === PAYMENT_CYCLES.ANNUAL
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-8 ${
                plan.popular
                  ? 'ring-2 ring-blue-600 shadow-xl transform scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute top-4 right-4 bg-blue-600 text-white">
                  Popular
                </Badge>
              )}

              {/* Icon */}
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${
                plan.popular ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {getPlanIcon(plan.id)}
              </div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                {plan.price === 0 ? (
                  <div>
                    <span className="text-4xl font-bold text-gray-900">Free</span>
                    <span className="text-gray-600"> / 14 days</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-4xl font-bold text-gray-900">
                      ${billingCycle === PAYMENT_CYCLES.ANNUAL ? plan.priceAnnual : plan.price}
                    </span>
                    <span className="text-gray-600">
                      {billingCycle === PAYMENT_CYCLES.ANNUAL ? ' / year' : ' / month'}
                    </span>
                    {billingCycle === PAYMENT_CYCLES.ANNUAL && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${(plan.price * 12) - plan.priceAnnual} annually
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSelectPlan(plan)}
                variant={plan.popular ? 'primary' : 'secondary'}
                className="w-full mb-6"
              >
                {plan.id === 'trial' ? 'Start Free Trial' : 'Get Started'}
              </Button>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Limits Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {plan.limits.employees === -1
                    ? 'Unlimited employees'
                    : `Up to ${plan.limits.employees} employees`}
                </p>
                <p className="text-xs text-gray-500">
                  {plan.limits.storage} GB storage
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 text-left">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600 text-sm">
                No setup fees! You only pay for your subscription. We'll help you get started for free.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel anytime. Your data remains accessible until the end of your billing period.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-8 text-gray-500">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
