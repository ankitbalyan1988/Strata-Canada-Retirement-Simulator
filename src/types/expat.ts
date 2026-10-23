export type RealEstateExpatStrategy = 'sell_before_departure' | 'keep_and_rent' | 'sell_after_departure';

export interface ExpatDestinationCountry {
  id: string;
  name: string;
  flag: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Caribbean';
  currencyCode: string;
  currencySymbol: string;
  exchangeRateToCAD: number; // 1 CAD = X local currency units
  costOfLivingIndex: number; // Relative to Canada = 1.00 (e.g. 0.50 means 50% cheaper)
  purchasingPowerMultiplier: number; // 1 / costOfLivingIndex (e.g. 2.0x purchasing power)
  hasTaxTreaty: boolean;
  treatyRates: {
    cppWithholding: number; // % withholding by CRA
    oasWithholding: number; // % withholding by CRA
    rrspPeriodicWithholding: number; // % withholding on periodic RRIF/pension
    rrspLumpSumWithholding: number; // % withholding on lump sum RRSP
    nonRegDividendsWithholding: number; // % on Canadian dividends
  };
  localIncomeTaxRate: number; // Typical local income tax on foreign pension/income (%)
  localTaxTreatmentNotes: string;
  healthCareNotes: string;
  visaProgram: string;
  popularRetirementTowns: string[];
  climate: string;
}

export interface ExpatInputs {
  planToEmigrate: boolean;
  emigrationAge: number;
  destinationCountryId: string;
  yearsLivedInCanadaAfter18: number; // Critical CRA / Service Canada 20-year rule for OAS outside Canada
  realEstateStrategy: RealEstateExpatStrategy;
  customExchangeRate?: number;
  customCostOfLivingFactor?: number;
  optSection216ForRental?: boolean; // Section 216 net rental income tax election
  deferDepartureTaxWithT1244?: boolean; // Form T1244 election to defer deemed disposition
}

export interface ExpatYearResult {
  year: number;
  age: number;
  isNonResident: boolean;
  
  // Canadian Domestic Baseline Comparison
  domesticNetIncomeCAD: number;
  
  // Non-Resident Gross Withdrawals & Benefits (CAD)
  grossIncomeCAD: number;
  cppReceivedCAD: number;
  oasReceivedCAD: number;
  oasEligibleAbroad: boolean;
  rrspWithdrawnCAD: number;
  tfsaWithdrawnCAD: number;
  nonRegWithdrawnCAD: number;
  rentalNetIncomeCAD: number;

  // Canadian Non-Resident Taxes (CAD)
  craPartXIIIWithholdingCAD: number;
  craRentalWithholdingCAD: number;
  departureTaxCAD: number; // Paid at exit year

  // Destination Country Taxes (CAD)
  destinationLocalTaxCAD: number;

  // Net Income & Purchasing Power
  expatNetIncomeCAD: number;
  expatNetIncomeLocalCurrency: number;
  pppEquivalentPurchasingPowerCAD: number;
  purchasingPowerBoostCAD: number;
}

export interface ExpatSimulationSummary {
  departureAge: number;
  departureYear: number;
  destinationCountry: ExpatDestinationCountry;
  
  // OAS 20-Year Test
  yearsInCanadaAfter18: number;
  qualifiesForLifetimeWorldwideOAS: boolean;
  oasStatusMessage: string;
  
  // Departure Tax (CRA S. 128.1)
  departureTaxEstimateCAD: number;
  unrealizedCapitalGainsAtExitCAD: number;
  
  // Averages in Retirement
  averageDomesticNetCAD: number;
  averageExpatNetCAD: number;
  averageExpatNetLocalCurrency: number;
  averagePPPEquivalentCAD: number;
  purchasingPowerBoostPercent: number; // e.g. +100%
  
  // Lifetime Totals
  lifetimePartXIIIWithholdingCAD: number;
  lifetimePPPSurplusCAD: number;
  
  // Real Estate Analysis
  realEstateOutcomeDescription: string;
  
  // Year-by-Year Expat Ledger
  yearlyExpatResults: ExpatYearResult[];
  
  // Strategic Insights
  insights: {
    category: 'oas' | 'departure_tax' | 'treaty' | 'tfsa' | 'real_estate' | 'lifestyle';
    title: string;
    description: string;
    type: 'success' | 'warning' | 'info';
    badge: string;
  }[];
  
  // Relocation Readiness Checklist
  checklist: {
    id: string;
    stage: 'pre_departure' | 'year_of_departure' | 'post_departure';
    title: string;
    agency: string;
    description: string;
    formNumber?: string;
  }[];
}
