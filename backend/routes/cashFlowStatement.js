import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================================
// CASH FLOW STATEMENT MODULE - CA/CFO CRITICAL (Issue #16)
// Provides IAS 7 compliant Statement of Cash Flows
// Indirect Method with proper classification
// ============================================================================

// ============================================================================
// GET /indirect - Cash Flow Statement (Indirect Method)
// ============================================================================
router.get('/indirect', authenticate, async (req, res) => {
  try {
    const { fiscalYear, startDate, endDate } = req.query;
    
    // Determine period
    let periodStart, periodEnd;
    
    if (startDate && endDate) {
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    } else if (fiscalYear) {
      const [startYear, endYear] = fiscalYear.split('-').map(Number);
      periodStart = new Date(startYear, 6, 1); // July 1
      periodEnd = new Date(endYear, 5, 30, 23, 59, 59, 999); // June 30
    } else {
      // Current fiscal year
      const now = new Date();
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      periodStart = new Date(startYear, 6, 1);
      periodEnd = now;
    }
    
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
    const previousPeriodEnd = new Date(periodEnd);
    previousPeriodEnd.setFullYear(previousPeriodEnd.getFullYear() - 1);
    
    const JournalEntry = mongoose.model('JournalEntry');
    const ChartOfAccount = mongoose.model('ChartOfAccount');
    
    // Get all accounts
    const accounts = await ChartOfAccount.find({ company: req.user.company }).lean();
    const accountMap = {};
    accounts.forEach(a => { accountMap[a._id.toString()] = a; });
    
    // Helper: Get account balance at a point in time
    const getBalanceAtDate = async (accountTypes, endDate, accountCodePattern = null) => {
      const typeAccounts = accounts.filter(a => {
        if (!accountTypes.includes(a.accountType)) return false;
        if (accountCodePattern && !new RegExp(accountCodePattern).test(a.accountCode)) return false;
        return true;
      });
      
      const accountIds = typeAccounts.map(a => a._id);
      
      const result = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lte: endDate }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': { $in: accountIds } } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      if (!result[0]) return 0;
      
      // Asset and Expense: Debit balance (Debit - Credit)
      // Liability, Equity, Revenue: Credit balance (Credit - Debit)
      const normalDebitTypes = ['Asset', 'Expense'];
      if (normalDebitTypes.includes(accountTypes[0])) {
        return result[0].totalDebit - result[0].totalCredit;
      }
      return result[0].totalCredit - result[0].totalDebit;
    };
    
    // Helper: Get period activity
    const getPeriodActivity = async (accountTypes, startDate, endDate, accountCodePattern = null) => {
      const typeAccounts = accounts.filter(a => {
        if (!accountTypes.includes(a.accountType)) return false;
        if (accountCodePattern && !new RegExp(accountCodePattern).test(a.accountCode)) return false;
        return true;
      });
      
      const accountIds = typeAccounts.map(a => a._id);
      
      const result = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $gte: startDate, $lte: endDate }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': { $in: accountIds } } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      if (!result[0]) return { debit: 0, credit: 0, net: 0 };
      
      return {
        debit: result[0].totalDebit,
        credit: result[0].totalCredit,
        net: result[0].totalDebit - result[0].totalCredit
      };
    };
    
    // ========================================================================
    // SECTION A: OPERATING ACTIVITIES (Indirect Method)
    // ========================================================================
    
    // 1. Net Income (Revenue - Expenses)
    const revenueBalance = await getBalanceAtDate(['Revenue'], periodEnd);
    const previousRevenueBalance = await getBalanceAtDate(['Revenue'], periodStart);
    const periodRevenue = revenueBalance - previousRevenueBalance;
    
    const expenseBalance = await getBalanceAtDate(['Expense'], periodEnd);
    const previousExpenseBalance = await getBalanceAtDate(['Expense'], periodStart);
    const periodExpenses = expenseBalance - previousExpenseBalance;
    
    const netIncome = periodRevenue - periodExpenses;
    
    // 2. Non-Cash Adjustments
    // Depreciation/Amortization (typically 6xxx expense accounts)
    const depreciation = await getPeriodActivity(['Expense'], periodStart, periodEnd, '^6[0-5]');
    const depreciationExpense = depreciation.debit || 0;
    
    // 3. Working Capital Changes
    // Accounts Receivable (decrease = source, increase = use)
    const arEndBalance = await getBalanceAtDate(['Asset'], periodEnd, '^11[2-4]');
    const arStartBalance = await getBalanceAtDate(['Asset'], periodStart, '^11[2-4]');
    const arChange = -(arEndBalance - arStartBalance); // Negative because increase uses cash
    
    // Inventory
    const invEndBalance = await getBalanceAtDate(['Asset'], periodEnd, '^12');
    const invStartBalance = await getBalanceAtDate(['Asset'], periodStart, '^12');
    const inventoryChange = -(invEndBalance - invStartBalance);
    
    // Prepaid Expenses
    const prepaidEndBalance = await getBalanceAtDate(['Asset'], periodEnd, '^13');
    const prepaidStartBalance = await getBalanceAtDate(['Asset'], periodStart, '^13');
    const prepaidChange = -(prepaidEndBalance - prepaidStartBalance);
    
    // Accounts Payable (increase = source, decrease = use)
    const apEndBalance = await getBalanceAtDate(['Liability'], periodEnd, '^21');
    const apStartBalance = await getBalanceAtDate(['Liability'], periodStart, '^21');
    const apChange = apEndBalance - apStartBalance;
    
    // Accrued Liabilities
    const accruedEndBalance = await getBalanceAtDate(['Liability'], periodEnd, '^22');
    const accruedStartBalance = await getBalanceAtDate(['Liability'], periodStart, '^22');
    const accruedChange = accruedEndBalance - accruedStartBalance;
    
    // Tax Payable
    const taxEndBalance = await getBalanceAtDate(['Liability'], periodEnd, '^23');
    const taxStartBalance = await getBalanceAtDate(['Liability'], periodStart, '^23');
    const taxPayableChange = taxEndBalance - taxStartBalance;
    
    const operatingActivities = {
      netIncome,
      adjustments: {
        depreciation: depreciationExpense,
        // Add other non-cash items here
      },
      workingCapitalChanges: {
        accountsReceivable: arChange,
        inventory: inventoryChange,
        prepaidExpenses: prepaidChange,
        accountsPayable: apChange,
        accruedLiabilities: accruedChange,
        taxPayable: taxPayableChange
      },
      netCashFromOperating: 
        netIncome + 
        depreciationExpense + 
        arChange + inventoryChange + prepaidChange + 
        apChange + accruedChange + taxPayableChange
    };
    
    // ========================================================================
    // SECTION B: INVESTING ACTIVITIES
    // ========================================================================
    
    // Fixed Asset Purchases (15xxx accounts)
    const faActivity = await getPeriodActivity(['Asset'], periodStart, periodEnd, '^15');
    const fixedAssetPurchases = -faActivity.debit; // Negative = cash outflow
    
    // Fixed Asset Disposals (credit to FA accounts)
    const fixedAssetDisposals = faActivity.credit;
    
    // Investments (16xxx accounts)
    const invActivity = await getPeriodActivity(['Asset'], periodStart, periodEnd, '^16');
    const investmentPurchases = -invActivity.debit;
    const investmentSales = invActivity.credit;
    
    const investingActivities = {
      fixedAssetPurchases,
      fixedAssetDisposals,
      investmentPurchases,
      investmentSales,
      netCashFromInvesting: 
        fixedAssetPurchases + fixedAssetDisposals + 
        investmentPurchases + investmentSales
    };
    
    // ========================================================================
    // SECTION C: FINANCING ACTIVITIES
    // ========================================================================
    
    // Long-term Loans (24xxx-25xxx)
    const loanActivity = await getPeriodActivity(['Liability'], periodStart, periodEnd, '^2[45]');
    const loanProceeds = loanActivity.credit;
    const loanRepayments = -loanActivity.debit;
    
    // Share Capital (31xxx)
    const capitalActivity = await getPeriodActivity(['Equity'], periodStart, periodEnd, '^31');
    const shareIssuance = capitalActivity.credit;
    
    // Dividends Paid (from Retained Earnings 32xxx)
    const dividendActivity = await getPeriodActivity(['Equity'], periodStart, periodEnd, '^32');
    const dividendsPaid = -dividendActivity.debit;
    
    const financingActivities = {
      loanProceeds,
      loanRepayments,
      shareIssuance,
      dividendsPaid,
      netCashFromFinancing: 
        loanProceeds + loanRepayments + shareIssuance + dividendsPaid
    };
    
    // ========================================================================
    // CASH RECONCILIATION
    // ========================================================================
    
    // Cash accounts (10xxx-11xxx bank/cash)
    const cashEndBalance = await getBalanceAtDate(['Asset'], periodEnd, '^1[01][0-1]');
    const cashStartBalance = await getBalanceAtDate(['Asset'], periodStart, '^1[01][0-1]');
    
    const netCashChange = 
      operatingActivities.netCashFromOperating +
      investingActivities.netCashFromInvesting +
      financingActivities.netCashFromFinancing;
    
    const calculatedEndCash = cashStartBalance + netCashChange;
    const reconciliationVariance = cashEndBalance - calculatedEndCash;
    
    res.json({
      success: true,
      data: {
        statement: 'Statement of Cash Flows',
        method: 'Indirect',
        period: {
          from: periodStart,
          to: periodEnd,
          fiscalYear: fiscalYear || `${periodStart.getFullYear()}-${periodEnd.getFullYear()}`
        },
        company: req.user.company,
        
        operatingActivities,
        investingActivities,
        financingActivities,
        
        summary: {
          netCashFromOperating: operatingActivities.netCashFromOperating,
          netCashFromInvesting: investingActivities.netCashFromInvesting,
          netCashFromFinancing: financingActivities.netCashFromFinancing,
          netChangeInCash: netCashChange,
          openingCashBalance: cashStartBalance,
          closingCashBalance: cashEndBalance,
          calculatedClosingCash: calculatedEndCash,
          reconciliationVariance
        },
        
        isReconciled: Math.abs(reconciliationVariance) < 1,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Cash flow statement error:', error);
    res.status(500).json({ message: 'Error generating cash flow statement', error: error.message });
  }
});

// ============================================================================
// GET /direct - Cash Flow Statement (Direct Method)
// ============================================================================
router.get('/direct', authenticate, async (req, res) => {
  try {
    const { fiscalYear, startDate, endDate } = req.query;
    
    // Determine period
    let periodStart, periodEnd;
    
    if (startDate && endDate) {
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    } else if (fiscalYear) {
      const [startYear, endYear] = fiscalYear.split('-').map(Number);
      periodStart = new Date(startYear, 6, 1);
      periodEnd = new Date(endYear, 5, 30, 23, 59, 59, 999);
    } else {
      const now = new Date();
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      periodStart = new Date(startYear, 6, 1);
      periodEnd = now;
    }
    
    const JournalEntry = mongoose.model('JournalEntry');
    const ChartOfAccount = mongoose.model('ChartOfAccount');
    const BankPayment = mongoose.model('BankPayment');
    
    // Get cash/bank accounts
    const cashAccounts = await ChartOfAccount.find({
      company: req.user.company,
      accountCode: { $regex: /^1[01][0-1]/ }
    }).lean();
    
    const cashAccountIds = cashAccounts.map(a => a._id);
    
    // Get all journal entries affecting cash accounts
    const cashEntries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $gte: periodStart, $lte: periodEnd }
        }
      },
      { $unwind: '$lines' },
      { $match: { 'lines.account': { $in: cashAccountIds } } },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'lines.account',
          foreignField: '_id',
          as: 'accountInfo'
        }
      },
      { $unwind: '$accountInfo' },
      {
        $project: {
          entryNumber: 1,
          entryDate: 1,
          description: 1,
          reference: 1,
          line: '$lines',
          accountInfo: 1
        }
      },
      { $sort: { entryDate: 1 } }
    ]);
    
    // Classify cash flows by looking at the OTHER side of the transaction
    const operating = { receipts: [], payments: [] };
    const investing = { receipts: [], payments: [] };
    const financing = { receipts: [], payments: [] };
    
    // Get full journal entries to classify based on contra accounts
    for (const entry of cashEntries) {
      // Get the full entry to see contra accounts
      const fullEntry = await JournalEntry.findById(entry._id)
        .populate('lines.account')
        .lean();
      
      if (!fullEntry) continue;
      
      // Find contra accounts (non-cash lines)
      const contraLines = fullEntry.lines.filter(
        l => !cashAccountIds.some(id => id.equals(l.account._id))
      );
      
      const cashAmount = entry.line.debit - entry.line.credit;
      const isReceipt = cashAmount > 0;
      const amount = Math.abs(cashAmount);
      
      // Classify based on contra account
      for (const contra of contraLines) {
        const code = contra.account?.accountCode || '';
        const type = contra.account?.accountType || '';
        
        let category = 'operating';
        
        // Investing: Fixed Assets (15xxx), Investments (16xxx)
        if (/^1[56]/.test(code)) {
          category = 'investing';
        }
        // Financing: Long-term Loans (24xxx-25xxx), Capital (31xxx)
        else if (/^2[45]|^31/.test(code)) {
          category = 'financing';
        }
        // Revenue/Expense/AP/AR = Operating
        
        const item = {
          date: entry.entryDate,
          description: entry.description,
          reference: entry.reference,
          contraAccount: contra.account?.accountName,
          amount
        };
        
        if (category === 'operating') {
          if (isReceipt) operating.receipts.push(item);
          else operating.payments.push(item);
        } else if (category === 'investing') {
          if (isReceipt) investing.receipts.push(item);
          else investing.payments.push(item);
        } else {
          if (isReceipt) financing.receipts.push(item);
          else financing.payments.push(item);
        }
        break; // Classify once per entry
      }
    }
    
    // Calculate totals
    const sumAmount = items => items.reduce((sum, i) => sum + i.amount, 0);
    
    const operatingReceipts = sumAmount(operating.receipts);
    const operatingPayments = sumAmount(operating.payments);
    const investingReceipts = sumAmount(investing.receipts);
    const investingPayments = sumAmount(investing.payments);
    const financingReceipts = sumAmount(financing.receipts);
    const financingPayments = sumAmount(financing.payments);
    
    res.json({
      success: true,
      data: {
        statement: 'Statement of Cash Flows',
        method: 'Direct',
        period: {
          from: periodStart,
          to: periodEnd
        },
        
        operatingActivities: {
          receipts: operating.receipts,
          payments: operating.payments,
          totalReceipts: operatingReceipts,
          totalPayments: operatingPayments,
          netCashFromOperating: operatingReceipts - operatingPayments
        },
        
        investingActivities: {
          receipts: investing.receipts,
          payments: investing.payments,
          totalReceipts: investingReceipts,
          totalPayments: investingPayments,
          netCashFromInvesting: investingReceipts - investingPayments
        },
        
        financingActivities: {
          receipts: financing.receipts,
          payments: financing.payments,
          totalReceipts: financingReceipts,
          totalPayments: financingPayments,
          netCashFromFinancing: financingReceipts - financingPayments
        },
        
        summary: {
          netCashFromOperating: operatingReceipts - operatingPayments,
          netCashFromInvesting: investingReceipts - investingPayments,
          netCashFromFinancing: financingReceipts - financingPayments,
          netChangeInCash: 
            (operatingReceipts - operatingPayments) +
            (investingReceipts - investingPayments) +
            (financingReceipts - financingPayments)
        },
        
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Cash flow direct method error:', error);
    res.status(500).json({ message: 'Error generating cash flow statement', error: error.message });
  }
});

// ============================================================================
// GET /forecast - Cash Flow Forecast
// ============================================================================
router.get('/forecast', authenticate, async (req, res) => {
  try {
    const { months = 3 } = req.query;
    
    const JournalEntry = mongoose.model('JournalEntry');
    const ChartOfAccount = mongoose.model('ChartOfAccount');
    
    // Get historical monthly cash flows for trend analysis
    const now = new Date();
    const historicalMonths = 6;
    
    const monthlyFlows = [];
    
    for (let i = historicalMonths; i >= 1; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      // Get cash accounts
      const cashAccounts = await ChartOfAccount.find({
        company: req.user.company,
        accountCode: { $regex: /^1[01][0-1]/ }
      }).lean();
      
      const cashAccountIds = cashAccounts.map(a => a._id);
      
      const result = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': { $in: cashAccountIds } } },
        {
          $group: {
            _id: null,
            inflows: { $sum: '$lines.debit' },
            outflows: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      monthlyFlows.push({
        month: monthStart.toLocaleString('en-PK', { month: 'short', year: 'numeric' }),
        inflows: result[0]?.inflows || 0,
        outflows: result[0]?.outflows || 0,
        net: (result[0]?.inflows || 0) - (result[0]?.outflows || 0)
      });
    }
    
    // Calculate averages and trends
    const avgInflows = monthlyFlows.reduce((s, m) => s + m.inflows, 0) / monthlyFlows.length;
    const avgOutflows = monthlyFlows.reduce((s, m) => s + m.outflows, 0) / monthlyFlows.length;
    const avgNet = avgInflows - avgOutflows;
    
    // Simple trend (last 3 months vs previous 3)
    const recentAvg = monthlyFlows.slice(-3).reduce((s, m) => s + m.net, 0) / 3;
    const earlierAvg = monthlyFlows.slice(0, 3).reduce((s, m) => s + m.net, 0) / 3;
    const trendPercent = earlierAvg !== 0 ? ((recentAvg - earlierAvg) / Math.abs(earlierAvg)) * 100 : 0;
    
    // Generate forecast
    const forecast = [];
    let currentCash = monthlyFlows[monthlyFlows.length - 1]?.net || 0;
    
    for (let i = 1; i <= parseInt(months); i++) {
      const forecastMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const projectedInflows = avgInflows * (1 + trendPercent / 100);
      const projectedOutflows = avgOutflows;
      const projectedNet = projectedInflows - projectedOutflows;
      
      currentCash += projectedNet;
      
      forecast.push({
        month: forecastMonth.toLocaleString('en-PK', { month: 'short', year: 'numeric' }),
        projectedInflows,
        projectedOutflows,
        projectedNet,
        cumulativeCash: currentCash
      });
    }
    
    res.json({
      success: true,
      data: {
        historical: monthlyFlows,
        forecast,
        analysis: {
          averageMonthlyInflows: avgInflows,
          averageMonthlyOutflows: avgOutflows,
          averageNetFlow: avgNet,
          trendPercent: trendPercent.toFixed(2),
          trendDirection: trendPercent > 0 ? 'IMPROVING' : trendPercent < 0 ? 'DECLINING' : 'STABLE'
        }
      }
    });
    
  } catch (error) {
    console.error('Cash flow forecast error:', error);
    res.status(500).json({ message: 'Error generating forecast', error: error.message });
  }
});

export default router;
