import { CanadianProvince } from '../types/retirement';
import {
  TaxBracket,
  ProvincialTaxSchedule,
  FederalTaxSchedule,
  CppCeilings,
  OasLimits,
  RegisteredAccountCaps,
  EconomicDefaults,
  TaxYearConfig,
  DEFAULT_TAX_YEAR_CONFIG,
  getTaxYearConfig,
  FEDERAL_BRACKETS,
  FEDERAL_BPA,
  FEDERAL_AGE_AMOUNT,
  FEDERAL_AGE_AMOUNT_THRESHOLD,
  PENSION_INCOME_AMOUNT,
  PROVINCIAL_BRACKETS,
  RRIF_MINIMUM_RATES,
  CPP_MAX_ANNUAL_AT_65,
  CPP_YMPE,
  CPP_YAMPE,
  CPP_EMPLOYEE_RATE,
  CPP2_EMPLOYEE_RATE,
  OAS_MAX_ANNUAL_AT_65,
  OAS_AGE_75_BONUS_MULTIPLIER,
  OAS_CLAWBACK_THRESHOLD,
  OAS_CLAWBACK_RATE,
  RRSP_MAX_ROOM_BASE,
  TFSA_ANNUAL_LIMIT,
  FHSA_ANNUAL_LIMIT,
  FHSA_LIFETIME_LIMIT,
  CRA_ECONOMIC_DEFAULTS,
  CANADIAN_TAX_SCHEDULE_2025_2026,
  CANADIAN_TAX_SCHEDULE_2026_2027,
  TAX_YEAR_CONFIGS
} from '../config/canadianTaxData';

// Re-export decoupled statutory constants and types for complete backward compatibility
export {
  FEDERAL_BRACKETS,
  FEDERAL_BPA,
  FEDERAL_AGE_AMOUNT,
  FEDERAL_AGE_AMOUNT_THRESHOLD,
  PENSION_INCOME_AMOUNT,
  PROVINCIAL_BRACKETS,
  RRIF_MINIMUM_RATES,
  CPP_MAX_ANNUAL_AT_65,
  CPP_YMPE,
  CPP_YAMPE,
  CPP_EMPLOYEE_RATE,
  CPP2_EMPLOYEE_RATE,
  OAS_MAX_ANNUAL_AT_65,
  OAS_AGE_75_BONUS_MULTIPLIER,
  OAS_CLAWBACK_THRESHOLD,
  OAS_CLAWBACK_RATE,
  RRSP_MAX_ROOM_BASE,
  TFSA_ANNUAL_LIMIT,
  FHSA_ANNUAL_LIMIT,
  FHSA_LIFETIME_LIMIT,
  CRA_ECONOMIC_DEFAULTS,
  CANADIAN_TAX_SCHEDULE_2025_2026,
  CANADIAN_TAX_SCHEDULE_2026_2027,
  TAX_YEAR_CONFIGS,
  DEFAULT_TAX_YEAR_CONFIG,
  getTaxYearConfig
};

export type {
  TaxBracket,
  ProvincialTaxSchedule,
  FederalTaxSchedule,
  CppCeilings,
  OasLimits,
  RegisteredAccountCaps,
  EconomicDefaults,
  TaxYearConfig
};

/**
 * RRIF Minimum Withdrawal Percentage by Age at the start of the year
 * CRA Prescribed Rates (Subsection 7308(3) and (4) of Regulations)
 * Decoupled: Resolves rate from the supplied or default TaxYearConfig
 */
export function getRrifMinimumRate(
  age: number,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): number {
  if (age < 71) {
    // Under 71: formula is 1 / (90 - age)
    return 1 / (90 - age);
  }
  if (age >= 95) return 0.20;
  return config.rrifMinimumRates[age] || 0.0528;
}

/**
 * Calculates Canada Pension Plan (CPP) annual retirement benefit
 * Decoupled: Accepts optional TaxYearConfig for dynamic year-keyed indexing
 */
export function calculateCppAnnualBenefit(
  startAge: number,
  percentOfMax: number,
  currentYearInflationFactor: number,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): number {
  const baseBenefit = config.cpp.maxAnnualAt65 * (percentOfMax / 100);
  let adjustmentFactor = 1.0;

  if (startAge < 65) {
    // -0.6% per month (7.2% per year) before 65
    const monthsEarly = (65 - startAge) * 12;
    adjustmentFactor = 1.0 - (monthsEarly * (config.cpp.earlyReductionMonthlyRate || 0.006));
  } else if (startAge > 65) {
    // +0.7% per month (8.4% per year) after 65 (max age 70)
    const monthsLate = (Math.min(70, startAge) - 65) * 12;
    adjustmentFactor = 1.0 + (monthsLate * (config.cpp.delayedEnhancementMonthlyRate || 0.007));
  }

  return baseBenefit * adjustmentFactor * currentYearInflationFactor;
}

/**
 * Calculates Old Age Security (OAS) gross annual pension benefit
 * Decoupled: Accepts optional TaxYearConfig for dynamic year-keyed indexing
 */
export function calculateOasGrossBenefit(
  age: number,
  startAge: number,
  eligibleYears: number,
  currentYearInflationFactor: number,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): number {
  if (age < startAge) return 0;
  if (age < 65) return 0;

  const residencyRatio = Math.min(1.0, Math.max(0, eligibleYears / 40));
  let baseBenefit = config.oas.maxAnnualAt65 * residencyRatio;

  // Age 75+ bump (10% statutory increase)
  if (age >= 75) {
    baseBenefit *= (config.oas.age75BonusMultiplier || 1.10);
  }

  // Deferral adjustment: +0.6% per month (7.2% per year) up to age 70
  let deferralMultiplier = 1.0;
  if (startAge > 65) {
    const monthsDeferred = (Math.min(70, startAge) - 65) * 12;
    deferralMultiplier = 1.0 + (monthsDeferred * (config.oas.deferralMonthlyRate || 0.006));
  }

  return baseBenefit * deferralMultiplier * currentYearInflationFactor;
}

/**
 * Calculates OAS Recovery Tax (Clawback) on net world income above threshold
 * Decoupled: Accepts optional TaxYearConfig
 */
export function calculateOasClawback(
  grossOas: number,
  netTaxableIncome: number,
  currentYearInflationFactor: number,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): number {
  if (grossOas <= 0) return 0;
  const threshold = config.oas.clawbackThreshold * currentYearInflationFactor;
  if (netTaxableIncome <= threshold) return 0;

  const excess = netTaxableIncome - threshold;
  const clawback = excess * (config.oas.clawbackRate || 0.15);
  return Math.min(grossOas, Math.max(0, clawback));
}

/**
 * Computes progressive tax for a set of brackets and basic personal amount credit
 */
function computeProgressiveTax(taxableIncome: number, brackets: TaxBracket[], bpa: number): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const current = brackets[i];
    const next = brackets[i + 1];
    const lower = current.threshold;
    const upper = next ? next.threshold : Infinity;

    if (taxableIncome > lower) {
      const taxableInBracket = Math.min(taxableIncome, upper) - lower;
      tax += taxableInBracket * current.rate;
    }
  }

  // Basic Personal Amount non-refundable tax credit (lowest bracket rate)
  const lowestRate = brackets[0]?.rate || 0.15;
  const bpaCredit = bpa * lowestRate;
  return Math.max(0, tax - bpaCredit);
}

/**
 * Calculates Canadian Federal + Provincial Income Tax
 * Decoupled: Accepts optional TaxYearConfig for dynamic year-keyed indexing.
 * Safely fails over if an unknown province key is passed with detailed console warnings.
 */
export function calculateCanadianTax(
  taxableIncome: number,
  province: CanadianProvince,
  age: number,
  eligiblePensionIncome: number = 0,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): {
  federalTax: number;
  provincialTax: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
} {
  if (taxableIncome <= 0) {
    return { federalTax: 0, provincialTax: 0, totalTax: 0, effectiveRate: 0, marginalRate: 0 };
  }

  const fedConfig = config.federal;

  // 1. Federal progressive tax
  let federalTax = computeProgressiveTax(taxableIncome, fedConfig.brackets, fedConfig.bpa);

  // Federal Age Amount Credit (for age 65+)
  if (age >= 65) {
    const reduction = Math.max(0, (taxableIncome - fedConfig.ageAmountThreshold) * 0.15);
    const ageAmount = Math.max(0, fedConfig.ageAmount - reduction);
    const ageCredit = ageAmount * 0.15;
    federalTax = Math.max(0, federalTax - ageCredit);
  }

  // Federal Pension Income Credit (up to $2,000 at 15% = $300)
  if (age >= 65 && eligiblePensionIncome > 0) {
    const pensionCredit = Math.min(fedConfig.pensionIncomeAmount, eligiblePensionIncome) * 0.15;
    federalTax = Math.max(0, federalTax - pensionCredit);
  }

  // 2. Provincial progressive tax with safe fallback & console warning
  let provConfig = config.provincial[province];
  if (!provConfig) {
    console.warn(
      `[CanadianTax] Unknown or unsupported province code "${province}" supplied to calculateCanadianTax(). ` +
      `Failing safely by falling back to Ontario (ON) statutory schedule.`
    );
    provConfig = config.provincial.ON || Object.values(config.provincial)[0];
  }

  let provincialTax = computeProgressiveTax(taxableIncome, provConfig.brackets, provConfig.bpa);

  // Ontario Health Premium & surtax simulation
  if (province === 'ON') {
    if (taxableIncome > 200000) provincialTax += 900;
    else if (taxableIncome > 72000) provincialTax += 750;
    else if (taxableIncome > 48000) provincialTax += 600;
    else if (taxableIncome > 36000) provincialTax += 450;
    else if (taxableIncome > 25000) provincialTax += 300;
  }

  // Quebec federal abatement (-16.5% of federal tax because QC collects its own provincial programs)
  if (province === 'QC') {
    federalTax = federalTax * 0.835;
  }

  const totalTax = federalTax + provincialTax;
  const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;

  // Marginal tax rate estimation (check next $1,000 increment)
  const delta = 1000;
  const nextFed = computeProgressiveTax(taxableIncome + delta, fedConfig.brackets, fedConfig.bpa);
  const nextProv = computeProgressiveTax(taxableIncome + delta, provConfig.brackets, provConfig.bpa);
  let nextTotal = nextFed + nextProv;
  if (province === 'QC') nextTotal = (nextFed * 0.835) + nextProv;
  
  const currentTotal = (computeProgressiveTax(taxableIncome, fedConfig.brackets, fedConfig.bpa) * (province === 'QC' ? 0.835 : 1)) +
    computeProgressiveTax(taxableIncome, provConfig.brackets, provConfig.bpa);

  const marginalRate = Math.max(0, Math.min(0.55, (nextTotal - currentTotal) / delta));

  return {
    federalTax,
    provincialTax,
    totalTax,
    effectiveRate,
    marginalRate
  };
}
