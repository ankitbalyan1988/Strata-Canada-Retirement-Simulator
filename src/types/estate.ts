import { CanadianProvince } from './retirement';

export type KinCategory = 'spouse' | 'children' | 'family_charity_split';
export type NoKinStrategy = 'charitable_legacy' | 'named_friends_heirs' | 'endowment_daf' | 'balanced_legacy' | 'intestate_escheat';

export interface EstatePlanningInputs {
  passingAge: number;
  hasNextOfKin: boolean;
  
  // Next of Kin options
  kinCategory: KinCategory;
  spousalRolloverEnabled: boolean; // CRA s.70(6) rollover for RRSP/RRIF & TFSA successor
  directBeneficiariesDesignated: boolean; // Bypass probate on registered accounts
  familyDistributionPercent: number; // e.g. 100 or 80
  charityShareWithKinPercent: number; // if giving a portion to charity
  
  // No Next of Kin options
  noKinStrategy: NoKinStrategy;
  charityAllocationPercent: number; // 0-100%
  namedFriendsAllocationPercent: number; // 0-100%
  endowmentAllocationPercent: number; // 0-100%
  hasValidWill: boolean; // If false without kin, assets risk escheat to provincial crown
  
  // Settlement & Liquidation options
  liquidateRealEstateOnDeath: boolean;
  realtorAndClosingPercent: number; // ~3.5%
  executorCompensationPercent: number; // 0% to 5% (standard Canadian executor tariff)
  
  // Funeral & Final Arrangements (First-Charge Estate Debt)
  estimatedFuneralCost: number; // Typical Canadian funeral/cremation cost: $5,000 - $15,000
  includeCppDeathBenefitOffset: boolean; // Offsets statutory $2,500 Canadian CPP/QPP death benefit
}

export interface EstateReservesAtDeath {
  passingAge: number;
  passingYear: number;
  rrspBalance: number;
  tfsaBalance: number;
  fhsaBalance: number;
  nonRegBalance: number;
  homeEquity: number;
  totalGrossEstate: number;
  liquidFinancialAssets: number;
}

export interface EstateTaxAndFeesBreakdown {
  rrspTerminalTax: number;
  nonRegCapitalGainsTax: number;
  totalTerminalIncomeTax: number;
  effectiveTerminalTaxRate: number;
  
  grossProbateAssets: number;
  probateFee: number;
  probateAvoidedByBeneficiaryDesignation: number;
  
  closingAndLiquidationCosts: number;
  executorCompensation: number;
  funeralCosts: number;
  cppDeathBenefit: number;
  netFuneralBurden: number;
  charitableDonationAmount: number;
  charitableTaxCredit: number;
  netIncomeTaxAfterCredits: number;
  
  totalEstateDeductions: number;
  netEstateRemaining: number;
  taxEfficiencyScore: number; // 0 to 100%
}

export interface EstateDistributionItem {
  id: string;
  recipient: string;
  category: 'spouse' | 'children' | 'friends' | 'charity' | 'endowment' | 'taxes' | 'probate' | 'funeral' | 'crown';
  amount: number;
  percentOfGross: number;
  percentOfNet: number;
  taxStatus: string;
  notes: string;
}

export interface EstateKeyStrategy {
  title: string;
  description: string;
  taxSavedOrBenefit: number;
  badge: string;
  type: 'success' | 'warning' | 'info';
}

export interface EstatePlanResult {
  inputs: EstatePlanningInputs;
  province: CanadianProvince;
  reserves: EstateReservesAtDeath;
  taxAndFees: EstateTaxAndFeesBreakdown;
  distributions: EstateDistributionItem[];
  keyStrategies: EstateKeyStrategy[];
}
