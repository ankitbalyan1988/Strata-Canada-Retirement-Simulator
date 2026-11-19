import { RetirementInputs } from '../types/retirement';
import { calculateCanadianTax, calculateOasGrossBenefit, calculateOasClawback } from './canadianTax';
import { calculatePersonCppAnnualBenefit } from './cppCalculator';
import { calculateEmployerRrspMatch } from './employerMatch';
import {
  initializeMortgageAndHousingParams,
  createInitialHousingState,
  calculateMortgageAndHousingForYear
} from './engine/calculateMortgageAndHousing';
import {
  getEffectiveDebts,
  initializeDebtStates,
  calculateDebtsForYear
} from './debtCalculator';

export interface MonteCarloOptimizerOptions {
  confidenceTarget: number; // e.g. 80, 85, 90, 95
  volatilityPercent: number; // e.g. 9 (Conservative), 12 (Balanced), 15 (Growth)
  numTrials: number; // e.g. 500
  seed: number; // deterministic PRNG seed
  customSavingsRatePercent?: number | null; // optional sandbox override
  customTargetIncomeToday?: number | null; // optional sandbox override
}

export interface AgeMonteCarloPoint {
  age: number;
  successRate: number; // 0 to 100
  successfulTrials: number;
  totalTrials: number;
  medianNestEggAtRetirementReal: number; // today's $
  medianTerminalWealthReal: number; // today's $
  p10TerminalWealthReal: number; // 10th percentile stressed outcome, today's $
  p90TerminalWealthReal: number; // 90th percentile upside outcome, today's $
  medianDepletionAge: number | null; // median failure age among failed paths
}

export interface MonteCarloTrajectoryPoint {
  age: number;
  p10Real: number;
  p25Real: number;
  p50Real: number;
  p75Real: number;
  p90Real: number;
}

export interface MonteCarloOptimizerResult {
  isBlankCanvas: boolean;
  suggestedAge: number | null; // earliest age meeting confidenceTarget
  bestAvailableAge: number; // highest-probability age evaluated
  currentRetirementAge: number;
  ageDelta: number | null; // suggestedAge - currentRetirementAge
  confidenceTarget: number;
  volatilityPercent: number;
  numTrials: number;
  seed: number;
  // Derived plan drivers
  householdIncome: number;
  baseAnnualSavings: number;
  effectiveAnnualSavings: number;
  baseSavingsRatePercent: number;
  effectiveSavingsRatePercent: number;
  baseTargetIncomeToday: number;
  effectiveTargetIncomeToday: number;
  weightedPreReturnPercent: number;
  weightedPostReturnPercent: number;
  // Evaluations
  currentPlanResult: AgeMonteCarloPoint | null;
  suggestedPlanResult: AgeMonteCarloPoint | null;
  ageCurve: AgeMonteCarloPoint[];
  suggestedTrajectory: MonteCarloTrajectoryPoint[];
  // Sensitivity guidance if current plan is below confidence target
  extraMonthlySavingsEstimate: number | null;
  executionMs: number;
}

/**
 * Fast, high-quality deterministic PRNG (Mulberry32) for reproducible Monte Carlo trials.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates standard normal N(0,1) variates via Box-Muller transform.
 */
function nextGaussian(rng: () => number): [number, number] {
  let u1 = rng();
  let u2 = rng();
  if (u1 < 1e-10) u1 = 1e-10;
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  const angle = 2.0 * Math.PI * u2;
  return [mag * Math.cos(angle), mag * Math.sin(angle)];
}

/**
 * Computes percentile on a sorted numeric array (p in [0, 1]).
 */
function percentileSorted(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const idx = p * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/**
 * Computes weighted expected pre- and post-retirement portfolio returns from user's account mix.
 */
function computeWeightedReturns(inputs: RetirementInputs): {
  preReturn: number;
  postReturn: number;
  nonRegDrag: number;
} {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const sp = inputs.spouse;
  const ar = inputs.accountReturns;

  const rrspPre = ar?.rrspReturn ?? inputs.preRetirementReturn ?? 6.5;
  const tfsaPre = ar?.tfsaReturn ?? inputs.preRetirementReturn ?? 7.0;
  const fhsaPre = ar?.fhsaReturn ?? 6.0;
  const nonRegPre = ar?.nonRegReturn ?? inputs.preRetirementReturn ?? 5.5;

  const rrspPost = ar?.rrspPostReturn ?? ar?.rrspReturn ?? inputs.postRetirementReturn ?? 5.0;
  const tfsaPost = ar?.tfsaPostReturn ?? ar?.tfsaReturn ?? inputs.postRetirementReturn ?? 5.5;
  const nonRegPost = ar?.nonRegPostReturn ?? ar?.nonRegReturn ?? inputs.postRetirementReturn ?? 4.5;

  const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
  const customNonRegTotal = hasCustomNonReg
    ? inputs.nonRegCustomAccounts!.reduce((sum, a) => sum + Math.max(0, a.balance), 0)
    : 0;
  const customNonRegWeightedReturn =
    customNonRegTotal > 0
      ? inputs.nonRegCustomAccounts!.reduce((sum, a) => sum + Math.max(0, a.balance) * a.expectedReturn, 0) /
        customNonRegTotal
      : nonRegPre;

  const wRrsp = Math.max(0, inputs.rrspBalance || 0) + (isCouple && sp ? Math.max(0, sp.rrspBalance || 0) : 0) + Math.max(0, inputs.rrspAnnualContribution || 0) * 3;
  const wTfsa = Math.max(0, inputs.tfsaBalance || 0) + (isCouple && sp ? Math.max(0, sp.tfsaBalance || 0) : 0) + Math.max(0, inputs.tfsaAnnualContribution || 0) * 3;
  const wFhsa = Math.max(0, inputs.fhsaBalance || 0) + (isCouple && sp ? Math.max(0, sp.fhsaBalance || 0) : 0) + Math.max(0, inputs.fhsaAnnualContribution || 0) * 3;
  const wNonReg =
    (hasCustomNonReg ? customNonRegTotal : Math.max(0, inputs.nonRegBalance || 0)) +
    (isCouple && sp ? Math.max(0, sp.nonRegBalance || 0) : 0) +
    Math.max(0, inputs.nonRegAnnualContribution || 0) * 3;

  const totalW = wRrsp + wTfsa + wFhsa + wNonReg;
  const effNonRegPre = hasCustomNonReg ? customNonRegWeightedReturn : nonRegPre;

  if (totalW <= 0) {
    return {
      preReturn: (rrspPre + tfsaPre) / 2,
      postReturn: (rrspPost + tfsaPost) / 2,
      nonRegDrag: Math.max(0, inputs.nonRegYieldTaxRate ?? 1.2)
    };
  }

  const preReturn = (wRrsp * rrspPre + wTfsa * tfsaPre + wFhsa * fhsaPre + wNonReg * effNonRegPre) / totalW;
  const postReturn = (wRrsp * rrspPost + wTfsa * tfsaPost + wFhsa * rrspPost + wNonReg * nonRegPost) / totalW;

  return {
    preReturn,
    postReturn,
    nonRegDrag: Math.max(0, inputs.nonRegYieldTaxRate ?? 1.2)
  };
}

/**
 * Computes baseline annual household savings, employer match, and gross income.
 */
export function computeHouseholdSavingsSummary(inputs: RetirementInputs) {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const sp = inputs.spouse;

  const primaryIncome = Math.max(0, inputs.currentAnnualIncome || 0);
  const spouseIncome = isCouple && sp ? Math.max(0, sp.annualIncome || 0) : 0;
  const householdIncome = primaryIncome + spouseIncome;

  const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
  const primaryNonRegContrib = hasCustomNonReg
    ? inputs.nonRegCustomAccounts!.reduce((sum, a) => sum + Math.max(0, a.annualContribution || 0), 0)
    : Math.max(0, inputs.nonRegAnnualContribution || 0);

  const primaryRrsp = Math.max(0, inputs.rrspAnnualContribution || 0);
  const primaryTfsa = Math.max(0, inputs.tfsaAnnualContribution || 0);
  const primaryFhsa = Math.max(0, inputs.fhsaAnnualContribution || 0);
  const primaryMatch = calculateEmployerRrspMatch(primaryIncome, primaryRrsp, inputs.employerMatch);

  const spouseRrsp = isCouple && sp ? Math.max(0, sp.rrspAnnualContribution || 0) : 0;
  const spouseTfsa = isCouple && sp ? Math.max(0, sp.tfsaAnnualContribution || 0) : 0;
  const spouseFhsa = isCouple && sp ? Math.max(0, sp.fhsaAnnualContribution || 0) : 0;
  const spouseNonReg = isCouple && sp ? Math.max(0, sp.nonRegAnnualContribution || 0) : 0;
  const spouseMatch =
    isCouple && sp && sp.employerMatch?.enabled
      ? calculateEmployerRrspMatch(spouseIncome, spouseRrsp, sp.employerMatch)
      : 0;

  const totalRrspContrib = primaryRrsp + primaryMatch + spouseRrsp + spouseMatch;
  const totalTfsaFhsaContrib = primaryTfsa + primaryFhsa + spouseTfsa + spouseFhsa;
  const totalNonRegContrib = primaryNonRegContrib + spouseNonReg;
  const baseAnnualSavings = totalRrspContrib + totalTfsaFhsaContrib + totalNonRegContrib;
  const baseSavingsRatePercent = householdIncome > 0 ? (baseAnnualSavings / householdIncome) * 100 : 0;

  return {
    householdIncome,
    primaryIncome,
    spouseIncome,
    totalRrspContrib,
    totalTfsaFhsaContrib,
    totalNonRegContrib,
    baseAnnualSavings,
    baseSavingsRatePercent
  };
}

/**
 * Estimates effective Canadian tax rate on taxable retirement income (RRSP/RRIF + CPP + OAS),
 * incorporating provincial brackets, age credit, pension credit, and couple income splitting.
 */
function estimateRetirementTaxRate(
  taxableIncomeReal: number,
  province: RetirementInputs['province'],
  age: number,
  isCouple: boolean,
  pensionSplitting: boolean
): number {
  if (taxableIncomeReal <= 12000) return 0;
  if (isCouple && pensionSplitting) {
    const splitIncome = taxableIncomeReal / 2;
    const taxEach = calculateCanadianTax(splitIncome, province, age, splitIncome * 0.6).totalTax;
    return Math.min(0.48, Math.max(0, (taxEach * 2) / taxableIncomeReal));
  }
  const tax = calculateCanadianTax(taxableIncomeReal, province, age, taxableIncomeReal * 0.5).totalTax;
  return Math.min(0.48, Math.max(0, tax / taxableIncomeReal));
}

/**
 * Pre-computes deterministic annual housing cashflows (mortgage, rent, taxes, condo fees, rental income, home sale proceeds)
 * and consumer debt service schedules from the user's exact inputs so the Monte Carlo loop remains ultra-fast.
 */
function precomputeHousingAndDebtSchedules(inputs: RetirementInputs, totalYears: number) {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const sp = inputs.spouse;

  const housingParams = initializeMortgageAndHousingParams(inputs, isCouple);
  const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
  const initNonReg = hasCustomNonReg
    ? inputs.nonRegCustomAccounts!.reduce((sum, a) => sum + Math.max(0, a.balance), 0)
    : Math.max(0, inputs.nonRegBalance || 0);

  const dummyBalances = {
    pRrsp: Math.max(0, inputs.rrspBalance || 0),
    pTfsa: Math.max(0, inputs.tfsaBalance || 0),
    pFhsa: Math.max(0, inputs.fhsaBalance || 0),
    pNonReg: initNonReg,
    sRrsp: isCouple && sp ? Math.max(0, sp.rrspBalance || 0) : 0,
    sTfsa: isCouple && sp ? Math.max(0, sp.tfsaBalance || 0) : 0,
    sFhsa: isCouple && sp ? Math.max(0, sp.fhsaBalance || 0) : 0,
    sNonReg: isCouple && sp ? Math.max(0, sp.nonRegBalance || 0) : 0,
    customAccountsState: []
  };

  const pFhsaActive = dummyBalances.pFhsa > 0 || (inputs.fhsaAnnualContribution > 0 && inputs.currentAge < 71);
  const sFhsaActive =
    isCouple && sp ? dummyBalances.sFhsa > 0 || (sp.fhsaAnnualContribution > 0 && sp.currentAge < 71) : false;

  const housingState = createInitialHousingState(housingParams, pFhsaActive, sFhsaActive);
  const effectiveDebts = getEffectiveDebts(inputs);
  const debtStates = initializeDebtStates(effectiveDebts, inputs.currentAge, inputs.debtStrategy);

  // Arrays indexed by year i = 0 .. totalYears - 1 (all stored in real today's dollars or exact nominal where fixed)
  const mortgagePaymentNominal = new Float64Array(totalYears);
  const rentPaymentReal = new Float64Array(totalYears);
  const ownershipFixedReal = new Float64Array(totalYears);
  const rentalIncomeReal = new Float64Array(totalYears);
  const homeSaleNetProceedsNominal = new Float64Array(totalYears);
  const downPaymentCashOutflowNominal = new Float64Array(totalYears);
  const debtPaymentNominal = new Float64Array(totalYears);

  for (let i = 0; i < totalYears; i++) {
    const age = inputs.currentAge + i;
    const spouseAge = isCouple && sp ? sp.currentAge + i : undefined;

    const prevTotal =
      dummyBalances.pRrsp +
      dummyBalances.pTfsa +
      dummyBalances.pFhsa +
      dummyBalances.pNonReg +
      dummyBalances.sRrsp +
      dummyBalances.sTfsa +
      dummyBalances.sFhsa +
      dummyBalances.sNonReg;

    const hRes = calculateMortgageAndHousingForYear(
      age,
      spouseAge,
      i,
      housingParams,
      housingState,
      dummyBalances,
      isCouple
    );

    const postTotal =
      dummyBalances.pRrsp +
      dummyBalances.pTfsa +
      dummyBalances.pFhsa +
      dummyBalances.pNonReg +
      dummyBalances.sRrsp +
      dummyBalances.sTfsa +
      dummyBalances.sFhsa +
      dummyBalances.sNonReg;

    const balanceDelta = postTotal - prevTotal;
    if (hRes.homeSaleProceeds > 0) {
      homeSaleNetProceedsNominal[i] = hRes.homeSaleProceeds;
    }
    if (balanceDelta < -1) {
      downPaymentCashOutflowNominal[i] = Math.abs(balanceDelta);
    }

    mortgagePaymentNominal[i] = Math.max(0, hRes.mortgagePaidThisYear || 0);
    rentPaymentReal[i] = Math.max(0, hRes.rentPaidThisYear || 0);
    ownershipFixedReal[i] = Math.max(0, (hRes.propertyTaxPaidThisYear || 0) + (hRes.condoFeesPaidThisYear || 0));
    rentalIncomeReal[i] = Math.max(0, hRes.rentalIncomeThisYear || 0);

    const dRes = calculateDebtsForYear(debtStates, age, inputs.debtStrategy);
    debtPaymentNominal[i] = Math.max(0, dRes.totalAnnualPayment || 0);
  }

  return {
    mortgagePaymentNominal,
    rentPaymentReal,
    ownershipFixedReal,
    rentalIncomeReal,
    homeSaleNetProceedsNominal,
    downPaymentCashOutflowNominal,
    debtPaymentNominal
  };
}

/**
 * Runs a full Monte Carlo Retirement Age Optimization using Common Random Numbers (CRN)
 * across all candidate retirement ages so success probability curves are smooth and comparable.
 */
export function runMonteCarloRetirementOptimizer(
  inputs: RetirementInputs,
  options: MonteCarloOptimizerOptions
): MonteCarloOptimizerResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const sp = inputs.spouse;

  const {
    householdIncome,
    primaryIncome,
    spouseIncome,
    totalRrspContrib,
    totalTfsaFhsaContrib,
    totalNonRegContrib,
    baseAnnualSavings,
    baseSavingsRatePercent
  } = computeHouseholdSavingsSummary(inputs);

  const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
  const initNonReg =
    (hasCustomNonReg
      ? inputs.nonRegCustomAccounts!.reduce((sum, a) => sum + Math.max(0, a.balance), 0)
      : Math.max(0, inputs.nonRegBalance || 0)) +
    (isCouple && sp ? Math.max(0, sp.nonRegBalance || 0) : 0);

  const initRrsp = Math.max(0, inputs.rrspBalance || 0) + (isCouple && sp ? Math.max(0, sp.rrspBalance || 0) : 0);
  const initTfsaFhsa =
    Math.max(0, inputs.tfsaBalance || 0) +
    Math.max(0, inputs.fhsaBalance || 0) +
    (isCouple && sp ? Math.max(0, sp.tfsaBalance || 0) + Math.max(0, sp.fhsaBalance || 0) : 0);

  const totalInitialLiquid = initRrsp + initTfsaFhsa + initNonReg;
  const baseTargetIncomeToday = Math.max(0, inputs.targetRetirementSpendingToday || 0);

  const effectiveTargetIncomeToday =
    options.customTargetIncomeToday !== null && options.customTargetIncomeToday !== undefined
      ? Math.max(12000, options.customTargetIncomeToday)
      : baseTargetIncomeToday;

  const effectiveSavingsRatePercent =
    options.customSavingsRatePercent !== null && options.customSavingsRatePercent !== undefined
      ? Math.max(0, Math.min(75, options.customSavingsRatePercent))
      : baseSavingsRatePercent;

  const effectiveAnnualSavings =
    options.customSavingsRatePercent !== null && options.customSavingsRatePercent !== undefined && householdIncome > 0
      ? (householdIncome * effectiveSavingsRatePercent) / 100
      : baseAnnualSavings;

  const isBlankCanvas =
    householdIncome === 0 &&
    baseTargetIncomeToday === 0 &&
    totalInitialLiquid === 0;

  const { preReturn, postReturn, nonRegDrag } = computeWeightedReturns(inputs);

  if (isBlankCanvas || effectiveTargetIncomeToday <= 0) {
    return {
      isBlankCanvas: true,
      suggestedAge: null,
      bestAvailableAge: inputs.retirementAge,
      currentRetirementAge: inputs.retirementAge,
      ageDelta: null,
      confidenceTarget: options.confidenceTarget,
      volatilityPercent: options.volatilityPercent,
      numTrials: options.numTrials,
      seed: options.seed,
      householdIncome,
      baseAnnualSavings,
      effectiveAnnualSavings,
      baseSavingsRatePercent,
      effectiveSavingsRatePercent,
      baseTargetIncomeToday,
      effectiveTargetIncomeToday,
      weightedPreReturnPercent: preReturn,
      weightedPostReturnPercent: postReturn,
      currentPlanResult: null,
      suggestedPlanResult: null,
      ageCurve: [],
      suggestedTrajectory: [],
      extraMonthlySavingsEstimate: null,
      executionMs: 0
    };
  }

  const currentAge = Math.max(18, Math.round(inputs.currentAge));
  const lifeExpectancy = Math.max(currentAge + 5, Math.round(inputs.lifeExpectancy));
  const totalYears = lifeExpectancy - currentAge + 1;

  // Candidate retirement age sweep bounds (aligned with HeroRetirementSlider: 45 to 75)
  const minCandidateAge = Math.min(
    lifeExpectancy - 3,
    Math.max(currentAge + 1, Math.min(45, inputs.retirementAge))
  );
  const maxCandidateAge = Math.max(
    minCandidateAge,
    Math.min(75, lifeExpectancy - 3, Math.max(72, inputs.retirementAge))
  );

  const candidateAges: number[] = [];
  for (let a = minCandidateAge; a <= maxCandidateAge; a++) {
    candidateAges.push(a);
  }
  if (!candidateAges.includes(inputs.retirementAge) && inputs.retirementAge > currentAge && inputs.retirementAge < lifeExpectancy) {
    candidateAges.push(inputs.retirementAge);
    candidateAges.sort((a, b) => a - b);
  }

  // Savings bucket allocation ratios (preserve user's RRSP / TFSA / Non-Reg split)
  const rrspShare = baseAnnualSavings > 0 ? totalRrspContrib / baseAnnualSavings : 0.55;
  const tfsaShare = baseAnnualSavings > 0 ? totalTfsaFhsaContrib / baseAnnualSavings : 0.30;
  const nonRegShare = Math.max(0, 1 - rrspShare - tfsaShare);

  const effRrspAnnual = effectiveAnnualSavings * rrspShare;
  const effTfsaAnnual = effectiveAnnualSavings * tfsaShare;
  const effNonRegAnnual = effectiveAnnualSavings * nonRegShare;

  // Spouse retirement offset relative to primary retirement age
  const spouseAgeDiff = isCouple && sp ? sp.currentAge - currentAge : 0;
  const spouseRetireOffset = isCouple && sp ? sp.retirementAge - inputs.retirementAge : 0;
  const spouseWorkingAfterTaxBase =
    isCouple && sp && spouseIncome > 0
      ? Math.max(0, spouseIncome - calculateCanadianTax(spouseIncome, inputs.province, sp.currentAge).totalTax)
      : 0;

  // Pre-compute deterministic housing & debt schedules
  const schedules = precomputeHousingAndDebtSchedules(inputs, totalYears);

  // Calibrate Canadian effective tax rate at target retirement spending level
  const pensionSplitting = Boolean(isCouple && sp?.pensionIncomeSplitting);
  const calibratedRetireTaxRate = estimateRetirementTaxRate(
    effectiveTargetIncomeToday * 0.85,
    inputs.province,
    65,
    isCouple,
    pensionSplitting
  );

  // Pre-generate Common Random Numbers (CRN) matrix for returns & inflation
  const numTrials = Math.max(100, Math.min(1000, Math.round(options.numTrials)));
  const rng = mulberry32(options.seed || 20260815);
  const baseInf = (inputs.inflationRate ?? 2.1) / 100;
  const incomeGrowthRate = (inputs.incomeGrowthRate ?? 2.1) / 100;
  const sigmaPre = Math.max(0.02, options.volatilityPercent / 100);
  // Slight post-retirement volatility moderation if post-return is lower than pre-return
  const sigmaPost = postReturn < preReturn ? Math.max(0.02, sigmaPre * 0.85) : sigmaPre;
  const muPreLog = Math.log(1 + preReturn / 100) - 0.5 * sigmaPre * sigmaPre;
  const muPostLog = Math.log(1 + postReturn / 100) - 0.5 * sigmaPost * sigmaPost;
  const nonRegDragDec = nonRegDrag / 100;

  const zReturns = new Float64Array(numTrials * totalYears);
  const inflationFactors = new Float64Array(numTrials * totalYears);

  for (let t = 0; t < numTrials; t++) {
    let cumInf = 1.0;
    const rowOffset = t * totalYears;
    for (let y = 0; y < totalYears; y++) {
      const [z1, z2] = nextGaussian(rng);
      // Mild negative correlation (-0.18) between equity shocks and inflation spikes
      const zInf = -0.18 * z1 + Math.sqrt(1 - 0.18 * 0.18) * z2;
      zReturns[rowOffset + y] = z1;
      if (y === 0) {
        inflationFactors[rowOffset + y] = 1.0;
      } else {
        const yearInf = Math.max(-0.005, Math.min(0.075, baseInf + 0.009 * zInf));
        cumInf *= 1 + yearInf;
        inflationFactors[rowOffset + y] = cumInf;
      }
    }
  }

  // Evaluate a single candidate retirement age across all `numTrials` Monte Carlo paths
  const evaluateCandidateAge = (
    retireAge: number,
    recordTrajectory: boolean,
    overrideSavingsMultiplier = 1.0
  ): { point: AgeMonteCarloPoint; trajectory: MonteCarloTrajectoryPoint[] } => {
    // Pre-compute real-dollar CPP & OAS benefits per year for this candidate retirement age
    const pensionRealByYear = new Float64Array(totalYears);
    const oasGrossRealByYear = new Float64Array(totalYears);

    for (let y = 0; y < totalYears; y++) {
      const age = currentAge + y;
      const sAge = isCouple && sp ? sp.currentAge + y : 0;

      const pCpp = calculatePersonCppAnnualBenefit(
        age,
        {
          currentAge,
          retirementAge: retireAge,
          annualIncome: primaryIncome,
          cppStartAge: inputs.cppStartAge,
          cppEstimatedPercentOfMax: inputs.cppEstimatedPercentOfMax,
          cppCalculationMethod: inputs.cppCalculationMethod,
          cppServiceCanadaEstimateAt65: inputs.cppServiceCanadaEstimateAt65,
          careerDisruption: inputs.careerDisruption
        },
        1.0
      ).annualBenefit;

      const pOas = calculateOasGrossBenefit(age, inputs.oasStartAge, inputs.oasEligibleYearsInCanada, 1.0);

      let sCpp = 0;
      let sOas = 0;
      if (isCouple && sp) {
        const spouseCandidateRetireAge = Math.max(sp.currentAge + 1, Math.min(75, retireAge + spouseRetireOffset));
        sCpp = calculatePersonCppAnnualBenefit(
          sAge,
          {
            currentAge: sp.currentAge,
            retirementAge: spouseCandidateRetireAge,
            annualIncome: spouseIncome,
            cppStartAge: sp.cppStartAge,
            cppEstimatedPercentOfMax: sp.cppEstimatedPercentOfMax,
            cppCalculationMethod: sp.cppCalculationMethod,
            cppServiceCanadaEstimateAt65: sp.cppServiceCanadaEstimateAt65,
            careerDisruption: sp.careerDisruption
          },
          1.0
        ).annualBenefit;
        sOas = calculateOasGrossBenefit(sAge, sp.oasStartAge, sp.oasEligibleYearsInCanada, 1.0);
      }

      pensionRealByYear[y] = pCpp + pOas + sCpp + sOas;
      oasGrossRealByYear[y] = pOas + sOas;
    }

    const terminalRealArr = new Float64Array(numTrials);
    const retireNestEggRealArr = new Float64Array(numTrials);
    const failureAges: number[] = [];
    let successCount = 0;

    // Optional trajectory matrix for percentile fan chart
    const trajectoryMatrix = recordTrajectory ? new Float64Array(totalYears * numTrials) : null;

    const retireIdx = Math.max(0, Math.min(totalYears - 1, retireAge - currentAge));
    const spouseCandidateRetireAge = isCouple && sp ? Math.max(sp.currentAge + 1, Math.min(75, retireAge + spouseRetireOffset)) : 0;

    for (let t = 0; t < numTrials; t++) {
      let rrsp = initRrsp;
      let tfsa = initTfsaFhsa;
      let nonReg = initNonReg;
      let depletedAge: number | null = null;
      let nestEggAtRetireReal = 0;

      const rowOffset = t * totalYears;

      for (let y = 0; y < totalYears; y++) {
        const age = currentAge + y;
        const infFactor = inflationFactors[rowOffset + y];
        const isRetired = age >= retireAge;
        const z = zReturns[rowOffset + y];

        // Stochastic annual growth rate (log-normal)
        const rBase = isRetired
          ? Math.exp(muPostLog + sigmaPost * z) - 1
          : Math.exp(muPreLog + sigmaPre * z) - 1;
        const rNetNonReg = Math.max(-0.55, rBase - nonRegDragDec);

        // Apply scheduled real-estate lump sums (down payments or sale proceeds)
        const downPayOut = schedules.downPaymentCashOutflowNominal[y];
        if (downPayOut > 0) {
          let rem = downPayOut;
          const fromTfsa = Math.min(tfsa, rem);
          tfsa -= fromTfsa;
          rem -= fromTfsa;
          const fromNonReg = Math.min(nonReg, rem);
          nonReg -= fromNonReg;
          rem -= fromNonReg;
          if (rem > 0) {
            const fromRrsp = Math.min(rrsp, rem);
            rrsp -= fromRrsp;
          }
        }
        if (schedules.homeSaleNetProceedsNominal[y] > 0) {
          nonReg += schedules.homeSaleNetProceedsNominal[y];
        }

        if (!isRetired) {
          // Working & Accumulation Year: scale annual savings with real wage growth/inflation
          const wageFactor = Math.pow(1 + incomeGrowthRate, y);
          const contribScale = wageFactor * overrideSavingsMultiplier;

          const rrspAdd = effRrspAnnual * contribScale;
          const tfsaAdd = effTfsaAnnual * contribScale;
          const nonRegAdd = effNonRegAnnual * contribScale;

          rrsp = Math.max(0, (rrsp + rrspAdd) * (1 + rBase));
          tfsa = Math.max(0, (tfsa + tfsaAdd) * (1 + rBase));
          nonReg = Math.max(0, (nonReg + nonRegAdd) * (1 + rNetNonReg));
        } else {
          // Compound first (start-of-year balance grows through year, matching fastSimulator)
          rrsp = Math.max(0, rrsp * (1 + rBase));
          tfsa = Math.max(0, tfsa * (1 + rBase));
          nonReg = Math.max(0, nonReg * (1 + rNetNonReg));

          // Target retirement spending in nominal dollars + fixed housing/debt obligations minus rental income
          const retireBaseNominal = effectiveTargetIncomeToday * infFactor;
          const rentNom = schedules.rentPaymentReal[y] * infFactor;
          const mortNom = schedules.mortgagePaymentNominal[y];
          const ownFixedNom = schedules.ownershipFixedReal[y] * infFactor;
          const rentalIncNom = schedules.rentalIncomeReal[y] * infFactor;
          const debtNom = schedules.debtPaymentNominal[y];

          let requiredSpendNominal = retireBaseNominal + ownFixedNom + mortNom + debtNom - rentalIncNom;
          if (rentNom > 0 && mortNom === 0) {
            // Target spending already encompasses baseline living/rent
            requiredSpendNominal = Math.max(rentNom, retireBaseNominal) + debtNom - rentalIncNom;
          }
          requiredSpendNominal = Math.max(0, requiredSpendNominal);

          // Guaranteed income: CPP + OAS + spouse working income if spouse still working
          const grossPensionsNom = pensionRealByYear[y] * infFactor;
          const oasGrossNom = oasGrossRealByYear[y] * infFactor;
          const spouseAgeNow = currentAge + y + spouseAgeDiff;
          const spouseWorkingNetNom =
            isCouple && sp && spouseAgeNow < spouseCandidateRetireAge
              ? spouseWorkingAfterTaxBase * Math.pow(1 + (sp.incomeGrowthRate ?? 2.0) / 100, y)
              : 0;

          // Approximate tax on guaranteed pensions
          const pensionTax = grossPensionsNom * Math.min(0.22, calibratedRetireTaxRate * 0.75);
          const netGuaranteed = Math.max(0, grossPensionsNom - pensionTax) + spouseWorkingNetNom;

          let cashGap = requiredSpendNominal - netGuaranteed;

          if (cashGap > 0) {
            // Tax-efficient withdrawal waterfall: Non-Reg -> RRSP/RRIF (grossed up for Canadian tax & OAS clawback) -> TFSA (tax-free)
            if (nonReg > 0) {
              // Capital gains inclusion effective drag (~12% of withdrawal)
              const grossNonRegNeeded = cashGap / 0.92;
              const draw = Math.min(nonReg, grossNonRegNeeded);
              nonReg -= draw;
              cashGap -= draw * 0.92;
            }

            if (cashGap > 1 && rrsp > 0) {
              // Account for OAS clawback if taxable income exceeds indexed threshold
              const estTaxableWithRrsp = grossPensionsNom + cashGap / Math.max(0.55, 1 - calibratedRetireTaxRate);
              const clawback =
                oasGrossNom > 0
                  ? calculateOasClawback(oasGrossNom, estTaxableWithRrsp / (isCouple && pensionSplitting ? 2 : 1), infFactor)
                  : 0;
              const effTax = Math.min(0.46, calibratedRetireTaxRate + (clawback > 0 ? 0.08 : 0));
              const grossRrspNeeded = cashGap / Math.max(0.54, 1 - effTax);
              const draw = Math.min(rrsp, grossRrspNeeded);
              rrsp -= draw;
              cashGap -= draw * (1 - effTax);
            }

            if (cashGap > 1 && tfsa > 0) {
              const draw = Math.min(tfsa, cashGap);
              tfsa -= draw;
              cashGap -= draw;
            }

            if (cashGap > 250 && depletedAge === null) {
              depletedAge = age;
            }
          } else if (cashGap < 0) {
            // Reinvest retirement cashflow surplus into TFSA/Non-Reg
            const surplus = Math.abs(cashGap);
            const tfsaCap = 7000 * infFactor * (isCouple ? 2 : 1);
            const toTfsa = Math.min(surplus, tfsaCap);
            tfsa += toTfsa;
            nonReg += surplus - toTfsa;
          }
        }

        const totalLiquidNominal = rrsp + tfsa + nonReg;
        const totalLiquidReal = totalLiquidNominal / infFactor;

        if (y === retireIdx) {
          nestEggAtRetireReal = totalLiquidReal;
        }
        if (trajectoryMatrix) {
          trajectoryMatrix[y * numTrials + t] = totalLiquidReal;
        }
      }

      const finalInf = inflationFactors[rowOffset + totalYears - 1] || 1;
      const finalReal = (rrsp + tfsa + nonReg) / finalInf;
      terminalRealArr[t] = finalReal;
      retireNestEggRealArr[t] = nestEggAtRetireReal;

      if (depletedAge === null && finalReal >= 0) {
        successCount++;
      } else {
        failureAges.push(depletedAge ?? lifeExpectancy);
      }
    }

    terminalRealArr.sort();
    retireNestEggRealArr.sort();

    let medianDepletionAge: number | null = null;
    if (failureAges.length > 0) {
      failureAges.sort((a, b) => a - b);
      medianDepletionAge = failureAges[Math.floor(failureAges.length / 2)];
    }

    const trajectory: MonteCarloTrajectoryPoint[] = [];
    if (trajectoryMatrix) {
      const slice = new Float64Array(numTrials);
      for (let y = 0; y < totalYears; y++) {
        const yOff = y * numTrials;
        for (let t = 0; t < numTrials; t++) {
          slice[t] = trajectoryMatrix[yOff + t];
        }
        slice.sort();
        trajectory.push({
          age: currentAge + y,
          p10Real: Math.round(percentileSorted(slice, 0.10)),
          p25Real: Math.round(percentileSorted(slice, 0.25)),
          p50Real: Math.round(percentileSorted(slice, 0.50)),
          p75Real: Math.round(percentileSorted(slice, 0.75)),
          p90Real: Math.round(percentileSorted(slice, 0.90))
        });
      }
    }

    return {
      point: {
        age: retireAge,
        successRate: Math.round((successCount / numTrials) * 1000) / 10,
        successfulTrials: successCount,
        totalTrials: numTrials,
        medianNestEggAtRetirementReal: Math.round(percentileSorted(retireNestEggRealArr, 0.50)),
        medianTerminalWealthReal: Math.round(percentileSorted(terminalRealArr, 0.50)),
        p10TerminalWealthReal: Math.round(percentileSorted(terminalRealArr, 0.10)),
        p90TerminalWealthReal: Math.round(percentileSorted(terminalRealArr, 0.90)),
        medianDepletionAge
      },
      trajectory
    };
  };

  // Sweep all candidate retirement ages
  const ageCurve: AgeMonteCarloPoint[] = [];
  let suggestedAge: number | null = null;
  let bestAvailablePoint: AgeMonteCarloPoint | null = null;

  for (const age of candidateAges) {
    const { point } = evaluateCandidateAge(age, false);
    ageCurve.push(point);

    if (suggestedAge === null && point.successRate >= options.confidenceTarget) {
      suggestedAge = age;
    }

    if (!bestAvailablePoint || point.successRate > bestAvailablePoint.successRate) {
      bestAvailablePoint = point;
    }
  }

  const bestAvailableAge = bestAvailablePoint?.age ?? inputs.retirementAge;
  const focusAge = suggestedAge ?? bestAvailableAge;

  // Compute full percentile trajectory cone for the suggested (or best available) age
  const focusEval = evaluateCandidateAge(focusAge, true);
  const currentPlanResult =
    ageCurve.find((pt) => pt.age === inputs.retirementAge) ??
    evaluateCandidateAge(inputs.retirementAge, false).point;
  const suggestedPlanResult =
    suggestedAge !== null
      ? ageCurve.find((pt) => pt.age === suggestedAge) ?? focusEval.point
      : focusEval.point;

  // If the user's current target age falls short of confidenceTarget, estimate the extra monthly savings needed
  // via quick binary search on savings multiplier
  let extraMonthlySavingsEstimate: number | null = null;
  if (
    currentPlanResult &&
    currentPlanResult.successRate < options.confidenceTarget &&
    inputs.retirementAge > currentAge &&
    effectiveAnnualSavings >= 0
  ) {
    // Only run quick estimate when current annual savings > 0 or income > 0
    if (effectiveAnnualSavings > 0) {
      let lo = 1.0;
      let hi = 3.5;
      const highCheck = evaluateCandidateAge(inputs.retirementAge, false, hi).point.successRate;
      if (highCheck >= options.confidenceTarget) {
        for (let iter = 0; iter < 6; iter++) {
          const mid = (lo + hi) / 2;
          const sr = evaluateCandidateAge(inputs.retirementAge, false, mid).point.successRate;
          if (sr >= options.confidenceTarget) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        const extraAnnual = effectiveAnnualSavings * (hi - 1);
        extraMonthlySavingsEstimate = Math.max(50, Math.ceil(extraAnnual / 12 / 25) * 25);
      }
    }
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    isBlankCanvas: false,
    suggestedAge,
    bestAvailableAge,
    currentRetirementAge: inputs.retirementAge,
    ageDelta: suggestedAge !== null ? suggestedAge - inputs.retirementAge : null,
    confidenceTarget: options.confidenceTarget,
    volatilityPercent: options.volatilityPercent,
    numTrials,
    seed: options.seed,
    householdIncome,
    baseAnnualSavings,
    effectiveAnnualSavings,
    baseSavingsRatePercent,
    effectiveSavingsRatePercent,
    baseTargetIncomeToday,
    effectiveTargetIncomeToday,
    weightedPreReturnPercent: Math.round(preReturn * 10) / 10,
    weightedPostReturnPercent: Math.round(postReturn * 10) / 10,
    currentPlanResult,
    suggestedPlanResult,
    ageCurve,
    suggestedTrajectory: focusEval.trajectory,
    extraMonthlySavingsEstimate,
    executionMs: Math.round(endTime - startTime)
  };
}
