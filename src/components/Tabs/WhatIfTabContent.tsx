import React, { useMemo, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateWhatIfSimulation } from '../../utils/whatIfCalculator';
import { WhatIfSensitivityPanel } from '../Charts/WhatIfSensitivityPanel';
import { NetWorthChart } from '../Charts/NetWorthChart';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Anchor,
  Wallet,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const WhatIfTabContent: React.FC = () => {
  const inputs = useSimulationStore(useShallow((state) => state.inputs));
  const summary = useSimulationStore(useShallow((state) => state.summary));
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const whatIfSettings = useSimulationStore(useShallow((state) => state.whatIfSettings));
  const setWhatIfSettings = useSimulationStore((state) => state.setWhatIfSettings);
  const resetWhatIfSettings = useSimulationStore((state) => state.resetWhatIfSettings);
  const retirementAge = inputs.retirementAge;

  // Ensure what-if is active when user is in this tab
  useEffect(() => {
    if (!whatIfSettings.isActive) {
      setWhatIfSettings({ isActive: true });
    }
  }, [whatIfSettings.isActive, setWhatIfSettings]);

  // Compute what-if simulation results
  const whatIfResult = useMemo(() => {
    return calculateWhatIfSimulation(inputs, whatIfSettings, summary, yearlyResults);
  }, [inputs, whatIfSettings, summary, yearlyResults]);

  const handleApplyPreset = useCallback((presetSettings: { returnDelta: number; appreciationDelta: number; inflationDelta: number }) => {
    setWhatIfSettings((prev) => ({
      ...prev,
      ...presetSettings
    }));
  }, [setWhatIfSettings]);

  const handleUpdateDelta = useCallback((field: 'returnDelta' | 'appreciationDelta' | 'inflationDelta', value: number) => {
    setWhatIfSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  }, [setWhatIfSettings]);

  const hasModifications =
    whatIfSettings.returnDelta !== 0 ||
    whatIfSettings.appreciationDelta !== 0 ||
    whatIfSettings.inflationDelta !== 0;

  const nwDelta = whatIfResult?.retirementNetWorth.delta ?? 0;
  const cashflowDelta = whatIfResult?.retirementCashflow.deltaNominalMonthly ?? 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* What-If Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  What-If Sensitivity Analysis & Multi-Scenario Stress Lab
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Interactive Sensitivity
                </span>
                {hasModifications && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Live Delta Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Stress-test real estate appreciation, market returns, and Canadian inflation deltas to observe immediate impacts on Crossover Age, Coast FIRE, and lifetime solvency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {hasModifications && (
              <button
                type="button"
                onClick={resetWhatIfSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Reset deltas to 0%"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Baseline</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Comparative Impact Cards */}
        {whatIfResult && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            {/* Crossover Age */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Crossover Age
              </span>
              <div className="mt-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {whatIfResult.crossoverImpact.whatIfAge !== null
                    ? `Age ${whatIfResult.crossoverImpact.whatIfAge}`
                    : 'N/A'}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Baseline: Age {whatIfResult.crossoverImpact.baselineAge ?? 'N/A'}
                  {whatIfResult.crossoverImpact.ageDelta !== null && whatIfResult.crossoverImpact.ageDelta !== 0 && (
                    <span
                      className={`ml-1.5 font-bold ${
                        whatIfResult.crossoverImpact.ageDelta < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      ({whatIfResult.crossoverImpact.ageDelta > 0 ? `+${whatIfResult.crossoverImpact.ageDelta}y` : `${whatIfResult.crossoverImpact.ageDelta}y`})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Coast FIRE Age */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-blue-500" />
                Coast FIRE Age
              </span>
              <div className="mt-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {whatIfResult.coastFireImpact.whatIfAge !== null
                    ? `Age ${whatIfResult.coastFireImpact.whatIfAge}`
                    : 'N/A'}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Baseline: Age {whatIfResult.coastFireImpact.baselineAge ?? 'N/A'}
                  {whatIfResult.coastFireImpact.ageDelta !== null && whatIfResult.coastFireImpact.ageDelta !== 0 && (
                    <span
                      className={`ml-1.5 font-bold ${
                        whatIfResult.coastFireImpact.ageDelta < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      ({whatIfResult.coastFireImpact.ageDelta > 0 ? `+${whatIfResult.coastFireImpact.ageDelta}y` : `${whatIfResult.coastFireImpact.ageDelta}y`})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Retirement Cash Flow */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                Monthly Cash Flow
              </span>
              <div className="mt-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ${Math.round(whatIfResult.retirementCashflow.whatIfNominalMonthly).toLocaleString()}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Δ: {cashflowDelta >= 0 ? `+$${Math.round(cashflowDelta).toLocaleString()}` : `-$${Math.round(Math.abs(cashflowDelta)).toLocaleString()}`}/mo
                  <span
                    className={`ml-1 font-bold ${
                      cashflowDelta >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    ({whatIfResult.retirementCashflow.percentDeltaMonthly > 0 ? `+` : ''}
                    {whatIfResult.retirementCashflow.percentDeltaMonthly.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Net Worth @ Retirement */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                Nest Egg @ Age {retirementAge}
              </span>
              <div className="mt-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ${(whatIfResult.retirementNetWorth.whatIf / 1_000_000).toFixed(2)}M
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Δ: {nwDelta >= 0 ? `+$${Math.round(nwDelta).toLocaleString()}` : `-$${Math.round(Math.abs(nwDelta)).toLocaleString()}`}
                  <span
                    className={`ml-1 font-bold ${
                      nwDelta >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    ({whatIfResult.retirementNetWorth.percentDelta > 0 ? `+` : ''}
                    {whatIfResult.retirementNetWorth.percentDelta.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* What-If Sensitivity Panel Component */}
      {whatIfResult && (
        <WhatIfSensitivityPanel
          whatIfResult={whatIfResult}
          onApplyPreset={handleApplyPreset}
          onUpdateDelta={handleUpdateDelta}
          onReset={resetWhatIfSettings}
        />
      )}

      {/* Visual Comparison: Net Worth Chart with What-If Overlay */}
      <div className="flex flex-col gap-2">
        <div className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span>Interactive Trajectory Comparison (Baseline vs What-If Overlay)</span>
        </div>
        <NetWorthChart
          yearlyResults={yearlyResults}
          retirementAge={retirementAge}
          showStressTestToggle={false}
          showWhatIfToggle={false}
          showWhatIfOverlayLine={true}
        />
      </div>
    </div>
  );
};
