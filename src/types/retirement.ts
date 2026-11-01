import { ExpatInputs } from './expat';

export type CanadianProvince = 
  | 'ON' // Ontario
  | 'BC' // British Columbia
  | 'AB' // Alberta
  | 'QC' // Quebec
  | 'MB' // Manitoba
  | 'SK' // Saskatchewan
  | 'NS' // Nova Scotia
  | 'NB' // New Brunswick
  | 'NL' // Newfoundland and Labrador
  | 'PE'; // Prince Edward Island

export type DrawdownStrategyType = 
  | 'tax_efficient' // Non-Reg -> RRSP/RRIF -> TFSA (protects TFSA tax-free compounding)
  | 'rrsp_meltdown' // Early RRSP withdrawals to smooth brackets & avoid OAS clawback at 71+
  | 'proportional'  // Pro-rata across all available accounts
  | 'tfsa_first'    // TFSA -> Non-Reg -> RRSP
  | 'minimize_overall_tax' // Lifetime bracket equalization across all career and retirement years
  | 'maximize_govt_pensions' // Maximize guaranteed lifetime CPP & OAS via bridge funding to age 70
  | 'minimize_post_retirement_tax'; // Minimizes cumulative taxes during post-retirement phase

export type MaritalStatus = 'single' | 'married' | 'divorced';

export type DebtCategory =
  | 'student_loan'
  | 'vehicle_loan'
  | 'personal_loan'
  | 'line_of_credit'
  | 'credit_card'
  | 'other';

export interface DebtItem {
  id: string;
  name: string;
  category: DebtCategory;
  initialBalance: number;
  interestRate: number; // annual % rate (0 for Canada Student Loans, or market APR)
  remainingTermMonths: number; // loan amortization in months
  monthlyPayment?: number; // optional custom payment; if 0/undefined, auto-amortized
  extraMonthlyPayment?: number; // early repayment: additional monthly principal prepayment ($/mo)
  earlyPayoffAge?: number; // early repayment: target age to pay off remaining loan in full
  lumpSumPrepaymentAmount?: number; // early repayment: optional one-time early lump-sum payment
  lumpSumPrepaymentAge?: number; // early repayment: age when one-time lump-sum payment occurs
  startAge?: number; // starting age for loan service (defaults to currentAge)
  notes?: string;
}

export interface DebtRepaymentStrategy {
  acceleratePayoff: boolean;
  extraMonthlyPayment: number; // additional monthly prepayment across debt portfolio ($/mo)
  strategyType: 'avalanche' | 'snowball' | 'pro_rata'; // avalanche (highest APR first) vs snowball (lowest balance first)
  targetPayoffAge?: number; // target age to eliminate remaining balance
  redirectFreedCashflowToSavings: boolean; // whether freed debt payments automatically flow into investment savings
}

export interface StressTestOptions {
  enabled: boolean;
  dropPercent: number; // e.g. 10 for 10% market crash
  timing: 'at_retirement' | 'immediate';
}

export interface SimulationOptions {
  stopContributionsAge?: number;
  isCoastCheck?: boolean;
}

export interface CareerDisruption {
  enabled: boolean;
  shockAge: number;
  reductionPercent: number; // e.g. 25 for 25% drop
  isTemporary: boolean;
  recoveryYears: number; // years before income recovers
}

export interface MonthlyExpenseEstimates {
  rentOrMortgage: number; // monthly rent or mortgage payment
  utilities: number; // electricity, heat, water, internet, phone
  creditCard: number; // groceries, dining, transport, subscriptions, retail
  otherExpenses: number; // insurance, healthcare, miscellaneous catch-all
  postRetirementAdjustmentPercent: number; // slider: e.g. -50% to +50% change post-retirement
  autoSyncMortgage?: boolean; // whether rentOrMortgage is auto-filled from real estate mortgage
}

export interface SpouseInputs {
  name: string;
  currentAge: number;
  retirementAge: number;
  annualIncome: number;
  incomeGrowthRate: number;
  careerDisruption?: CareerDisruption;

  // Spouse Accounts
  rrspBalance: number;
  rrspAnnualContribution: number;
  tfsaBalance: number;
  tfsaAnnualContribution: number;
  fhsaBalance: number;
  fhsaAnnualContribution: number;
  fhsaOpenYear?: number; // Year FHSA was opened (determines 15-year participation period)
  fhsaIntent: 'home_purchase' | 'rollover_to_rrsp';
  fhsaHomePurchaseAge: number;
  nonRegBalance: number;
  nonRegAnnualContribution: number;

  // Spouse Govt Pensions
  cppStartAge: number;
  cppEstimatedPercentOfMax: number;
  oasStartAge: number;
  oasEligibleYearsInCanada: number;

  // Canadian Couple Tax Optimization
  pensionIncomeSplitting: boolean; // allow up to 50% RRIF income splitting at 65+
}

export type RealEstatePurchaseType = 'current' | 'future';

export interface RealEstateInputs {
  ownsHome: boolean;
  purchaseType?: RealEstatePurchaseType; // 'current' (bought in past) | 'future' (renting now, buying later)
  futurePurchaseAge?: number; // Age of future home purchase (e.g. 35)
  currentRent?: number; // Monthly rent while currently renting before purchase
  useHbp?: boolean; // Use RRSP Home Buyers' Plan for down payment (up to $60k CRA limit)
  costOfHome: number; // Original purchase price / baseline cost of home in today's dollars
  currentMarketValue: number; // Estimated current market value
  downPayment: number; // Down payment paid upfront or target down payment
  mortgageInterestRate: number; // Annual mortgage interest rate (%)
  mortgageTermYears: number; // Amortization term in years (e.g. 25, 30)
  mortgageStartYear: number; // Year the mortgage originated (e.g. 2020)
  ownershipSharePercent: number; // User's ownership share of the home (e.g. 100% single, 50% couple)
  annualAppreciationRate: number; // Estimated annual appreciation rate (%)
  planToSellHome: boolean; // Whether the user plans to dispose/downsize the home
  sellHomeAge: number; // Age at which the home is sold
  sellingCostPercent: number; // Realtor, legal, and closing fees (%)

  // Future Home Purchase Down Payment Funding Accounts Selection
  fundWithFhsa?: boolean; // Use accumulated FHSA balance
  fundWithHbp?: boolean; // Use RRSP Home Buyers' Plan (HBP)
  fundWithTfsa?: boolean; // Use TFSA savings
  fundWithNonReg?: boolean; // Use Non-Registered / Taxable savings
  downPaymentPercentPreset?: 5 | 10 | 15 | 20 | 'custom'; // Selected down payment % preset or custom
  rentOverridden?: boolean; // True if user manually entered a custom rent in real estate tab
}

export type NonRegAccountCategory = 'savings' | 'investment' | 'gic';

export interface CustomNonRegAccount {
  id: string;
  name: string;
  category: NonRegAccountCategory; // 'savings' | 'investment' | 'gic'
  balance: number;
  annualContribution: number;
  expectedReturn: number; // % annual expected return
  gicCloseDate?: string; // Optional close date string e.g. "2028-11-30"
  gicCloseYear?: number; // Calendar year of maturity e.g. 2028
}

export interface AccountReturnRates {
  useCustomReturns?: boolean;
  rrspReturn: number; // % annual expected return for RRSP
  tfsaReturn: number; // % annual expected return for TFSA
  fhsaReturn: number; // % annual expected return for FHSA
  nonRegReturn: number; // % annual expected return for Taxable / Non-Registered
  rrspPostReturn?: number; // Optional post-retirement RRSP return
  tfsaPostReturn?: number; // Optional post-retirement TFSA return
  nonRegPostReturn?: number; // Optional post-retirement Non-Reg return
}

export interface RetirementInputs {
  // Personal & Marital Status
  maritalStatus: MaritalStatus;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  province: CanadianProvince;
  currentAnnualIncome: number;
  incomeGrowthRate: number; // percentage e.g. -5.0% to +8.0%
  careerDisruption?: CareerDisruption;
  monthlyExpenses?: MonthlyExpenseEstimates;
  targetRetirementSpendingToday: number; // in today's dollars (household budget)

  // Spouse Details (only applicable when maritalStatus === 'married')
  spouse?: SpouseInputs;

  // Real Estate & Home Ownership Asset
  realEstate?: RealEstateInputs;

  // Individual Account Rate of Returns
  accountReturns?: AccountReturnRates;

  // Current Account Balances (Primary)
  rrspBalance: number;
  tfsaBalance: number;
  fhsaBalance: number;
  nonRegBalance: number;

  // Pre-Retirement Annual Contributions (Primary)
  rrspAnnualContribution: number;
  tfsaAnnualContribution: number;
  fhsaAnnualContribution: number;
  nonRegAnnualContribution: number;

  // Custom Non-Registered Sub-Accounts (Savings, Investment, GIC)
  nonRegCustomAccounts?: CustomNonRegAccount[];

  // Consumer & Fixed-Term Debts (Student Loans, Auto Loans, Personal Loans, LOC)
  debts?: DebtItem[];
  debtStrategy?: DebtRepaymentStrategy;

  // FHSA Settings (Primary)
  fhsaOpenYear?: number; // Year FHSA account was opened (e.g. 2023-2026). Determines 15-year CRA participation limit
  fhsaIntent: 'home_purchase' | 'rollover_to_rrsp';
  fhsaHomePurchaseAge: number; // if home purchase, funds withdrawn tax-free at this age

  // Government Benefits (Primary)
  cppStartAge: number; // 60 to 70
  cppEstimatedPercentOfMax: number; // 0 to 100% of maximum entitlement
  oasStartAge: number; // 65 to 70
  oasEligibleYearsInCanada: number; // 40 years for full OAS

  // Investment & Economic Assumptions
  preRetirementReturn?: number; // Deprecated: replaced by per-account accountReturns
  postRetirementReturn?: number; // Deprecated: replaced by per-account accountReturns
  inflationRate: number; // % annual inflation
  nonRegYieldTaxRate: number; // effective tax drag on taxable account dividends/capital gains (e.g. 1.2%)

  // Post-Retirement Strategy
  drawdownStrategy: DrawdownStrategyType;

  // Expat Emigration Planning
  expat?: ExpatInputs;
}

export interface MilestoneBadge {
  id: string;
  label: string;
  shortLabel: string;
  type: 'crossover' | 'coast_fire' | 'millionaire' | 'mortgage_free' | 'debt_free' | 'home_purchase' | 'retirement' | 'pension' | 'rrif' | 'peak_net_worth' | 'fhsa' | 'general';
  icon: string;
  color: string;
  description: string;
  metricsSummary?: string;
}

export interface YearSimulationResult {
  age: number;
  year: number;
  isRetired: boolean;

  // Incomes
  employmentIncome: number;
  cppIncome: number;
  oasGrossIncome: number;
  oasClawback: number;
  oasNetIncome: number;

  // Account Balances at start/end of year
  rrspBalance: number;
  rrifBalance: number; // separate RRIF balance for age 72+
  tfsaBalance: number;
  fhsaBalance: number;
  nonRegBalance: number;
  totalNetWorth: number;

  // Real Estate & Home Equity (Backup Asset)
  homeValue: number;
  remainingMortgage: number;
  homeEquity: number;
  realEstateShare: number; // user's ownership share of home equity
  homeSoldThisYear: boolean;
  homeSaleProceeds: number; // net proceeds deposited into taxable account
  isHomePurchasedThisYear?: boolean;
  downPaymentPaidThisYear?: number;
  housingStatus?: 'renting' | 'mortgage' | 'mortgage_free';

  // Fixed-Term Debts & Liabilities
  remainingDebt: number;
  debtPayment: number;
  debtPrincipalPaid: number;
  debtInterestPaid: number;

  // Contributions in working years
  rrspContribution: number;
  tfsaContribution: number;
  fhsaContribution: number;
  nonRegContribution: number;

  // Withdrawals in retirement
  rrspWithdrawal: number;
  rrifWithdrawal: number; // separate RRIF withdrawal for age 72+
  tfsaWithdrawal: number;
  nonRegWithdrawal: number;
  fhsaWithdrawalOrTransfer: number;
  totalWithdrawals: number;
  isRrifMinMet?: boolean; // whether RRIF minimum prescribed withdrawal guideline was met

  // Growth / Investment return
  totalInvestmentGrowth: number;

  // Expenses & Cashflow
  targetSpendingNominal: number;
  totalGrossIncome: number;
  taxableIncome: number;
  totalTaxPaid: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  netSpendableCashflow: number;
  cashflowGap: number; // shortfall if assets depleted

  // Special events
  isRrifMandatory: boolean; // age 72+
  rrifMinimumWithdrawal: number;
  fhsaRolledOver: boolean;
  notes: string[];

  // Couple specific breakdown (if married)
  isCouple: boolean;
  spouseAge?: number;
  isSpouseRetired?: boolean;
  spouseEmploymentIncome?: number;
  spouseCppIncome?: number;
  spouseOasNetIncome?: number;
  spouseTaxPaid?: number;

  // Additional strategic milestone fields
  isCrossoverMilestone?: boolean;
  isCoastFireMilestone?: boolean;
  isMillionaireMilestone?: boolean;
  isMortgageFreeMilestone?: boolean;
  isDebtFreeMilestone?: boolean;
  isPeakWealthMilestone?: boolean;
  milestoneBadges?: MilestoneBadge[];
}

export interface SimulationSummary {
  portfolioDepletionAge: number | null; // null if funded until life expectancy
  yearsFunded: number;
  totalYearsInRetirement: number;
  isFullyFunded: boolean;
  readinessScore: number; // 0 to 100
  netWorthAtRetirement: number;
  netWorthAtLifeExpectancy: number;
  peakNetWorth: number;
  peakNetWorthAge: number;

  // Lifetime metrics
  lifetimeEmploymentIncome: number;
  lifetimeCppReceived: number;
  lifetimeOasReceived: number;
  lifetimeTaxesPaid: number;
  lifetimeInvestmentGrowth: number;
  averageAnnualRetirementSpendNominal: number;
  averageEffectiveTaxInRetirement: number;

  // Key milestones
  retirementAge: number;
  firstRrifMandatoryYear: number;
  cppStartAge: number;
  oasStartAge: number;

  // Additional strategic milestones
  crossoverAge: number | null; // Age when annual investment returns >= required living expenses
  crossoverYear: number | null;
  crossoverInvestmentGrowth: number;
  crossoverLivingExpenses: number;

  coastFireAge: number | null; // Age where zero future contributions still 100% meets retirement living expenses
  coastFireYear: number | null;
  coastFireNetWorth: number;

  millionaireAge: number | null; // First age net worth reaches $1M
  millionaireYear: number | null;

  mortgagePayoffAge: number | null; // Age mortgage loan reaches $0
  mortgagePayoffYear: number | null;

  // Consumer & Fixed-Term Debt Milestones
  debtPayoffAge?: number | null; // Age all consumer debts reach $0
  debtPayoffYear?: number | null;
  totalInitialDebt?: number;
  debtAtRetirement?: number;
  totalDebtInterestPaid?: number;
  debtInterestSaved?: number;

  // Real Estate & Backup Asset metrics
  ownsHome: boolean;
  isFutureHomeBuyer?: boolean;
  futurePurchaseAge?: number | null;
  futurePurchaseYear?: number | null;
  homeEquityAtRetirement: number;
  homeSoldAge: number | null;
  homeNetProceedsAtSale: number;
  liquidNetWorthAtRetirement: number;

  // Couple details
  isCouple: boolean;
  spouseRetirementAge?: number;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  inputs: RetirementInputs;
}
