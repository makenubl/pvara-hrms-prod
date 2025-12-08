export const SUBSCRIPTION_PLANS = {
  TRIAL: {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    duration: 14, // days
    features: [
      'Up to 10 employees',
      'Basic attendance tracking',
      'Leave management',
      'Email support',
      'Mobile app access',
    ],
    limits: {
      employees: 10,
      storage: 1, // GB
    }
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceAnnual: 490, // 2 months free
    duration: 30,
    features: [
      'Up to 50 employees',
      'All attendance features',
      'Leave & time-off management',
      'Basic payroll',
      'Reports & analytics',
      'Priority email support',
      'Mobile app access',
      'Custom branding',
    ],
    limits: {
      employees: 50,
      storage: 10, // GB
    },
    popular: false,
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 149,
    priceAnnual: 1490, // 2 months free
    duration: 30,
    features: [
      'Up to 200 employees',
      'Advanced attendance & shifts',
      'Complete payroll management',
      'Performance management',
      'Recruitment & ATS',
      'Learning & development',
      'Advanced analytics',
      'API access',
      'Phone & email support',
      'Custom branding & themes',
      'SSO integration',
    ],
    limits: {
      employees: 200,
      storage: 50, // GB
    },
    popular: true,
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399,
    priceAnnual: 3990, // 2 months free
    duration: 30,
    features: [
      'Unlimited employees',
      'All Professional features',
      'Multi-location support',
      'Advanced compliance tools',
      'Custom workflows',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom integrations',
      'On-premise deployment option',
      'Advanced security features',
      'Custom training',
      'SLA guarantee',
    ],
    limits: {
      employees: -1, // unlimited
      storage: 500, // GB
    },
    popular: false,
  },
};

export const PAYMENT_CYCLES = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
};
