import { WhatIfSettings, WhatIfSimulationResult } from '../types/whatIf';
import { RetirementInputs, SimulationSummary } from '../types/retirement';

export interface WhatIfNarrativeData {
  scenarioTitle: string;
  riskRating: 'low' | 'moderate' | 'high' | 'critical';
  riskLabel: string;
  summary: string;
  assetSafetyAnalysis: {
    safeAssets: string[];
    vulnerableAssets: string[];
    sequenceRiskLevel: string;
  };
  milestoneImpactSummary: string;
  remediationTactics: string[];
  projectionLimits: string;
  source?: string;
  customAnswer?: string;
}

export interface FetchWhatIfNarrativeParams {
  scenarioName?: string;
  settings: WhatIfSettings;
  whatIfResult: WhatIfSimulationResult;
  inputs: RetirementInputs;
  summary: SimulationSummary;
  customQuestion?: string;
}

export async function fetchWhatIfNarrative({
  scenarioName,
  settings,
  whatIfResult,
  inputs,
  summary,
  customQuestion
}: FetchWhatIfNarrativeParams): Promise<WhatIfNarrativeData> {
  const payload = {
    scenarioName: scenarioName || (
      settings.returnDelta === 0 && settings.appreciationDelta === 0 && settings.inflationDelta === 0
        ? 'Baseline Plan'
        : `Custom Scenario (Return ${settings.returnDelta >= 0 ? '+' : ''}${settings.returnDelta}%, Home ${settings.appreciationDelta >= 0 ? '+' : ''}${settings.appreciationDelta}%, Inflation ${settings.inflationDelta >= 0 ? '+' : ''}${settings.inflationDelta}%)`
    ),
    settings: {
      returnDelta: settings.returnDelta,
      appreciationDelta: settings.appreciationDelta,
      inflationDelta: settings.inflationDelta
    },
    metrics: {
      crossoverImpact: {
        baselineAge: whatIfResult.crossoverImpact.baselineAge,
        whatIfAge: whatIfResult.crossoverImpact.whatIfAge,
        ageDelta: whatIfResult.crossoverImpact.ageDelta
      },
      coastFireImpact: {
        baselineAge: whatIfResult.coastFireImpact.baselineAge,
        whatIfAge: whatIfResult.coastFireImpact.whatIfAge,
        ageDelta: whatIfResult.coastFireImpact.ageDelta
      },
      retirementCashflow: {
        baselineNominalMonthly: whatIfResult.retirementCashflow.baselineNominalMonthly,
        whatIfNominalMonthly: whatIfResult.retirementCashflow.whatIfNominalMonthly,
        deltaNominalMonthly: whatIfResult.retirementCashflow.deltaNominalMonthly,
        percentDeltaMonthly: whatIfResult.retirementCashflow.percentDeltaMonthly,
        whatIfRealMonthly: whatIfResult.retirementCashflow.whatIfRealMonthly
      },
      retirementNetWorth: {
        baseline: whatIfResult.retirementNetWorth.baseline,
        whatIf: whatIfResult.retirementNetWorth.whatIf,
        delta: whatIfResult.retirementNetWorth.delta,
        percentDelta: whatIfResult.retirementNetWorth.percentDelta
      },
      effectiveRates: whatIfResult.effectiveRates
    },
    planContext: {
      userName: inputs.userName,
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      lifeExpectancy: inputs.lifeExpectancy,
      province: inputs.province,
      isMarried: inputs.maritalStatus === 'married',
      hasHome: inputs.realEstate?.ownsHome,
      homeValue: inputs.realEstate?.currentMarketValue,
      drawdownStrategy: inputs.drawdownStrategy,
      rrspBalance: inputs.rrspBalance,
      tfsaBalance: inputs.tfsaBalance,
      nonRegBalance: inputs.nonRegBalance,
      isFullyFunded: whatIfResult.summary.isFullyFunded,
      depletionAge: whatIfResult.summary.portfolioDepletionAge
    },
    customQuestion
  };

  const response = await fetch('/api/what-if-narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Network request failed');
    throw new Error(`Failed to generate AI narrative insights: ${errorText}`);
  }

  const data = await response.json();
  return {
    ...data.narrative,
    source: data.source || data.narrative?.source
  };
}
