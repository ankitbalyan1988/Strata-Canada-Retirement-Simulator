import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  Landmark, 
  Percent, 
  Receipt,
  Sparkles,
  TrendingUp,
  Zap,
  Anchor
} from 'lucide-react';
import { RetirementInputs, SimulationSummary, YearSimulationResult } from '../types/retirement';
import { useSimulation } from '../context/SimulationContext';

export interface RetirementScorecardProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  yearlyResults?: YearSimulationResult[];
}

export const RetirementScorecard: React.FC<RetirementScorecardProps> = (props) => {
  const sim = useSimulation();
  const inputs = props.inputs ?? sim.inputs;
  const summary = props.summary ?? sim.summary;
  const yearlyResults = props.yearlyResults ?? sim.yearlyResults;
  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Find first retirement year data
  const firstRetirementYear = yearlyResults.find(y => y.isRetired);
  const monthlyRetirementSpend = summary.averageAnnualRetirementSpendNominal / 12;

  // Pension coverage in retirement
  const totalLifetimePensions = summary.lifetimeCppReceived + summary.lifetimeOasReceived;
  const pensionCoveragePercent = summary.lifetimeEmploymentIncome > 0 
    ? Math.min(100, Math.round((totalLifetimePensions / (summary.averageAnnualRetirementSpendNominal * summary.totalYearsInRetirement || 1)) * 100))
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Card 1: Readiness Score */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Readiness Score
          </span>
          <span className={`p-1.5 rounded-lg ${
            summary.isFullyFunded 
              ? 'bg-emerald-50 text-emerald-600' 
              : 'bg-rose-50 text-rose-600'
          }`}>
            {summary.isFullyFunded ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {summary.readinessScore}%
            </span>
            <span className={`text-xs font-bold ${
              summary.isFullyFunded ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {summary.isFullyFunded ? 'Fully Funded' : 'Shortfall Risk'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.isFullyFunded ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${summary.readinessScore}%` }}
            ></div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[11px] text-slate-500">
            {summary.yearsFunded} of {summary.totalYearsInRetirement} retirement years funded to Age {inputs.lifeExpectancy}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {summary.crossoverAge && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md" title={`Crossover Point: Returns exceed expenses at Age ${summary.crossoverAge}`}>
                <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-500" />
                <span>Crossover: Age {summary.crossoverAge}</span>
              </span>
            )}
            {summary.coastFireAge !== undefined && summary.coastFireAge !== null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-md" title={`Coast FIRE: Zero-contribution viability achieved at Age ${summary.coastFireAge}`}>
                <Anchor className="w-2.5 h-2.5 text-cyan-600" />
                <span>Coast FIRE: {summary.coastFireAge === inputs.currentAge ? 'Achieved!' : `Age ${summary.coastFireAge}`}</span>
              </span>
            )}
            {summary.isFutureHomeBuyer && summary.futurePurchaseAge && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md" title={`Planning Home Purchase at Age ${summary.futurePurchaseAge} (Year ${summary.futurePurchaseYear})`}>
                <span>🏡 Buy @ Age {summary.futurePurchaseAge}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Net Worth at Retirement & End */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Retirement Nest Egg
          </span>
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <DollarSign className="w-4 h-4" />
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {formatCur(summary.netWorthAtRetirement)}
          </div>
          <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
            <span>Portfolio: <strong className="font-mono text-slate-800">{formatCur(summary.liquidNetWorthAtRetirement || summary.netWorthAtRetirement)}</strong></span>
            {summary.ownsHome && summary.homeEquityAtRetirement > 0 && (
              <span className="text-amber-800 font-semibold">Home Eq: <strong className="font-mono">{formatCur(summary.homeEquityAtRetirement)}</strong></span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
            <span>At Age {inputs.lifeExpectancy}:</span>
            <span className={`font-mono font-bold ${
              summary.netWorthAtLifeExpectancy > 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {formatCur(summary.netWorthAtLifeExpectancy)}
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          Peak of {formatCur(summary.peakNetWorth)} reached at age {summary.peakNetWorthAge}
        </span>
      </div>

      {/* Card 3: Post-Retirement Monthly Cash Flow */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Monthly Spendable Budget
          </span>
          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            ${Math.round(inputs.targetRetirementSpendingToday / 12).toLocaleString()}
            <span className="text-sm font-normal text-slate-400">/mo</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Inflation-adjusted avg:</span>
            <span className="font-mono font-bold text-slate-700">
              ${Math.round(monthlyRetirementSpend).toLocaleString()}/mo
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          CPP + OAS covers approx {pensionCoveragePercent}% of retirement needs
        </span>
      </div>

      {/* Card 4: Lifetime Taxes & Effective Tax Rate */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Lifetime Tax & Efficiency
          </span>
          <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
            <Receipt className="w-4 h-4" />
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {formatCur(summary.lifetimeTaxesPaid)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Avg Tax Rate in Retirement:</span>
            <span className="font-mono font-bold text-indigo-600">
              {(summary.averageEffectiveTaxInRetirement * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          Strategy: {inputs.drawdownStrategy.replace('_', ' ').toUpperCase()}
        </span>
      </div>

    </div>
  );
};
