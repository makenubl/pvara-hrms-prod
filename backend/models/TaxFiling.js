import mongoose from 'mongoose';

/**
 * Tax Filing Report Schema
 * For FBR compliance reports (WHT statements, sales tax returns)
 */

const whtDetailSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  vendorName: String,
  vendorNTN: String,
  vendorCNIC: String,
  paymentDate: Date,
  invoiceNumber: String,
  paymentReference: String,
  grossAmount: Number,
  whtSection: String, // 153(1a), 153(1b), etc.
  whtRate: Number,
  whtAmount: Number,
  netAmount: Number,
  isFiler: Boolean,
  // For CPR (Computerized Payment Receipt)
  cprNumber: String,
  cprDate: Date,
});

const taxFilingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Report type
    reportType: {
      type: String,
      enum: [
        'wht_monthly',        // Monthly WHT statement
        'wht_annual',         // Annual WHT statement
        'sales_tax_return',   // Monthly Sales Tax Return
        'income_tax_return',  // Annual Income Tax Return
        'wht_challan',        // WHT payment challan
        'withholding_statement_417',  // Statement u/s 165
      ],
      required: true,
    },
    // Period
    period: {
      type: String, // YYYY-MM for monthly, YYYY-YYYY for annual
      required: true,
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    month: Number, // 1-12 for monthly reports
    // For monthly WHT
    whtDetails: [whtDetailSchema],
    // Summary by section
    whtSummary: {
      section153_1a: { count: Number, grossAmount: Number, whtAmount: Number },
      section153_1b: { count: Number, grossAmount: Number, whtAmount: Number },
      section153_1c: { count: Number, grossAmount: Number, whtAmount: Number },
      section233: { count: Number, grossAmount: Number, whtAmount: Number },
      section234: { count: Number, grossAmount: Number, whtAmount: Number },
      section235: { count: Number, grossAmount: Number, whtAmount: Number },
      salary: { count: Number, grossAmount: Number, whtAmount: Number },
      other: { count: Number, grossAmount: Number, whtAmount: Number },
    },
    // Totals
    totalGrossAmount: {
      type: Number,
      default: 0,
    },
    totalWHTAmount: {
      type: Number,
      default: 0,
    },
    totalNetAmount: {
      type: Number,
      default: 0,
    },
    // Payment details
    challanNumber: String,
    challanDate: Date,
    bankName: String,
    bankBranch: String,
    depositSlipNumber: String,
    // Filing status
    status: {
      type: String,
      enum: ['draft', 'generated', 'reviewed', 'filed', 'revised'],
      default: 'draft',
    },
    // FBR submission
    fbrSubmissionDate: Date,
    fbrAcknowledgementNumber: String,
    fbrPSID: String, // Payment Slip ID
    // Attachments
    attachments: [{
      name: String,
      type: { type: String, enum: ['challan', 'acknowledgement', 'excel', 'xml', 'other'] },
      url: String,
    }],
    // Workflow
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    generatedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    filedAt: Date,
    // Notes
    notes: String,
  },
  { timestamps: true }
);

// Indexes
taxFilingSchema.index({ company: 1, reportType: 1, period: 1 }, { unique: true });
taxFilingSchema.index({ company: 1, fiscalYear: 1 });
taxFilingSchema.index({ company: 1, status: 1 });

// Calculate totals before save
taxFilingSchema.pre('save', function(next) {
  if (this.whtDetails && this.whtDetails.length > 0) {
    this.totalGrossAmount = this.whtDetails.reduce((sum, d) => sum + (d.grossAmount || 0), 0);
    this.totalWHTAmount = this.whtDetails.reduce((sum, d) => sum + (d.whtAmount || 0), 0);
    this.totalNetAmount = this.whtDetails.reduce((sum, d) => sum + (d.netAmount || 0), 0);
    
    // Calculate summary by section
    const sections = ['153(1a)', '153(1b)', '153(1c)', '233', '234', '235'];
    const sectionMap = {
      '153(1a)': 'section153_1a',
      '153(1b)': 'section153_1b',
      '153(1c)': 'section153_1c',
      '233': 'section233',
      '234': 'section234',
      '235': 'section235',
    };
    
    this.whtSummary = {};
    sections.forEach(section => {
      const key = sectionMap[section];
      const sectionDetails = this.whtDetails.filter(d => d.whtSection === section);
      this.whtSummary[key] = {
        count: sectionDetails.length,
        grossAmount: sectionDetails.reduce((sum, d) => sum + (d.grossAmount || 0), 0),
        whtAmount: sectionDetails.reduce((sum, d) => sum + (d.whtAmount || 0), 0),
      };
    });
    
    // Other sections
    const otherDetails = this.whtDetails.filter(d => !sections.includes(d.whtSection) && d.whtSection !== 'salary');
    this.whtSummary.other = {
      count: otherDetails.length,
      grossAmount: otherDetails.reduce((sum, d) => sum + (d.grossAmount || 0), 0),
      whtAmount: otherDetails.reduce((sum, d) => sum + (d.whtAmount || 0), 0),
    };
    
    // Salary
    const salaryDetails = this.whtDetails.filter(d => d.whtSection === 'salary');
    this.whtSummary.salary = {
      count: salaryDetails.length,
      grossAmount: salaryDetails.reduce((sum, d) => sum + (d.grossAmount || 0), 0),
      whtAmount: salaryDetails.reduce((sum, d) => sum + (d.whtAmount || 0), 0),
    };
  }
  
  next();
});

// Method to generate FBR XML format
taxFilingSchema.methods.generateFBRXML = function() {
  // XML generation for FBR IRIS portal
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const details = this.whtDetails.map(d => `
    <Record>
      <NTN>${d.vendorNTN || ''}</NTN>
      <CNIC>${d.vendorCNIC || ''}</CNIC>
      <Name>${d.vendorName || ''}</Name>
      <GrossAmount>${d.grossAmount || 0}</GrossAmount>
      <TaxDeducted>${d.whtAmount || 0}</TaxDeducted>
      <Section>${d.whtSection || ''}</Section>
      <Rate>${d.whtRate || 0}</Rate>
      <FilerStatus>${d.isFiler ? 'Filer' : 'Non-Filer'}</FilerStatus>
    </Record>
  `).join('');
  
  return `${xmlHeader}
<WHT_Statement>
  <Period>${this.period}</Period>
  <FiscalYear>${this.fiscalYear}</FiscalYear>
  <Records>${details}</Records>
  <TotalGross>${this.totalGrossAmount}</TotalGross>
  <TotalWHT>${this.totalWHTAmount}</TotalWHT>
</WHT_Statement>`;
};

export default mongoose.model('TaxFiling', taxFilingSchema);
