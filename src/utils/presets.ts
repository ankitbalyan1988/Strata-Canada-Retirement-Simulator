import { ScenarioPreset, SpouseInputs, RealEstateInputs, AccountReturnRates, RetirementInputs, MonthlyExpenseEstimates } from '../types/retirement';

export const DEFAULT_REAL_ESTATE_INPUTS: RealEstateInputs = {
  ownsHome: true,
  costOfHome: 650000, // Canadian average benchmark (CREA / StatCan)
  currentMarketValue: 750000, // Current estimated market value
  downPayment: 130000, // 20% down payment
  mortgageInterestRate: 4.79, // Standard 5-year Canadian mortgage rate
  mortgageTermYears: 25, // Standard amortization
  mortgageStartYear: 2021, // 5 years into amortization
  ownershipSharePercent: 100, // 100% for single, 50% for couple
  annualAppreciationRate: 3.2, // Long-term Canadian housing growth
  planToSellHome: false, // User can toggle and set target disposition age
  sellHomeAge: 72,
  sellingCostPercent: 4.5 // Realtor commissions, legal & closing friction
};

export const DEFAULT_MONTHLY_EXPENSES: MonthlyExpenseEstimates = {
  rentOrMortgage: 2980, // Matches $520k Canadian loan @ 4.79% 25-yr amortization
  utilities: 450,
  creditCard: 1800,
  otherExpenses: 550,
  postRetirementAdjustmentPercent: -20,
  autoSyncMortgage: true
};

export const DEFAULT_ACCOUNT_RETURNS: AccountReturnRates = {
  useCustomReturns: true,
  rrspReturn: 6.5,
  tfsaReturn: 7.0,
  fhsaReturn: 6.0,
  nonRegReturn: 5.5,
  rrspPostReturn: 5.0,
  tfsaPostReturn: 5.5,
  nonRegPostReturn: 4.5
};

/**
 * Official Canadian CRA & Statistics Canada Benchmarks:
 * - Average Full-Time Salary (StatCan SEPH/T4): ~$68,400/yr
 * - Average Retirement Age (StatCan Table 14-10-0060-01): 64.4 years old
 * - Average Life Expectancy at 65 (StatCan Table 13-10-0114-01): 85.5 years old
 * - Average TFSA Balance among active holders (CRA TFSA Statistics): ~$41,510
 * - Average RRSP Balance across savers (CRA T1 / BoC Survey): ~$112,000
 * - Average CPP Benefit (CRA / Service Canada): ~64% of maximum
 * - Average Non-Registered Investments (StatCan SFS): ~$32,000
 * - Average Canadian Home Ownership Rate: ~66.5% (StatCan Census)
 */
export const CRA_CANADIAN_AVERAGE_INPUTS: RetirementInputs = {
  maritalStatus: 'single',
  currentAge: 42,
  retirementAge: 64,
  lifeExpectancy: 85,
  province: 'ON',
  currentAnnualIncome: 68400,
  incomeGrowthRate: 2.1,
  monthlyExpenses: { ...DEFAULT_MONTHLY_EXPENSES },
  targetRetirementSpendingToday: 46500, // ~68% income replacement (FCAC benchmark)
  realEstate: { ...DEFAULT_REAL_ESTATE_INPUTS },
  accountReturns: { ...DEFAULT_ACCOUNT_RETURNS },
  rrspBalance: 112000,
  tfsaBalance: 41500,
  fhsaBalance: 12000,
  nonRegBalance: 32000,
  rrspAnnualContribution: 6800,
  tfsaAnnualContribution: 5800,
  fhsaAnnualContribution: 6000,
  nonRegAnnualContribution: 3000,
  fhsaOpenYear: 2023,
  fhsaIntent: 'rollover_to_rrsp',
  fhsaHomePurchaseAge: 45,
  cppStartAge: 65,
  cppEstimatedPercentOfMax: 64, // Actual CRA average benefit paid
  oasStartAge: 65,
  oasEligibleYearsInCanada: 40,
  preRetirementReturn: 6.0, // FP Canada guideline for balanced portfolio
  postRetirementReturn: 4.8, // FP Canada guideline for retirement
  inflationRate: 2.1, // Bank of Canada target
  nonRegYieldTaxRate: 1.2,
  drawdownStrategy: 'tax_efficient'
};

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'canadian_average',
    name: 'Canadian National Average (CRA)',
    tagline: 'Official CRA & Statistics Canada Averages',
    description: 'Loaded with official Canadian averages: $68,400 salary, $41,500 TFSA, $112,000 RRSP, retiring at 64 with 85-year life expectancy and 64% average CPP.',
    inputs: CRA_CANADIAN_AVERAGE_INPUTS
  },
  {
    id: 'toronto_tech',
    name: 'Toronto Tech Lead (Single)',
    tagline: 'Balanced Growth & RRSP Optimization (ON)',
    description: '36-year-old software architect in Ontario targeting retirement at 62 with healthy RRSP & TFSA balances.',
    inputs: {
      maritalStatus: 'single',
      currentAge: 36,
      retirementAge: 62,
      lifeExpectancy: 92,
      province: 'ON',
      currentAnnualIncome: 145000,
      incomeGrowthRate: 2.5,
      monthlyExpenses: { ...DEFAULT_MONTHLY_EXPENSES },
      targetRetirementSpendingToday: 78000,
      realEstate: {
        ownsHome: true,
        costOfHome: 780000,
        currentMarketValue: 860000,
        downPayment: 160000,
        mortgageInterestRate: 4.65,
        mortgageTermYears: 25,
        mortgageStartYear: 2021,
        ownershipSharePercent: 100,
        annualAppreciationRate: 3.5,
        planToSellHome: true,
        sellHomeAge: 65,
        sellingCostPercent: 4.5
      },
      accountReturns: {
        useCustomReturns: true,
        rrspReturn: 7.2,
        tfsaReturn: 7.5,
        fhsaReturn: 6.0,
        nonRegReturn: 6.0,
        rrspPostReturn: 5.2,
        tfsaPostReturn: 5.5,
        nonRegPostReturn: 4.8
      },
      rrspBalance: 165000,
      tfsaBalance: 72000,
      fhsaBalance: 16000,
      nonRegBalance: 35000,
      rrspAnnualContribution: 18000,
      tfsaAnnualContribution: 7000,
      fhsaAnnualContribution: 8000,
      nonRegAnnualContribution: 6000,
      fhsaIntent: 'home_purchase',
      fhsaHomePurchaseAge: 38,
      cppStartAge: 65,
      cppEstimatedPercentOfMax: 85,
      oasStartAge: 65,
      oasEligibleYearsInCanada: 40,
      preRetirementReturn: 6.8,
      postRetirementReturn: 5.2,
      inflationRate: 2.2,
      nonRegYieldTaxRate: 1.2,
      drawdownStrategy: 'tax_efficient'
    }
  },
  {
    id: 'ottawa_couple',
    name: 'Ottawa Dual-Income Couple (Married)',
    tagline: 'Dual CPP/OAS & Pension Income Splitting (ON)',
    description: 'Married couple (ages 38 & 36) in Ontario planning joint retirement with dual registered accounts and pension income splitting.',
    inputs: {
      maritalStatus: 'married',
      currentAge: 38,
      retirementAge: 63,
      lifeExpectancy: 92,
      province: 'ON',
      currentAnnualIncome: 135000,
      incomeGrowthRate: 2.2,
      monthlyExpenses: { ...DEFAULT_MONTHLY_EXPENSES },
      targetRetirementSpendingToday: 95000,
      realEstate: {
        ownsHome: true,
        costOfHome: 720000,
        currentMarketValue: 790000,
        downPayment: 150000,
        mortgageInterestRate: 4.59,
        mortgageTermYears: 25,
        mortgageStartYear: 2020,
        ownershipSharePercent: 50, // 50% primary share in couple
        annualAppreciationRate: 3.2,
        planToSellHome: true,
        sellHomeAge: 70,
        sellingCostPercent: 4.5
      },
      accountReturns: {
        useCustomReturns: true,
        rrspReturn: 6.6,
        tfsaReturn: 7.0,
        fhsaReturn: 5.8,
        nonRegReturn: 5.5,
        rrspPostReturn: 4.8,
        tfsaPostReturn: 5.2,
        nonRegPostReturn: 4.5
      },
      spouse: {
        name: 'Alex',
        currentAge: 36,
        retirementAge: 63,
        annualIncome: 110000,
        incomeGrowthRate: 2.0,
        rrspBalance: 120000,
        rrspAnnualContribution: 14000,
        tfsaBalance: 58000,
        tfsaAnnualContribution: 7000,
        fhsaBalance: 16000,
        fhsaAnnualContribution: 8000,
        fhsaIntent: 'rollover_to_rrsp',
        fhsaHomePurchaseAge: 40,
        nonRegBalance: 25000,
        nonRegAnnualContribution: 5000,
        cppStartAge: 65,
        cppEstimatedPercentOfMax: 85,
        oasStartAge: 65,
        oasEligibleYearsInCanada: 40,
        pensionIncomeSplitting: true
      },
      rrspBalance: 185000,
      tfsaBalance: 82000,
      fhsaBalance: 16000,
      nonRegBalance: 40000,
      rrspAnnualContribution: 16000,
      tfsaAnnualContribution: 7000,
      fhsaAnnualContribution: 8000,
      nonRegAnnualContribution: 6000,
      fhsaIntent: 'rollover_to_rrsp',
      fhsaHomePurchaseAge: 40,
      cppStartAge: 65,
      cppEstimatedPercentOfMax: 90,
      oasStartAge: 65,
      oasEligibleYearsInCanada: 40,
      preRetirementReturn: 6.5,
      postRetirementReturn: 5.0,
      inflationRate: 2.2,
      nonRegYieldTaxRate: 1.2,
      drawdownStrategy: 'tax_efficient'
    }
  },
  {
    id: 'vancouver_fire',
    name: 'Vancouver Early FIRE (Single)',
    tagline: 'High Savings & Early Retirement at 52 (BC)',
    description: '31-year-old in British Columbia aiming for Financial Independence / Retire Early at 52 using tax-efficient drawdowns.',
    inputs: {
      maritalStatus: 'single',
      currentAge: 31,
      retirementAge: 52,
      lifeExpectancy: 90,
      province: 'BC',
      currentAnnualIncome: 130000,
      incomeGrowthRate: 3.0,
      monthlyExpenses: { ...DEFAULT_MONTHLY_EXPENSES },
      targetRetirementSpendingToday: 62000,
      realEstate: {
        ownsHome: true,
        costOfHome: 890000,
        currentMarketValue: 960000,
        downPayment: 200000,
        mortgageInterestRate: 4.89,
        mortgageTermYears: 25,
        mortgageStartYear: 2022,
        ownershipSharePercent: 100,
        annualAppreciationRate: 3.8,
        planToSellHome: true,
        sellHomeAge: 55, // Downsize at 55 to fund FIRE!
        sellingCostPercent: 4.5
      },
      accountReturns: {
        useCustomReturns: true,
        rrspReturn: 7.5,
        tfsaReturn: 8.0,
        fhsaReturn: 6.5,
        nonRegReturn: 6.2,
        rrspPostReturn: 5.5,
        tfsaPostReturn: 5.8,
        nonRegPostReturn: 5.0
      },
      rrspBalance: 85000,
      tfsaBalance: 65000,
      fhsaBalance: 24000,
      nonRegBalance: 40000,
      rrspAnnualContribution: 16000,
      tfsaAnnualContribution: 7000,
      fhsaAnnualContribution: 8000,
      nonRegAnnualContribution: 15000,
      fhsaIntent: 'rollover_to_rrsp',
      fhsaHomePurchaseAge: 35,
      cppStartAge: 65,
      cppEstimatedPercentOfMax: 70,
      oasStartAge: 65,
      oasEligibleYearsInCanada: 40,
      preRetirementReturn: 7.2,
      postRetirementReturn: 5.0,
      inflationRate: 2.3,
      nonRegYieldTaxRate: 1.1,
      drawdownStrategy: 'rrsp_meltdown'
    }
  },
  {
    id: 'calgary_exec',
    name: 'Alberta Energy Exec (Single/Divorced)',
    tagline: 'Wealth Preservation & Clawback Defense (AB)',
    description: '49-year-old executive in Calgary planning solo retirement at 65 with substantial non-registered capital.',
    inputs: {
      maritalStatus: 'single',
      currentAge: 49,
      retirementAge: 65,
      lifeExpectancy: 95,
      province: 'AB',
      currentAnnualIncome: 215000,
      incomeGrowthRate: 2.0,
      monthlyExpenses: { ...DEFAULT_MONTHLY_EXPENSES },
      targetRetirementSpendingToday: 110000,
      realEstate: {
        ownsHome: true,
        costOfHome: 780000,
        currentMarketValue: 840000,
        downPayment: 250000,
        mortgageInterestRate: 4.25,
        mortgageTermYears: 20,
        mortgageStartYear: 2016, // Near payoff!
        ownershipSharePercent: 100,
        annualAppreciationRate: 2.8,
        planToSellHome: false, // Keep family home throughout retirement
        sellHomeAge: 75,
        sellingCostPercent: 4.5
      },
      accountReturns: {
        useCustomReturns: true,
        rrspReturn: 6.4,
        tfsaReturn: 6.8,
        fhsaReturn: 5.5,
        nonRegReturn: 5.8,
        rrspPostReturn: 4.6,
        tfsaPostReturn: 5.0,
        nonRegPostReturn: 4.2
      },
      rrspBalance: 420000,
      tfsaBalance: 115000,
      fhsaBalance: 0,
      nonRegBalance: 280000,
      rrspAnnualContribution: 26000,
      tfsaAnnualContribution: 7000,
      fhsaAnnualContribution: 0,
      nonRegAnnualContribution: 25000,
      fhsaIntent: 'rollover_to_rrsp',
      fhsaHomePurchaseAge: 50,
      cppStartAge: 67,
      cppEstimatedPercentOfMax: 100,
      oasStartAge: 67,
      oasEligibleYearsInCanada: 40,
      preRetirementReturn: 6.2,
      postRetirementReturn: 4.8,
      inflationRate: 2.1,
      nonRegYieldTaxRate: 1.3,
      drawdownStrategy: 'tax_efficient'
    }
  },
  {
    id: 'montreal_consultant',
    name: 'Montreal Senior Consultant (Single)',
    tagline: 'Quebec Tax Optimization & Bracket Smoothing (QC)',
    description: '42-year-old consultant in Montreal optimizing RRSP deductions against Quebec progressive brackets and retiring at 64.',
    inputs: {
      maritalStatus: 'single',
      currentAge: 42,
      retirementAge: 64,
      lifeExpectancy: 92,
      province: 'QC',
      currentAnnualIncome: 122000,
      incomeGrowthRate: 2.2,
      monthlyExpenses: { ...DEFAULT_MONTHLY_EXPENSES },
      targetRetirementSpendingToday: 68000,
      realEstate: {
        ownsHome: true,
        costOfHome: 580000,
        currentMarketValue: 640000,
        downPayment: 120000,
        mortgageInterestRate: 4.69,
        mortgageTermYears: 25,
        mortgageStartYear: 2019,
        ownershipSharePercent: 100,
        annualAppreciationRate: 3.0,
        planToSellHome: true,
        sellHomeAge: 72,
        sellingCostPercent: 4.5
      },
      accountReturns: {
        useCustomReturns: true,
        rrspReturn: 6.7,
        tfsaReturn: 7.2,
        fhsaReturn: 5.8,
        nonRegReturn: 5.6,
        rrspPostReturn: 4.9,
        tfsaPostReturn: 5.2,
        nonRegPostReturn: 4.5
      },
      rrspBalance: 210000,
      tfsaBalance: 88000,
      fhsaBalance: 8000,
      nonRegBalance: 45000,
      rrspAnnualContribution: 19000,
      tfsaAnnualContribution: 7000,
      fhsaAnnualContribution: 8000,
      nonRegAnnualContribution: 5000,
      fhsaIntent: 'rollover_to_rrsp',
      fhsaHomePurchaseAge: 45,
      cppStartAge: 65,
      cppEstimatedPercentOfMax: 80,
      oasStartAge: 65,
      oasEligibleYearsInCanada: 40,
      preRetirementReturn: 6.5,
      postRetirementReturn: 4.9,
      inflationRate: 2.2,
      nonRegYieldTaxRate: 1.2,
      drawdownStrategy: 'rrsp_meltdown'
    }
  }
];

export const DEFAULT_SPOUSE_INPUTS: SpouseInputs = {
  name: 'Spouse',
  currentAge: 41,
  retirementAge: 64, // StatCan average
  annualIncome: 65000, // StatCan average
  incomeGrowthRate: 2.0,
  rrspBalance: 98000,
  rrspAnnualContribution: 6000,
  tfsaBalance: 38000,
  tfsaAnnualContribution: 5500,
  fhsaBalance: 10000,
  fhsaAnnualContribution: 5000,
  fhsaOpenYear: 2023,
  fhsaIntent: 'rollover_to_rrsp',
  fhsaHomePurchaseAge: 45,
  nonRegBalance: 25000,
  nonRegAnnualContribution: 2500,
  cppStartAge: 65,
  cppEstimatedPercentOfMax: 64, // CRA average
  oasStartAge: 65,
  oasEligibleYearsInCanada: 40,
  pensionIncomeSplitting: true
};

// Initial default loads with official CRA & Statistics Canada national averages!
export const DEFAULT_INPUTS = CRA_CANADIAN_AVERAGE_INPUTS;
