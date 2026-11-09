import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { StressTestHealthCard } from '../StressTestHealthCard';
import { NetWorthChart } from '../Charts/NetWorthChart';
import { ShieldAlert, ShieldCheck, Activity, TrendingDown, Info } from 'lucide-react';

export const StressTestTabContent: React.FC = () => {
  const inputs = useSimulationStore((state) => state.inputs);
  const yearlyResults = useSimulationStore((state) => state.yearlyResults);
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const setIsStressTestActive = useSimulationStore((state) => state.setIsStressTestActive);
  const stressTiming = useSimulationStore((state) => state.stressTiming);
  const setStressTiming = useSimulationStore((state) => state.setStressTiming);
  const stressSimulation = useSimulationStore((state) => state.stressSimulation);
  const retirementAge = inputs.retirementAge;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Plan Stress Test Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Plan Stress Test & Economic Resilience Console
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Crash Simulation
                </span>
                {isStressTestActive && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                    Stress Curve Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Evaluate your retirement plan against severe historical economic shocks: 2008 Global Financial Crisis, 2000 Dot-com crash, 1970s high-inflation stagflation, and rapid interest rate surges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsStressTestActive((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                isStressTestActive
                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-900/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/20'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isStressTestActive ? 'Deactivate Stress Test' : 'Run Stress Simulation'}</span>
            </button>
          </div>
        </div>
      </div>

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
            {isStressTestActive ? 'Showing baseline vs stressed portfolio' : 'Click "Run Stress Simulation" above to view overlay'}
          </span>
        </div>

        <NetWorthChart
          yearlyResults={yearlyResults}
          stressYearlyResults={isStressTestActive ? stressSimulation?.yearlyResults : undefined}
          retirementAge={retirementAge}
          isStressTestActive={isStressTestActive}
          onToggleStressTest={() => setIsStressTestActive((prev) => !prev)}
          stressTiming={stressTiming}
          onChangeStressTiming={setStressTiming}
          showStressTestToggle={true}
          showWhatIfToggle={true}
        />
      </div>
    </div>
  );
};
