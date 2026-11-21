import React, { useMemo } from 'react';
import {
  Percent,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  PiggyBank,
  Building2,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateEmployerRrspMatch } from '../utils/employerMatch';
import { SectionCollapseButton } from './SectionCollapseButton';

interface BenchmarkTier {
  id: 'below' | 'starter' | 'standard' | 'accelerated';
  label: string;
  rangeLabel: string;
  min: number;
  summary: string;
}

const CANADIAN_BENCHMARK_TIERS: BenchmarkTier[] = [
  {
    id: 'below',
    label: 'Below Floor',
    rangeLabel: '<10%',
    min: 0,
    summary: 'Relies heavily on CPP & OAS; higher lifestyle shortfall risk in retirement.'
  },
  {
    id: 'starter',
    label: 'Starter Pace',
    rangeLabel: '10–14.9%',
    min: 10,
    summary: 'Traditional starter floor, but trails the 15% Canadian standard benchmark.'
  },
  {
    id: 'standard',
    label: 'Canadian Standard',
    rangeLabel: '15–19.9%',
    min: 15,
    summary: 'Meets FP Canada & institutional 15–18% gross income guideline (with CPP/OAS).'
  },
  {
    id: 'accelerated',
    label: 'Accelerated / FIRE',
    rangeLabel: '20%+',
    min: 20,
    summary: 'Exceeds standard benchmarks; supports early retirement or mid-career catch-up.'
  }
];

export const SavingsRateIndicator: React.FC = React.memo(() => {
  const {
    currentAge,
    retirementAge,
    maritalStatus,
    currentAnnualIncome,
    rrspAnnualContribution,
    tfsaAnnualContribution,
    fhsaAnnualContribution,
    nonRegAnnualContribution,
    employerMatch,
    spouseIncome,
    spouseRrspAnnual,
    spouseTfsaAnnual,
    spouseFhsaAnnual,
    spouseNonRegAnnual,
    spouseEmployerMatch,
    hasExistingPortfolio,
    targetRetirementSpendingToday
  } = useSimulationStore(
    useShallow((state) => {
      const inp = state.inputs;
      const sp = inp.maritalStatus === 'married' ? inp.spouse : undefined;
      const totalPortfolio =
        (inp.rrspBalance || 0) +
        (inp.tfsaBalance || 0) +
        (inp.fhsaBalance || 0) +
        (inp.nonRegBalance || 0) +
        (sp ? (sp.rrspBalance || 0) + (sp.tfsaBalance || 0) + (sp.fhsaBalance || 0) + (sp.nonRegBalance || 0) : 0);

      return {
        currentAge: inp.currentAge,
        retirementAge: inp.retirementAge,
        maritalStatus: inp.maritalStatus,
        currentAnnualIncome: inp.currentAnnualIncome || 0,
        rrspAnnualContribution: inp.rrspAnnualContribution || 0,
        tfsaAnnualContribution: inp.tfsaAnnualContribution || 0,
        fhsaAnnualContribution: inp.fhsaAnnualContribution || 0,
        nonRegAnnualContribution: inp.nonRegAnnualContribution || 0,
        employerMatch: inp.employerMatch,
        spouseIncome: sp?.annualIncome || 0,
        spouseRrspAnnual: sp?.rrspAnnualContribution || 0,
        spouseTfsaAnnual: sp?.tfsaAnnualContribution || 0,
        spouseFhsaAnnual: sp?.fhsaAnnualContribution || 0,
        spouseNonRegAnnual: sp?.nonRegAnnualContribution || 0,
        spouseEmployerMatch: sp?.employerMatch,
        hasExistingPortfolio: totalPortfolio > 0,
        targetRetirementSpendingToday: inp.targetRetirementSpendingToday || 0
      };
    })
  );

  const applyMonthlyBoost = useSimulationStore((state) => state.applyMonthlyBoost);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const setActiveInputTab = useSimulationStore((state) => state.setActiveInputTab);
  const isCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.savingsRate));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const metrics = useMemo(() => {
    const isCouple = maritalStatus === 'married';
    const totalHouseholdIncome = currentAnnualIncome + (isCouple ? spouseIncome : 0);

    const primaryPersonalSavings =
      rrspAnnualContribution +
      tfsaAnnualContribution +
      fhsaAnnualContribution +
      nonRegAnnualContribution;
    const primaryMatch = calculateEmployerRrspMatch(
      currentAnnualIncome,
      rrspAnnualContribution,
      employerMatch
    );

    const spousePersonalSavings = isCouple
      ? spouseRrspAnnual + spouseTfsaAnnual + spouseFhsaAnnual + spouseNonRegAnnual
      : 0;
    const spouseMatch =
      isCouple && spouseEmployerMatch?.enabled
        ? calculateEmployerRrspMatch(spouseIncome, spouseRrspAnnual, spouseEmployerMatch)
        : 0;

    const personalSavings = primaryPersonalSavings + spousePersonalSavings;
    const totalEmployerMatch = primaryMatch + spouseMatch;
    const totalAnnualSavings = personalSavings + totalEmployerMatch;

    const savingsRate =
      totalHouseholdIncome > 0 ? (totalAnnualSavings / totalHouseholdIncome) * 100 : 0;
    const personalRate =
      totalHouseholdIncome > 0 ? (personalSavings / totalHouseholdIncome) * 100 : 0;

    // Personalized Canadian Retirement Savings Guideline based on current age & retirement horizon
    let recommendedRate = 15;
    let guidelineRationale =
      'Standard Canadian guideline (15% of gross income alongside CPP & OAS)';

    if (retirementAge <= 55) {
      recommendedRate = 25;
      guidelineRationale = `Early retirement target (Age ${retirementAge}) calls for an accelerated 25% savings pace`;
    } else if (retirementAge <= 60 || currentAge >= 45) {
      recommendedRate = 20;
      guidelineRationale =
        retirementAge <= 60
          ? `Retiring early at Age ${retirementAge} aligns with a 20% Canadian wealth-building target`
          : `Mid-career horizon (Age ${currentAge} → ${retirementAge}) aligns with a 20% catch-up guideline`;
    } else if (currentAge >= 38) {
      recommendedRate = 18;
      guidelineRationale = `Matches the 18% statutory Canadian RRSP contribution benchmark for Age ${currentAge}+`;
    }

    const recommendedAnnualDollars = Math.round((totalHouseholdIncome * recommendedRate) / 100);
    const annualDelta = Math.round(totalAnnualSavings - recommendedAnnualDollars);
    const monthlyGapToTarget = annualDelta < 0 ? Math.ceil(Math.abs(annualDelta) / 12) : 0;

    const isBlankCanvas =
      totalHouseholdIncome === 0 &&
      targetRetirementSpendingToday === 0 &&
      !hasExistingPortfolio;

    const tier: BenchmarkTier =
      savingsRate >= 20
        ? CANADIAN_BENCHMARK_TIERS[3]
        : savingsRate >= 15
        ? CANADIAN_BENCHMARK_TIERS[2]
        : savingsRate >= 10
        ? CANADIAN_BENCHMARK_TIERS[1]
        : CANADIAN_BENCHMARK_TIERS[0];

    const meetsPersonalizedTarget = savingsRate >= recommendedRate - 0.1;

    return {
      totalHouseholdIncome,
      personalSavings,
      totalEmployerMatch,
      totalAnnualSavings,
      savingsRate,
      personalRate,
      recommendedRate,
      recommendedAnnualDollars,
      annualDelta,
      monthlyGapToTarget,
      guidelineRationale,
      tier,
      meetsPersonalizedTarget,
      isBlankCanvas
    };
  }, [
    currentAge,
    retirementAge,
    maritalStatus,
    currentAnnualIncome,
    rrspAnnualContribution,
    tfsaAnnualContribution,
    fhsaAnnualContribution,
    nonRegAnnualContribution,
    employerMatch,
    spouseIncome,
    spouseRrspAnnual,
    spouseTfsaAnnual,
    spouseFhsaAnnual,
    spouseNonRegAnnual,
    spouseEmployerMatch,
    hasExistingPortfolio,
    targetRetirementSpendingToday
  ]);

  // Visual gauge scale capped at 30% for crisp benchmark spacing (10% = 33.3%, 15% = 50%, 18% = 60%, 20% = 66.7%)
  const SCALE_MAX = 30;
  const clampedMarkerPercent = Math.min(100, Math.max(0, (metrics.savingsRate / SCALE_MAX) * 100));
  const targetLinePercent = Math.min(100, Math.max(0, (metrics.recommendedRate / SCALE_MAX) * 100));

  const statusTone = metrics.isBlankCanvas
    ? {
        badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        rateText: 'text-slate-400 dark:text-slate-500',
        needleColor: 'bg-slate-400 dark:bg-slate-500',
        fillGradient: 'from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600',
        statusLabel: 'Awaiting Income & Savings'
      }
    : metrics.meetsPersonalizedTarget
    ? {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/30',
        rateText: 'text-emerald-600 dark:text-emerald-400',
        needleColor: 'bg-emerald-500',
        fillGradient: 'from-emerald-500 to-teal-500',
        statusLabel: metrics.savingsRate >= 20 ? 'Exceeds Canadian Guideline' : 'Meets Canadian Guideline'
      }
    : metrics.savingsRate >= 15
    ? {
        badgeBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-500/30',
        rateText: 'text-blue-600 dark:text-blue-400',
        needleColor: 'bg-blue-500',
        fillGradient: 'from-blue-500 to-indigo-500',
        statusLabel: 'Meets 15% Baseline'
      }
    : metrics.savingsRate >= 10
    ? {
        badgeBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/30',
        rateText: 'text-amber-600 dark:text-amber-400',
        needleColor: 'bg-amber-500',
        fillGradient: 'from-amber-400 to-amber-500',
        statusLabel: 'Below 15% Guideline'
      }
    : {
        badgeBg: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/30',
        rateText: 'text-rose-600 dark:text-rose-400',
        needleColor: 'bg-rose-500',
        fillGradient: 'from-rose-500 to-orange-500',
        statusLabel: 'Savings Gap Warning'
      };

  const formatCur = (val: number) => `$${Math.round(val).toLocaleString()}`;

  return (
    <section
      aria-label="Canadian Retirement Savings Rate Benchmark"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-5 flex flex-col gap-4 transition-colors"
    >
      {/* Top Row: Title, Personalized Benchmark Status, and Primary Savings Rate Readout */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Savings Rate & Canadian Benchmark
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusTone.badgeBg}`}>
                {metrics.meetsPersonalizedTarget ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : metrics.isBlankCanvas ? (
                  <Info className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                <span>{statusTone.statusLabel}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {metrics.totalHouseholdIncome > 0
                ? metrics.guidelineRationale
                : 'Enter household employment income and annual contributions to benchmark your savings rate against Canadian guidelines.'}
            </p>
          </div>
        </div>

        {/* Hero Readout + Collapse Toggle */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          <div className="flex items-center gap-5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 rounded-xl px-4 py-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Current Rate
              </span>
              <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${statusTone.rateText}`}>
                {metrics.isBlankCanvas ? '0.0%' : `${metrics.savingsRate.toFixed(1)}%`}
              </div>
            </div>

            <div className="h-9 w-px bg-slate-200 dark:bg-slate-700" />

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                CA Guideline Target
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-800 dark:text-slate-100 flex items-baseline gap-1.5">
                <span>{metrics.recommendedRate}%</span>
                {metrics.totalHouseholdIncome > 0 && (
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    ({formatCur(metrics.recommendedAnnualDollars)}/yr)
                  </span>
                )}
              </div>
            </div>
          </div>

          <SectionCollapseButton
            isCollapsed={isCollapsed}
            onToggle={() => toggleSectionCollapse('savingsRate')}
            sectionLabel="Savings Rate & Canadian Benchmark"
          />
        </div>
      </div>

      {!isCollapsed && (
        <>

      {/* Middle Row: Interactive Canadian Guideline Spectrum Bar (0% to 30%+) */}
      <div className="flex flex-col gap-2">
        <div className="relative pt-6 pb-2">
          {/* Current Position Floating Marker Pill */}
          {!metrics.isBlankCanvas && metrics.totalHouseholdIncome > 0 && (
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300 z-10 pointer-events-none"
              style={{ left: `${clampedMarkerPercent}%` }}
            >
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs whitespace-nowrap">
                You: {metrics.savingsRate.toFixed(1)}%
              </span>
              <span className={`w-0.5 h-2.5 ${statusTone.needleColor}`} />
            </div>
          )}

          {/* Segmented Canadian Guideline Track (0-10% | 10-15% | 15-20% | 20-30%) */}
          <div className="relative h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex border border-slate-200/80 dark:border-slate-700/80">
            <div className="h-full bg-rose-500/20 dark:bg-rose-500/25 border-r border-white/60 dark:border-slate-900/70" style={{ width: '33.33%' }} title="Below 10%: Below Minimum Floor" />
            <div className="h-full bg-amber-500/25 dark:bg-amber-500/25 border-r border-white/60 dark:border-slate-900/70" style={{ width: '16.67%' }} title="10%–14.9%: Starter Floor" />
            <div className="h-full bg-emerald-500/25 dark:bg-emerald-500/25 border-r border-white/60 dark:border-slate-900/70" style={{ width: '16.67%' }} title="15%–19.9%: FP Canada Standard Benchmark" />
            <div className="h-full bg-teal-500/30 dark:bg-teal-500/30" style={{ width: '33.33%' }} title="20%+: Accelerated / Early Retirement" />

            {/* Filled Active Progress Overlay */}
            {!metrics.isBlankCanvas && metrics.totalHouseholdIncome > 0 && (
              <div
                className={`absolute top-0 left-0 h-full rounded-l-full bg-gradient-to-r ${statusTone.fillGradient} transition-all duration-500 opacity-85`}
                style={{ width: `${clampedMarkerPercent}%` }}
              />
            )}
          </div>

          {/* Personalized Guideline Target Vertical Marker */}
          <div
            className="absolute top-5 bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${targetLinePercent}%` }}
            title={`Personalized Canadian Guideline Target: ${metrics.recommendedRate}%`}
          >
            <div className="w-0.5 h-5 bg-slate-700 dark:bg-slate-200 rounded-full" />
          </div>

          {/* Axis Scale Labels */}
          <div className="relative h-4 mt-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span className="absolute left-0">0%</span>
            <span className="absolute -translate-x-1/2" style={{ left: '33.33%' }}>10% Floor</span>
            <span className="absolute -translate-x-1/2 font-bold text-emerald-700 dark:text-emerald-400" style={{ left: '50%' }}>15% Standard</span>
            <span className="absolute -translate-x-1/2 hidden sm:inline" style={{ left: '60%' }}>18% RRSP Cap</span>
            <span className="absolute -translate-x-1/2" style={{ left: '66.67%' }}>20% Accel.</span>
            <span className="absolute right-0">30%+</span>
          </div>
        </div>

        {/* 4 Canadian Guideline Tier Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          {CANADIAN_BENCHMARK_TIERS.map((tier) => {
            const isCurrentTier = !metrics.isBlankCanvas && metrics.totalHouseholdIncome > 0 && metrics.tier.id === tier.id;
            return (
              <div
                key={tier.id}
                className={`p-2.5 rounded-xl border text-left transition ${
                  isCurrentTier
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 shadow-2xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[11px] font-bold ${
                    isCurrentTier ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {tier.label}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isCurrentTier
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {tier.rangeLabel}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {tier.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Contribution Breakdown & Actionable Gap/Surplus Guidance */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Personal Savings:</span>
            <strong className="font-mono text-slate-900 dark:text-slate-100">
              {formatCur(metrics.personalSavings)}/yr
            </strong>
            {metrics.totalHouseholdIncome > 0 && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                ({metrics.personalRate.toFixed(1)}%)
              </span>
            )}
          </div>

          {metrics.totalEmployerMatch > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Employer Match:</span>
              <strong className="font-mono text-blue-600 dark:text-blue-400">
                +{formatCur(metrics.totalEmployerMatch)}/yr
              </strong>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Gross Household Income:</span>
            <strong className="font-mono text-slate-900 dark:text-slate-100">
              {formatCur(metrics.totalHouseholdIncome)}/yr
            </strong>
          </div>
        </div>

        {/* Benchmark Delta + Optional Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {metrics.totalHouseholdIncome > 0 && (
            metrics.annualDelta >= 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20 font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  +{formatCur(metrics.annualDelta)}/yr above {metrics.recommendedRate}% Canadian benchmark
                </span>
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/20 font-semibold text-[11px]">
                  <span>
                    {formatCur(Math.abs(metrics.annualDelta))}/yr ({formatCur(metrics.monthlyGapToTarget)}/mo) below {metrics.recommendedRate}% target
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => applyMonthlyBoost(metrics.monthlyGapToTarget)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs cursor-pointer"
                  title={`Increase annual savings by +${formatCur(metrics.monthlyGapToTarget)}/mo to reach the ${metrics.recommendedRate}% Canadian benchmark`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Close Gap (+{formatCur(metrics.monthlyGapToTarget)}/mo)</span>
                </button>
              </>
            )
          )}

          <button
            type="button"
            onClick={() => {
              setActiveView('inputs');
              setActiveInputTab('accounts');
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
          >
            <span>Adjust Contributions</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
        </>
      )}
    </section>
  );
});

SavingsRateIndicator.displayName = 'SavingsRateIndicator';
