import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Zap, 
  Anchor 
} from 'lucide-react';
import { RetirementInputs, SimulationSummary, YearSimulationResult } from '../types/retirement';
import { useSimulationStore } from '../store/useSimulationStore';

export interface RetirementScorecardProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  optimisticSummary?: SimulationSummary;
  yearlyResults?: YearSimulationResult[];
}

export const RetirementScorecard: React.FC<RetirementScorecardProps> = (props) => {
  const storeInputs = useSimulationStore((state) => state.inputs);
  const storeOptimisticSummary = useSimulationStore((state) => state.optimisticSummary);
  const storeSummary = useSimulationStore((state) => state.summary);
  const storeYearlyResults = useSimulationStore((state) => state.yearlyResults);

  const inputs = props.inputs ?? storeInputs;
  const summary = props.optimisticSummary ?? props.summary ?? storeOptimisticSummary ?? storeSummary;
  const yearlyResults = props.yearlyResults ?? storeYearlyResults;

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  const monthlyRetirementSpend = summary.averageAnnualRetirementSpendNominal / 12;

  // Pension coverage in retirement
  const totalLifetimePensions = summary.lifetimeCppReceived + summary.lifetimeOasReceived;
  const pensionCoveragePercent = summary.lifetimeEmploymentIncome > 0 
    ? Math.min(100, Math.round((totalLifetimePensions / (summary.averageAnnualRetirementSpendNominal * summary.totalYearsInRetirement || 1)) * 100))
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Card 1: Readiness Score */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Readiness Score
          </span>
          <span className={`p-1.5 rounded-xl border ${
            summary.isFullyFunded 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20' 
              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/20'
          }`}>
            {summary.isFullyFunded ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </span>
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {summary.readinessScore}%
            </span>
            <span className={`text-xs font-semibold ${
              summary.isFullyFunded ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {summary.isFullyFunded ? 'Fully Funded' : 'Shortfall Risk'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.isFullyFunded ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${summary.readinessScore}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {summary.yearsFunded} of {summary.totalYearsInRetirement} retirement years funded to Age {inputs.lifeExpectancy}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {summary.crossoverAge && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 px-2 py-0.5 rounded-md" title={`Crossover Point: Returns exceed expenses at Age ${summary.crossoverAge}`}>
                <Zap className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                <span>Crossover: Age {summary.crossoverAge}</span>
              </span>
            )}
            {summary.coastFireAge !== undefined && summary.coastFireAge !== null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md" title={`Coast FIRE: Zero-contribution viability achieved at Age ${summary.coastFireAge}`}>
                <Anchor className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                <span>Coast FIRE: {summary.coastFireAge === inputs.currentAge ? 'Achieved!' : `Age ${summary.coastFireAge}`}</span>
              </span>
            )}
            {summary.isFutureHomeBuyer && summary.futurePurchaseAge && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md" title={`Planning Home Purchase at Age ${summary.futurePurchaseAge} (Year ${summary.futurePurchaseYear})`}>
                <span>🏡 Buy @ Age {summary.futurePurchaseAge}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Net Worth at Retirement & End */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Retirement Nest Egg
          </span>
          <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
        </div>

        <div className="my-2.5">
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
            {formatCur(summary.netWorthAtRetirement)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Portfolio: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCur(summary.liquidNetWorthAtRetirement || summary.netWorthAtRetirement)}</strong></span>
            {summary.ownsHome && summary.homeEquityAtRetirement > 0 && (
              <span className="text-slate-600 dark:text-slate-400">Home Eq: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCur(summary.homeEquityAtRetirement)}</strong></span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
            <span>At Age {inputs.lifeExpectancy}:</span>
            <span className={`font-mono font-semibold ${
              summary.netWorthAtLifeExpectancy > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCur(summary.netWorthAtLifeExpectancy)}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Peak of {formatCur(summary.peakNetWorth)} at age {summary.peakNetWorthAge}
          </span>
        </div>
      </div>

      {/* Card 3: Post-Retirement Monthly Cash Flow */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Monthly Spendable Budget
          </span>
          <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
        </div>

        <div className="my-2.5">
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
            ${Math.round(inputs.targetRetirementSpendingToday / 12).toLocaleString()}
            <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/mo</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Inflation-adjusted avg:</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              ${Math.round(monthlyRetirementSpend).toLocaleString()}/mo
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            CPP + OAS covers approx {pensionCoveragePercent}% of retirement needs
          </span>
        </div>
      </div>

      {/* Card 4: Lifetime Taxes & Effective Tax Rate */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Lifetime Tax & Efficiency
          </span>
          <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
        </div>

        <div className="my-2.5">
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
            {formatCur(summary.lifetimeTaxesPaid)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Avg Tax Rate in Retirement:</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {(summary.averageEffectiveTaxInRetirement * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Strategy: {inputs.drawdownStrategy.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

    </div>
  );
};
