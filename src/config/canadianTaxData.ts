import { CanadianProvince } from '../types/retirement';

/**
 * TypeScript Schema Definitions for Decoupled Canadian Tax & Pension Rules
 * Allows advancing tax years (e.g., 2025/2026 -> 2027) by appending a single year-keyed configuration record.
 */

export interface TaxBracket {
  threshold: number;
  rate: number;
}

export interface FederalTaxSchedule {
  brackets: TaxBracket[];
  bpa: number; // Basic Personal Amount
  ageAmount: number; // Age 65+ credit amount
  ageAmountThreshold: number; // Income threshold where Age Amount begins phasing out
  pensionIncomeAmount: number; // Maximum eligible pension income credit base (typically $2,000)
}

export interface ProvincialTaxSchedule {
  name: string;
  bpa: number;
  brackets: TaxBracket[];
  surtaxOrHealthPremiumNotes?: string;
}

export interface CppCeilings {
  maxAnnualAt65: number;
  ympe: number; // Year's Maximum Pensionable Earnings (First ceiling)
  yampe: number; // Year's Additional Maximum Pensionable Earnings (Second ceiling - CPP2)
  employeeRate: number; // Standard contribution rate (5.95%)
  cpp2EmployeeRate: number; // Second tier contribution rate (4.00%)
  earlyReductionMonthlyRate: number; // 0.006 (-7.2%/yr)
  delayedEnhancementMonthlyRate: number; // 0.007 (+8.4%/yr)
}

export interface OasLimits {
  maxAnnualAt65: number;
  age75BonusMultiplier: number; // +10% bump at age 75+
  clawbackThreshold: number; // Income threshold where OAS recovery tax begins
  clawbackRate: number; // 15% recovery tax on excess income
  deferralMonthlyRate: number; // 0.006 (+7.2%/yr)
}

export interface RegisteredAccountCaps {
  rrspMaxRoomBase: number;
  tfsaAnnualLimit: number;
  fhsaAnnualLimit: number;
  fhsaLifetimeLimit: number;
}

export interface EconomicDefaults {
  averageSalary: number;
  averageCppBenefitPercent: number;
  averageTfsaBalance: number;
  averageRrspBalance: number;
  averageNonRegBalance: number;
  benchmarkHomeCost: number;
  benchmarkMortgageRate: number;
}

export interface TaxYearConfig {
  year: number | string;
  label: string;
  source: string;
  federal: FederalTaxSchedule;
  provincial: Record<CanadianProvince, ProvincialTaxSchedule>;
  rrifMinimumRates: Record<number, number>;
  cpp: CppCeilings;
  oas: OasLimits;
  registeredCaps: RegisteredAccountCaps;
  economicDefaults: EconomicDefaults;
}

/**
 * 2025/2026 Indexed Schedule
 * Source: Canada Revenue Agency (CRA) & Statistics Canada
 */
export const CANADIAN_TAX_SCHEDULE_2025_2026: TaxYearConfig = {
  year: '2025_2026',
  label: '2025 / 2026 CRA Indexed Schedule',
  source: 'Canada Revenue Agency & Service Canada statutory indexed tables',
  federal: {
    brackets: [
      { threshold: 0, rate: 0.15 },
      { threshold: 57375, rate: 0.205 },
      { threshold: 114750, rate: 0.26 },
      { threshold: 177882, rate: 0.29 },
      { threshold: 253414, rate: 0.33 }
    ],
    bpa: 15705,
    ageAmount: 8790,
    ageAmountThreshold: 44325,
    pensionIncomeAmount: 2000
  },
  provincial: {
    ON: {
      name: 'Ontario',
      bpa: 12399,
      brackets: [
        { threshold: 0, rate: 0.0505 },
        { threshold: 51446, rate: 0.0915 },
        { threshold: 102894, rate: 0.1116 },
        { threshold: 150000, rate: 0.1216 },
        { threshold: 220000, rate: 0.1316 }
      ],
      surtaxOrHealthPremiumNotes: 'Includes simulated Ontario Health Premium tiers ($300 to $900).'
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
      ],
      surtaxOrHealthPremiumNotes: 'Subject to 16.5% federal tax abatement as Quebec administers its own provincial programs.'
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
  },
  rrifMinimumRates: {
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
    95: 0.2000 // 95+ capped at 20%
  },
  cpp: {
    maxAnnualAt65: 16920, // ~$1,410 / month
    ympe: 71300, // 2025 YMPE
    yampe: 81200, // 2025 YAMPE
    employeeRate: 0.0595,
    cpp2EmployeeRate: 0.04,
    earlyReductionMonthlyRate: 0.006, // -0.6% / mo (-7.2% / yr)
    delayedEnhancementMonthlyRate: 0.007 // +0.7% / mo (+8.4% / yr)
  },
  oas: {
    maxAnnualAt65: 8731, // ~$727.58/mo (ages 65-74)
    age75BonusMultiplier: 1.10, // +10% boost at 75+
    clawbackThreshold: 93208, // 2025 recovery tax baseline
    clawbackRate: 0.15,
    deferralMonthlyRate: 0.006 // +0.6% / mo (+7.2% / yr) up to age 70
  },
  registeredCaps: {
    rrspMaxRoomBase: 32490,
    tfsaAnnualLimit: 7000,
    fhsaAnnualLimit: 8000,
    fhsaLifetimeLimit: 40000
  },
  economicDefaults: {
    averageSalary: 68400,
    averageCppBenefitPercent: 64,
    averageTfsaBalance: 41500,
    averageRrspBalance: 112000,
    averageNonRegBalance: 32000,
    benchmarkHomeCost: 650000,
    benchmarkMortgageRate: 4.79
  }
};

/**
 * 2026/2027 Projected Schedule (Indexed for inflation advancement)
 */
export const CANADIAN_TAX_SCHEDULE_2026_2027: TaxYearConfig = {
  ...CANADIAN_TAX_SCHEDULE_2025_2026,
  year: '2026_2027',
  label: '2026 / 2027 Projected CRA Schedule (+2.2% Indexation)',
  source: 'Projected CRA indexation based on Bank of Canada target guidelines',
  federal: {
    ...CANADIAN_TAX_SCHEDULE_2025_2026.federal,
    brackets: [
      { threshold: 0, rate: 0.15 },
      { threshold: 58637, rate: 0.205 },
      { threshold: 117274, rate: 0.26 },
      { threshold: 181795, rate: 0.29 },
      { threshold: 258989, rate: 0.33 }
    ],
    bpa: 16050,
    ageAmount: 8983,
    ageAmountThreshold: 45300
  },
  cpp: {
    ...CANADIAN_TAX_SCHEDULE_2025_2026.cpp,
    maxAnnualAt65: 17292,
    ympe: 72900,
    yampe: 83000
  },
  oas: {
    ...CANADIAN_TAX_SCHEDULE_2025_2026.oas,
    maxAnnualAt65: 8923,
    clawbackThreshold: 95258
  },
  registeredCaps: {
    rrspMaxRoomBase: 33200,
    tfsaAnnualLimit: 7000,
    fhsaAnnualLimit: 8000,
    fhsaLifetimeLimit: 40000
  }
};

/**
 * Registry of all available tax year configs
 */
export const TAX_YEAR_CONFIGS: Record<string, TaxYearConfig> = {
  '2025_2026': CANADIAN_TAX_SCHEDULE_2025_2026,
  '2026_2027': CANADIAN_TAX_SCHEDULE_2026_2027,
  'latest': CANADIAN_TAX_SCHEDULE_2025_2026
};

/**
 * Default active tax year config
 */
export const DEFAULT_TAX_YEAR_CONFIG: TaxYearConfig = CANADIAN_TAX_SCHEDULE_2025_2026;

/**
 * Resolver for dynamic rule resolution by year key or string
 */
export function getTaxYearConfig(yearOrKey?: string | number): TaxYearConfig {
  if (!yearOrKey) return DEFAULT_TAX_YEAR_CONFIG;
  const key = String(yearOrKey).replace(/[\s\/-]/g, '_');
  if (TAX_YEAR_CONFIGS[key]) return TAX_YEAR_CONFIGS[key];
  if (TAX_YEAR_CONFIGS[`${key}_${Number(key) + 1}`]) return TAX_YEAR_CONFIGS[`${key}_${Number(key) + 1}`];
  console.warn(`[CanadianTaxData] Unknown tax schedule "${yearOrKey}". Defaulting to ${DEFAULT_TAX_YEAR_CONFIG.label}`);
  return DEFAULT_TAX_YEAR_CONFIG;
}

// Backward-compatible individual exports mapped to default schedule
export const FEDERAL_BRACKETS: TaxBracket[] = DEFAULT_TAX_YEAR_CONFIG.federal.brackets;
export const FEDERAL_BPA: number = DEFAULT_TAX_YEAR_CONFIG.federal.bpa;
export const FEDERAL_AGE_AMOUNT: number = DEFAULT_TAX_YEAR_CONFIG.federal.ageAmount;
export const FEDERAL_AGE_AMOUNT_THRESHOLD: number = DEFAULT_TAX_YEAR_CONFIG.federal.ageAmountThreshold;
export const PENSION_INCOME_AMOUNT: number = DEFAULT_TAX_YEAR_CONFIG.federal.pensionIncomeAmount;
export const PROVINCIAL_BRACKETS: Record<CanadianProvince, { brackets: TaxBracket[]; bpa: number; name: string }> = DEFAULT_TAX_YEAR_CONFIG.provincial;
export const RRIF_MINIMUM_RATES: Record<number, number> = DEFAULT_TAX_YEAR_CONFIG.rrifMinimumRates;
export const CPP_MAX_ANNUAL_AT_65: number = DEFAULT_TAX_YEAR_CONFIG.cpp.maxAnnualAt65;
export const CPP_YMPE: number = DEFAULT_TAX_YEAR_CONFIG.cpp.ympe;
export const CPP_YAMPE: number = DEFAULT_TAX_YEAR_CONFIG.cpp.yampe;
export const CPP_EMPLOYEE_RATE: number = DEFAULT_TAX_YEAR_CONFIG.cpp.employeeRate;
export const CPP2_EMPLOYEE_RATE: number = DEFAULT_TAX_YEAR_CONFIG.cpp.cpp2EmployeeRate;
export const OAS_MAX_ANNUAL_AT_65: number = DEFAULT_TAX_YEAR_CONFIG.oas.maxAnnualAt65;
export const OAS_AGE_75_BONUS_MULTIPLIER: number = DEFAULT_TAX_YEAR_CONFIG.oas.age75BonusMultiplier;
export const OAS_CLAWBACK_THRESHOLD: number = DEFAULT_TAX_YEAR_CONFIG.oas.clawbackThreshold;
export const OAS_CLAWBACK_RATE: number = DEFAULT_TAX_YEAR_CONFIG.oas.clawbackRate;
export const RRSP_MAX_ROOM_BASE: number = DEFAULT_TAX_YEAR_CONFIG.registeredCaps.rrspMaxRoomBase;
export const TFSA_ANNUAL_LIMIT: number = DEFAULT_TAX_YEAR_CONFIG.registeredCaps.tfsaAnnualLimit;
export const FHSA_ANNUAL_LIMIT: number = DEFAULT_TAX_YEAR_CONFIG.registeredCaps.fhsaAnnualLimit;
export const FHSA_LIFETIME_LIMIT: number = DEFAULT_TAX_YEAR_CONFIG.registeredCaps.fhsaLifetimeLimit;
export const CRA_ECONOMIC_DEFAULTS: EconomicDefaults = DEFAULT_TAX_YEAR_CONFIG.economicDefaults;
