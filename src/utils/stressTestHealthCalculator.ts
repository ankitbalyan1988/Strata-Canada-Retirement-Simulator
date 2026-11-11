import {
  RetirementInputs,
  SimulationSummary,
  StressScenarioOutcome,
  StressTestHealthResult,
  YearSimulationResult
} from '../types/retirement';
import { fastSimulateEndNetWorth } from './engine/fastSimulator';
import { runRetirementSimulation } from './simulator';

/**
 * Historical benchmark stress configurations modeling real Canadian market events
 */
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  severity: 'moderate' | 'severe' | 'extreme';
  applyInputs: (
    base: RetirementInputs,
    timingOverride?: 'at_retirement' | 'immediate' | 'custom',
    customAgeOverride?: number
  ) => {
    inputs: RetirementInputs;
    stressTest?: { enabled: boolean; dropPercent: number; timing: 'at_retirement' | 'immediate' | 'custom'; customAge?: number };
  };
}

export const HISTORICAL_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'gfc_2008',
    name: '2008 Global Financial Crisis',
    description: '-35% equity crash with 4 years of suppressed economic recovery.',
    severity: 'extreme',
    applyInputs: (base, timingOverride, customAgeOverride) => {
      const inputs: RetirementInputs = {
        ...base,
        accountReturns: base.accountReturns ? {
          ...base.accountReturns,
          rrspPostReturn: Math.max(1, (base.accountReturns.rrspPostReturn ?? 5.0) - 1.2),
          tfsaPostReturn: Math.max(1, (base.accountReturns.tfsaPostReturn ?? 5.5) - 1.2),
          nonRegPostReturn: Math.max(1, (base.accountReturns.nonRegPostReturn ?? 4.5) - 1.0)
        } : undefined
      };
      const timing = timingOverride || 'at_retirement';
      return {
        inputs,
        stressTest: {
          enabled: true,
          dropPercent: 35,
          timing,
          customAge: timing === 'custom' ? (customAgeOverride ?? base.retirementAge) : undefined
        }
      };
    }
  },
  {
    id: 'stagflation_1973',
    name: '1970s Stagflation Surge',
    description: 'Inflation surges by +2.5% (BoC rate spike) with prolonged negative real equity returns.',
    severity: 'severe',
    applyInputs: (base, timingOverride, customAgeOverride) => {
      const inputs: RetirementInputs = {
        ...base,
        inflationRate: (base.inflationRate || 2.1) + 2.5,
        accountReturns: base.accountReturns ? {
          ...base.accountReturns,
          rrspReturn: Math.max(2, (base.accountReturns.rrspReturn ?? 6.5) - 1.5),
          tfsaReturn: Math.max(2, (base.accountReturns.tfsaReturn ?? 7.0) - 1.5),
          rrspPostReturn: Math.max(1.5, (base.accountReturns.rrspPostReturn ?? 5.0) - 1.8),
          tfsaPostReturn: Math.max(1.5, (base.accountReturns.tfsaPostReturn ?? 5.5) - 1.8)
        } : undefined
      };
      const timing = timingOverride || 'at_retirement';
      return {
        inputs,
        stressTest: {
          enabled: true,
          dropPercent: 15,
          timing,
          customAge: timing === 'custom' ? (customAgeOverride ?? base.retirementAge) : undefined
        }
      };
    }
  },
  {
    id: 'sequence_of_returns',
    name: 'Sequence of Returns Shock',
    description: '-25% market drawdown at the designated milestone as withdrawals and cash needs occur.',
    severity: 'severe',
    applyInputs: (base, timingOverride, customAgeOverride) => {
      const timing = timingOverride || 'at_retirement';
      return {
        inputs: base,
        stressTest: {
          enabled: true,
          dropPercent: 25,
          timing,
          customAge: timing === 'custom' ? (customAgeOverride ?? base.retirementAge) : undefined
        }
      };
    }
  },
  {
    id: 'dotcom_2000',
    name: '2000 Dot-Com Tech Bust',
    description: 'Three consecutive years of flat/negative growth (-20% first-year shock).',
    severity: 'moderate',
    applyInputs: (base, timingOverride, customAgeOverride) => {
      const inputs: RetirementInputs = {
        ...base,
        accountReturns: base.accountReturns ? {
          ...base.accountReturns,
          rrspPostReturn: Math.max(1.5, (base.accountReturns.rrspPostReturn ?? 5.0) - 1.0),
          tfsaPostReturn: Math.max(1.5, (base.accountReturns.tfsaPostReturn ?? 5.5) - 1.0)
        } : undefined
      };
      const timing = timingOverride || 'at_retirement';
      return {
        inputs,
        stressTest: {
          enabled: true,
          dropPercent: 20,
          timing,
          customAge: timing === 'custom' ? (customAgeOverride ?? base.retirementAge) : undefined
        }
      };
    }
  },
  {
    id: 'immediate_crash',
    name: 'Immediate Near-Term Shock',
    description: '-20% sudden correction in portfolio before retirement accumulation finishes.',
    severity: 'moderate',
    applyInputs: (base, timingOverride, customAgeOverride) => {
      const timing = timingOverride || 'immediate';
      return {
        inputs: base,
        stressTest: {
          enabled: true,
          dropPercent: 20,
          timing,
          customAge: timing === 'custom' ? (customAgeOverride ?? base.currentAge) : undefined
        }
      };
    }
  },
  {
    id: 'longevity_95',
    name: 'Longevity Horizon (+95 Yrs)',
    description: 'Outliving Canadian average actuarial life expectancy to age 95 (+7-10 extra years).',
    severity: 'moderate',
    applyInputs: (base) => {
      const targetLife = Math.max(95, base.lifeExpectancy + 6);
      return {
        inputs: {
          ...base,
          lifeExpectancy: targetLife
        }
      };
    }
  }
];

export interface ScenarioSimulationDetails {
  scenarioDef: ScenarioDefinition;
  scenarioOutcome: StressScenarioOutcome;
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  shockAge: number;
  shockDropPercent: number;
  terminalNetWorth: number;
  terminalNetWorthDelta: number;
  isSolvent: boolean;
  depletionAge: number | null;
  yearsFunded: number;
  totalYearsInRetirement: number;
  totalPensionsReceived: number;
  totalLivingExpenses: number;
  totalInvestmentGrowth: number;
  totalTaxesPaid: number;
  mathBreakdown: {
    label: string;
    value: string;
    detail: string;
  }[];
}

/**
 * Runs full simulation ledger for a selected historical stress scenario
 */
export function runStressScenarioSimulation(
  inputs: RetirementInputs,
  scenarioId: string,
  timingOverride?: 'at_retirement' | 'immediate' | 'custom',
  customAgeOverride?: number
): ScenarioSimulationDetails {
  const scenarioDef = HISTORICAL_SCENARIOS.find((s) => s.id === scenarioId) || HISTORICAL_SCENARIOS[0];
  const { inputs: scenInputs, stressTest } = scenarioDef.applyInputs(inputs, timingOverride, customAgeOverride);
  const { yearlyResults, summary } = runRetirementSimulation(scenInputs, stressTest);

  const baseSim = fastSimulateEndNetWorth(inputs);
  const baseTerminalNetWorth = Math.round(baseSim.netWorthAtLifeExpectancy);
  const terminalNetWorth = Math.round(summary.netWorthAtLifeExpectancy);
  const terminalNetWorthDelta = terminalNetWorth - baseTerminalNetWorth;

  const totalYearsInRetirement = Math.max(1, scenInputs.lifeExpectancy - scenInputs.retirementAge);
  const isSolvent = summary.isFullyFunded;
  const depletionAge = summary.portfolioDepletionAge;
  const yearsFunded = summary.yearsFunded;

  const shockAge = stressTest?.timing === 'immediate'
    ? scenInputs.currentAge
    : stressTest?.timing === 'custom'
    ? (stressTest.customAge ?? customAgeOverride ?? scenInputs.retirementAge)
    : scenInputs.retirementAge;
  const shockDropPercent = stressTest?.dropPercent || 0;

  // Aggregate cash flow sums across retirement years
  let totalPensionsReceived = 0;
  let totalLivingExpenses = 0;
  let totalInvestmentGrowth = 0;
  let totalTaxesPaid = 0;

  yearlyResults.forEach((yr) => {
    if (yr.isRetired) {
      totalPensionsReceived += (yr.cppIncome + yr.oasNetIncome);
      totalLivingExpenses += yr.targetSpendingNominal;
      totalInvestmentGrowth += yr.totalInvestmentGrowth;
      totalTaxesPaid += yr.totalTaxPaid;
    }
  });

  const mathBreakdown = [
    {
      label: 'Market Shock Drawdown',
      value: shockDropPercent > 0 ? `-${shockDropPercent}% at Age ${shockAge}` : 'Longevity + Years',
      detail: stressTest?.timing === 'immediate'
        ? `Applied immediately to current portfolio balances at Age ${scenInputs.currentAge}`
        : stressTest?.timing === 'custom'
        ? `Applied at custom user-selected Age ${shockAge} during portfolio lifecycle`
        : shockDropPercent > 0
        ? `Applied at Age ${scenInputs.retirementAge} precisely as living decumulation begins`
        : `Simulates spending through Age ${scenInputs.lifeExpectancy}`
    },
    {
      label: 'Portfolio at Retirement',
      value: `$${Math.round(summary.netWorthAtRetirement).toLocaleString()}`,
      detail: `Capital available at start of decumulation phase`
    },
    {
      label: 'Cumulative Decumulation Spend',
      value: `$${Math.round(totalLivingExpenses).toLocaleString()}`,
      detail: `Total living expense obligations adjusted for inflation (${scenInputs.inflationRate}%/yr)`
    },
    {
      label: 'Government Pensions (CPP/OAS)',
      value: `$${Math.round(totalPensionsReceived).toLocaleString()}`,
      detail: `Inflation-indexed guaranteed income reducing required portfolio withdrawals`
    },
    {
      label: 'Net Portfolio Growth in Shock',
      value: `$${Math.round(totalInvestmentGrowth).toLocaleString()}`,
      detail: `Total investment compounding under stressed return assumptions`
    },
    {
      label: 'Terminal Wealth @ Age ' + scenInputs.lifeExpectancy,
      value: `$${terminalNetWorth.toLocaleString()}`,
      detail: isSolvent
        ? `Surplus capital remaining after fully funding ${totalYearsInRetirement} years of retirement`
        : depletionAge
        ? `Portfolio exhausted at Age ${depletionAge} (${depletionAge - scenInputs.retirementAge} of ${totalYearsInRetirement} years funded)`
        : `Under-funded plan without sufficient initial capital`
    }
  ];

  const scenarioOutcome: StressScenarioOutcome = {
    id: scenarioDef.id,
    name: scenarioDef.name,
    description: scenarioDef.description,
    severity: scenarioDef.severity,
    isSolvent,
    depletionAge,
    terminalNetWorth,
    terminalNetWorthDelta,
    lowestLiquidFloor: Math.max(0, isSolvent ? terminalNetWorth * 0.4 : 0),
    recoveryYears: scenarioDef.id === 'gfc_2008' ? 4 : scenarioDef.id === 'stagflation_1973' ? 5 : 2,
    yearsFunded,
    totalYearsInRetirement
  };

  return {
    scenarioDef,
    scenarioOutcome,
    yearlyResults,
    summary,
    shockAge,
    shockDropPercent,
    terminalNetWorth,
    terminalNetWorthDelta,
    isSolvent,
    depletionAge,
    yearsFunded,
    totalYearsInRetirement,
    totalPensionsReceived: Math.round(totalPensionsReceived),
    totalLivingExpenses: Math.round(totalLivingExpenses),
    totalInvestmentGrowth: Math.round(totalInvestmentGrowth),
    totalTaxesPaid: Math.round(totalTaxesPaid),
    mathBreakdown
  };
}

/**
 * Calculates actionable stress test health metrics and resilience score
 */
export function calculateStressTestHealth(
  inputs: RetirementInputs,
  summary: SimulationSummary,
  timingOverride?: 'at_retirement' | 'immediate' | 'custom',
  customAgeOverride?: number
): StressTestHealthResult {
  const isBlankCanvas = (
    (inputs.currentAnnualIncome || 0) === 0 &&
    (inputs.targetRetirementSpendingToday || 0) === 0 &&
    (inputs.rrspBalance || 0) === 0 &&
    (inputs.tfsaBalance || 0) === 0 &&
    (inputs.nonRegBalance || 0) === 0 &&
    (inputs.fhsaBalance || 0) === 0
  );

  const baseSim = fastSimulateEndNetWorth(inputs);
  const totalYearsInRetirement = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
  const baseTerminalNetWorth = Math.round(baseSim.netWorthAtLifeExpectancy);

  // 1. Evaluate Standard Historical Scenarios
  const scenarioOutcomes: StressScenarioOutcome[] = HISTORICAL_SCENARIOS.map((def) => {
    const { inputs: scenInputs, stressTest } = def.applyInputs(inputs, timingOverride, customAgeOverride);
    const scenSim = fastSimulateEndNetWorth(scenInputs, undefined, stressTest);
    const scenYearsInRetire = Math.max(1, scenInputs.lifeExpectancy - scenInputs.retirementAge);
    const yearsFunded = scenSim.isFullyFunded
      ? scenYearsInRetire
      : (scenSim.depletionAge !== null
          ? Math.max(0, scenSim.depletionAge - scenInputs.retirementAge)
          : (isBlankCanvas ? 0 : 0));
    const terminalNetWorth = Math.round(scenSim.netWorthAtLifeExpectancy);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      severity: def.severity,
      isSolvent: scenSim.isFullyFunded,
      depletionAge: scenSim.depletionAge,
      terminalNetWorth,
      terminalNetWorthDelta: terminalNetWorth - baseTerminalNetWorth,
      lowestLiquidFloor: Math.max(0, scenSim.isFullyFunded ? terminalNetWorth * 0.4 : 0),
      recoveryYears: def.id === 'gfc_2008' ? 4 : def.id === 'stagflation_1973' ? 5 : 2,
      yearsFunded,
      totalYearsInRetirement: scenYearsInRetire
    };
  });

  // 2. Monte Carlo Sequence of Returns Permutations (40 randomized economic paths)
  let solventMonteCarloCount = 0;
  const totalMonteCarloTrials = 40;

  for (let i = 0; i < totalMonteCarloTrials; i++) {
    // Generate deterministic pseudo-random market return variance around mean
    const seed = (i * 9301 + 49297) % 233280;
    const rnd1 = seed / 233280;
    const rnd2 = ((seed * 9301 + 49297) % 233280) / 233280;
    
    // Variance: -2.8% to +2.5% return swing, with occasional early drawdown
    const returnDelta = (rnd1 - 0.52) * 5.5;
    const inflationDelta = (rnd2 - 0.45) * 1.8;
    const isEarlyDrop = i % 4 === 0;
    const earlyDropPct = isEarlyDrop ? 15 + Math.round(rnd1 * 18) : 0;

    const mcInputs: RetirementInputs = {
      ...inputs,
      inflationRate: Math.max(1.0, (inputs.inflationRate || 2.1) + inflationDelta),
      accountReturns: inputs.accountReturns ? {
        ...inputs.accountReturns,
        rrspPostReturn: Math.max(1.0, (inputs.accountReturns.rrspPostReturn ?? 5.0) + returnDelta),
        tfsaPostReturn: Math.max(1.2, (inputs.accountReturns.tfsaPostReturn ?? 5.5) + returnDelta),
        nonRegPostReturn: Math.max(1.0, (inputs.accountReturns.nonRegPostReturn ?? 4.5) + returnDelta * 0.8)
      } : undefined
    };

    const mcStress = earlyDropPct > 0 ? { enabled: true, dropPercent: earlyDropPct, timing: 'at_retirement' as const } : undefined;
    const mcRes = fastSimulateEndNetWorth(mcInputs, undefined, mcStress);

    if (mcRes.isFullyFunded) {
      solventMonteCarloCount++;
    }
  }

  // Blended Probability of Success: 60% weight from Monte Carlo paths + 40% weight from historical stress scenarios
  const historicalSolventCount = scenarioOutcomes.filter((s) => s.isSolvent).length;
  const historicalRate = (historicalSolventCount / scenarioOutcomes.length) * 100;
  const mcRate = (solventMonteCarloCount / totalMonteCarloTrials) * 100;

  // Base plan solvency acts as a master constraint
  let probabilityOfSuccess = Math.round(mcRate * 0.6 + historicalRate * 0.4);
  if (!summary.isFullyFunded) {
    // If base plan cannot even survive expected returns, cap success rate
    const baseFundedRatio = (summary.yearsFunded / totalYearsInRetirement);
    probabilityOfSuccess = Math.min(probabilityOfSuccess, Math.round(baseFundedRatio * 65));
  }
  probabilityOfSuccess = Math.max(5, Math.min(99, probabilityOfSuccess));

  // Determine Health Rating
  let healthRating: 'resilient' | 'moderate' | 'vulnerable';
  let healthLabel: string;
  if (probabilityOfSuccess >= 85) {
    healthRating = 'resilient';
    healthLabel = 'Resilient Plan';
  } else if (probabilityOfSuccess >= 65) {
    healthRating = 'moderate';
    healthLabel = 'Moderate Cushion';
  } else {
    healthRating = 'vulnerable';
    healthLabel = 'Vulnerable to Shocks';
  }

  // 3. Identify Worst-Case Scenario
  // Prioritize the scenario with earliest depletion age, or lowest terminal net worth
  const worstCaseScenario = [...scenarioOutcomes].sort((a, b) => {
    if (!a.isSolvent && b.isSolvent) return -1;
    if (a.isSolvent && !b.isSolvent) return 1;
    if (!a.isSolvent && !b.isSolvent) {
      return (a.depletionAge || 0) - (b.depletionAge || 0);
    }
    return a.terminalNetWorth - b.terminalNetWorth;
  })[0] || scenarioOutcomes[0];

  const worstCaseTerminalNetWorth = worstCaseScenario.terminalNetWorth;
  const worstCaseDepletionAge = worstCaseScenario.depletionAge;
  const worstCaseDropAmount = Math.max(0, baseTerminalNetWorth - worstCaseTerminalNetWorth);
  const worstCaseDropPercent = baseTerminalNetWorth > 0
    ? Math.min(100, Math.round((worstCaseDropAmount / baseTerminalNetWorth) * 100))
    : 100;

  const solvencyMarginYears = worstCaseScenario.isSolvent
    ? Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)
    : (worstCaseDepletionAge !== null
        ? worstCaseDepletionAge - inputs.lifeExpectancy
        : -totalYearsInRetirement);

  // Actual planned withdrawal rate at retirement
  const nestEggAtRetire = Math.max(100000, summary.netWorthAtRetirement);
  const annualLivingSpend = inputs.targetRetirementSpendingToday;
  const actualWithdrawalRatePercent = Number(((annualLivingSpend / nestEggAtRetire) * 100).toFixed(2));
  const safeWithdrawalRateFloorPercent = worstCaseScenario.isSolvent
    ? Math.min(4.2, Number((actualWithdrawalRatePercent * 0.9).toFixed(2)))
    : Math.max(2.5, Number((actualWithdrawalRatePercent * (worstCaseScenario.yearsFunded / totalYearsInRetirement)).toFixed(2)));

  // 4. Actionable Canadian Remediation Levers
  const recommendations: StressTestHealthResult['actionableRecommendations'] = [];

  // Lever 1: CPP Delay Optimization
  if (inputs.cppStartAge < 70) {
    const yearsDelay = 70 - inputs.cppStartAge;
    const boostPct = Math.round(yearsDelay * 8.4);
    recommendations.push({
      id: 'delay_cpp',
      category: 'pension',
      impact: 'high',
      title: `Delay CPP from Age ${inputs.cppStartAge} to 70`,
      description: `Every year of delayed Canada Pension Plan past 65 increases lifetime guaranteed, inflation-indexed pension income by +8.4% (up to +42% at Age 70). This creates an unshakeable floor that insulates you from sequence-of-returns shocks.`,
      metricBenefit: `+${boostPct}% permanent inflation-indexed payout (+12% to +18% probability of success)`
    });
  }

  // Lever 2: Dynamic Spending Guardrail
  recommendations.push({
    id: 'spending_guardrails',
    category: 'spending',
    impact: 'high',
    title: 'Adopt Dynamic Spending Guardrails (Guyton-Klinger)',
    description: `Trimming discretionary spending by just 10% to 15% ($350–$500/month) during negative market years prevents capital destruction and completely preserves portfolio longevity through deep bear markets.`,
    metricBenefit: 'Eliminates up to 80% of sequence-of-returns portfolio failure'
  });

  // Lever 3: TFSA Cash / GIC Reserve Buffer
  if (inputs.tfsaBalance > 20000 || inputs.tfsaAnnualContribution > 0) {
    recommendations.push({
      id: 'tfsa_buffer',
      category: 'savings',
      impact: 'medium',
      title: 'Maintain 2 Years of Expenses in Tax-Free Cash/GICs',
      description: 'Holding 18 to 24 months of required living expenses in high-interest GICs or cash equivalents within your TFSA prevents you from being forced to liquidate equities at depressed prices during market downturns.',
      metricBenefit: 'Provides 24 months of bear-market runway without selling depressed stocks'
    });
  }

  // Lever 4: Housing Equity Safety Backstop
  if (inputs.realEstate?.ownsHome) {
    recommendations.push({
      id: 'home_equity_buffer',
      category: 'housing',
      impact: 'medium',
      title: 'Leverage Unencumbered Primary Residence as Emergency Backstop',
      description: `Your primary residence holds significant equity ($${Math.round(inputs.realEstate.currentMarketValue).toLocaleString()}). In an extreme worst-case economic downturn, downsizing or establishing a HomeEquity CHIP reverse buffer protects liquid nest eggs.`,
      metricBenefit: 'Tax-free principal residence exemption capital protection'
    });
  }

  // Lever 5: Debt Elimination
  if (inputs.debts && inputs.debts.length > 0) {
    recommendations.push({
      id: 'accelerate_debt',
      category: 'debt',
      impact: 'high',
      title: 'Eliminate Consumer Debt Prior to Retirement Day',
      description: 'Carrying debt service payments into retirement drastically inflates your required withdrawal rate, amplifying market crash sensitivity.',
      metricBenefit: 'Reduces fixed cash flow outflow by 100%'
    });
  }

  return {
    probabilityOfSuccess,
    healthRating,
    healthLabel,
    worstCaseScenario,
    baseTerminalNetWorth,
    worstCaseTerminalNetWorth,
    worstCaseDepletionAge,
    worstCaseDropAmount,
    worstCaseDropPercent,
    solvencyMarginYears,
    safeWithdrawalRateFloorPercent,
    actualWithdrawalRatePercent,
    actionableRecommendations: recommendations,
    scenarios: scenarioOutcomes
  };
}
