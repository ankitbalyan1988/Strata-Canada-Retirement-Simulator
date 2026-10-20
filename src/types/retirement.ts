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
  | 'tfsa_first';   // TFSA -> Non-Reg -> RRSP

export type MaritalStatus = 'single' | 'married' | 'divorced';

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

export interface RealEstateInputs {
  ownsHome: boolean;
  costOfHome: number; // Original purchase price / cost of the home
  currentMarketValue: number; // Estimated current market value
  downPayment: number; // Down payment paid upfront
  mortgageInterestRate: number; // Annual mortgage interest rate (%)
  mortgageTermYears: number; // Amortization term in years (e.g. 25, 30)
  mortgageStartYear: number; // Year the mortgage originated (e.g. 2020)
  ownershipSharePercent: number; // User's ownership share of the home (e.g. 100% single, 50% couple)
  annualAppreciationRate: number; // Estimated annual appreciation rate (%)
  planToSellHome: boolean; // Whether the user plans to dispose/downsize the home
  sellHomeAge: number; // Age at which the home is sold
  sellingCostPercent: number; // Realtor, legal, and closing fees (%)
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
}

export interface MilestoneBadge {
  id: string;
  label: string;
  shortLabel: string;
  type: 'crossover' | 'coast_fire' | 'millionaire' | 'mortgage_free' | 'retirement' | 'pension' | 'rrif' | 'peak_net_worth' | 'fhsa' | 'general';
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

  // Contributions in working years
  rrspContribution: number;
  tfsaContribution: number;
  fhsaContribution: number;
  nonRegContribution: number;

  // Withdrawals in retirement
  rrspWithdrawal: number;
  tfsaWithdrawal: number;
  nonRegWithdrawal: number;
  fhsaWithdrawalOrTransfer: number;
  totalWithdrawals: number;

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

  // Real Estate & Backup Asset metrics
  ownsHome: boolean;
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
