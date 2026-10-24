import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Flame, 
  PiggyBank, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Receipt 
} from 'lucide-react';
import { RetirementInputs, SimulationSummary } from '../types/retirement';
import { calculateSavingsPulse, SavingsPulseResult } from '../utils/simulator';
import { useSimulationStore } from '../store/useSimulationStore';

export interface SavingsPulseProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  pulse?: SavingsPulseResult;
  onApplyMonthlyBoost?: (additionalMonthly: number) => void;
}

export const SavingsPulse: React.FC<SavingsPulseProps> = (props) => {
  const storeInputs = useSimulationStore((state) => state.inputs);
  const storeSummary = useSimulationStore((state) => state.summary);
  const storePulse = useSimulationStore((state) => state.pulse);
  const storeApplyMonthlyBoost = useSimulationStore((state) => state.applyMonthlyBoost);
  const isCalculating = useSimulationStore((state) => state.isCalculating);

  const inputs = props.inputs ?? storeInputs;
  const summary = props.summary ?? storeSummary;
  const onApplyMonthlyBoost = props.onApplyMonthlyBoost ?? storeApplyMonthlyBoost;

  const [isExpanded, setIsExpanded] = useState(true);
  const pulse: SavingsPulseResult = useMemo(() => {
    if (props.pulse) return props.pulse;
    if (storePulse && typeof storePulse.currentMonthlySavings === 'number') return storePulse;
    return calculateSavingsPulse(inputs, summary);
  }, [props.pulse, storePulse, inputs, summary]);

  const formatCur = (val: number) => `$${Math.round(val).toLocaleString()}`;

  // Progress percentage of current vs required
  const pacingPercentage = pulse.requiredMonthlySavings > 0
    ? Math.min(200, Math.round((pulse.currentMonthlySavings / pulse.requiredMonthlySavings) * 100))
    : 100;

  const statusConfig = {
    surplus: {
      title: 'Ahead of Target Pace',
      badge: 'Surplus Buffer',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20',
      icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    on_track: {
      title: 'On Track for Goal',
      badge: 'Balanced Pacing',
      badgeColor: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-500/20',
      icon: <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    underfunded: {
      title: 'Savings Gap Detected',
      badge: 'Moderate Shortfall',
      badgeColor: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-500/20',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      barColor: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400'
    },
    critical: {
      title: 'Immediate Action Needed',
      badge: 'High Shortfall Risk',
      badgeColor: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/20',
      icon: <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      barColor: 'bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400'
    }
  }[pulse.status];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col transition duration-200">
      
      {/* Top Banner with Pulse Indicator */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
        
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {/* Animated pulsing dot */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                pulse.status === 'surplus' || pulse.status === 'on_track' ? 'bg-emerald-400' : 'bg-rose-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                pulse.status === 'surplus' || pulse.status === 'on_track' ? 'bg-emerald-500' : 'bg-rose-500'
              }`} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base flex items-center gap-2">
                Savings Pulse
              </h3>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.badgeColor}`}>
                {statusConfig.badge}
              </span>
              {isCalculating && (
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Recalculating...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live monthly pacing check to sustain your lifestyle through Age {inputs.lifeExpectancy}
            </p>
          </div>
        </div>

        {/* Quick pacing metric chip & Collapse/Expand Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Pacing Ratio</span>
              <span className={`font-mono font-bold ${
                pacingPercentage >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {pacingPercentage}% of requirement
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-2xs">
              {statusConfig.icon}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-750 transition border border-slate-200/80 dark:border-slate-700/80 font-medium cursor-pointer"
            title={isExpanded ? 'Collapse Savings Pulse' : 'Expand Savings Pulse'}
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* Main Pulse Comparison Body */}
      {isExpanded && (
        <div className="p-5 sm:p-6 flex flex-col gap-5">
        
        {/* Comparison Grid: Current vs Required */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Box 1: Current Monthly Savings */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Your Current Savings</span>
              <PiggyBank className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                  {formatCur(pulse.currentMonthlySavings)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">/month</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                <span>{pulse.currentSavingsRate}%</span>
                <span>of gross income (${Math.round(inputs.currentAnnualIncome / 1000)}k/yr)</span>
              </div>
            </div>

            {/* Account breakdown */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/80 grid grid-cols-2 gap-x-2 gap-y-1 text-[10.5px] font-mono text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>RRSP:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCur(pulse.monthlyBreakdown.rrsp)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span>TFSA:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCur(pulse.monthlyBreakdown.tfsa)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span>FHSA:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCur(pulse.monthlyBreakdown.fhsa)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span>Non-Reg:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCur(pulse.monthlyBreakdown.nonReg)}/mo</span>
              </div>
            </div>
          </div>

          {/* Box 2: Required Monthly Savings */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Target Requirement</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                  {formatCur(pulse.requiredMonthlySavings)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">/month</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                <span>{pulse.requiredSavingsRate}%</span>
                <span>required savings rate</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Remaining Working Career:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-50 font-mono">{pulse.workingYearsRemaining} Years</span>
            </div>
          </div>

          {/* Box 3: Pacing Delta (Surplus vs Gap) */}
          <div className={`rounded-xl p-4 flex flex-col justify-between border ${
            pulse.monthlyGap <= 0
              ? 'bg-emerald-50/40 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20'
              : 'bg-rose-50/40 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">
                {pulse.monthlyGap <= 0 ? 'Monthly Surplus Buffer' : 'Monthly Savings Gap'}
              </span>
              {pulse.monthlyGap <= 0 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  pulse.monthlyGap <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {pulse.monthlyGap <= 0
                    ? `+${formatCur(Math.abs(pulse.monthlyGap))}`
                    : `-${formatCur(pulse.monthlyGap)}`}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">/month</span>
              </div>

              <div className="text-[11px] mt-0.5 font-medium text-slate-600 dark:text-slate-400">
                {pulse.monthlyGap <= 0
                  ? 'Exceeds minimum retirement threshold'
                  : 'Needed to fund all retirement years'}
              </div>
            </div>

            {/* Canadian Tax Arbitrage or Surplus Callout */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/80 text-[11px]">
              {pulse.monthlyGap > 0 ? (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-[10.5px]">
                    <Receipt className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                    RRSP CRA Tax Refund:
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ~{formatCur(pulse.rrspTaxSavingsMonthly)}/mo
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Target Nest Egg at {inputs.retirementAge}:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-50">
                    ${(pulse.targetNestEggNeeded / 1000000).toFixed(2)}M
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Visual Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>Goal Pacing Tracker:</span>
              <span className={`font-mono font-semibold ${statusConfig.textColor}`}>
                {formatCur(pulse.currentMonthlySavings)} of {formatCur(pulse.requiredMonthlySavings)}/mo
              </span>
            </span>
            <span className="font-mono text-slate-400 dark:text-slate-500">
              {pacingPercentage}%
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusConfig.barColor}`}
              style={{ width: `${Math.min(100, pacingPercentage)}%` }}
            />
          </div>
        </div>

        {/* Strategic Guidance Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-50">Savings Pulse Takeaway: </span>
              <span className="text-slate-600 dark:text-slate-300">{pulse.recommendedAction}</span>
              {pulse.monthlyGap > 0 && pulse.rrspTaxSavingsMonthly > 0 && (
                <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                  💡 Tax Advantage: Because RRSP contributions reduce your taxable income, saving ${pulse.monthlyGap.toLocaleString()}/mo in an RRSP only costs ~${(pulse.monthlyGap - pulse.rrspTaxSavingsMonthly).toLocaleString()}/mo out-of-pocket after CRA tax savings!
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Button if gap exists and handler provided */}
          {pulse.monthlyGap > 0 && onApplyMonthlyBoost && (
            <button
              type="button"
              onClick={() => onApplyMonthlyBoost(pulse.monthlyGap)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <span>Auto-Bridge Gap (+{formatCur(pulse.monthlyGap)}/mo)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    )}

    </div>
  );
};
