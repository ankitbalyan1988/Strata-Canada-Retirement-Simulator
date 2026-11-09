import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { RetirementScorecard } from '../RetirementScorecard';
import { HeroRetirementSlider } from '../HeroRetirementSlider';
import { SavingsPulse } from '../SavingsPulse';
import { NetWorthChart } from '../Charts/NetWorthChart';
import { IncomeStreamChart } from '../Charts/IncomeStreamChart';
import { MarginalTaxBracketChart } from '../Charts/MarginalTaxBracketChart';
import {
  Layers,
  Wallet,
  Percent,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';

export const MainDashboardTabContent: React.FC = () => {
  const currentAge = useSimulationStore((state) => state.inputs.currentAge);
  const retirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const province = useSimulationStore((state) => state.inputs.province);
  const isCouple = useSimulationStore((state) => state.inputs.maritalStatus === 'married');
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const activePresetId = useSimulationStore((state) => state.activePresetId);
  const inputs = useSimulationStore((state) => state.inputs);

  const isBlankCanvas = activePresetId === 'blank' || (
    inputs.currentAnnualIncome === 0 &&
    inputs.rrspBalance === 0 &&
    inputs.tfsaBalance === 0 &&
    inputs.nonRegBalance === 0
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Summary Status / Quick Profile Context Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
          <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Active Plan Configuration:
          </span>
          {isBlankCanvas ? (
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <span>Fresh Blank Canvas (No pre-loaded data)</span>
            </span>
          ) : (
            <>
              <span>Age {currentAge} → Retire at <strong>Age {retirementAge}</strong></span>
              <span>•</span>
              <span>Province: <strong>{province}</strong></span>
              <span>•</span>
              <span>Household: <strong>{isCouple ? 'Married Couple' : 'Individual'}</strong></span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setActiveView('inputs')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/60 font-semibold shadow-xs hover:bg-emerald-50 dark:hover:bg-slate-750 transition cursor-pointer text-xs shrink-0 self-start sm:self-auto"
        >
          <span>Edit Profile & Plan Inputs</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </button>
      </div>

      {/* 2. Financial KPI Scorecard (Positioned at top for instant visibility) */}
      <RetirementScorecard />

      {/* 3. Hero Interactive Retirement Age Simulator */}
      <HeroRetirementSlider />

      {/* 4. Savings Pulse: Live Monthly Goal Pacing & Trajectory Comparison */}
      <SavingsPulse />

      {/* Section Divider & Header for Dedicated Visual Portlets */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Dedicated Analytics & Trajectory Portlets
          </h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
          Full interactive portlets rendered continuously for instant comparison
        </span>
      </div>

      {/* Dedicated Portlet 1: Net Worth Trajectory */}
      <div className="flex flex-col gap-2">
        <NetWorthChart
          yearlyResults={yearlyResults}
          retirementAge={retirementAge}
          showStressTestToggle={false}
          showWhatIfToggle={false}
          showWhatIfOverlayLine={false}
        />
      </div>

      {/* Dedicated Portlet 2: Post-Retirement Cash Flows */}
      <div className="flex flex-col gap-2">
        <IncomeStreamChart
          yearlyResults={yearlyResults}
          retirementAge={retirementAge}
        />
      </div>

      {/* Dedicated Portlet 3: Marginal Tax Brackets */}
      <div className="flex flex-col gap-2">
        <MarginalTaxBracketChart
          yearlyResults={yearlyResults}
          retirementAge={retirementAge}
          province={province}
          isCouple={isCouple}
        />
      </div>
    </div>
  );
};
