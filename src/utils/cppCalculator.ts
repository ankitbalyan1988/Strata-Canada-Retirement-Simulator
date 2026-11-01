import {
  CppCalculationMethod,
  CareerDisruption,
  RetirementInputs,
  SpouseInputs
} from '../types/retirement';
import {
  TaxYearConfig,
  DEFAULT_TAX_YEAR_CONFIG
} from './canadianTax';

export interface ServiceCanadaCppAdjustmentOptions {
  serviceCanadaMonthlyAt65: number; // Statement of Contributions (SOC) estimated monthly CPP at 65 (in today's dollars)
  currentAge: number; // Current age of user/spouse
  retirementAge: number; // Planned retirement age (when work/contributions cease)
  cppStartAge: number; // Planned age to begin collecting CPP (60 to 70)
  currentAnnualIncome?: number; // Current annual earnings (used for YMPE comparison)
  careerDisruption?: CareerDisruption; // Layoff, wage drop, or career shock settings
  config?: TaxYearConfig; // Tax year configuration for YMPE and max benefit
}

export interface ServiceCanadaCppAdjustmentResult {
  serviceCanadaMonthlyAt65: number;
  serviceCanadaAnnualAt65: number;
  adjustedMonthlyAt65: number;
  adjustedAnnualAt65: number;
  timingFactor: number;
  anticipatedMonthlyAtStartAge: number;
  anticipatedAnnualAtStartAge: number;
  effectivePercentOfMaxAt65: number;
  effectivePercentOfMaxAtStartAge: number;
  earlyRetirementYearsLost: number;
  unabsorbedZeroYears: number;
  careerDownturnImpactPercent: number;
  earlyRetirementImpactPercent: number;
  totalCareerAdjustmentPercent: number;
  timingAdjustmentPercent: number;
  explanation: string;
  breakdownNotes: string[];
}

/**
 * Returns the statutory actuarial timing factor for CPP collection age (60 to 70).
 * Pre-65: -0.6% per month (-7.2% per year), down to -36% at age 60.
 * Post-65: +0.7% per month (+8.4% per year), up to +42% at age 70.
 */
export function getCppTimingFactor(
  cppStartAge: number,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): { factor: number; adjustmentPercent: number; label: string } {
  const age = Math.min(70, Math.max(60, cppStartAge));
  const earlyRate = config.cpp.earlyReductionMonthlyRate || 0.006; // 0.6%/mo
  const delayedRate = config.cpp.delayedEnhancementMonthlyRate || 0.007; // 0.7%/mo

  if (age < 65) {
    const monthsEarly = (65 - age) * 12;
    const factor = Math.max(0.60, 1.0 - (monthsEarly * earlyRate));
    const adjustmentPercent = -Math.round((1.0 - factor) * 1000) / 10;
    return {
      factor,
      adjustmentPercent,
      label: `${adjustmentPercent}% permanent reduction (${(earlyRate * 1200).toFixed(1)}%/yr early)`
    };
  }

  if (age > 65) {
    const monthsLate = (age - 65) * 12;
    const factor = 1.0 + (monthsLate * delayedRate);
    const adjustmentPercent = Math.round((factor - 1.0) * 1000) / 10;
    return {
      factor,
      adjustmentPercent,
      label: `+${adjustmentPercent}% permanent enhancement (${(delayedRate * 1200).toFixed(1)}%/yr deferred)`
    };
  }

  return {
    factor: 1.0,
    adjustmentPercent: 0,
    label: 'Standard Age 65 Baseline (100%)'
  };
}

/**
 * Dynamically converts a Service Canada Statement of Contributions (SOC) estimated
 * monthly CPP at age 65 into the true anticipated CPP benefit.
 *
 * Actuarial Principles Modeled:
 * 1. Service Canada SOC Assumption: Service Canada assumes the contributor will continue
 *    earning and contributing at their current earnings level every single year from their
 *    current age until age 65.
 * 2. Early Retirement Zero-Earning Years: If the contributor stops working before 65, those
 *    intervening years contribute $0 in pensionable earnings.
 * 3. 17% General Drop-Out Buffer: In the standard 47-year contributory period (ages 18 to 65),
 *    the lowest 17% of months (~8 years / 96 months) are automatically dropped. Zero-earning years
 *    beyond this drop-out allowance dilute the 39-year earnings divisor.
 * 4. Career Disruptions / Downturns: Wage reductions or layoffs between current age and retirement
 *    reduce earnings relative to the full YMPE trajectory assumed by Service Canada.
 * 5. Collection Age Actuarial Adjustment: Applies the statutory -0.6%/mo reduction (age 60-64)
 *    or +0.7%/mo enhancement (age 66-70) to yield the actual anticipated CPP at the chosen start age.
 */
export function calculateAdjustedServiceCanadaCpp(
  options: ServiceCanadaCppAdjustmentOptions
): ServiceCanadaCppAdjustmentResult {
  const {
    serviceCanadaMonthlyAt65,
    currentAge,
    retirementAge,
    cppStartAge,
    currentAnnualIncome,
    careerDisruption,
    config = DEFAULT_TAX_YEAR_CONFIG
  } = options;

  const maxAnnualAt65 = config.cpp.maxAnnualAt65; // ~$17,202 in 2026
  const maxMonthlyAt65 = maxAnnualAt65 / 12; // ~$1,433.50/mo
  const ympe = config.cpp.ympe; // ~$71,300 in 2026

  const rawMonthly = Math.max(0, serviceCanadaMonthlyAt65 || 0);
  const rawAnnual = rawMonthly * 12;

  // If input is 0 or negative, return baseline zeros
  if (rawMonthly <= 0) {
    return {
      serviceCanadaMonthlyAt65: 0,
      serviceCanadaAnnualAt65: 0,
      adjustedMonthlyAt65: 0,
      adjustedAnnualAt65: 0,
      timingFactor: 1.0,
      anticipatedMonthlyAtStartAge: 0,
      anticipatedAnnualAtStartAge: 0,
      effectivePercentOfMaxAt65: 0,
      effectivePercentOfMaxAtStartAge: 0,
      earlyRetirementYearsLost: 0,
      unabsorbedZeroYears: 0,
      careerDownturnImpactPercent: 0,
      earlyRetirementImpactPercent: 0,
      totalCareerAdjustmentPercent: 0,
      timingAdjustmentPercent: 0,
      explanation: 'No Service Canada estimate provided.',
      breakdownNotes: []
    };
  }

  // 1. Service Canada Implied Ratio over 39 years
  const scRatioAt65 = Math.min(1.0, rawAnnual / maxAnnualAt65);
  const scPoints39 = 39 * scRatioAt65;

  // Current earnings ratio relative to YMPE
  const income = currentAnnualIncome !== undefined && currentAnnualIncome > 0 ? currentAnnualIncome : ympe * scRatioAt65;
  const currentEarningsRatio = Math.min(1.0, Math.max(0.1, income / ympe));

  // 2. Contributory Timeline Analysis (from Age 18 to 65 = 47 years)
  const totalContributoryYears = 47;
  const totalDropOutYears = 8; // 17% of 47 = 7.99 -> 8 years
  const pastYears = Math.min(totalContributoryYears, Math.max(0, currentAge - 18));
  const futureYearsTo65 = Math.max(0, 65 - currentAge);

  // Past drop-out years already utilized (school, early career gaps)
  // Standard actuarial assumption: proportional to past career, min 2 years for post-secondary
  const pastDropOutEstimated = Math.min(totalDropOutYears, Math.max(2, Math.round(pastYears * 0.17)));
  const remainingDropOutYears = Math.max(0, totalDropOutYears - pastDropOutEstimated);

  // 3. Early Retirement Zero-Earnings Years
  // Years from planned retirement until age 65
  const earlyRetirementYears = Math.max(0, 65 - Math.max(currentAge, retirementAge));
  const absorbedZeroYears = Math.min(earlyRetirementYears, remainingDropOutYears);
  const unabsorbedZeroYears = Math.max(0, earlyRetirementYears - remainingDropOutYears);

  // Unabsorbed zero years directly replace assumed positive earnings with $0
  const unabsorbedLoss = unabsorbedZeroYears * currentEarningsRatio;

  // Absorbed zero years use up drop-out room that Service Canada assumed would displace lower past years
  const absorbedLoss = absorbedZeroYears * Math.max(0, currentEarningsRatio - scRatioAt65);

  const totalEarlyRetirementLoss = unabsorbedLoss + absorbedLoss;

  // 4. Career Disruption / Downturn Impact
  let downturnLoss = 0;
  if (careerDisruption?.enabled && careerDisruption.shockAge < Math.min(65, retirementAge)) {
    const shockStart = Math.max(currentAge, careerDisruption.shockAge);
    const workEnd = Math.min(65, retirementAge);
    const recoveryAge = careerDisruption.isTemporary ? shockStart + (careerDisruption.recoveryYears || 2) : workEnd;
    const shockEnd = Math.min(workEnd, recoveryAge);
    const affectedYears = Math.max(0, shockEnd - shockStart);
    const reductionFactor = Math.min(0.9, Math.max(0.05, careerDisruption.reductionPercent / 100));

    downturnLoss = affectedYears * currentEarningsRatio * reductionFactor;
  }

  // 5. Total Adjustment on 39-Year Divisor
  const totalPointsLoss = totalEarlyRetirementLoss + downturnLoss;
  const ratioReduction = totalPointsLoss / 39;
  const adjustedRatioAt65 = Math.max(0.15, Math.min(1.0, scRatioAt65 - ratioReduction));

  const adjustedAnnualAt65 = Math.round(adjustedRatioAt65 * maxAnnualAt65);
  const adjustedMonthlyAt65 = Math.round((adjustedAnnualAt65 / 12) * 100) / 100;

  // Percentage reductions relative to Service Canada's age-65 estimate
  const earlyRetireImpactPct = rawAnnual > 0 ? -Math.round(((totalEarlyRetirementLoss / 39) * maxAnnualAt65 / rawAnnual) * 1000) / 10 : 0;
  const downturnImpactPct = rawAnnual > 0 ? -Math.round(((downturnLoss / 39) * maxAnnualAt65 / rawAnnual) * 1000) / 10 : 0;
  const totalCareerAdjPct = rawMonthly > 0 ? Math.round(((adjustedMonthlyAt65 - rawMonthly) / rawMonthly) * 1000) / 10 : 0;

  // 6. Actuarial Timing Factor for cppStartAge (60 to 70)
  const timing = getCppTimingFactor(cppStartAge, config);
  const anticipatedAnnualAtStartAge = Math.round(adjustedAnnualAt65 * timing.factor);
  const anticipatedMonthlyAtStartAge = Math.round((anticipatedAnnualAtStartAge / 12) * 100) / 100;

  const effectivePercentOfMaxAt65 = Math.round(adjustedRatioAt65 * 1000) / 10;
  const effectivePercentOfMaxAtStartAge = Math.round((anticipatedAnnualAtStartAge / maxAnnualAt65) * 1000) / 10;

  // 7. Explanatory Breakdown Notes
  const breakdownNotes: string[] = [];
  breakdownNotes.push(`Service Canada SOC Estimate: $${Math.round(rawMonthly).toLocaleString()}/mo ($${Math.round(rawAnnual).toLocaleString()}/yr) at Age 65.`);

  if (earlyRetirementYears > 0) {
    breakdownNotes.push(
      `Early Retirement Dilution: Retiring at Age ${retirementAge} stops CPP contributions ${earlyRetirementYears} year${earlyRetirementYears > 1 ? 's' : ''} early. ${absorbedZeroYears} year${absorbedZeroYears > 1 ? 's are' : ' is'} absorbed by the CRA 17% drop-out; ${unabsorbedZeroYears} year${unabsorbedZeroYears > 1 ? 's dilute' : ' dilutes'} the 39-year career average (${earlyRetireImpactPct}% adjustment).`
    );
  } else {
    breakdownNotes.push(`Full Career to 65: Working through Age 65 avoids zero-earning dilution years.`);
  }

  if (downturnLoss > 0 && careerDisruption?.enabled) {
    breakdownNotes.push(
      `Career Disruption Adjustment: -${careerDisruption.reductionPercent}% earnings shock modeled at Age ${careerDisruption.shockAge} reduces future contributory points by ~${downturnLoss.toFixed(1)} points (${downturnImpactPct}% adjustment).`
    );
  }

  breakdownNotes.push(`Adjusted Age 65 Baseline: $${Math.round(adjustedMonthlyAt65).toLocaleString()}/mo ($${Math.round(adjustedAnnualAt65).toLocaleString()}/yr).`);

  if (cppStartAge !== 65) {
    breakdownNotes.push(
      `Collection Timing Factor @ Age ${cppStartAge}: ${timing.label} transforms your adjusted baseline into $${Math.round(anticipatedMonthlyAtStartAge).toLocaleString()}/mo ($${Math.round(anticipatedAnnualAtStartAge).toLocaleString()}/yr).`
    );
  } else {
    breakdownNotes.push(`Standard Collection Timing @ Age 65: 100% of adjusted baseline ($${Math.round(anticipatedMonthlyAtStartAge).toLocaleString()}/mo).`);
  }

  const explanation = earlyRetirementYears > 0 || downturnLoss > 0
    ? `Service Canada's $${Math.round(rawMonthly).toLocaleString()}/mo statement assumes uninterrupted earnings through age 65. Factoring in your planned retirement at Age ${retirementAge}${careerDisruption?.enabled ? ' and career disruption' : ''} adjusts your age-65 baseline to $${Math.round(adjustedMonthlyAt65).toLocaleString()}/mo, and collecting at Age ${cppStartAge} results in an anticipated benefit of $${Math.round(anticipatedMonthlyAtStartAge).toLocaleString()}/mo.`
    : `Your Service Canada statement estimate of $${Math.round(rawMonthly).toLocaleString()}/mo at Age 65 is adjusted for your chosen collection age of ${cppStartAge} (${timing.label}), yielding an anticipated $${Math.round(anticipatedMonthlyAtStartAge).toLocaleString()}/mo.`;

  return {
    serviceCanadaMonthlyAt65: rawMonthly,
    serviceCanadaAnnualAt65: rawAnnual,
    adjustedMonthlyAt65,
    adjustedAnnualAt65,
    timingFactor: timing.factor,
    anticipatedMonthlyAtStartAge,
    anticipatedAnnualAtStartAge,
    effectivePercentOfMaxAt65,
    effectivePercentOfMaxAtStartAge,
    earlyRetirementYearsLost: earlyRetirementYears,
    unabsorbedZeroYears,
    careerDownturnImpactPercent: downturnImpactPct,
    earlyRetirementImpactPercent: earlyRetireImpactPct,
    totalCareerAdjustmentPercent: totalCareerAdjPct,
    timingAdjustmentPercent: timing.adjustmentPercent,
    explanation,
    breakdownNotes
  };
}

/**
 * High-level unified CPP evaluator for either primary or spouse.
 * Inspects `cppCalculationMethod` ('percentage' vs 'service_canada') and returns
 * the exact nominal benefit for a given simulation year.
 */
export function calculatePersonCppAnnualBenefit(
  age: number,
  person: {
    currentAge: number;
    retirementAge: number;
    annualIncome: number;
    cppStartAge: number;
    cppEstimatedPercentOfMax: number;
    cppCalculationMethod?: CppCalculationMethod;
    cppServiceCanadaEstimateAt65?: number;
    careerDisruption?: CareerDisruption;
  },
  inflationFactor: number,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): {
  annualBenefit: number;
  monthlyBenefitToday: number;
  percentOfMax: number;
  details?: ServiceCanadaCppAdjustmentResult;
} {
  if (age < person.cppStartAge) {
    return {
      annualBenefit: 0,
      monthlyBenefitToday: 0,
      percentOfMax: 0
    };
  }

  const isServiceCanada = person.cppCalculationMethod === 'service_canada' &&
    Boolean(person.cppServiceCanadaEstimateAt65 && person.cppServiceCanadaEstimateAt65 > 0);

  if (isServiceCanada) {
    const adj = calculateAdjustedServiceCanadaCpp({
      serviceCanadaMonthlyAt65: person.cppServiceCanadaEstimateAt65!,
      currentAge: person.currentAge,
      retirementAge: person.retirementAge,
      cppStartAge: person.cppStartAge,
      currentAnnualIncome: person.annualIncome,
      careerDisruption: person.careerDisruption,
      config
    });

    return {
      annualBenefit: Math.round(adj.anticipatedAnnualAtStartAge * inflationFactor),
      monthlyBenefitToday: adj.anticipatedMonthlyAtStartAge,
      percentOfMax: adj.effectivePercentOfMaxAtStartAge,
      details: adj
    };
  }

  // Standard percentage method
  const percent = Math.min(100, Math.max(0, person.cppEstimatedPercentOfMax || 64));
  const baseAt65 = config.cpp.maxAnnualAt65 * (percent / 100);
  const timing = getCppTimingFactor(person.cppStartAge, config);
  const annualToday = baseAt65 * timing.factor;
  const monthlyToday = annualToday / 12;

  return {
    annualBenefit: Math.round(annualToday * inflationFactor),
    monthlyBenefitToday: Math.round(monthlyToday * 100) / 100,
    percentOfMax: Math.round((annualToday / config.cpp.maxAnnualAt65) * 1000) / 10
  };
}
