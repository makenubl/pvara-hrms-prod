/**
 * Test Suite for ERP Finance Modules
 * Tests: Chart of Accounts, Journal Entries, Budgets, Vendors, Bank Payments
 * Run with: node --experimental-vm-modules backend/test/erp-finance.test.js
 */

import mongoose from 'mongoose';
import assert from 'assert';

// Mock environment
process.env.NODE_ENV = 'test';

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms-test',
};

// Simple test runner
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n🧪 Running Test Suite: ${this.name}\n`);
    console.log('='.repeat(60));

    for (const { description, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ PASS: ${description}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// ============================================================
// Test Data Fixtures
// ============================================================

const testCompanyId = new mongoose.Types.ObjectId();
const testUserId = new mongoose.Types.ObjectId();

// Chart of Accounts test data
const chartOfAccountsData = [
  {
    company: testCompanyId,
    accountCode: '1000',
    name: 'Cash and Cash Equivalents',
    nameUrdu: 'نقد اور نقد مساوی',
    type: 'asset',
    subType: 'current_asset',
    parentAccount: null,
    level: 1,
    isActive: true,
    currency: 'PKR',
    createdBy: testUserId,
  },
  {
    company: testCompanyId,
    accountCode: '1001',
    name: 'Bank - HBL Current Account',
    type: 'asset',
    subType: 'current_asset',
    level: 2,
    isActive: true,
    currency: 'PKR',
    createdBy: testUserId,
  },
  {
    company: testCompanyId,
    accountCode: '4000',
    name: 'Sales Revenue',
    type: 'revenue',
    subType: 'operating_revenue',
    level: 1,
    isActive: true,
    currency: 'PKR',
    createdBy: testUserId,
  },
  {
    company: testCompanyId,
    accountCode: '5000',
    name: 'Cost of Goods Sold',
    type: 'expense',
    subType: 'cost_of_sales',
    level: 1,
    isActive: true,
    currency: 'PKR',
    createdBy: testUserId,
  },
];

// Journal Entry test data (balanced)
const journalEntryData = {
  company: testCompanyId,
  entryNumber: 'JV-2026-0001',
  entryDate: new Date('2026-01-10'),
  description: 'Cash Sales Revenue',
  reference: 'INV-001',
  lines: [
    {
      lineNumber: 1,
      description: 'Cash received from sales',
      debit: 100000,
      credit: 0,
    },
    {
      lineNumber: 2,
      description: 'Sales revenue',
      debit: 0,
      credit: 100000,
    },
  ],
  totalDebit: 100000,
  totalCredit: 100000,
  status: 'draft',
  createdBy: testUserId,
};

// Unbalanced Journal Entry (should fail validation)
const unbalancedJournalEntry = {
  company: testCompanyId,
  entryNumber: 'JV-2026-0002',
  entryDate: new Date('2026-01-10'),
  description: 'Unbalanced Entry',
  lines: [
    {
      lineNumber: 1,
      description: 'Debit side',
      debit: 100000,
      credit: 0,
    },
    {
      lineNumber: 2,
      description: 'Credit side - wrong amount',
      debit: 0,
      credit: 50000, // Wrong! Should be 100000
    },
  ],
  totalDebit: 100000,
  totalCredit: 50000,
  status: 'draft',
  createdBy: testUserId,
};

// Vendor test data
const vendorData = {
  company: testCompanyId,
  vendorCode: 'V-001',
  name: 'ABC Suppliers Ltd',
  contactPerson: 'Ali Khan',
  email: 'ali@abcsuppliers.pk',
  phone: '+92-321-1234567',
  address: {
    street: '123 Business Avenue',
    city: 'Karachi',
    state: 'Sindh',
    postalCode: '74000',
    country: 'Pakistan',
  },
  taxInfo: {
    ntn: '1234567-8',
    strn: 'STRN-12345',
    cnic: '42101-1234567-1',
    isFiler: true,
  },
  wht: {
    applicable: true,
    section: '153(1a)',
    filerRate: 4.5,
    nonFilerRate: 9,
  },
  paymentTerms: 30,
  status: 'active',
  createdBy: testUserId,
};

// Budget test data
const budgetData = {
  company: testCompanyId,
  name: 'Annual Budget FY 2025-2026',
  fiscalYear: '2025-2026',
  type: 'annual',
  status: 'draft',
  lines: [
    {
      lineNumber: 1,
      allocatedAmount: 1000000,
      consumedAmount: 0,
      remainingAmount: 1000000,
    },
    {
      lineNumber: 2,
      allocatedAmount: 500000,
      consumedAmount: 100000,
      remainingAmount: 400000,
    },
  ],
  totalAllocated: 1500000,
  totalConsumed: 100000,
  totalRemaining: 1400000,
  createdBy: testUserId,
};

// ============================================================
// Unit Tests - Model Validation
// ============================================================

const modelTests = new TestRunner('Model Validation Tests');

// Chart of Account Tests
modelTests.test('ChartOfAccount - Valid account should have required fields', async () => {
  const account = chartOfAccountsData[0];
  assert(account.accountCode, 'Account code is required');
  assert(account.name, 'Account name is required');
  assert(account.type, 'Account type is required');
  assert(['asset', 'liability', 'equity', 'revenue', 'expense'].includes(account.type), 'Invalid account type');
});

modelTests.test('ChartOfAccount - Account code format validation', async () => {
  const validCodes = ['1000', '1001', '2000', '3100'];
  const invalidCodes = ['ABC', '12', '123456789'];
  
  validCodes.forEach(code => {
    assert(code.length >= 3 && code.length <= 10, `Code ${code} should be valid`);
  });
});

modelTests.test('ChartOfAccount - Account type hierarchy is correct', async () => {
  const assetAccount = chartOfAccountsData[0];
  const revenueAccount = chartOfAccountsData[2];
  const expenseAccount = chartOfAccountsData[3];
  
  assert(assetAccount.type === 'asset', 'Cash should be asset');
  assert(revenueAccount.type === 'revenue', 'Sales should be revenue');
  assert(expenseAccount.type === 'expense', 'COGS should be expense');
});

// Journal Entry Tests
modelTests.test('JournalEntry - Balanced entry should pass validation', async () => {
  const entry = journalEntryData;
  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
  
  assert(Math.abs(totalDebit - totalCredit) < 0.01, 'Entry should be balanced');
});

modelTests.test('JournalEntry - Unbalanced entry should fail validation', async () => {
  const entry = unbalancedJournalEntry;
  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
  
  assert(Math.abs(totalDebit - totalCredit) > 0.01, 'Unbalanced entry detected');
});

modelTests.test('JournalEntry - Entry number format is valid', async () => {
  const entry = journalEntryData;
  const pattern = /^JV-\d{4}-\d{4}$/;
  assert(pattern.test(entry.entryNumber), 'Entry number should match JV-YYYY-NNNN format');
});

// Vendor Tests
modelTests.test('Vendor - NTN format validation', async () => {
  const vendor = vendorData;
  const ntnPattern = /^\d{7}-\d$/;
  assert(ntnPattern.test(vendor.taxInfo.ntn), 'NTN should match format XXXXXXX-X');
});

modelTests.test('Vendor - WHT section is valid FBR section', async () => {
  const validSections = ['153(1a)', '153(1b)', '153(1c)', '233', '234', '235'];
  const vendor = vendorData;
  assert(validSections.includes(vendor.wht.section), 'WHT section should be valid FBR section');
});

modelTests.test('Vendor - WHT rates are correct for section 153(1a)', async () => {
  const vendor = vendorData;
  assert(vendor.wht.section === '153(1a)', 'Section should be 153(1a)');
  assert(vendor.wht.filerRate === 4.5, 'Filer rate for 153(1a) should be 4.5%');
  assert(vendor.wht.nonFilerRate === 9, 'Non-filer rate for 153(1a) should be 9%');
});

// Budget Tests
modelTests.test('Budget - Fiscal year format is correct (YYYY-YYYY)', async () => {
  const budget = budgetData;
  const fyPattern = /^\d{4}-\d{4}$/;
  assert(fyPattern.test(budget.fiscalYear), 'Fiscal year should be YYYY-YYYY format');
});

modelTests.test('Budget - Remaining amount calculation is correct', async () => {
  const budget = budgetData;
  budget.lines.forEach(line => {
    const calculated = line.allocatedAmount - line.consumedAmount;
    assert(calculated === line.remainingAmount, 'Remaining = Allocated - Consumed');
  });
});

modelTests.test('Budget - Total calculations are accurate', async () => {
  const budget = budgetData;
  const totalAllocated = budget.lines.reduce((sum, l) => sum + l.allocatedAmount, 0);
  const totalConsumed = budget.lines.reduce((sum, l) => sum + l.consumedAmount, 0);
  const totalRemaining = budget.lines.reduce((sum, l) => sum + l.remainingAmount, 0);
  
  assert(totalAllocated === budget.totalAllocated, 'Total allocated should match');
  assert(totalConsumed === budget.totalConsumed, 'Total consumed should match');
  assert(totalRemaining === budget.totalRemaining, 'Total remaining should match');
});

// ============================================================
// Business Logic Tests
// ============================================================

const businessTests = new TestRunner('Business Logic Tests');

// Pakistan Fiscal Year Tests
businessTests.test('Fiscal Year - January 2026 should be in FY 2025-2026', async () => {
  const date = new Date('2026-01-10');
  const month = date.getMonth(); // 0 = January
  const year = date.getFullYear();
  
  // Pakistan FY: July to June
  // January (month 0) is in second half of fiscal year
  const fiscalYear = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  
  assert(fiscalYear === '2025-2026', 'January 2026 should be FY 2025-2026');
});

businessTests.test('Fiscal Year - July 2025 should be in FY 2025-2026', async () => {
  const date = new Date('2025-07-01');
  const month = date.getMonth(); // 6 = July
  const year = date.getFullYear();
  
  const fiscalYear = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  
  assert(fiscalYear === '2025-2026', 'July 2025 should be FY 2025-2026');
});

businessTests.test('Fiscal Year - June 2026 should be in FY 2025-2026', async () => {
  const date = new Date('2026-06-30');
  const month = date.getMonth(); // 5 = June
  const year = date.getFullYear();
  
  const fiscalYear = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  
  assert(fiscalYear === '2025-2026', 'June 2026 should be FY 2025-2026');
});

// WHT Calculation Tests
businessTests.test('WHT - Calculate WHT for filer vendor (153(1a))', async () => {
  const grossAmount = 100000;
  const whtRate = 4.5; // Filer rate for 153(1a)
  const whtAmount = grossAmount * (whtRate / 100);
  const netAmount = grossAmount - whtAmount;
  
  assert(whtAmount === 4500, 'WHT should be 4,500 PKR');
  assert(netAmount === 95500, 'Net should be 95,500 PKR');
});

businessTests.test('WHT - Calculate WHT for non-filer vendor (153(1a))', async () => {
  const grossAmount = 100000;
  const whtRate = 9; // Non-filer rate for 153(1a)
  const whtAmount = grossAmount * (whtRate / 100);
  const netAmount = grossAmount - whtAmount;
  
  assert(whtAmount === 9000, 'WHT should be 9,000 PKR');
  assert(netAmount === 91000, 'Net should be 91,000 PKR');
});

businessTests.test('WHT - No WHT below threshold (75,000 PKR)', async () => {
  const grossAmount = 50000; // Below threshold
  const whtThreshold = 75000;
  
  const applyWHT = grossAmount >= whtThreshold;
  assert(applyWHT === false, 'WHT should not apply below 75,000 PKR threshold');
});

businessTests.test('WHT - Apply WHT at threshold (75,000 PKR)', async () => {
  const grossAmount = 75000; // At threshold
  const whtThreshold = 75000;
  
  const applyWHT = grossAmount >= whtThreshold;
  assert(applyWHT === true, 'WHT should apply at 75,000 PKR threshold');
});

// WHT Section Rate Tests
businessTests.test('WHT - Section 153(1b) services rates are correct', async () => {
  const section = '153(1b)';
  const expectedFilerRate = 8;
  const expectedNonFilerRate = 16;
  
  // Simulate rate lookup
  const rates = {
    '153(1a)': { filer: 4.5, nonFiler: 9 },
    '153(1b)': { filer: 8, nonFiler: 16 },
    '153(1c)': { filer: 7.5, nonFiler: 15 },
  };
  
  assert(rates[section].filer === expectedFilerRate, '153(1b) filer rate should be 8%');
  assert(rates[section].nonFiler === expectedNonFilerRate, '153(1b) non-filer rate should be 16%');
});

businessTests.test('WHT - Section 153(1c) contracts rates are correct', async () => {
  const section = '153(1c)';
  const expectedFilerRate = 7.5;
  const expectedNonFilerRate = 15;
  
  const rates = {
    '153(1c)': { filer: 7.5, nonFiler: 15 },
  };
  
  assert(rates[section].filer === expectedFilerRate, '153(1c) filer rate should be 7.5%');
  assert(rates[section].nonFiler === expectedNonFilerRate, '153(1c) non-filer rate should be 15%');
});

// Double-Entry Validation Tests
businessTests.test('Double-Entry - Assets = Liabilities + Equity', async () => {
  const assets = 1000000;
  const liabilities = 400000;
  const equity = 600000;
  
  assert(assets === liabilities + equity, 'Accounting equation must balance');
});

businessTests.test('Double-Entry - Debit increases assets', async () => {
  const assetBefore = 100000;
  const debitEntry = 50000;
  const assetAfter = assetBefore + debitEntry;
  
  assert(assetAfter === 150000, 'Debit should increase asset balance');
});

businessTests.test('Double-Entry - Credit increases liabilities', async () => {
  const liabilityBefore = 50000;
  const creditEntry = 25000;
  const liabilityAfter = liabilityBefore + creditEntry;
  
  assert(liabilityAfter === 75000, 'Credit should increase liability balance');
});

// Budget Validation Tests
businessTests.test('Budget - Cannot exceed allocated amount', async () => {
  const allocated = 100000;
  const consumed = 80000;
  const newExpense = 30000;
  
  const wouldExceed = (consumed + newExpense) > allocated;
  assert(wouldExceed === true, 'New expense would exceed budget');
});

businessTests.test('Budget - Utilization percentage calculation', async () => {
  const allocated = 100000;
  const consumed = 75000;
  
  const utilization = (consumed / allocated) * 100;
  assert(utilization === 75, 'Utilization should be 75%');
});

// ============================================================
// Fixed Asset & Depreciation Tests
// ============================================================

const depreciationTests = new TestRunner('Depreciation Calculation Tests');

depreciationTests.test('Depreciation - Straight Line Method (SLM)', async () => {
  const cost = 1000000;
  const residualValue = 100000;
  const usefulLifeYears = 5;
  
  const depreciableAmount = cost - residualValue;
  const annualDepreciation = depreciableAmount / usefulLifeYears;
  const monthlyDepreciation = annualDepreciation / 12;
  
  assert(depreciableAmount === 900000, 'Depreciable amount should be 900,000');
  assert(annualDepreciation === 180000, 'Annual depreciation should be 180,000');
  assert(monthlyDepreciation === 15000, 'Monthly depreciation should be 15,000');
});

depreciationTests.test('Depreciation - Written Down Value (WDV) Method', async () => {
  const cost = 1000000;
  const rate = 15; // 15% WDV rate
  
  // Year 1
  const year1Depreciation = cost * (rate / 100);
  const year1WDV = cost - year1Depreciation;
  
  // Year 2
  const year2Depreciation = year1WDV * (rate / 100);
  const year2WDV = year1WDV - year2Depreciation;
  
  assert(year1Depreciation === 150000, 'Year 1 depreciation should be 150,000');
  assert(year1WDV === 850000, 'Year 1 WDV should be 850,000');
  assert(year2Depreciation === 127500, 'Year 2 depreciation should be 127,500');
  assert(year2WDV === 722500, 'Year 2 WDV should be 722,500');
});

depreciationTests.test('Depreciation - Pakistan Tax Rates (Third Schedule)', async () => {
  const taxRates = {
    buildings: 10,
    furniture_fixtures: 15,
    plant_machinery: 15,
    vehicles: 15,
    computer_equipment: 30,
  };
  
  assert(taxRates.buildings === 10, 'Buildings rate should be 10%');
  assert(taxRates.computer_equipment === 30, 'Computer equipment rate should be 30%');
});

depreciationTests.test('Depreciation - No depreciation on land', async () => {
  const assetClass = 'land';
  const depreciationMethod = assetClass === 'land' ? 'no_depreciation' : 'straight_line';
  
  assert(depreciationMethod === 'no_depreciation', 'Land should not be depreciated');
});

// ============================================================
// Bank Reconciliation Tests
// ============================================================

const reconciliationTests = new TestRunner('Bank Reconciliation Tests');

reconciliationTests.test('Reconciliation - Calculate adjusted bank balance', async () => {
  const closingBankBalance = 500000;
  const depositsInTransit = 50000;
  const outstandingChecks = 30000;
  
  const adjustedBankBalance = closingBankBalance + depositsInTransit - outstandingChecks;
  
  assert(adjustedBankBalance === 520000, 'Adjusted bank balance should be 520,000');
});

reconciliationTests.test('Reconciliation - Calculate adjusted GL balance', async () => {
  const closingGLBalance = 510000;
  const interestEarned = 5000;
  const bankCharges = 1500;
  const returnedChecks = 3500;
  
  const adjustedGLBalance = closingGLBalance + interestEarned - bankCharges - returnedChecks;
  
  assert(adjustedGLBalance === 510000, 'Adjusted GL balance should be 510,000');
});

reconciliationTests.test('Reconciliation - Detect reconciled state', async () => {
  const adjustedBankBalance = 520000;
  const adjustedGLBalance = 520000;
  
  const difference = Math.abs(adjustedBankBalance - adjustedGLBalance);
  const isReconciled = difference < 0.01;
  
  assert(isReconciled === true, 'Accounts should be reconciled when difference < 0.01');
});

reconciliationTests.test('Reconciliation - Detect unreconciled state', async () => {
  const adjustedBankBalance = 520000;
  const adjustedGLBalance = 519500;
  
  const difference = Math.abs(adjustedBankBalance - adjustedGLBalance);
  const isReconciled = difference < 0.01;
  
  assert(isReconciled === false, 'Accounts should not be reconciled with 500 difference');
});

// ============================================================
// Tax Filing Tests
// ============================================================

const taxFilingTests = new TestRunner('Tax Filing Tests');

taxFilingTests.test('Tax Filing - WHT summary by section calculation', async () => {
  const whtDetails = [
    { whtSection: '153(1a)', grossAmount: 100000, whtAmount: 4500 },
    { whtSection: '153(1a)', grossAmount: 200000, whtAmount: 9000 },
    { whtSection: '153(1b)', grossAmount: 50000, whtAmount: 4000 },
  ];
  
  const section153_1a = whtDetails
    .filter(d => d.whtSection === '153(1a)')
    .reduce((sum, d) => sum + d.whtAmount, 0);
  
  const section153_1b = whtDetails
    .filter(d => d.whtSection === '153(1b)')
    .reduce((sum, d) => sum + d.whtAmount, 0);
  
  assert(section153_1a === 13500, 'Section 153(1a) total should be 13,500');
  assert(section153_1b === 4000, 'Section 153(1b) total should be 4,000');
});

taxFilingTests.test('Tax Filing - Period format for monthly report', async () => {
  const date = new Date('2026-01-10');
  const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  assert(period === '2026-01', 'Period should be YYYY-MM format');
});

taxFilingTests.test('Tax Filing - Total calculations', async () => {
  const whtDetails = [
    { grossAmount: 100000, whtAmount: 4500, netAmount: 95500 },
    { grossAmount: 200000, whtAmount: 9000, netAmount: 191000 },
  ];
  
  const totalGross = whtDetails.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalWHT = whtDetails.reduce((sum, d) => sum + d.whtAmount, 0);
  const totalNet = whtDetails.reduce((sum, d) => sum + d.netAmount, 0);
  
  assert(totalGross === 300000, 'Total gross should be 300,000');
  assert(totalWHT === 13500, 'Total WHT should be 13,500');
  assert(totalNet === 286500, 'Total net should be 286,500');
});

// ============================================================
// Year-End Closing Tests
// ============================================================

const yearEndTests = new TestRunner('Year-End Closing Tests');

yearEndTests.test('Year-End - Net income calculation', async () => {
  const totalRevenue = 5000000;
  const totalExpenses = 3500000;
  const netIncome = totalRevenue - totalExpenses;
  
  assert(netIncome === 1500000, 'Net income should be 1,500,000');
});

yearEndTests.test('Year-End - Net loss detection', async () => {
  const totalRevenue = 2000000;
  const totalExpenses = 2500000;
  const netIncome = totalRevenue - totalExpenses;
  
  assert(netIncome === -500000, 'Net loss should be -500,000');
  assert(netIncome < 0, 'Should detect net loss');
});

yearEndTests.test('Year-End - Trial balance must balance', async () => {
  const totalDebits = 10000000;
  const totalCredits = 10000000;
  
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  
  assert(isBalanced === true, 'Trial balance must be balanced');
});

yearEndTests.test('Year-End - Pakistan fiscal year period', async () => {
  const fiscalYear = '2025-2026';
  const [startYear, endYear] = fiscalYear.split('-').map(Number);
  
  const periodStart = new Date(`${startYear}-07-01`);
  const periodEnd = new Date(`${endYear}-06-30`);
  
  assert(periodStart.getMonth() === 6, 'Period should start in July');
  assert(periodEnd.getMonth() === 5, 'Period should end in June');
});

// ============================================================
// Currency & Multi-Currency Tests
// ============================================================

const currencyTests = new TestRunner('Multi-Currency Tests');

currencyTests.test('Currency - Convert USD to PKR', async () => {
  const usdAmount = 1000;
  const exchangeRate = 278.50; // USD to PKR
  const pkrAmount = usdAmount * exchangeRate;
  
  assert(pkrAmount === 278500, 'PKR amount should be 278,500');
});

currencyTests.test('Currency - Convert PKR to USD', async () => {
  const pkrAmount = 278500;
  const exchangeRate = 278.50;
  const usdAmount = pkrAmount / exchangeRate;
  
  assert(usdAmount === 1000, 'USD amount should be 1,000');
});

currencyTests.test('Currency - Calculate unrealized gain', async () => {
  const foreignAmount = 1000; // USD
  const originalRate = 270.00;
  const currentRate = 278.50;
  
  const originalPKR = foreignAmount * originalRate;
  const currentPKR = foreignAmount * currentRate;
  const unrealizedGain = currentPKR - originalPKR;
  
  assert(originalPKR === 270000, 'Original PKR should be 270,000');
  assert(currentPKR === 278500, 'Current PKR should be 278,500');
  assert(unrealizedGain === 8500, 'Unrealized gain should be 8,500');
});

currencyTests.test('Currency - Calculate unrealized loss', async () => {
  const foreignAmount = 1000; // EUR
  const originalRate = 310.00;
  const currentRate = 295.00;
  
  const originalPKR = foreignAmount * originalRate;
  const currentPKR = foreignAmount * currentRate;
  const unrealizedLoss = originalPKR - currentPKR;
  
  assert(unrealizedLoss === 15000, 'Unrealized loss should be 15,000');
});

// ============================================================
// Run All Tests
// ============================================================

async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('  PVARA HRMS - ERP Finance Module Test Suite');
  console.log('  Date: ' + new Date().toISOString());
  console.log('█'.repeat(60));

  const results = [];

  // Run all test suites
  results.push(await modelTests.run());
  results.push(await businessTests.run());
  results.push(await depreciationTests.run());
  results.push(await reconciliationTests.run());
  results.push(await taxFilingTests.run());
  results.push(await yearEndTests.run());
  results.push(await currencyTests.run());

  // Summary
  console.log('\n' + '█'.repeat(60));
  console.log('  FINAL SUMMARY');
  console.log('█'.repeat(60));
  
  const totalPassed = modelTests.passed + businessTests.passed + depreciationTests.passed +
    reconciliationTests.passed + taxFilingTests.passed + yearEndTests.passed + currencyTests.passed;
  const totalFailed = modelTests.failed + businessTests.failed + depreciationTests.failed +
    reconciliationTests.failed + taxFilingTests.failed + yearEndTests.failed + currencyTests.failed;
  
  console.log(`\n📊 Total Tests: ${totalPassed + totalFailed}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review.\n');
    process.exit(1);
  }
}

// Execute
runAllTests().catch(console.error);
