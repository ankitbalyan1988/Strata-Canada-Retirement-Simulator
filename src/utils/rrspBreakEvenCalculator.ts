import { RetirementInputs, CanadianProvince } from '../types/retirement';
import {
  calculateCanadianTax,
  calculateOasGrossBenefit,
  calculateOasClawback,
  calculateCppAnnualBenefit,
  getRrifMinimumRate,
  DEFAULT_TAX_YEAR_CONFIG,
  TaxYearConfig
} from './canadianTax';

export type MeltdownTargetStrategy = 'bracket1' | 'oas_threshold' | 'even_meltdown';

export interface RrspBreakEvenAgePoint {
  startAge: number;
  totalLifetimeTax: number; // Regular income taxes paid over lifetime
  totalOasClawback: number; // OAS clawbacks paid over lifetime
  terminalEstateTax: number; // Final terminal return tax on remaining RRIF at life expectancy
  totalTaxBurden: number; // Sum of income tax, clawback, and terminal estate tax
  taxSavingsVsHold: number; // Positive = saves money compared to holding until 72
  endingNetWorth: number; // Total after-tax wealth at life expectancy
  netWealthAdvantageVsHold: number; // Ending wealth difference vs hold
  effectiveWithdrawalTaxRate: number; // Avg marginal rate when melting down at startAge
  peakHoldTaxRate: number; // Peak marginal rate forced by RRIF minimums under hold
  crossoverAge?: number; // Age when cumulative wealth overtakes holding
  isBreakEven: boolean; // Is taxSavingsVsHold > 0
  isOptimal: boolean; // Maximizes net lifetime tax savings
}

export interface RrspBreakEvenAnalysis {
  hasRrspBalance: boolean;
  totalInitialRrsp: number; // Combined primary + spouse RRSP balance
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  province: CanadianProvince;
  targetStrategy: MeltdownTargetStrategy;

  // Key Decision Metrics
  breakEvenAge: number; // Specific earliest age where early withdrawal becomes more tax-efficient than holding to 72
  optimalAge: number; // Specific age that maximizes net lifetime tax savings & estate wealth
  crossoverAge: number; // Year when early withdrawal strategy permanently overtakes hold strategy in cumulative wealth
  lifetimeTaxSavingsAtOptimal: number; // Total $ saved (income tax + clawback + terminal estate tax)
  oasClawbackSavedAtOptimal: number; // Total $ of OAS clawback recovery taxes avoided
  terminalEstateTaxSavedAtOptimal: number; // Tax bomb reduction on terminal return
  earlyMarginalRateAtOptimal: number; // Marginal tax rate at optimal meltdown age
  forcedHoldMarginalRateAt72: number; // Marginal tax rate at 72+ under hold strategy
  marginalRateSpread: number; // Percentage point arbitrage (forcedHoldRate - earlyRate)

  // Hold Strategy Metrics
  holdTotalTaxBurden: number;
  holdTotalTaxesPaid: number;
  holdTotalOasClawback: number;
  holdTerminalEstateTax: number;
  holdEndingNetWorth: number;
  holdPeakRrifBalance: number;

  // Optimal Meltdown Strategy Metrics
  optimalTotalTaxBurden: number;
  optimalTotalTaxesPaid: number;
  optimalTotalOasClawback: number;
  optimalTerminalEstateTax: number;
  optimalEndingNetWorth: number;

  // Comparison Matrix for tested candidate ages (e.g. 55 to 71)
  candidateAgePoints: RrspBreakEvenAgePoint[];

  // Executive Summary & Guidance
  verdict: 'withdraw_early' | 'hold_to_72' | 'neutral';
  headline: string;
  keyDrivers: string[];
  recommendation: string;
}

/**
 * Simulates a single lifetime decumulation path for testing tax efficiency.
 */
function simulateTrajectory(
  inputs: RetirementInputs,
  startWithdrawalAge: number, // If >= 72, models the "Hold until 72" strategy
  targetStrategy: MeltdownTargetStrategy,
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): {
  totalTaxesPaid: number;
  totalOasClawback: number;
  terminalEstateTax: number;
  totalTaxBurden: number;
  endingNetWorth: number;
  peakRrifBalance: number;
  earlyWithdrawalMarginalRate: number;
  forcedRrifMarginalRate72: number;
  cumulativeWealthByAge: Map<number, number>;
} {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const startAge = inputs.currentAge;
  const retireAge = inputs.retirementAge;
  const lifeExp = inputs.lifeExpectancy;
  const province = inputs.province;

  // Investment return and inflation assumptions
  const growthRate = ((inputs.accountReturns?.rrspReturn ?? inputs.preRetirementReturn ?? 6.0)) / 100;
  const postGrowthRate = ((inputs.accountReturns?.rrspPostReturn ?? inputs.postRetirementReturn ?? 4.8)) / 100;
  const tfsaGrowthRate = ((inputs.accountReturns?.tfsaPostReturn ?? inputs.accountReturns?.tfsaReturn ?? 5.5)) / 100;
  const inflationRate = (inputs.inflationRate || 2.1) / 100;

  let rrspBal = inputs.rrspBalance + (isCouple && inputs.spouse ? inputs.spouse.rrspBalance : 0);
  let tfsaBal = inputs.tfsaBalance + (isCouple && inputs.spouse ? inputs.spouse.tfsaBalance : 0);
  let nonRegBal = inputs.nonRegBalance + (isCouple && inputs.spouse ? inputs.spouse.nonRegBalance : 0);

  let totalTaxesPaid = 0;
  let totalOasClawback = 0;
  let peakRrifBalance = 0;
  let earlyWithdrawalMarginalRate = 0;
  let forcedRrifMarginalRate72 = 0;
  const cumulativeWealthByAge = new Map<number, number>();

  const isHoldStrategy = startWithdrawalAge >= 72;

  // Annual simulation loop from current age to life expectancy
  for (let age = startAge; age <= lifeExp; age++) {
    const yearIndex = age - startAge;
    const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
    const isRetired = age >= retireAge;
    const currentGrowth = isRetired ? postGrowthRate : growthRate;

    // 1. Working years accumulation (pre-retirement contributions)
    if (!isRetired) {
      const isEarlyMeltdownActive = !isHoldStrategy && age >= startWithdrawalAge && age < 72 && rrspBal > 0;
      const annualRrspContrib = isEarlyMeltdownActive ? 0 : (inputs.rrspAnnualContribution + (isCouple && inputs.spouse ? inputs.spouse.rrspAnnualContribution : 0));
      const annualTfsaContrib = inputs.tfsaAnnualContribution + (isCouple && inputs.spouse ? inputs.spouse.tfsaAnnualContribution : 0);
      rrspBal = (rrspBal + annualRrspContrib) * (1 + currentGrowth);
      tfsaBal = (tfsaBal + annualTfsaContrib) * (1 + currentGrowth);
      nonRegBal = nonRegBal * (1 + currentGrowth * 0.85); // approximate tax drag on taxable dividends

      if (isEarlyMeltdownActive) {
        const yearsTo72 = Math.max(1, 72 - age);
        let rrspWithdrawal = 0;
        if (targetStrategy === 'bracket1') {
          const bracket1Threshold = config.federal.brackets[1]?.threshold * inflationFactor || (57375 * inflationFactor);
          const targetTaxable = isCouple ? bracket1Threshold * 2 : bracket1Threshold;
          const availableRoom = Math.max(0, targetTaxable - (inputs.currentAnnualIncome * inflationFactor));
          const minSlice = rrspBal / yearsTo72;
          rrspWithdrawal = Math.min(rrspBal, Math.max(availableRoom, minSlice));
        } else if (targetStrategy === 'oas_threshold') {
          const oasThreshold = config.oas.clawbackThreshold * inflationFactor;
          const targetTaxable = isCouple ? oasThreshold * 2 : oasThreshold;
          const availableRoom = Math.max(0, targetTaxable - (inputs.currentAnnualIncome * inflationFactor));
          const minSlice = rrspBal / yearsTo72;
          rrspWithdrawal = Math.min(rrspBal, Math.max(availableRoom, minSlice));
        } else {
          const evenSlice = rrspBal / yearsTo72;
          rrspWithdrawal = Math.min(rrspBal, Math.max(25000 * inflationFactor, evenSlice));
        }

        rrspBal = Math.max(0, rrspBal - rrspWithdrawal);
        const taxResult = calculateCanadianTax(rrspWithdrawal / (isCouple ? 2 : 1), province, age, 0, config);
        const yearTax = taxResult.totalTax * (isCouple ? 2 : 1);
        totalTaxesPaid += yearTax;

        if (earlyWithdrawalMarginalRate === 0 && rrspWithdrawal > 0) {
          earlyWithdrawalMarginalRate = taxResult.marginalRate;
        }

        const netAfterTax = Math.max(0, rrspWithdrawal - yearTax);
        const tfsaAnnualRoom = (config.registeredCaps?.tfsaAnnualLimit || 7000) * (isCouple ? 2 : 1);
        const tfsaDeposit = Math.min(netAfterTax, tfsaAnnualRoom);
        tfsaBal += tfsaDeposit;
        nonRegBal += (netAfterTax - tfsaDeposit);
      }

      const rrspNetValue = rrspBal * 0.75;
      cumulativeWealthByAge.set(age, rrspNetValue + tfsaBal + nonRegBal);
      continue;
    }

    // 2. Investment growth during retirement year
    rrspBal = rrspBal * (1 + currentGrowth);
    tfsaBal = tfsaBal * (1 + tfsaGrowthRate);
    nonRegBal = nonRegBal * (1 + currentGrowth * 0.85);

    if (age >= 72 && rrspBal > peakRrifBalance) {
      peakRrifBalance = rrspBal;
    }

    // 3. Government pensions (CPP + OAS)
    let cppIncome = 0;
    if (age >= inputs.cppStartAge) {
      const cppPct = inputs.cppEstimatedPercentOfMax !== undefined ? inputs.cppEstimatedPercentOfMax : 64;
      cppIncome = calculateCppAnnualBenefit(inputs.cppStartAge, cppPct, inflationFactor, config);
    }
    let oasGross = 0;
    if (age >= inputs.oasStartAge) {
      const oasYears = inputs.oasEligibleYearsInCanada !== undefined ? inputs.oasEligibleYearsInCanada : 40;
      oasGross = calculateOasGrossBenefit(age, inputs.oasStartAge, oasYears, inflationFactor, config);
    }

    // 4. Determine RRSP / RRIF withdrawal for this year
    let rrspWithdrawal = 0;
    const rrifMinRate = getRrifMinimumRate(age, config);
    const mandatoryRrifMin = age >= 72 ? rrspBal * rrifMinRate : 0;

    if (isHoldStrategy) {
      // Hold Strategy: Zero voluntary draws before 72; forced minimums from 72 onwards
      if (age >= 72 && rrspBal > 0) {
        rrspWithdrawal = Math.min(rrspBal, mandatoryRrifMin);
      }
    } else {
      // Early Withdrawal Strategy: If age >= startWithdrawalAge
      if (age >= startWithdrawalAge && age < 72 && rrspBal > 0) {
        const yearsTo72 = Math.max(1, 72 - age);

        if (targetStrategy === 'bracket1') {
          // Fill up to Federal Bracket 1 (~$57,375 indexed)
          const bracket1Threshold = config.federal.brackets[1]?.threshold * inflationFactor || (57375 * inflationFactor);
          const targetTaxable = isCouple ? bracket1Threshold * 2 : bracket1Threshold;
          const availableRoom = Math.max(0, targetTaxable - cppIncome);
          const minSlice = rrspBal / yearsTo72;
          rrspWithdrawal = Math.min(rrspBal, Math.max(availableRoom, minSlice));
        } else if (targetStrategy === 'oas_threshold') {
          // Fill up to OAS clawback threshold (~$93,208 indexed)
          const oasThreshold = config.oas.clawbackThreshold * inflationFactor;
          const targetTaxable = isCouple ? oasThreshold * 2 : oasThreshold;
          const availableRoom = Math.max(0, targetTaxable - cppIncome - oasGross);
          const minSlice = rrspBal / yearsTo72;
          rrspWithdrawal = Math.min(rrspBal, Math.max(availableRoom, minSlice));
        } else {
          // Even meltdown: Spread balance smoothly across remaining years to 71
          const evenSlice = rrspBal / yearsTo72;
          rrspWithdrawal = Math.min(rrspBal, Math.max(25000 * inflationFactor, evenSlice));
        }
      } else if (age >= 72 && rrspBal > 0) {
        // From 72 onwards, take statutory RRIF minimum
        rrspWithdrawal = Math.min(rrspBal, mandatoryRrifMin);
      }
    }

    rrspBal = Math.max(0, rrspBal - rrspWithdrawal);

    // 5. Calculate Canadian taxes and OAS clawback
    // Pension splitting under CRA Form T1032 for age 65+
    const canSplit = isCouple && age >= 65;
    const totalTaxable = cppIncome + oasGross + rrspWithdrawal;
    const personTaxable = canSplit ? totalTaxable / 2 : totalTaxable;

    const taxResult = calculateCanadianTax(personTaxable, province, age, age >= 65 ? rrspWithdrawal / (canSplit ? 2 : 1) : 0, config);
    const personTax = taxResult.totalTax;
    const yearTaxPaid = canSplit ? personTax * 2 : personTax;
    totalTaxesPaid += yearTaxPaid;

    // Record marginal rates for key ages
    if (age === startWithdrawalAge && rrspWithdrawal > 0 && earlyWithdrawalMarginalRate === 0) {
      earlyWithdrawalMarginalRate = taxResult.marginalRate;
    }
    if (age === 72 && forcedRrifMarginalRate72 === 0) {
      forcedRrifMarginalRate72 = taxResult.marginalRate;
    }

    // OAS Clawback
    const yearClawback = calculateOasClawback(oasGross, personTaxable, inflationFactor, config) * (canSplit ? 2 : 1);
    totalOasClawback += yearClawback;

    // 6. Surplus reinvestment into TFSA & non-reg
    // Estimated living expenses needed from portfolio
    const basicLivingNeeds = (inputs.targetRetirementSpendingToday || 55000) * inflationFactor;
    const netCashInflow = (cppIncome + oasGross - yearClawback) + (rrspWithdrawal - yearTaxPaid);
    const surplusCash = Math.max(0, netCashInflow - basicLivingNeeds);

    if (surplusCash > 0) {
      // Prioritize tax-free TFSA room (~$7,000/yr per spouse)
      const tfsaAnnualRoom = (config.registeredCaps?.tfsaAnnualLimit || 7000) * (isCouple ? 2 : 1);
      const tfsaDeposit = Math.min(surplusCash, tfsaAnnualRoom);
      tfsaBal += tfsaDeposit;
      nonRegBal += (surplusCash - tfsaDeposit);
    }

    // Cumulative after-tax wealth at end of this year
    // Note: RRSP is discounted by the current marginal tax rate to reflect true after-tax liquid value
    const rrspNetValue = rrspBal * (1 - Math.min(0.535, taxResult.marginalRate || 0.35));
    cumulativeWealthByAge.set(age, rrspNetValue + tfsaBal + nonRegBal);
  }

  // 7. Terminal Estate Tax at life expectancy on remaining RRSP/RRIF balance
  // In Canada, on the death of the final spouse, 100% of the remaining RRIF balance is added to taxable income
  // and is typically taxed at the top marginal rate (~53.53% in ON, 50% in AB, 53.5% in BC/QC)
  const topProvincialRate = province === 'AB' ? 0.48 : province === 'ON' ? 0.5353 : province === 'QC' ? 0.533 : 0.50;
  const terminalEstateTax = rrspBal * topProvincialRate;

  const totalTaxBurden = totalTaxesPaid + totalOasClawback + terminalEstateTax;
  const endingNetWorth = (rrspBal - terminalEstateTax) + tfsaBal + nonRegBal;

  return {
    totalTaxesPaid: Math.round(totalTaxesPaid),
    totalOasClawback: Math.round(totalOasClawback),
    terminalEstateTax: Math.round(terminalEstateTax),
    totalTaxBurden: Math.round(totalTaxBurden),
    endingNetWorth: Math.round(endingNetWorth),
    peakRrifBalance: Math.round(peakRrifBalance),
    earlyWithdrawalMarginalRate: Math.round(earlyWithdrawalMarginalRate * 1000) / 10,
    forcedRrifMarginalRate72: Math.round(forcedRrifMarginalRate72 * 1000) / 10,
    cumulativeWealthByAge
  };
}

/**
 * Executes a full comparative Break-Even Analysis evaluating each prospective age
 * to identify when withdrawing from an RRSP/RRIF becomes more tax-efficient than continuing to hold.
 */
export function calculateRrspBreakEvenAnalysis(
  inputs: RetirementInputs,
  targetStrategy: MeltdownTargetStrategy = 'bracket1',
  config: TaxYearConfig = DEFAULT_TAX_YEAR_CONFIG
): RrspBreakEvenAnalysis {
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const totalRrsp = inputs.rrspBalance + (isCouple && inputs.spouse ? inputs.spouse.rrspBalance : 0);
  const currentAge = inputs.currentAge;
  const retirementAge = inputs.retirementAge;
  const lifeExp = inputs.lifeExpectancy;
  const province = inputs.province;

  // 1. Simulate the "Hold until 72" Baseline
  const holdResult = simulateTrajectory(inputs, 72, targetStrategy, config);

  // 2. Candidate Start Ages to Test
  // Range from early retirement (or age 55) up to age 71
  const minCandidateAge = Math.max(currentAge, Math.min(retirementAge, 55));
  const maxCandidateAge = 71;

  const candidateAgePoints: RrspBreakEvenAgePoint[] = [];
  let breakEvenAge = 72; // Default to 72 if no earlier age breaks even
  let optimalAge = 72;
  let maxTaxSavings = -Infinity;
  let crossoverAgeFound = 72;

  if (totalRrsp > 0) {
    for (let testAge = minCandidateAge; testAge <= maxCandidateAge; testAge++) {
      const earlyResult = simulateTrajectory(inputs, testAge, targetStrategy, config);
      const taxSavingsVsHold = holdResult.totalTaxBurden - earlyResult.totalTaxBurden;
      const netWealthAdvantageVsHold = earlyResult.endingNetWorth - holdResult.endingNetWorth;
      const isBreakEven = taxSavingsVsHold > 0 && netWealthAdvantageVsHold >= 0;

      // Find crossover age where cumulative wealth under Early(testAge) permanently exceeds Hold
      let crossoverAge: number | undefined = undefined;
      for (let age = testAge; age <= lifeExp; age++) {
        const earlyWealth = earlyResult.cumulativeWealthByAge.get(age) || 0;
        const holdWealth = holdResult.cumulativeWealthByAge.get(age) || 0;
        if (earlyWealth > holdWealth) {
          crossoverAge = age;
          break;
        }
      }

      const point: RrspBreakEvenAgePoint = {
        startAge: testAge,
        totalLifetimeTax: earlyResult.totalTaxesPaid,
        totalOasClawback: earlyResult.totalOasClawback,
        terminalEstateTax: earlyResult.terminalEstateTax,
        totalTaxBurden: earlyResult.totalTaxBurden,
        taxSavingsVsHold,
        endingNetWorth: earlyResult.endingNetWorth,
        netWealthAdvantageVsHold,
        effectiveWithdrawalTaxRate: earlyResult.earlyWithdrawalMarginalRate || 20.0,
        peakHoldTaxRate: holdResult.forcedRrifMarginalRate72 || 43.4,
        crossoverAge,
        isBreakEven,
        isOptimal: false
      };

      // Record first break-even age
      if (isBreakEven && breakEvenAge === 72) {
        breakEvenAge = testAge;
      }

      // Track optimal age maximizing tax savings
      if (taxSavingsVsHold > maxTaxSavings) {
        maxTaxSavings = taxSavingsVsHold;
        optimalAge = testAge;
        if (crossoverAge) crossoverAgeFound = crossoverAge;
      }

      candidateAgePoints.push(point);
    }

    // Mark optimal point
    const optimalPoint = candidateAgePoints.find((p) => p.startAge === optimalAge);
    if (optimalPoint) {
      optimalPoint.isOptimal = true;
    }
  }

  // If no early age was better (e.g. tiny balance or zero tax), break-even remains 72
  if (breakEvenAge === 72 && optimalAge !== 72 && maxTaxSavings > 0) {
    breakEvenAge = optimalAge;
  }

  const optimalResult = optimalAge < 72
    ? candidateAgePoints.find((p) => p.startAge === optimalAge)
    : null;

  const lifetimeTaxSavingsAtOptimal = optimalResult ? Math.max(0, optimalResult.taxSavingsVsHold) : 0;
  const oasClawbackSavedAtOptimal = optimalResult
    ? Math.max(0, holdResult.totalOasClawback - optimalResult.totalOasClawback)
    : 0;
  const terminalEstateTaxSavedAtOptimal = optimalResult
    ? Math.max(0, holdResult.terminalEstateTax - optimalResult.terminalEstateTax)
    : 0;
  const earlyMarginalRateAtOptimal = optimalResult?.effectiveWithdrawalTaxRate || 20.0;
  const forcedHoldMarginalRateAt72 = holdResult.forcedRrifMarginalRate72 || 43.4;
  const marginalRateSpread = Math.round((forcedHoldMarginalRateAt72 - earlyMarginalRateAtOptimal) * 10) / 10;

  // Executive Guidance & Rationale
  let verdict: 'withdraw_early' | 'hold_to_72' | 'neutral' = 'neutral';
  let headline = '';
  let recommendation = '';
  const keyDrivers: string[] = [];

  if (totalRrsp <= 0) {
    verdict = 'neutral';
    headline = 'No RRSP Balance Detected';
    recommendation = 'Enter an existing RRSP balance to model the tax-efficiency break-even crossover against holding until age 72.';
    keyDrivers.push('No registered accounts currently active.');
  } else if (lifetimeTaxSavingsAtOptimal > 5000 && optimalAge < 72) {
    verdict = 'withdraw_early';
    headline = `Withdrawing from Age ${breakEvenAge} is significantly more tax-efficient than holding to 72`;
    recommendation = `Initiating strategic RRSP withdrawals starting at Age ${breakEvenAge} (optimal peak at Age ${optimalAge}) unlocks $${lifetimeTaxSavingsAtOptimal.toLocaleString()} in net tax savings and protects your estate from high RRIF brackets.`;

    keyDrivers.push(
      `Tax Bracket Smoothing: Withdraw in bottom brackets (~${earlyMarginalRateAtOptimal}%) before CPP/OAS ramp up, avoiding forced ~${forcedHoldMarginalRateAt72}% brackets at 72+.`,
      `OAS Clawback Shield: Eliminates ~$${oasClawbackSavedAtOptimal.toLocaleString()} in 15% OAS recovery taxes by reducing peak mandatory RRIF minimums.`,
      `Estate Tax Defusal: Lowers terminal tax bomb by $${terminalEstateTaxSavedAtOptimal.toLocaleString()} by drawing down taxable RRIF assets while alive.`,
      `TFSA Compounding: Surplus withdrawals can be funneled into TFSAs, compounding 100% tax-free with zero future clawback risk.`
    );
  } else {
    verdict = 'hold_to_72';
    headline = 'Continuing to hold until Age 72 remains tax-efficient';
    recommendation = 'Given your modest RRSP balance or anticipated retirement income, continuing tax-deferred compounding until mandatory age 72 conversion does not trigger punitive tax brackets.';
    keyDrivers.push(
      'Projected retirement income remains below higher provincial brackets and OAS clawback thresholds.',
      'Tax-deferred compounding inside RRSP outpaces bracket arbitrage at this balance level.'
    );
  }

  return {
    hasRrspBalance: totalRrsp > 0,
    totalInitialRrsp: totalRrsp,
    currentAge,
    retirementAge,
    lifeExpectancy: lifeExp,
    province,
    targetStrategy,
    breakEvenAge,
    optimalAge,
    crossoverAge: crossoverAgeFound,
    lifetimeTaxSavingsAtOptimal,
    oasClawbackSavedAtOptimal,
    terminalEstateTaxSavedAtOptimal,
    earlyMarginalRateAtOptimal,
    forcedHoldMarginalRateAt72,
    marginalRateSpread,

    holdTotalTaxBurden: holdResult.totalTaxBurden,
    holdTotalTaxesPaid: holdResult.totalTaxesPaid,
    holdTotalOasClawback: holdResult.totalOasClawback,
    holdTerminalEstateTax: holdResult.terminalEstateTax,
    holdEndingNetWorth: holdResult.endingNetWorth,
    holdPeakRrifBalance: holdResult.peakRrifBalance,

    optimalTotalTaxBurden: optimalResult?.totalTaxBurden || holdResult.totalTaxBurden,
    optimalTotalTaxesPaid: optimalResult?.totalLifetimeTax || holdResult.totalTaxesPaid,
    optimalTotalOasClawback: optimalResult?.totalOasClawback || holdResult.totalOasClawback,
    optimalTerminalEstateTax: optimalResult?.terminalEstateTax || holdResult.terminalEstateTax,
    optimalEndingNetWorth: optimalResult?.endingNetWorth || holdResult.endingNetWorth,

    candidateAgePoints,
    verdict,
    headline,
    keyDrivers,
    recommendation
  };
}
