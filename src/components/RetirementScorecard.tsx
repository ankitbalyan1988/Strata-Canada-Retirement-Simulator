import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Zap, 
  Anchor,
  Wallet,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Coins,
  HelpCircle
} from 'lucide-react';
import { RetirementInputs, SimulationSummary, YearSimulationResult } from '../types/retirement';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateEmployerRrspMatch } from '../utils/employerMatch';

export interface RetirementScorecardProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  optimisticSummary?: SimulationSummary;
  yearlyResults?: YearSimulationResult[];
}

export const RetirementScorecard: React.FC<RetirementScorecardProps> = (props) => {
  const storeInputs = useSimulationStore(useShallow((state) => state.inputs));
  const storeOptimisticSummary = useSimulationStore(useShallow((state) => state.optimisticSummary));
  const storeSummary = useSimulationStore(useShallow((state) => state.summary));
  const storeYearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));

  const inputs = props.inputs ?? storeInputs;
  const summary = props.optimisticSummary ?? props.summary ?? storeOptimisticSummary ?? storeSummary;
  const yearlyResults = props.yearlyResults ?? storeYearlyResults;

  const [showAccountDetails, setShowAccountDetails] = useState<boolean>(true);

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  const formatChip = (val: number) => {
    if (Math.abs(val) >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(val) >= 1000) {
      const k = val / 1000;
      return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return `$${Math.round(val)}`;
  };

  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;

  // Primary Account Balances
  const rrspBal = inputs.rrspBalance || 0;
  const tfsaBal = inputs.tfsaBalance || 0;
  const fhsaBal = inputs.fhsaBalance || 0;
  const nonRegBal = inputs.nonRegBalance || 0;

  // Spouse Account Balances
  const spouseRrspBal = isCouple && spouse ? (spouse.rrspBalance || 0) : 0;
  const spouseTfsaBal = isCouple && spouse ? (spouse.tfsaBalance || 0) : 0;
  const spouseFhsaBal = isCouple && spouse ? (spouse.fhsaBalance || 0) : 0;
  const spouseNonRegBal = isCouple && spouse ? (spouse.nonRegBalance || 0) : 0;

  const totalCurrentBalance = rrspBal + tfsaBal + fhsaBal + nonRegBal + spouseRrspBal + spouseTfsaBal + spouseFhsaBal + spouseNonRegBal;

  const isBlankCanvas = (
    (inputs.currentAnnualIncome || 0) === 0 &&
    (inputs.targetRetirementSpendingToday || 0) === 0 &&
    totalCurrentBalance === 0
  );

  // Primary Annual Contributions Target (including Employer Match if applicable)
  const pEmployerMatch = calculateEmployerRrspMatch(inputs.currentAnnualIncome, inputs.rrspAnnualContribution || 0, inputs.employerMatch);
  const rrspTarget = (inputs.rrspAnnualContribution || 0) + pEmployerMatch;
  const tfsaTarget = inputs.tfsaAnnualContribution || 0;
  const fhsaTarget = inputs.fhsaAnnualContribution || 0;
  const nonRegTarget = inputs.nonRegAnnualContribution || 0;

  // Spouse Annual Contributions Target (including Spouse Employer Match)
  const sEmployerMatch = isCouple && spouse?.employerMatch?.enabled
    ? calculateEmployerRrspMatch(spouse.annualIncome, spouse.rrspAnnualContribution || 0, spouse.employerMatch)
    : 0;
  const spouseRrspTarget = (spouse?.rrspAnnualContribution || 0) + sEmployerMatch;
  const spouseTfsaTarget = isCouple && spouse ? (spouse.tfsaAnnualContribution || 0) : 0;
  const spouseFhsaTarget = isCouple && spouse ? (spouse.fhsaAnnualContribution || 0) : 0;
  const spouseNonRegTarget = isCouple && spouse ? (spouse.nonRegAnnualContribution || 0) : 0;

  const totalAnnualContributionsTarget = rrspTarget + tfsaTarget + fhsaTarget + nonRegTarget + spouseRrspTarget + spouseTfsaTarget + spouseFhsaTarget + spouseNonRegTarget;
  const totalMonthlyContributionsTarget = Math.round(totalAnnualContributionsTarget / 12);

  const totalHouseholdIncome = (inputs.currentAnnualIncome || 0) + (isCouple && spouse ? (spouse.annualIncome || 0) : 0);
  const currentSavingsRate = totalHouseholdIncome > 0
    ? (totalAnnualContributionsTarget / totalHouseholdIncome) * 100
    : 0;

  // FHSA Remaining Room
  const fhsaRemainingRoom = inputs.fhsaRemainingContributionRoom !== undefined
    ? Math.min(40000, Math.max(0, inputs.fhsaRemainingContributionRoom))
    : Math.max(0, 40000 - Math.min(40000, fhsaBal));

  const monthlyRetirementSpend = summary.averageAnnualRetirementSpendNominal / 12;

  // Pension coverage in retirement
  const totalLifetimePensions = summary.lifetimeCppReceived + summary.lifetimeOasReceived;
  const pensionCoveragePercent = summary.lifetimeEmploymentIncome > 0 
    ? Math.min(100, Math.round((totalLifetimePensions / (summary.averageAnnualRetirementSpendNominal * summary.totalYearsInRetirement || 1)) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 6 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3.5">
        
        {/* KPI 1: Current Portfolio Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Portfolio
            </span>
            <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {formatCur(totalCurrentBalance)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Registered: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatChip(rrspBal + tfsaBal + fhsaBal + spouseRrspBal + spouseTfsaBal + spouseFhsaBal)}</strong></span>
              <span>Taxable: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatChip(nonRegBal + spouseNonRegBal)}</strong></span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between gap-1 text-[10.5px] font-mono text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="text-blue-600 dark:text-blue-400" title="RRSP Balance">RRSP {formatChip(rrspBal + spouseRrspBal)}</span>
            <span className="text-emerald-600 dark:text-emerald-400" title="TFSA Balance">TFSA {formatChip(tfsaBal + spouseTfsaBal)}</span>
            <span className="text-amber-600 dark:text-amber-400" title="FHSA Balance">FHSA {formatChip(fhsaBal + spouseFhsaBal)}</span>
            <span className="text-purple-600 dark:text-purple-400" title="Non-Registered Balance">Non-Reg {formatChip(nonRegBal + spouseNonRegBal)}</span>
          </div>
        </div>

        {/* KPI 2: Annual Contributions Target */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Annual Contributions Target
            </span>
            <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                {formatCur(totalAnnualContributionsTarget)}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">/yr</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Monthly Target: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCur(totalMonthlyContributionsTarget)}/mo</strong></span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{currentSavingsRate.toFixed(1)}% Inc</span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between gap-1 text-[10.5px] font-mono text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="text-blue-600 dark:text-blue-400" title="RRSP Annual Target">RRSP {formatChip(rrspTarget + spouseRrspTarget)}</span>
            <span className="text-emerald-600 dark:text-emerald-400" title="TFSA Annual Target">TFSA {formatChip(tfsaTarget + spouseTfsaTarget)}</span>
            <span className="text-amber-600 dark:text-amber-400" title="FHSA Annual Target">FHSA {formatChip(fhsaTarget + spouseFhsaTarget)}</span>
            <span className="text-purple-600 dark:text-purple-400" title="Non-Registered Annual Target">Non-Reg {formatChip(nonRegTarget + spouseNonRegTarget)}</span>
          </div>
        </div>

        {/* KPI 3: Readiness Score */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Readiness Score
            </span>
            <span className={`p-1.5 rounded-xl border ${
              isBlankCanvas
                ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 border-slate-200/80 dark:border-slate-700/60'
                : summary.isFullyFunded 
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20' 
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/20'
            }`}>
              {isBlankCanvas ? <HelpCircle className="w-4 h-4" /> : summary.isFullyFunded ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                {isBlankCanvas ? '0%' : `${summary.readinessScore}%`}
              </span>
              <span className={`text-xs font-semibold ${
                isBlankCanvas
                  ? 'text-slate-500 dark:text-slate-400'
                  : summary.isFullyFunded 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {isBlankCanvas ? 'Awaiting Inputs' : summary.isFullyFunded ? 'Fully Funded' : 'Shortfall Risk'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBlankCanvas ? 'bg-slate-300 dark:bg-slate-700' : summary.isFullyFunded ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${isBlankCanvas ? 0 : summary.readinessScore}%` }}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between gap-1 text-[10.5px] text-slate-500 dark:text-slate-400">
            <span>{isBlankCanvas ? '0' : summary.yearsFunded}/{summary.totalYearsInRetirement || 21} yrs funded</span>
            {isBlankCanvas ? (
              <span className="text-slate-400 italic font-mono text-[10px]">Blank Canvas</span>
            ) : summary.coastFireAge !== undefined && summary.coastFireAge !== null ? (
              <span className="inline-flex items-center gap-0.5 text-slate-700 dark:text-slate-300 font-semibold font-mono">
                <Anchor className="w-2.5 h-2.5 text-slate-400" />
                Coast FIRE
              </span>
            ) : null}
          </div>
        </div>

        {/* KPI 4: Retirement Nest Egg */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Retirement Nest Egg
            </span>
            <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {formatCur(summary.netWorthAtRetirement)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Portfolio: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCur(summary.liquidNetWorthAtRetirement || summary.netWorthAtRetirement)}</strong></span>
              {summary.ownsHome && summary.homeEquityAtRetirement > 0 && (
                <span>Home Eq: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCur(summary.homeEquityAtRetirement)}</strong></span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
            <span>Peak at age {summary.peakNetWorthAge}:</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatCur(summary.peakNetWorth)}</span>
          </div>
        </div>

        {/* KPI 5: Monthly Spendable Budget */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Monthly Spendable Budget
            </span>
            <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              ${Math.round(inputs.targetRetirementSpendingToday / 12).toLocaleString()}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Indexed avg:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                ${Math.round(isBlankCanvas ? 0 : monthlyRetirementSpend).toLocaleString()}/mo
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
            <span>Pensions Cover:</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {isBlankCanvas ? '0%' : `~${pensionCoveragePercent}% of needs`}
            </span>
          </div>
        </div>

        {/* KPI 6: Lifetime Tax & Efficiency */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lifetime Tax & Efficiency
            </span>
            <span className="p-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {isBlankCanvas ? '$0' : formatCur(summary.lifetimeTaxesPaid)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Avg Tax in Ret.:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {isBlankCanvas ? '0.0%' : `${(summary.averageEffectiveTaxInRetirement * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
            <span>Strategy:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
              {isBlankCanvas ? 'No income modeled' : inputs.drawdownStrategy.replace('_', ' ')}
            </span>
          </div>
        </div>

      </div>

      {/* Account-Level KPI Strip: 4 Canadian Accounts (Direct reflection from Primary Accounts) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden transition">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Canadian Registered & Taxable Account Balances & Targets
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ({formatCur(totalCurrentBalance)} portfolio • {formatCur(totalAnnualContributionsTarget)}/yr target)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAccountDetails(!showAccountDetails)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            aria-expanded={showAccountDetails}
          >
            <span>{showAccountDetails ? 'Hide Details' : 'Show Details'}</span>
            {showAccountDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showAccountDetails && (
          <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/30 dark:bg-slate-900/60">
            {/* Card 1: RRSP */}
            <div className="p-3 rounded-xl border border-blue-200/70 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">RRSP</span>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-500/20 px-2 py-0.5 rounded">
                  Tax-Deductible
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Current</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{formatCur(rrspBal + spouseRrspBal)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Target</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatChip(rrspTarget + spouseRrspTarget)}/yr</span>
                  {(pEmployerMatch + sEmployerMatch > 0) && (
                    <span className="text-[8.5px] font-sans font-bold text-emerald-600 dark:text-emerald-400 block" title="Includes employer contribution match">
                      +{formatChip(pEmployerMatch + sEmployerMatch)} match
                    </span>
                  )}
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Return</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{inputs.accountReturns?.rrspReturn ?? 6.5}%</span>
                </div>
              </div>
            </div>

            {/* Card 2: TFSA */}
            <div className="p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">TFSA</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                  100% Tax-Free
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Current</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{formatCur(tfsaBal + spouseTfsaBal)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Target</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatChip(tfsaTarget + spouseTfsaTarget)}/yr</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Return</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{inputs.accountReturns?.tfsaReturn ?? 7.0}%</span>
                </div>
              </div>
            </div>

            {/* Card 3: FHSA */}
            <div className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">FHSA</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20 px-2 py-0.5 rounded">
                  Deductible + Tax-Free
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1 text-center font-mono">
                <div className="bg-white/80 dark:bg-slate-950/40 p-1 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <span className="text-[8.5px] uppercase text-slate-400 block font-sans">Current</span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-slate-50">{formatChip(fhsaBal + spouseFhsaBal)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <span className="text-[8.5px] uppercase text-slate-400 block font-sans">Room Left</span>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{formatChip(fhsaRemainingRoom)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <span className="text-[8.5px] uppercase text-slate-400 block font-sans">Target</span>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{formatChip(fhsaTarget + spouseFhsaTarget)}/yr</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <span className="text-[8.5px] uppercase text-slate-400 block font-sans">Return</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{inputs.accountReturns?.fhsaReturn ?? 6.0}%</span>
                </div>
              </div>
            </div>

            {/* Card 4: Non-Registered */}
            <div className="p-3 rounded-xl border border-purple-200/70 dark:border-purple-500/20 bg-purple-50/40 dark:bg-purple-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Non-Registered</span>
                </div>
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-500/20 px-2 py-0.5 rounded">
                  Taxable
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-purple-100 dark:border-purple-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Current</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{formatCur(nonRegBal + spouseNonRegBal)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-purple-100 dark:border-purple-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Target</span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{formatChip(nonRegTarget + spouseNonRegTarget)}/yr</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-purple-100 dark:border-purple-500/20">
                  <span className="text-[9px] uppercase text-slate-400 block font-sans">Return</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{inputs.accountReturns?.nonRegReturn ?? 5.5}%</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
