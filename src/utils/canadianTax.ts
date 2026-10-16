import { CanadianProvince } from '../types/retirement';

/**
 * 2025/2026 Canadian Tax Brackets and Parameters
 * Source: Canada Revenue Agency (CRA) indexed schedules
 */

export interface TaxBracket {
  threshold: number;
  rate: number;
}

// Federal Brackets (2025/2026 approximate indexed)
export const FEDERAL_BRACKETS: TaxBracket[] = [
  { threshold: 0, rate: 0.15 },
  { threshold: 57375, rate: 0.205 },
  { threshold: 114750, rate: 0.26 },
  { threshold: 177882, rate: 0.29 },
  { threshold: 253414, rate: 0.33 }
];

export const FEDERAL_BPA = 15705; // Basic Personal Amount
export const FEDERAL_AGE_AMOUNT = 8790; // Age 65+ credit amount
export const FEDERAL_AGE_AMOUNT_THRESHOLD = 44325; // Phaseout starts
export const PENSION_INCOME_AMOUNT = 2000; // Federal credit for eligible pension income

// Provincial Brackets (2025/2026 approximate indexed)
export const PROVINCIAL_BRACKETS: Record<CanadianProvince, { brackets: TaxBracket[]; bpa: number; name: string }> = {
  ON: {
    name: 'Ontario',
    bpa: 12399,
    brackets: [
      { threshold: 0, rate: 0.0505 },
      { threshold: 51446, rate: 0.0915 },
      { threshold: 102894, rate: 0.1116 },
      { threshold: 150000, rate: 0.1216 },
      { threshold: 220000, rate: 0.1316 }
    ]
  },
  BC: {
    name: 'British Columbia',
    bpa: 12580,
    brackets: [
      { threshold: 0, rate: 0.0506 },
      { threshold: 49279, rate: 0.0770 },
      { threshold: 98560, rate: 0.1050 },
      { threshold: 113143, rate: 0.1229 },
      { threshold: 137407, rate: 0.1470 },
      { threshold: 186543, rate: 0.1680 },
      { threshold: 252752, rate: 0.2050 }
    ]
  },
  AB: {
    name: 'Alberta',
    bpa: 21885,
    brackets: [
      { threshold: 0, rate: 0.10 },
      { threshold: 148269, rate: 0.12 },
      { threshold: 177922, rate: 0.13 },
      { threshold: 237230, rate: 0.14 },
      { threshold: 355845, rate: 0.15 }
    ]
  },
  QC: {
    name: 'Quebec',
    bpa: 18056,
    brackets: [
      { threshold: 0, rate: 0.14 },
      { threshold: 51780, rate: 0.19 },
      { threshold: 103545, rate: 0.24 },
      { threshold: 126000, rate: 0.2575 }
    ]
  },
  MB: {
    name: 'Manitoba',
    bpa: 15780,
    brackets: [
      { threshold: 0, rate: 0.108 },
      { threshold: 47000, rate: 0.1275 },
      { threshold: 100000, rate: 0.174 }
    ]
  },
  SK: {
    name: 'Saskatchewan',
    bpa: 18494,
    brackets: [
      { threshold: 0, rate: 0.105 },
      { threshold: 52057, rate: 0.125 },
      { threshold: 148734, rate: 0.145 }
    ]
  },
  NS: {
    name: 'Nova Scotia',
    bpa: 11481,
    brackets: [
      { threshold: 0, rate: 0.0879 },
      { threshold: 29590, rate: 0.1495 },
      { threshold: 59180, rate: 0.1667 },
      { threshold: 93000, rate: 0.1750 },
      { threshold: 150000, rate: 0.2100 }
    ]
  },
  NB: {
    name: 'New Brunswick',
    bpa: 13044,
    brackets: [
      { threshold: 0, rate: 0.0940 },
      { threshold: 49958, rate: 0.1400 },
      { threshold: 99916, rate: 0.1600 },
      { threshold: 185064, rate: 0.1950 }
    ]
  },
  NL: {
    name: 'Newfoundland & Labrador',
    bpa: 10818,
    brackets: [
      { threshold: 0, rate: 0.087 },
      { threshold: 43198, rate: 0.145 },
      { threshold: 86395, rate: 0.158 },
      { threshold: 154244, rate: 0.178 },
      { threshold: 215943, rate: 0.198 }
    ]
  },
  PE: {
    name: 'Prince Edward Island',
    bpa: 13500,
    brackets: [
      { threshold: 0, rate: 0.0965 },
      { threshold: 32656, rate: 0.1363 },
      { threshold: 64313, rate: 0.1665 },
      { threshold: 105000, rate: 0.1800 },
      { threshold: 140000, rate: 0.1875 }
    ]
  }
};

/**
 * RRIF Minimum Withdrawal Percentage by Age at the start of the year
 * CRA Prescribed Rates (Subsection 7308(3) and (4) of Regulations)
 */
export const RRIF_MINIMUM_RATES: Record<number, number> = {
  71: 0.0528,
  72: 0.0540,
  73: 0.0553,
  74: 0.0567,
  75: 0.0582,
  76: 0.0598,
  77: 0.0617,
  78: 0.0636,
  79: 0.0658,
  80: 0.0682,
  81: 0.0708,
  82: 0.0738,
  83: 0.0771,
  84: 0.0808,
  85: 0.0851,
  86: 0.0899,
  87: 0.0955,
  88: 0.1021,
  89: 0.1099,
  90: 0.1192,
  91: 0.1306,
  92: 0.1449,
  93: 0.1634,
  94: 0.1879,
  95: 0.2000 // 95 and older is capped at 20%
};

export function getRrifMinimumRate(age: number): number {
  if (age < 71) {
    // Under 71: formula is 1 / (90 - age)
    return 1 / (90 - age);
  }
  if (age >= 95) return 0.20;
  return RRIF_MINIMUM_RATES[age] || 0.0528;
}

/**
 * 2025/2026 CPP (Canada Pension Plan) Reference Values
 */
export const CPP_MAX_ANNUAL_AT_65 = 16920; // ~$1,410 / month
export const CPP_YMPE = 71300; // Year's Maximum Pensionable Earnings (approx)
export const CPP_YAMPE = 81200; // Second ceiling (CPP enhancement)
export const CPP_EMPLOYEE_RATE = 0.0595;
export const CPP2_EMPLOYEE_RATE = 0.04;

export function calculateCppAnnualBenefit(startAge: number, percentOfMax: number, currentYearInflationFactor: number): number {
  const baseBenefit = CPP_MAX_ANNUAL_AT_65 * (percentOfMax / 100);
  let adjustmentFactor = 1.0;

  if (startAge < 65) {
    // -0.6% per month (7.2% per year) before 65
    const monthsEarly = (65 - startAge) * 12;
    adjustmentFactor = 1.0 - (monthsEarly * 0.006);
  } else if (startAge > 65) {
    // +0.7% per month (8.4% per year) after 65 (max age 70)
    const monthsLate = (Math.min(70, startAge) - 65) * 12;
    adjustmentFactor = 1.0 + (monthsLate * 0.007);
  }

  return baseBenefit * adjustmentFactor * currentYearInflationFactor;
}

/**
 * 2025/2026 OAS (Old Age Security) Reference Values
 */
export const OAS_MAX_ANNUAL_AT_65 = 8731; // ~$727.58/mo (ages 65-74)
export const OAS_AGE_75_BONUS_MULTIPLIER = 1.10; // +10% increase at age 75+
export const OAS_CLAWBACK_THRESHOLD = 93208; // 2025 threshold base
export const OAS_CLAWBACK_RATE = 0.15; // 15% recovery tax

export function calculateOasGrossBenefit(age: number, startAge: number, eligibleYears: number, currentYearInflationFactor: number): number {
  if (age < startAge) return 0;
  if (age < 65) return 0;

  const residencyRatio = Math.min(1.0, Math.max(0, eligibleYears / 40));
  let baseBenefit = OAS_MAX_ANNUAL_AT_65 * residencyRatio;

  // Age 75+ bump (10% increase)
  if (age >= 75) {
    baseBenefit *= OAS_AGE_75_BONUS_MULTIPLIER;
  }

  // Deferral adjustment: +0.6% per month (7.2% per year) up to age 70
  let deferralMultiplier = 1.0;
  if (startAge > 65) {
    const monthsDeferred = (Math.min(70, startAge) - 65) * 12;
    deferralMultiplier = 1.0 + (monthsDeferred * 0.006);
  }

  return baseBenefit * deferralMultiplier * currentYearInflationFactor;
}

export function calculateOasClawback(grossOas: number, netTaxableIncome: number, currentYearInflationFactor: number): number {
  if (grossOas <= 0) return 0;
  const threshold = OAS_CLAWBACK_THRESHOLD * currentYearInflationFactor;
  if (netTaxableIncome <= threshold) return 0;

  const excess = netTaxableIncome - threshold;
  const clawback = excess * OAS_CLAWBACK_RATE;
  return Math.min(grossOas, Math.max(0, clawback));
}

/**
 * Computes progressive tax for a set of brackets
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
  const lowestRate = brackets[0].rate;
  const bpaCredit = bpa * lowestRate;
  return Math.max(0, tax - bpaCredit);
}

/**
 * Calculates Canadian Federal + Provincial Income Tax
 */
export function calculateCanadianTax(
  taxableIncome: number,
  province: CanadianProvince,
  age: number,
  eligiblePensionIncome: number = 0
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

  // Federal gross tax
  let federalTax = computeProgressiveTax(taxableIncome, FEDERAL_BRACKETS, FEDERAL_BPA);

  // Federal Age Amount Credit (for age 65+)
  if (age >= 65) {
    const reduction = Math.max(0, (taxableIncome - FEDERAL_AGE_AMOUNT_THRESHOLD) * 0.15);
    const ageAmount = Math.max(0, FEDERAL_AGE_AMOUNT - reduction);
    const ageCredit = ageAmount * 0.15;
    federalTax = Math.max(0, federalTax - ageCredit);
  }

  // Federal Pension Income Credit (up to $2,000 at 15% = $300)
  if (age >= 65 && eligiblePensionIncome > 0) {
    const pensionCredit = Math.min(2000, eligiblePensionIncome) * 0.15;
    federalTax = Math.max(0, federalTax - pensionCredit);
  }

  // Provincial tax
  const provConfig = PROVINCIAL_BRACKETS[province] || PROVINCIAL_BRACKETS.ON;
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

  // Marginal tax rate estimation (check next $1,000)
  const delta = 1000;
  const nextFed = computeProgressiveTax(taxableIncome + delta, FEDERAL_BRACKETS, FEDERAL_BPA);
  const nextProv = computeProgressiveTax(taxableIncome + delta, provConfig.brackets, provConfig.bpa);
  let nextTotal = nextFed + nextProv;
  if (province === 'QC') nextTotal = (nextFed * 0.835) + nextProv;
  const marginalRate = Math.max(0, Math.min(0.55, (nextTotal - (computeProgressiveTax(taxableIncome, FEDERAL_BRACKETS, FEDERAL_BPA) * (province === 'QC' ? 0.835 : 1) + computeProgressiveTax(taxableIncome, provConfig.brackets, provConfig.bpa))) / delta));

  return {
    federalTax,
    provincialTax,
    totalTax,
    effectiveRate,
    marginalRate
  };
}

/**
 * 2025/2026 Annual Registered Contribution Caps
 */
export const RRSP_MAX_ROOM_BASE = 32490; // 2025 base limit (18% earned income up to this)
export const TFSA_ANNUAL_LIMIT = 7000;   // 2024-2026 annual limit
export const FHSA_ANNUAL_LIMIT = 8000;   // $8k/yr up to $40k lifetime max
export const FHSA_LIFETIME_LIMIT = 40000;
