import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { RetirementScorecard } from '../RetirementScorecard';
import { RetirementProgress } from '../RetirementProgress';
import { HeroRetirementSlider } from '../HeroRetirementSlider';
import { SavingsPulse } from '../SavingsPulse';
import { NetWorthChart } from '../Charts/NetWorthChart';
import { IncomeStreamChart } from '../Charts/IncomeStreamChart';
import { MarginalTaxBracketChart } from '../Charts/MarginalTaxBracketChart';
import {
  Sparkles
} from 'lucide-react';

export const MainDashboardTabContent: React.FC = () => {
  const retirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const province = useSimulationStore((state) => state.inputs.province);
  const isCouple = useSimulationStore((state) => state.inputs.maritalStatus === 'married');
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Financial KPI Scorecard (Positioned at top for instant visibility) */}
      <RetirementScorecard />

      {/* 2. Retirement Progress Circular Gauge & Real-time Readiness Today */}
      <RetirementProgress />

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
