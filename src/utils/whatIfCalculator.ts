import {
  RetirementInputs,
  YearSimulationResult,
  SimulationSummary,
  AccountReturnRates,
  RealEstateInputs
} from '../types/retirement';
import {
  WhatIfSettings,
  WhatIfSimulationResult,
  SensitivityMatrix,
  SensitivityMatrixCell,
  WhatIfPresetScenario
} from '../types/whatIf';
import { runRetirementSimulation } from './simulator';

export const DEFAULT_WHAT_IF_SETTINGS: WhatIfSettings = {
  isActive: false,
  returnDelta: 0,
  appreciationDelta: 0,
  inflationDelta: 0
};

export const WHAT_IF_PRESETS: WhatIfPresetScenario[] = [
  {
    id: 'baseline',
    name: 'Current Baseline Plan',
    shortLabel: '🎯 Baseline',
    description: 'No variation. Current baseline Canadian portfolio assumptions.',
    icon: 'target',
    settings: { returnDelta: 0, appreciationDelta: 0, inflationDelta: 0 }
  },
  {
    id: 'stagflation',
    name: 'Stagflation Shock (-2% Return, -1% Home, +2% Inflation)',
    shortLabel: '🌪️ Stagflation',
    description: 'Persistent high inflation compounding alongside depressed capital returns and property stagnation.',
    icon: 'cloud-lightning',
    settings: { returnDelta: -2.0, appreciationDelta: -1.0, inflationDelta: 2.0 }
  },
  {
    id: 'bull_compounding',
    name: 'Bull Compounding (+2% Return, +2% Home, -0.5% Inflation)',
    shortLabel: '🚀 Bull Market',
    description: 'Strong market expansion, real estate appreciation, and benign controlled inflation.',
    icon: 'trending-up',
    settings: { returnDelta: 2.0, appreciationDelta: 2.0, inflationDelta: -0.5 }
  },
  {
    id: 'high_inflation',
    name: 'Sticky Inflation Drag (0% Return, 0% Home, +2% Inflation)',
    shortLabel: '🔥 Sticky Inflation',
    description: 'Inflation surges by +2.0%, driving up retirement living costs and cash flow demands.',
    icon: 'flame',
    settings: { returnDelta: 0, appreciationDelta: 0, inflationDelta: 2.0 }
  },
  {
    id: 'housing_surge',
    name: 'Canadian Housing Boom (0% Return, +2% Home, 0% Inflation)',
    shortLabel: '🏡 Housing Surge',
    description: 'Residential property values appreciate 2.0% faster than baseline, bolstering equity.',
    icon: 'home',
    settings: { returnDelta: 0, appreciationDelta: 2.0, inflationDelta: 0 }
  },
  {
    id: 'bear_market',
    name: 'Conservative Bear Market (-2% Return, -2% Home, +1% Inflation)',
    shortLabel: '🐻 Bear Market',
    description: 'Subdued returns across registered assets and property accompanied by moderate cost inflation.',
    icon: 'trending-down',
    settings: { returnDelta: -2.0, appreciationDelta: -2.0, inflationDelta: 1.0 }
  }
];

/**
 * Constructs modified inputs based on What-If delta adjustments and executes the simulation.
 */
export function calculateWhatIfSimulation(
  baseInputs: RetirementInputs,
  settings: WhatIfSettings,
  baselineSummary: SimulationSummary,
  baselineYearlyResults: YearSimulationResult[]
): WhatIfSimulationResult {
  const currentAge = baseInputs.currentAge;
  const retirementAge = baseInputs.retirementAge;

  // 1. Calculate adjusted return rates
  const baseRrsp = baseInputs.accountReturns?.rrspReturn ?? 6.5;
  const baseTfsa = baseInputs.accountReturns?.tfsaReturn ?? 7.0;
  const baseFhsa = baseInputs.accountReturns?.fhsaReturn ?? 6.5;
  const baseNonReg = baseInputs.accountReturns?.nonRegReturn ?? 6.0;

  const adjustedAccountReturns: AccountReturnRates = {
    useCustomReturns: true,
    rrspReturn: Math.max(0.1, Number((baseRrsp + settings.returnDelta).toFixed(2))),
    tfsaReturn: Math.max(0.1, Number((baseTfsa + settings.returnDelta).toFixed(2))),
    fhsaReturn: Math.max(0.1, Number((baseFhsa + settings.returnDelta).toFixed(2))),
    nonRegReturn: Math.max(0.1, Number((baseNonReg + settings.returnDelta).toFixed(2))),
    rrspPostReturn: baseInputs.accountReturns?.rrspPostReturn !== undefined
      ? Math.max(0.1, Number((baseInputs.accountReturns.rrspPostReturn + settings.returnDelta).toFixed(2)))
      : Math.max(0.1, Number((baseRrsp + settings.returnDelta).toFixed(2))),
    tfsaPostReturn: baseInputs.accountReturns?.tfsaPostReturn !== undefined
      ? Math.max(0.1, Number((baseInputs.accountReturns.tfsaPostReturn + settings.returnDelta).toFixed(2)))
      : Math.max(0.1, Number((baseTfsa + settings.returnDelta).toFixed(2))),
    nonRegPostReturn: baseInputs.accountReturns?.nonRegPostReturn !== undefined
      ? Math.max(0.1, Number((baseInputs.accountReturns.nonRegPostReturn + settings.returnDelta).toFixed(2)))
      : Math.max(0.1, Number((baseNonReg + settings.returnDelta).toFixed(2)))
  };

  // 2. Calculate adjusted real estate appreciation
  const baseAppreciation = baseInputs.realEstate?.annualAppreciationRate ?? 3.2;
  const adjustedRealEstate: RealEstateInputs | undefined = baseInputs.realEstate
    ? {
        ...baseInputs.realEstate,
        annualAppreciationRate: Math.max(
          -5.0,
          Number((baseAppreciation + settings.appreciationDelta).toFixed(2))
        )
      }
    : undefined;

  // 3. Calculate adjusted inflation rate
  const baseInflation = baseInputs.inflationRate ?? 2.1;
  const adjustedInflation = Math.max(
    0.1,
    Number((baseInflation + settings.inflationDelta).toFixed(2))
  );

  // 4. Adjust custom sub-accounts if present
  const adjustedCustomAccounts = baseInputs.nonRegCustomAccounts?.map((acc) => ({
    ...acc,
    expectedReturn: Math.max(0.1, Number((acc.expectedReturn + settings.returnDelta).toFixed(2)))
  }));

  const whatIfInputs: RetirementInputs = {
    ...baseInputs,
    inflationRate: adjustedInflation,
    accountReturns: adjustedAccountReturns,
    realEstate: adjustedRealEstate,
    nonRegCustomAccounts: adjustedCustomAccounts
  };

  // 5. Execute simulation with modified assumptions
  const sim = runRetirementSimulation(whatIfInputs);
  const whatIfYearlyResults = sim.yearlyResults;
  const whatIfSummary = sim.summary;

  // 6. Crossover Milestone Impact
  const baseCrossoverAge = baselineSummary.crossoverAge;
  const baseCrossoverYear = baselineSummary.crossoverYear;
  const whatIfCrossoverAge = whatIfSummary.crossoverAge;
  const whatIfCrossoverYear = whatIfSummary.crossoverYear;

  const crossoverAgeDelta =
    baseCrossoverAge !== null && whatIfCrossoverAge !== null
      ? whatIfCrossoverAge - baseCrossoverAge
      : null;

  const whatIfCrossoverRow = whatIfYearlyResults.find((r) => r.age === whatIfCrossoverAge);
  const baseCrossoverRow = baselineYearlyResults.find((r) => r.age === baseCrossoverAge);

  // 7. Coast FIRE Milestone Impact
  const baseCoastAge = baselineSummary.coastFireAge;
  const baseCoastYear = baselineSummary.coastFireYear;
  const whatIfCoastAge = whatIfSummary.coastFireAge;
  const whatIfCoastYear = whatIfSummary.coastFireYear;

  const coastAgeDelta =
    baseCoastAge !== null && whatIfCoastAge !== null
      ? whatIfCoastAge - baseCoastAge
      : null;

  const whatIfCoastRow = whatIfYearlyResults.find((r) => r.age === whatIfCoastAge);
  const baseCoastRow = baselineYearlyResults.find((r) => r.age === baseCoastAge);

  // 8. Retirement Cashflow Impact
  const baseRetireRow =
    baselineYearlyResults.find((r) => r.age === retirementAge) || baselineYearlyResults[0];
  const whatIfRetireRow =
    whatIfYearlyResults.find((r) => r.age === retirementAge) || whatIfYearlyResults[0];

  const baseNominalAnnual = baseRetireRow.netSpendableCashflow;
  const baseNominalMonthly = baseNominalAnnual / 12;
  const whatIfNominalAnnual = whatIfRetireRow.netSpendableCashflow;
  const whatIfNominalMonthly = whatIfNominalAnnual / 12;
  const deltaNominalMonthly = whatIfNominalMonthly - baseNominalMonthly;
  const percentDeltaMonthly =
    baseNominalMonthly > 0 ? (deltaNominalMonthly / baseNominalMonthly) * 100 : 0;

  // Calculate real purchasing power in today's dollars at retirement age
  const yearsToRetire = Math.max(0, retirementAge - currentAge);
  const baseInflationFactor = Math.pow(1 + baseInflation / 100, yearsToRetire);
  const whatIfInflationFactor = Math.pow(1 + adjustedInflation / 100, yearsToRetire);

  const baselineRealMonthly = baseNominalMonthly / baseInflationFactor;
  const whatIfRealMonthly = whatIfNominalMonthly / whatIfInflationFactor;

  // 9. Retirement Net Worth Impact
  const baseNW = baseRetireRow.totalNetWorth;
  const whatIfNW = whatIfRetireRow.totalNetWorth;
  const nwDelta = whatIfNW - baseNW;
  const nwPercentDelta = baseNW > 0 ? (nwDelta / baseNW) * 100 : 0;

  return {
    settings,
    yearlyResults: whatIfYearlyResults,
    summary: whatIfSummary,
    crossoverImpact: {
      baselineAge: baseCrossoverAge,
      baselineYear: baseCrossoverYear,
      whatIfAge: whatIfCrossoverAge,
      whatIfYear: whatIfCrossoverYear,
      ageDelta: crossoverAgeDelta,
      metricValue: whatIfCrossoverRow?.totalInvestmentGrowth ?? 0,
      baselineMetricValue: baseCrossoverRow?.totalInvestmentGrowth ?? 0
    },
    coastFireImpact: {
      baselineAge: baseCoastAge,
      baselineYear: baseCoastYear,
      whatIfAge: whatIfCoastAge,
      whatIfYear: whatIfCoastYear,
      ageDelta: coastAgeDelta,
      metricValue: whatIfCoastRow?.totalNetWorth ?? 0,
      baselineMetricValue: baseCoastRow?.totalNetWorth ?? 0
    },
    retirementCashflow: {
      baselineNominalAnnual: baseNominalAnnual,
      baselineNominalMonthly: baseNominalMonthly,
      whatIfNominalAnnual: whatIfNominalAnnual,
      whatIfNominalMonthly: whatIfNominalMonthly,
      deltaNominalMonthly: deltaNominalMonthly,
      percentDeltaMonthly: percentDeltaMonthly,
      whatIfRealMonthly: whatIfRealMonthly,
      baselineRealMonthly: baselineRealMonthly,
      isFullyFunded: whatIfRetireRow.cashflowGap <= 0 && whatIfSummary.isFullyFunded,
      cashflowGap: whatIfRetireRow.cashflowGap
    },
    retirementNetWorth: {
      baseline: baseNW,
      whatIf: whatIfNW,
      delta: nwDelta,
      percentDelta: nwPercentDelta
    },
    effectiveRates: {
      baseReturn: baseRrsp,
      whatIfReturn: adjustedAccountReturns.rrspReturn,
      baseAppreciation,
      whatIfAppreciation: adjustedRealEstate?.annualAppreciationRate ?? baseAppreciation,
      baseInflation,
      whatIfInflation: adjustedInflation
    }
  };
}

/**
 * Pre-computes a 2D sensitivity matrix of scenarios varying returns (±2%) vs inflation or home appreciation (±2%).
 */
export function generateSensitivityMatrix(
  baseInputs: RetirementInputs,
  dimension: 'inflation' | 'appreciation'
): SensitivityMatrix {
  const returnDeltas = [-2.0, -1.0, 0.0, 1.0, 2.0];
  const otherDeltas = [-2.0, -1.0, 0.0, 1.0, 2.0];

  const grid: SensitivityMatrixCell[][] = [];

  for (const rDelta of returnDeltas) {
    const row: SensitivityMatrixCell[] = [];
    for (const oDelta of otherDeltas) {
      const settings: WhatIfSettings = {
        isActive: true,
        returnDelta: rDelta,
        appreciationDelta: dimension === 'appreciation' ? oDelta : 0,
        inflationDelta: dimension === 'inflation' ? oDelta : 0
      };

      // Lightweight simulation execution
      const baseSummary = { crossoverAge: null, coastFireAge: null } as unknown as SimulationSummary;
      const res = calculateWhatIfSimulation(baseInputs, settings, baseSummary, []);

      row.push({
        returnDelta: rDelta,
        otherDelta: oDelta,
        crossoverAge: res.summary.crossoverAge,
        coastFireAge: res.summary.coastFireAge,
        retireMonthlyCashflow: res.retirementCashflow.whatIfNominalMonthly,
        retireNetWorth: res.retirementNetWorth.whatIf,
        depletionAge: res.summary.portfolioDepletionAge,
        isFullyFunded: res.summary.isFullyFunded
      });
    }
    grid.push(row);
  }

  return {
    dimension,
    returnDeltas,
    otherDeltas,
    grid
  };
}
