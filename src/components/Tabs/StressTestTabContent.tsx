import React, { useCallback, useMemo } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { StressTestHealthCard } from '../StressTestHealthCard';
import { NetWorthChart } from '../Charts/NetWorthChart';
import { TrendingDown } from 'lucide-react';

export const StressTestTabContent: React.FC = () => {
  const retirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const setIsStressTestActive = useSimulationStore((state) => state.setIsStressTestActive);
  const stressTiming = useSimulationStore((state) => state.stressTiming);
  const setStressTiming = useSimulationStore((state) => state.setStressTiming);
  const stressSimulation = useSimulationStore(useShallow((state) => state.stressSimulation));

  const handleToggleStressTest = useCallback(() => {
    setIsStressTestActive((prev) => !prev);
  }, [setIsStressTestActive]);

  const memoizedStressYearlyResults = useMemo(() => {
    return isStressTestActive ? stressSimulation?.yearlyResults : undefined;
  }, [isStressTestActive, stressSimulation?.yearlyResults]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Main Stress Test Health Card */}
      <StressTestHealthCard />

      {/* Visual Chart with Stressed Curve */}
      <div className="flex flex-col gap-2">
        <div className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            <span>Net Worth Shock & Trajectory Drawdown Curve</span>
          </div>
          <span className="text-[11px] font-normal normal-case text-slate-400">
            {isStressTestActive ? 'Showing baseline vs stressed portfolio' : 'Apply a historical crash scenario above to view overlay'}
          </span>
        </div>

        <NetWorthChart
          yearlyResults={yearlyResults}
          stressYearlyResults={memoizedStressYearlyResults}
          retirementAge={retirementAge}
          isStressTestActive={isStressTestActive}
          onToggleStressTest={handleToggleStressTest}
          stressTiming={stressTiming}
          onChangeStressTiming={setStressTiming}
          showStressTestToggle={true}
          showWhatIfToggle={true}
        />
      </div>
    </div>
  );
};
