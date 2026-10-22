import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Flame, 
  Percent, 
  Receipt, 
  PiggyBank, 
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RetirementInputs, SimulationSummary } from '../types/retirement';
import { calculateSavingsPulse, SavingsPulseResult } from '../utils/simulator';
import { useSimulation } from '../context/SimulationContext';

export interface SavingsPulseProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  onApplyMonthlyBoost?: (additionalMonthly: number) => void;
}

export const SavingsPulse: React.FC<SavingsPulseProps> = (props) => {
  const sim = useSimulation();
  const inputs = props.inputs ?? sim.inputs;
  const summary = props.summary ?? sim.summary;
  const onApplyMonthlyBoost = props.onApplyMonthlyBoost ?? sim.applyMonthlyBoost;

  const [isExpanded, setIsExpanded] = useState(true);
  const pulse: SavingsPulseResult = useMemo(
    () => calculateSavingsPulse(inputs, summary),
    [inputs, summary]
  );

  const formatCur = (val: number) => `$${Math.round(val).toLocaleString()}`;

  // Progress percentage of current vs required
  const pacingPercentage = pulse.requiredMonthlySavings > 0
    ? Math.min(200, Math.round((pulse.currentMonthlySavings / pulse.requiredMonthlySavings) * 100))
    : 100;

  const statusConfig = {
    surplus: {
      title: 'Ahead of Target Pace',
      badge: 'Surplus Buffer',
      badgeColor: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
      icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-700'
    },
    on_track: {
      title: 'On Track for Goal',
      badge: 'Balanced Pacing',
      badgeColor: 'bg-blue-500/15 text-blue-700 border-blue-300',
      icon: <CheckCircle2 className="w-4 h-4 text-blue-600" />,
      barColor: 'bg-blue-600',
      textColor: 'text-blue-700'
    },
    underfunded: {
      title: 'Savings Gap Detected',
      badge: 'Moderate Shortfall',
      badgeColor: 'bg-amber-500/15 text-amber-800 border-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      barColor: 'bg-amber-500',
      textColor: 'text-amber-700'
    },
    critical: {
      title: 'Immediate Action Needed',
      badge: 'High Shortfall Risk',
      badgeColor: 'bg-rose-500/15 text-rose-700 border-rose-300',
      icon: <Flame className="w-4 h-4 text-rose-600" />,
      barColor: 'bg-rose-500',
      textColor: 'text-rose-700'
    }
  }[pulse.status];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition duration-200">
      
      {/* Top Banner with Pulse Indicator */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-sm border border-slate-800">
            <Activity className="w-5 h-5 text-rose-400" />
            {/* Animated pulsing dot */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                pulse.status === 'surplus' || pulse.status === 'on_track' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                pulse.status === 'surplus' || pulse.status === 'on_track' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Savings Pulse
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.badgeColor}`}>
                {statusConfig.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live monthly pacing check to sustain your lifestyle through Age {inputs.lifeExpectancy}
            </p>
          </div>
        </div>

        {/* Quick pacing metric chip & Collapse/Expand Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-3 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500">Pacing Ratio</span>
              <span className={`font-mono font-bold ${
                pacingPercentage >= 100 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {pacingPercentage}% of requirement
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
              {statusConfig.icon}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-600 hover:text-slate-900:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80:bg-slate-700 transition border border-slate-200 font-medium cursor-pointer"
            title={isExpanded ? 'Collapse Savings Pulse' : 'Expand Savings Pulse'}
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Pulse'}</span>
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
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wider text-[10px]">Your Current Savings</span>
              <PiggyBank className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                  {formatCur(pulse.currentMonthlySavings)}
                </span>
                <span className="text-xs text-slate-400 font-medium">/month</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                <span>{pulse.currentSavingsRate}%</span>
                <span>of gross income (${Math.round(inputs.currentAnnualIncome / 1000)}k/yr)</span>
              </div>
            </div>

            {/* Account mini pills */}
            <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-x-2 gap-y-1 text-[10.5px] font-mono text-slate-600">
              <div className="flex justify-between">
                <span className="text-blue-600">RRSP:</span>
                <span>{formatCur(pulse.monthlyBreakdown.rrsp)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">TFSA:</span>
                <span>{formatCur(pulse.monthlyBreakdown.tfsa)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">FHSA:</span>
                <span>{formatCur(pulse.monthlyBreakdown.fhsa)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Non-Reg:</span>
                <span>{formatCur(pulse.monthlyBreakdown.nonReg)}/mo</span>
              </div>
            </div>
          </div>

          {/* Box 2: Required Monthly Savings */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wider text-[10px]">Target Requirement</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                  {formatCur(pulse.requiredMonthlySavings)}
                </span>
                <span className="text-xs text-slate-400 font-medium">/month</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                <span>{pulse.requiredSavingsRate}%</span>
                <span>required savings rate</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Remaining Working Career:</span>
              <span className="font-semibold text-slate-800 font-mono">{pulse.workingYearsRemaining} Years</span>
            </div>
          </div>

          {/* Box 3: Pacing Delta (Surplus vs Gap) */}
          <div className={`rounded-xl p-4 flex flex-col justify-between border ${
            pulse.monthlyGap <= 0
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600">
                {pulse.monthlyGap <= 0 ? 'Monthly Surplus Buffer' : 'Monthly Savings Gap'}
              </span>
              {pulse.monthlyGap <= 0 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Flame className="w-4 h-4 text-rose-600" />
              )}
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-black font-mono ${
                  pulse.monthlyGap <= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {pulse.monthlyGap <= 0
                    ? `+${formatCur(Math.abs(pulse.monthlyGap))}`
                    : `-${formatCur(pulse.monthlyGap)}`}
                </span>
                <span className="text-xs text-slate-500 font-medium">/month</span>
              </div>

              <div className="text-[11px] mt-0.5 font-medium text-slate-600">
                {pulse.monthlyGap <= 0
                  ? 'Exceeds minimum retirement threshold'
                  : 'Needed to fund all retirement years'}
              </div>
            </div>

            {/* Canadian Tax Arbitrage or Surplus Callout */}
            <div className="pt-2 border-t border-slate-200/60 text-[11px]">
              {pulse.monthlyGap > 0 ? (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1 text-[10.5px]">
                    <Receipt className="w-3 h-3 text-rose-600" />
                    RRSP CRA Tax Refund:
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    ~{formatCur(pulse.rrspTaxSavingsMonthly)}/mo
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-700">
                  <span>Target Nest Egg at {inputs.retirementAge}:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${(pulse.targetNestEggNeeded / 1000000).toFixed(2)}M
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Visual Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>Goal Pacing Tracker:</span>
              <span className={`font-mono ${statusConfig.textColor}`}>
                {formatCur(pulse.currentMonthlySavings)} of {formatCur(pulse.requiredMonthlySavings)}/mo
              </span>
            </span>
            <span className="font-mono text-slate-500">
              {pacingPercentage}%
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusConfig.barColor}`}
              style={{ width: `${Math.min(100, pacingPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Strategic Guidance Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <div>
              <span className="font-bold text-slate-900">Savings Pulse Takeaway: </span>
              <span className="text-slate-600">{pulse.recommendedAction}</span>
              {pulse.monthlyGap > 0 && pulse.rrspTaxSavingsMonthly > 0 && (
                <span className="block text-[11px] text-blue-700 font-medium mt-0.5">
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
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800:bg-indigo-500 text-white font-semibold text-xs transition shadow-2xs cursor-pointer"
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
