import { YearSimulationResult, SimulationSummary } from './retirement';

export interface WhatIfSettings {
  isActive: boolean;
  returnDelta: number; // -2.0 to +2.0 (%)
  appreciationDelta: number; // -2.0 to +2.0 (%)
  inflationDelta: number; // -2.0 to +2.0 (%)
}

export interface WhatIfMilestoneImpact {
  baselineAge: number | null;
  baselineYear: number | null;
  whatIfAge: number | null;
  whatIfYear: number | null;
  ageDelta: number | null; // negative means reached earlier (better)
  metricValue: number; // e.g. investment return at crossover or portfolio at coast FIRE
  baselineMetricValue: number;
}

export interface WhatIfRetirementCashflow {
  baselineNominalAnnual: number;
  baselineNominalMonthly: number;
  whatIfNominalAnnual: number;
  whatIfNominalMonthly: number;
  deltaNominalMonthly: number;
  percentDeltaMonthly: number;
  whatIfRealMonthly: number; // purchasing power in today's dollars
  baselineRealMonthly: number;
  isFullyFunded: boolean;
  cashflowGap: number;
}

export interface WhatIfSimulationResult {
  settings: WhatIfSettings;
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  crossoverImpact: WhatIfMilestoneImpact;
  coastFireImpact: WhatIfMilestoneImpact;
  retirementCashflow: WhatIfRetirementCashflow;
  retirementNetWorth: {
    baseline: number;
    whatIf: number;
    delta: number;
    percentDelta: number;
  };
  effectiveRates: {
    baseReturn: number;
    whatIfReturn: number;
    baseAppreciation: number;
    whatIfAppreciation: number;
    baseInflation: number;
    whatIfInflation: number;
  };
}

export interface SensitivityMatrixCell {
  returnDelta: number;
  otherDelta: number; // inflation or appreciation delta
  crossoverAge: number | null;
  coastFireAge: number | null;
  retireMonthlyCashflow: number;
  retireNetWorth: number;
  depletionAge: number | null;
  isFullyFunded: boolean;
}

export interface SensitivityMatrix {
  dimension: 'inflation' | 'appreciation';
  returnDeltas: number[];
  otherDeltas: number[];
  grid: SensitivityMatrixCell[][];
}

export interface WhatIfPresetScenario {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  icon: string;
  settings: {
    returnDelta: number;
    appreciationDelta: number;
    inflationDelta: number;
  };
}
