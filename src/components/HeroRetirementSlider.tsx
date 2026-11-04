import React, { startTransition } from 'react';
import { 
  Calendar, 
  Hourglass, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { RetirementInputs, SimulationSummary } from '../types/retirement';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';

export interface HeroRetirementSliderProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  onChangeRetirementAge?: (age: number) => void;
}

export const HeroRetirementSlider: React.FC<HeroRetirementSliderProps> = (props) => {
  // Targeted Zustand slice subscriptions
  const storeCurrentAge = useSimulationStore((state) => state.inputs.currentAge);
  const storeRetirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const storeLifeExpectancy = useSimulationStore((state) => state.inputs.lifeExpectancy);
  const storeMaritalStatus = useSimulationStore((state) => state.inputs.maritalStatus);
  const storeSpouse = useSimulationStore(useShallow((state) => state.inputs.spouse));
  const storeTargetSpending = useSimulationStore((state) => state.inputs.targetRetirementSpendingToday);
  const storeSummary = useSimulationStore(useShallow((state) => state.summary));
  const applyRetirementAge = useSimulationStore((state) => state.applyRetirementAge);

  const currentAge = props.inputs?.currentAge ?? storeCurrentAge;
  const retirementAge = props.inputs?.retirementAge ?? storeRetirementAge;
  const lifeExpectancy = props.inputs?.lifeExpectancy ?? storeLifeExpectancy;
  const maritalStatus = props.inputs?.maritalStatus ?? storeMaritalStatus;
  const spouse = props.inputs?.spouse ?? storeSpouse;
  const targetSpending = props.inputs?.targetRetirementSpendingToday ?? storeTargetSpending;
  const summary = props.summary ?? storeSummary;
  const onChangeRetirementAge = props.onChangeRetirementAge ?? applyRetirementAge;

  const handleRetirementAgeChange = (age: number) => {
    startTransition(() => {
      onChangeRetirementAge(age);
    });
  };

  const isCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.retirementAgeSimulator));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const isExpanded = !isCollapsed;

  const yearsToRetire = Math.max(0, retirementAge - currentAge);
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);

  const formatMillions = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${Math.round(val / 1000)}k`;
  };

  const landmarks = [
    { age: 55, label: 'Early (55)', note: 'Coast / FIRE' },
    { age: 60, label: 'CPP Min (60)', note: '-36% CPP' },
    { age: 65, label: 'Standard (65)', note: 'Full OAS & CPP' },
    { age: 70, label: 'Max CPP (70)', note: '+42% CPP' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xs relative transition-colors">
      <div className="flex flex-col gap-5">
        
        {/* Top headline & status row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Target Retirement Age Simulator
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                maritalStatus === 'married'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80'
              }`}>
                {maritalStatus === 'married'
                  ? `Couple Plan (Spouse: ${spouse?.name || 'Spouse'} @ ${spouse?.retirementAge || '63'})`
                  : 'Individual Plan (Solo)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-1">
              What Happens If You Retire at Age{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {retirementAge}
              </span>
              ?
            </h2>
          </div>

          {/* Funded Status Pill & Collapse/Expand Button */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {summary.isFullyFunded ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>100% Fully Funded to Age {lifeExpectancy}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Depletes at Age {summary.portfolioDepletionAge} ({summary.yearsFunded} yrs funded)</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleSectionCollapse('retirementAgeSimulator')}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition border border-slate-200/80 dark:border-slate-700/80 font-medium cursor-pointer"
              title={isExpanded ? 'Collapse Target Retirement Age Simulator' : 'Expand Target Retirement Age Simulator'}
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Simulator Body */}
        {isExpanded && (
          <>
            {/* The Slider Control */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-700/80 flex flex-col gap-3">
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Interactive Retirement Age:</span>
                
                {/* Quick +/- stepper buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRetirementAgeChange(Math.max(currentAge + 1, retirementAge - 1))}
                    disabled={retirementAge <= currentAge + 1}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer"
                    title="Retire 1 year earlier"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50 px-2 min-w-[3rem] text-center font-mono">
                    {retirementAge} yrs
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRetirementAgeChange(Math.min(75, retirementAge + 1))}
                    disabled={retirementAge >= 75}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer"
                    title="Retire 1 year later"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Range Slider Track */}
              <div className="relative pt-1 pb-2">
                <input
                  type="range"
                  min={Math.max(45, currentAge)}
                  max={75}
                  step={1}
                  value={retirementAge}
                  onChange={(e) => handleRetirementAgeChange(Number(e.target.value))}
                  aria-label="Target Retirement Age"
                  className="w-full h-2 rounded-lg cursor-pointer bg-slate-200 dark:bg-slate-700 accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />

                {/* Quick Landmark Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/80">
                  {landmarks.map((lm) => {
                    const isActive = lm.age === retirementAge;
                    const isPast = lm.age < currentAge;
                    return (
                      <button
                        key={lm.age}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleRetirementAgeChange(lm.age)}
                        className={`py-2 px-2 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500/40 shadow-xs'
                            : isPast
                            ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400'
                            : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
                        }`}
                      >
                        <span className="text-xs font-semibold">{lm.label}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">{lm.note}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Instant Impact Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Hourglass className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Career Remaining
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 mt-1 font-mono">
                  {yearsToRetire} {yearsToRetire === 1 ? 'Year' : 'Years'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Accumulates till age {retirementAge}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Nest Egg at Retirement
                </span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatMillions(summary.netWorthAtRetirement)}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Peak: {formatMillions(summary.peakNetWorth)} (Age {summary.peakNetWorthAge})
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Monthly Target (Inflation-Adj)
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 mt-1 font-mono">
                  ${Math.round(summary.averageAnnualRetirementSpendNominal / 12).toLocaleString()} /mo
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Today's $: ${Math.round(targetSpending / 12).toLocaleString()} /mo
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Retirement Horizon
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 mt-1 font-mono">
                  {yearsInRetirement} Years
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Up to age {lifeExpectancy} life expectancy
                </span>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
};
