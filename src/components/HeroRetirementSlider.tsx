import React, { useState } from 'react';
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

interface HeroRetirementSliderProps {
  inputs: RetirementInputs;
  summary: SimulationSummary;
  onChangeRetirementAge: (age: number) => void;
}

export const HeroRetirementSlider: React.FC<HeroRetirementSliderProps> = ({
  inputs,
  summary,
  onChangeRetirementAge
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentAge, retirementAge, lifeExpectancy } = inputs;
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
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden transition-all duration-200">
      
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-5">
        
        {/* Top headline & status row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-rose-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Target Retirement Age Simulator
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                inputs.maritalStatus === 'married'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-slate-700/60 text-slate-300 border-slate-600'
              }`}>
                {inputs.maritalStatus === 'married'
                  ? `Couple Plan (Spouse: ${inputs.spouse?.name || 'Spouse'} @ ${inputs.spouse?.retirementAge || '63'})`
                  : 'Individual Plan (Single / Divorced)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              What Happens If You Retire at Age{' '}
              <span className="text-rose-400 font-extrabold underline decoration-rose-500/50 underline-offset-4">
                {retirementAge}
              </span>
              ?
            </h2>
          </div>

          {/* Funded Status Pill & Collapse/Expand Button */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {summary.isFullyFunded ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Fully Funded to Age {lifeExpectancy}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 shadow-sm text-xs sm:text-sm font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Depletes at Age {summary.portfolioDepletionAge} ({summary.yearsFunded} yrs funded)</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 transition border border-slate-700/80 font-medium"
              title={isExpanded ? 'Collapse Target Retirement Age Simulator' : 'Expand Target Retirement Age Simulator'}
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Collapse' : 'Expand Simulator'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Simulator Body */}
        {isExpanded && (
          <>
            {/* The Slider Control */}
        <div className="bg-slate-800/60 rounded-xl p-4 sm:p-5 border border-slate-700/60 flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Interactive Retirement Age Slider:</span>
            
            {/* Quick +/- stepper buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChangeRetirementAge(Math.max(currentAge + 1, retirementAge - 1))}
                disabled={retirementAge <= currentAge + 1}
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition"
                title="Retire 1 year earlier"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-white px-2 min-w-[3rem] text-center">
                {retirementAge} yrs
              </span>

              <button
                type="button"
                onClick={() => onChangeRetirementAge(Math.min(75, retirementAge + 1))}
                disabled={retirementAge >= 75}
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition"
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
              onChange={(e) => onChangeRetirementAge(Number(e.target.value))}
              aria-label="Target Retirement Age"
              className="w-full h-3 rounded-lg cursor-pointer accent-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />

            {/* Quick Landmark Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-1 border-t border-slate-700/50">
              {landmarks.map((lm) => {
                const isActive = lm.age === retirementAge;
                const isPast = lm.age < currentAge;
                return (
                  <button
                    key={lm.age}
                    type="button"
                    disabled={isPast}
                    onClick={() => onChangeRetirementAge(lm.age)}
                    className={`py-1.5 px-2 rounded-lg text-center transition flex flex-col items-center justify-center ${
                      isActive
                        ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-400'
                        : isPast
                        ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-semibold">{lm.label}</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">{lm.note}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Instant Impact Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Hourglass className="w-3.5 h-3.5 text-sky-400" /> Career Remaining
            </span>
            <span className="text-lg sm:text-xl font-bold text-white mt-1">
              {yearsToRetire} {yearsToRetire === 1 ? 'Year' : 'Years'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Accumulates till age {retirementAge}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Nest Egg at Retirement
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-300 mt-1">
              {formatMillions(summary.netWorthAtRetirement)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Peak: {formatMillions(summary.peakNetWorth)} (Age {summary.peakNetWorthAge})
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Monthly Target (Inflation-Adj)
            </span>
            <span className="text-lg sm:text-xl font-bold text-white mt-1">
              ${Math.round(summary.averageAnnualRetirementSpendNominal / 12).toLocaleString()} /mo
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Today's $: ${Math.round(inputs.targetRetirementSpendingToday / 12).toLocaleString()} /mo
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-purple-400" /> Retirement Horizon
            </span>
            <span className="text-lg sm:text-xl font-bold text-white mt-1">
              {yearsInRetirement} Years
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
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
