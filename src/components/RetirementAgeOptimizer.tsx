import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  ShieldCheck,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  BarChart3,
  Activity,
  Info,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  AgeMonteCarloPoint,
  MonteCarloOptimizerResult,
  runMonteCarloRetirementOptimizer
} from '../utils/monteCarloOptimizer';
import { runMonteCarloOptimizerAsync } from '../utils/monteCarloClient';

const CONFIDENCE_OPTIONS = [80, 85, 90, 95] as const;

const VOLATILITY_PRESETS = [
  { value: 9, label: 'Conservative', sub: '9% σ' },
  { value: 12, label: 'Balanced', sub: '12% σ' },
  { value: 15, label: 'Growth', sub: '15% σ' }
] as const;

const DEFAULT_SEED = 20260815;
const NUM_TRIALS = 500;

const formatCompactCurrency = (val: number): string => {
  if (!Number.isFinite(val)) return '$0';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000).toLocaleString()}k`;
  }
  return `${sign}$${Math.round(abs).toLocaleString()}`;
};

const formatExactCurrency = (val: number): string => {
  if (!Number.isFinite(val)) return '$0';
  return `$${Math.round(val).toLocaleString()}`;
};

export const RetirementAgeOptimizer: React.FC = React.memo(() => {
  const inputs = useSimulationStore(useShallow((state) => state.inputs));
  const applyRetirementAge = useSimulationStore((state) => state.applyRetirementAge);
  const applyMonthlyBoost = useSimulationStore((state) => state.applyMonthlyBoost);
  const updateField = useSimulationStore((state) => state.updateField);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const setActiveInputTab = useSimulationStore((state) => state.setActiveInputTab);
  const isCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.retirementAgeOptimizer));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const [confidenceTarget, setConfidenceTarget] = useState<number>(85);
  const [volatilityPercent, setVolatilityPercent] = useState<number>(12);
  const [seed, setSeed] = useState<number>(DEFAULT_SEED);
  const [activeChartMode, setActiveChartMode] = useState<'probability' | 'wealth_cone'>('probability');
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [showMethodology, setShowMethodology] = useState<boolean>(true);

  // Optional sensitivity overrides (null = synced live to user's plan)
  const [customSavingsRate, setCustomSavingsRate] = useState<number | null>(null);
  const [customTargetIncome, setCustomTargetIncome] = useState<number | null>(null);

  // Selected / hovered inspection state for SVG charts
  const [inspectedAge, setInspectedAge] = useState<number | null>(null);
  const [hoveredConeIndex, setHoveredConeIndex] = useState<number | null>(null);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<MonteCarloOptimizerResult>(() =>
    runMonteCarloRetirementOptimizer(inputs, {
      confidenceTarget: 85,
      volatilityPercent: 12,
      numTrials: NUM_TRIALS,
      seed: DEFAULT_SEED
    })
  );

  const runIdRef = useRef<number>(0);

  // Re-run Monte Carlo asynchronously in Web Worker whenever inputs or optimizer controls change
  useEffect(() => {
    const runId = ++runIdRef.current;
    setIsSimulating(true);

    const timer = window.setTimeout(() => {
      runMonteCarloOptimizerAsync(inputs, {
        confidenceTarget,
        volatilityPercent,
        numTrials: NUM_TRIALS,
        seed,
        customSavingsRatePercent: customSavingsRate,
        customTargetIncomeToday: customTargetIncome
      })
        .then((nextResult) => {
          if (runId === runIdRef.current) {
            setResult(nextResult);
            setIsSimulating(false);
          }
        })
        .catch(() => {
          if (runId === runIdRef.current) {
            setIsSimulating(false);
          }
        });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [inputs, confidenceTarget, volatilityPercent, seed, customSavingsRate, customTargetIncome]);

  // Reset inspected bar if it falls outside the latest age curve
  useEffect(() => {
    if (inspectedAge !== null && !result.ageCurve.some((pt) => pt.age === inspectedAge)) {
      setInspectedAge(null);
    }
  }, [result.ageCurve, inspectedAge]);

  const isSandboxActive = customSavingsRate !== null || customTargetIncome !== null;
  const isExpanded = !isCollapsed;

  const handleApplySuggestedAge = useCallback(
    (age: number) => {
      startTransition(() => {
        applyRetirementAge(age);
      });
    },
    [applyRetirementAge]
  );

  const handleResetSandbox = useCallback(() => {
    setCustomSavingsRate(null);
    setCustomTargetIncome(null);
  }, []);

  const handleReseed = useCallback(() => {
    setSeed((prev) => ((prev * 1664525 + 1013904223) >>> 0) % 99999999 || DEFAULT_SEED + 7);
  }, []);

  // Currently focused age point for the probability bar inspection readout
  const activeInspectedPoint: AgeMonteCarloPoint | null = useMemo(() => {
    if (result.ageCurve.length === 0) return null;
    if (inspectedAge !== null) {
      return result.ageCurve.find((p) => p.age === inspectedAge) ?? null;
    }
    return (
      result.suggestedPlanResult ??
      result.currentPlanResult ??
      result.ageCurve[result.ageCurve.length - 1]
    );
  }, [result.ageCurve, result.suggestedPlanResult, result.currentPlanResult, inspectedAge]);

  // Dynamic upper bound for target income sandbox slider
  const incomeSliderMax = useMemo(() => {
    const base = Math.max(result.baseTargetIncomeToday || 60000, customTargetIncome || 60000);
    return Math.max(180000, Math.ceil((base * 1.75) / 10000) * 10000);
  }, [result.baseTargetIncomeToday, customTargetIncome]);

  // Total current investable portfolio (for transparent plain-English explanation)
  const startingLiquidPortfolio = useMemo(() => {
    const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
    const sp = inputs.spouse;
    const hasCustomNonReg = Boolean(inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0);
    const primaryNonReg = hasCustomNonReg
      ? inputs.nonRegCustomAccounts!.reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0)
      : Math.max(0, inputs.nonRegBalance || 0);
    return (
      Math.max(0, inputs.rrspBalance || 0) +
      Math.max(0, inputs.tfsaBalance || 0) +
      Math.max(0, inputs.fhsaBalance || 0) +
      primaryNonReg +
      (isCouple && sp
        ? Math.max(0, sp.rrspBalance || 0) +
          Math.max(0, sp.tfsaBalance || 0) +
          Math.max(0, sp.fhsaBalance || 0) +
          Math.max(0, sp.nonRegBalance || 0)
        : 0)
    );
  }, [inputs]);

  // Plain-English narrative explaining what the Monte Carlo result means for this specific user
  const plainEnglishSummary = useMemo(() => {
    if (result.isBlankCanvas) return null;

    const targetSpendStr = `${formatExactCurrency(result.effectiveTargetIncomeToday)}/yr`;
    const savingsStr = `${result.effectiveSavingsRatePercent.toFixed(1)}% of income (${formatExactCurrency(result.effectiveAnnualSavings)}/yr)`;
    const sugPt = result.suggestedPlanResult;
    const currPt = result.currentPlanResult;

    if (result.suggestedAge === null) {
      const peakRate = sugPt ? `${sugPt.successRate.toFixed(1)}%` : 'below target';
      return {
        title: 'Why no single retirement age met your safety target yet',
        body: `Even if you wait until Age ${result.bestAvailableAge}, your investable savings only lasted all the way to Age ${inputs.lifeExpectancy} in ${peakRate} of our ${result.numTrials} simulated market lifetimes — below your ${confidenceTarget}% comfort level. At your current savings pace (${savingsStr}) and target lifestyle (${targetSpendStr} in today's dollars), market downturns or inflation spikes create too much risk of running short.`,
        takeaway: `Try opening "Test Savings & Income" above to see how boosting savings or slightly lowering target retirement spending unlocks a safe retirement age.`
      };
    }

    if (result.ageDelta !== null && result.ageDelta < 0) {
      const yrsEarlier = Math.abs(result.ageDelta);
      return {
        title: `What this means: You could retire ${yrsEarlier} ${yrsEarlier === 1 ? 'year' : 'years'} ahead of schedule`,
        body: `At your savings pace of ${savingsStr}, your portfolio is strong enough to fund ${targetSpendStr} (in today's buying power) starting as early as Age ${result.suggestedAge}. Out of ${result.numTrials} simulated market futures — including recessions, booms, and inflation swings — your money lasted through Age ${inputs.lifeExpectancy} in ${sugPt?.successfulTrials ?? 0} scenarios (${sugPt?.successRate.toFixed(1) ?? 0}%), clearing your ${confidenceTarget}% safety target.`,
        takeaway: `Keeping your current Age ${inputs.retirementAge} goal gives you an even larger cushion (${currPt?.successRate.toFixed(1) ?? 0}% odds of success), or you can click "Apply Age ${result.suggestedAge}" to preview retiring earlier.`
      };
    }

    if (result.ageDelta === 0) {
      return {
        title: `What this means: Your planned Age ${inputs.retirementAge} retirement is right on target`,
        body: `Retiring at Age ${result.suggestedAge} is the earliest age that meets your ${confidenceTarget}% safety threshold. Across ${result.numTrials} simulated market lifetimes, your savings pace of ${savingsStr} funded ${targetSpendStr} (in today's dollars) all the way to Age ${inputs.lifeExpectancy} in ${sugPt?.successfulTrials ?? 0} out of ${result.numTrials} scenarios (${sugPt?.successRate.toFixed(1) ?? 0}%).`,
        takeaway: `Retiring even one year earlier drops below your ${confidenceTarget}% confidence target, making Age ${result.suggestedAge} a well-balanced choice between career time and financial security.`
      };
    }

    const yrsLater = result.ageDelta ?? 0;
    return {
      title: `What this means: Retiring at Age ${inputs.retirementAge} carries higher shortfall risk`,
      body: `At your current Age ${inputs.retirementAge} goal, your savings only lasted to Age ${inputs.lifeExpectancy} in ${currPt?.successRate.toFixed(1) ?? 0}% of our ${result.numTrials} simulated market futures — below your ${confidenceTarget}% safety bar. Working ${yrsLater} extra ${yrsLater === 1 ? 'year' : 'years'} to Age ${result.suggestedAge} gives your investments more time to compound while shortening retirement withdrawals, lifting your success odds to ${sugPt?.successRate.toFixed(1) ?? 0}% (${sugPt?.successfulTrials ?? 0}/${result.numTrials} futures).`,
      takeaway:
        result.extraMonthlySavingsEstimate !== null
          ? `Prefer to keep Age ${inputs.retirementAge}? Saving about +${formatExactCurrency(result.extraMonthlySavingsEstimate)}/mo more (or slightly trimming target retirement spending) can achieve the same ${confidenceTarget}% confidence without delaying retirement.`
          : `You can apply Age ${result.suggestedAge} for stronger resilience, or use "Test Savings & Income" above to explore higher savings or adjusted retirement spending.`
    };
  }, [result, inputs.lifeExpectancy, inputs.retirementAge, confidenceTarget]);

  // Status badge styling based on recommendation vs current plan
  const recommendationTone = useMemo(() => {
    if (result.isBlankCanvas) {
      return {
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        heroAccent: 'text-slate-500 dark:text-slate-400',
        headline: 'Awaiting Plan Inputs'
      };
    }
    if (result.suggestedAge === null) {
      return {
        badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/30',
        heroAccent: 'text-rose-600 dark:text-rose-400',
        headline: `Below ${confidenceTarget}% across evaluated ages`
      };
    }
    if (result.ageDelta !== null && result.ageDelta < 0) {
      return {
        badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/30',
        heroAccent: 'text-emerald-600 dark:text-emerald-400',
        headline: `Retire ${Math.abs(result.ageDelta)} ${Math.abs(result.ageDelta) === 1 ? 'year' : 'years'} earlier`
      };
    }
    if (result.ageDelta === 0) {
      return {
        badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/30',
        heroAccent: 'text-emerald-600 dark:text-emerald-400',
        headline: 'Matches your target age'
      };
    }
    return {
      badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/30',
      heroAccent: 'text-amber-600 dark:text-amber-400',
      headline: `+${result.ageDelta} ${result.ageDelta === 1 ? 'year' : 'years'} later for ${confidenceTarget}% safety`
    };
  }, [result.isBlankCanvas, result.suggestedAge, result.ageDelta, confidenceTarget]);

  // SVG Wealth Cone geometry calculations
  const coneChartGeometry = useMemo(() => {
    const pts = result.suggestedTrajectory;
    if (pts.length < 2) return null;

    const width = 760;
    const height = 220;
    const padL = 56;
    const padR = 20;
    const padT = 18;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const rawMax = Math.max(
      100_000,
      ...pts.map((p) => Math.max(p.p90Real, p.p50Real))
    );
    const yMax = rawMax * 1.08;

    const xForIndex = (idx: number) => padL + (idx / Math.max(1, pts.length - 1)) * plotW;
    const yForVal = (v: number) => padT + plotH - (Math.max(0, v) / yMax) * plotH;

    const buildLine = (selector: (p: typeof pts[number]) => number) =>
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(1)} ${yForVal(selector(p)).toFixed(1)}`).join(' ');

    const buildBand = (
      upper: (p: typeof pts[number]) => number,
      lower: (p: typeof pts[number]) => number
    ) => {
      const top = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(1)} ${yForVal(upper(p)).toFixed(1)}`)
        .join(' ');
      const bottom = [...pts]
        .reverse()
        .map((p, revIdx) => {
          const origIdx = pts.length - 1 - revIdx;
          return `L ${xForIndex(origIdx).toFixed(1)} ${yForVal(lower(p)).toFixed(1)}`;
        })
        .join(' ');
      return `${top} ${bottom} Z`;
    };

    const focusAge = result.suggestedAge ?? result.bestAvailableAge;
    const retireIdx = pts.findIndex((p) => p.age === focusAge);
    const retireX = retireIdx >= 0 ? xForIndex(retireIdx) : null;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      val: yMax * frac,
      y: yForVal(yMax * frac)
    }));

    const xTickStep = Math.max(1, Math.ceil(pts.length / 8));
    const xTicks = pts
      .map((p, i) => ({ age: p.age, x: xForIndex(i), idx: i }))
      .filter((t, i) => i === 0 || i === pts.length - 1 || i % xTickStep === 0);

    return {
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      yMax,
      xForIndex,
      yForVal,
      band10_90: buildBand((p) => p.p90Real, (p) => p.p10Real),
      band25_75: buildBand((p) => p.p75Real, (p) => p.p25Real),
      lineP50: buildLine((p) => p.p50Real),
      lineP10: buildLine((p) => p.p10Real),
      lineP90: buildLine((p) => p.p90Real),
      retireX,
      focusAge,
      yTicks,
      xTicks
    };
  }, [result.suggestedTrajectory, result.suggestedAge, result.bestAvailableAge]);

  const hoveredConePoint =
    hoveredConeIndex !== null && result.suggestedTrajectory[hoveredConeIndex]
      ? result.suggestedTrajectory[hoveredConeIndex]
      : null;

  return (
    <section
      aria-label="Monte Carlo Retirement Age Optimizer"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-5 sm:p-6 flex flex-col gap-5 transition-colors"
    >
      {/* Header Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                Retirement Age Optimizer
              </h3>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 whitespace-nowrap inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Monte Carlo · {NUM_TRIALS} Paths</span>
              </span>
              {isSandboxActive && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 whitespace-nowrap">
                  Sandbox Preview
                </span>
              )}
              {isSimulating && (
                <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 inline-flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Updating...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Finds the earliest age you can comfortably retire by stress-testing your savings and target retirement income across {NUM_TRIALS} randomized market futures (booms, downturns, and inflation swings).
            </p>
          </div>
        </div>

        {/* Right Controls: Collapse + Quick Re-seed */}
        <div className="flex items-center gap-2 self-start xl:self-auto flex-wrap">
          {!result.isBlankCanvas && (
            <button
              type="button"
              onClick={handleReseed}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer"
              title="Run a fresh random draw of 500 stochastic market paths"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Re-run Trials</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleSectionCollapse('retirementAgeOptimizer')}
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition border border-slate-200/80 dark:border-slate-700/80 font-medium cursor-pointer"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {result.isBlankCanvas ? (
            /* Blank Canvas Empty State */
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Enter your income, savings, and target retirement spending to optimize
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Once your household income, annual contributions, and target retirement income are entered, the Monte Carlo engine will evaluate every retirement age across {NUM_TRIALS} market sequences to recommend your ideal retirement age.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveView('inputs');
                  setActiveInputTab('personal');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>Enter Plan Inputs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Control Bar: Confidence Target, Market Volatility & Sensitivity Toggle */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                    {/* Confidence Target */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Success Target:
                      </span>
                      <div className="inline-flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        {CONFIDENCE_OPTIONS.map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setConfidenceTarget(pct)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition cursor-pointer ${
                              confidenceTarget === pct
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volatility Regime */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Market Volatility:
                      </span>
                      <div className="inline-flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex-wrap">
                        {VOLATILITY_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setVolatilityPercent(preset.value)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                              volatilityPercent === preset.value
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {preset.label}{' '}
                            <span className={volatilityPercent === preset.value ? 'text-indigo-100 font-mono' : 'text-slate-400 font-mono'}>
                              ({preset.sub})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sandbox Sensitivity Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSandbox((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer self-start lg:self-auto whitespace-nowrap ${
                      showSandbox || isSandboxActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showSandbox ? 'Hide Sensitivity Levers' : 'Test Savings & Income'}</span>
                  </button>
                </div>

                {/* Plain-English Control Guide */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200/70 dark:border-slate-700/60 pt-2">
                  <strong className="text-slate-700 dark:text-slate-300">Success Target ({confidenceTarget}%)</strong> sets how many of the {NUM_TRIALS} simulated futures must keep your portfolio funded to Age {inputs.lifeExpectancy} (higher % = extra safety cushion, usually a slightly later retirement age).{' '}
                  <strong className="text-slate-700 dark:text-slate-300">Market Volatility ({volatilityPercent}% σ)</strong> controls how sharply investment returns bounce up and down each year.
                </p>
              </div>

              {/* Optional Interactive Sandbox Levers */}
              {showSandbox && (
                <div className="rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-200/80 dark:border-indigo-800/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Sensitivity Sandbox — See how savings rate or target income shifts your ideal retirement age</span>
                    </span>
                    {isSandboxActive && (
                      <button
                        type="button"
                        onClick={handleResetSandbox}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Current Plan</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Savings Rate Sandbox Slider */}
                    <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Household Savings Rate
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {result.effectiveSavingsRatePercent.toFixed(1)}%{' '}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            ({formatCompactCurrency(result.effectiveAnnualSavings)}/yr)
                          </span>
                        </span>
                      </div>
                      <input
                        type="range"
                        inputMode="none"
                        min={0}
                        max={50}
                        step={0.5}
                        disabled={result.householdIncome <= 0}
                        value={Number(result.effectiveSavingsRatePercent.toFixed(1))}
                        onChange={(e) => setCustomSavingsRate(Number(e.target.value))}
                        aria-label="Test Household Savings Rate Percent"
                        className="w-full h-2 rounded-lg cursor-pointer bg-slate-200 dark:bg-slate-700 accent-emerald-600 disabled:opacity-40"
                      />
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        <span>0%</span>
                        <span>Current Plan: {result.baseSavingsRatePercent.toFixed(1)}%</span>
                        <span>50%</span>
                      </div>
                    </div>

                    {/* Target Retirement Income Sandbox Slider */}
                    <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Target Retirement Income (Today&apos;s $)
                        </span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {formatExactCurrency(result.effectiveTargetIncomeToday)}/yr
                        </span>
                      </div>
                      <input
                        type="range"
                        inputMode="none"
                        min={20000}
                        max={incomeSliderMax}
                        step={2000}
                        value={Math.min(incomeSliderMax, Math.max(20000, Math.round(result.effectiveTargetIncomeToday)))}
                        onChange={(e) => setCustomTargetIncome(Number(e.target.value))}
                        aria-label="Test Target Retirement Income"
                        className="w-full h-2 rounded-lg cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                      />
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        <span>$20k</span>
                        <span>Current Plan: {formatCompactCurrency(result.baseTargetIncomeToday)}/yr</span>
                        <span>{formatCompactCurrency(incomeSliderMax)}</span>
                      </div>
                      {customTargetIncome !== null && customTargetIncome !== result.baseTargetIncomeToday && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              updateField('targetRetirementSpendingToday', customTargetIncome);
                              setCustomTargetIncome(null);
                            }}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Apply {formatExactCurrency(customTargetIncome)}/yr to my plan →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Hero Recommendation Banner */}
              <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-800/70 dark:via-slate-900 dark:to-indigo-950/30 border border-slate-200/90 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Suggested Ideal Retirement Age
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${recommendationTone.badge}`}>
                      {result.suggestedAge !== null ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      )}
                      <span>{recommendationTone.headline}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${recommendationTone.heroAccent}`}>
                      {result.suggestedAge !== null ? `Age ${result.suggestedAge}` : `Age ${result.bestAvailableAge}+`}
                    </span>
                    {result.suggestedPlanResult && (
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                        {result.suggestedAge !== null ? (
                          <>
                            <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                              {result.suggestedPlanResult.successRate.toFixed(1)}%
                            </strong>{' '}
                            Monte Carlo success ({result.suggestedPlanResult.successfulTrials}/{result.numTrials} paths funded to Age {inputs.lifeExpectancy})
                          </>
                        ) : (
                          <>
                            Peak success is{' '}
                            <strong className="font-mono text-rose-600 dark:text-rose-400">
                              {result.suggestedPlanResult.successRate.toFixed(1)}%
                            </strong>{' '}
                            at Age {result.bestAvailableAge} — consider boosting savings or trimming target income
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Based on a <strong className="text-slate-700 dark:text-slate-200 font-mono">{result.effectiveSavingsRatePercent.toFixed(1)}%</strong> savings rate ({formatExactCurrency(result.effectiveAnnualSavings)}/yr) and{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatExactCurrency(result.effectiveTargetIncomeToday)}/yr</strong> target retirement spending (in today&apos;s $) with{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">{result.weightedPreReturnPercent.toFixed(1)}%</strong> /{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">{result.weightedPostReturnPercent.toFixed(1)}%</strong> pre/post returns at {result.volatilityPercent}% σ.
                  </p>
                </div>

                {/* Action CTAs */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {result.suggestedAge !== null && (
                    result.suggestedAge === inputs.retirementAge ? (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Already Set to Age {result.suggestedAge}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplySuggestedAge(result.suggestedAge!)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Target className="w-4 h-4" />
                        <span>Apply Age {result.suggestedAge} to Plan</span>
                      </button>
                    )
                  )}

                  {result.extraMonthlySavingsEstimate !== null && !isSandboxActive && (
                    <button
                      type="button"
                      onClick={() => applyMonthlyBoost(result.extraMonthlySavingsEstimate!)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      title={`Add +${formatExactCurrency(result.extraMonthlySavingsEstimate)}/mo in savings to reach ${confidenceTarget}% success at Age ${inputs.retirementAge}`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>+{formatExactCurrency(result.extraMonthlySavingsEstimate)}/mo to keep Age {inputs.retirementAge}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Plain-English Interpretation Card */}
              {plainEnglishSummary && (
                <div className="rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {plainEnglishSummary.title}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {plainEnglishSummary.body}
                    </p>
                    <p className="text-[11.5px] font-medium text-indigo-800 dark:text-indigo-300 leading-relaxed mt-0.5">
                      {plainEnglishSummary.takeaway}
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Key Telemetry KPI Tiles with Plain-English Captions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Your Current Goal (Age {inputs.retirementAge})
                  </span>
                  <span
                    className={`text-xl font-extrabold font-mono mt-1 ${
                      (result.currentPlanResult?.successRate ?? 0) >= confidenceTarget
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : (result.currentPlanResult?.successRate ?? 0) >= 70
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {result.currentPlanResult ? `${result.currentPlanResult.successRate.toFixed(1)}% odds` : '—'}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {result.currentPlanResult
                      ? `Money lasted to Age ${inputs.lifeExpectancy} in ${result.currentPlanResult.successfulTrials} of ${result.numTrials} simulated market lifetimes.`
                      : 'Outside evaluated retirement age range.'}
                  </span>
                </div>

                <div className="rounded-xl p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Typical Nest Egg @ Age {result.suggestedAge ?? result.bestAvailableAge}
                  </span>
                  <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                    {result.suggestedPlanResult
                      ? formatCompactCurrency(result.suggestedPlanResult.medianNestEggAtRetirementReal)
                      : '—'}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Middle (50th percentile) investable savings at retirement, expressed in today&apos;s buying power.
                  </span>
                </div>

                <div className="rounded-xl p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Typical Leftover @ Age {inputs.lifeExpectancy} (P50)
                  </span>
                  <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-50 mt-1">
                    {result.suggestedPlanResult
                      ? formatCompactCurrency(result.suggestedPlanResult.medianTerminalWealthReal)
                      : '—'}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Middle outcome after funding all retirement years. Strong markets (P90):{' '}
                    <strong className="font-mono text-slate-700 dark:text-slate-300">
                      {result.suggestedPlanResult ? formatCompactCurrency(result.suggestedPlanResult.p90TerminalWealthReal) : '—'}
                    </strong>
                    .
                  </span>
                </div>

                <div className="rounded-xl p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Bad-Luck Market Outcome (P10)
                  </span>
                  <span
                    className={`text-xl font-extrabold font-mono mt-1 ${
                      (result.suggestedPlanResult?.p10TerminalWealthReal ?? 0) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {result.suggestedPlanResult
                      ? formatCompactCurrency(result.suggestedPlanResult.p10TerminalWealthReal)
                      : '—'}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Bottom 10% worst simulated markets at Age {inputs.lifeExpectancy} — shows your downside safety buffer.
                  </span>
                </div>
              </div>

              {/* Interactive Visualization Panel */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/30 p-4 flex flex-col gap-3">
                {/* Chart Mode Switcher & Legend */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs self-start">
                    <button
                      type="button"
                      onClick={() => setActiveChartMode('probability')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        activeChartMode === 'probability'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Success Probability by Age</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveChartMode('wealth_cone')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        activeChartMode === 'wealth_cone'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Wealth Fan (P10 / P50 / P90)</span>
                    </button>
                  </div>

                  {activeChartMode === 'probability' ? (
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                        <span>≥{confidenceTarget}% Ideal</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                        <span>70–{confidenceTarget - 1}% Moderate</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />
                        <span>&lt;70% High Risk</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 dark:border-indigo-400 inline-block" />
                        <span>Current Age ({inputs.retirementAge})</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-indigo-500 inline-block" />
                        <span>Median (P50)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/25 inline-block" />
                        <span>P25–P75 Band</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/12 border border-indigo-300/60 dark:border-indigo-700/60 inline-block" />
                        <span>P10–P90 Range</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Plain-English Chart Reading Guide */}
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeChartMode === 'probability' ? (
                    <>
                      <strong className="text-slate-800 dark:text-slate-100">How to read this chart:</strong> Each bar tests retiring at that age across {result.numTrials} randomized market lifetimes. The first green bar that crosses the dashed{' '}
                      <strong className="font-mono text-emerald-700 dark:text-emerald-400">{confidenceTarget}% Target</strong> line is your suggested ideal retirement age. Hover or tap any bar to compare outcomes.
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-800 dark:text-slate-100">How to read this chart:</strong> Shows how your investable savings (in today&apos;s buying power) evolve if you retire at{' '}
                      <strong className="font-mono text-emerald-700 dark:text-emerald-400">Age {result.suggestedAge ?? result.bestAvailableAge}</strong>. The solid middle line (P50) is a typical market, the lower dashed line (P10) is an unlucky downturn scenario, and the upper dashed line (P90) is a strong bull market.
                    </>
                  )}
                </p>

                {activeChartMode === 'probability' ? (
                  /* Chart 1: Interactive Success Probability by Retirement Age */
                  <div className="flex flex-col gap-3">
                    <div className="w-full overflow-x-auto pb-1">
                      <svg
                        viewBox="0 0 760 215"
                        className="w-full min-w-[520px] h-auto select-none"
                        role="img"
                        aria-label="Monte Carlo retirement success probability by candidate retirement age"
                      >
                        {/* Horizontal Grid Lines (0, 25, 50, 75, 100%) */}
                        {[0, 25, 50, 75, 100].map((val) => {
                          const y = 175 - (val / 100) * 145;
                          return (
                            <g key={val}>
                              <line
                                x1={42}
                                x2={746}
                                y1={y}
                                y2={y}
                                className="stroke-slate-200 dark:stroke-slate-800"
                                strokeWidth={1}
                              />
                              <text
                                x={36}
                                y={y + 3.5}
                                textAnchor="end"
                                className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                              >
                                {val}%
                              </text>
                            </g>
                          );
                        })}

                        {/* Confidence Threshold Dashed Reference Line */}
                        {(() => {
                          const ty = 175 - (confidenceTarget / 100) * 145;
                          return (
                            <g>
                              <line
                                x1={42}
                                x2={746}
                                y1={ty}
                                y2={ty}
                                strokeDasharray="5 4"
                                className="stroke-emerald-600 dark:stroke-emerald-400"
                                strokeWidth={1.5}
                              />
                              <rect
                                x={672}
                                y={ty - 17}
                                width={72}
                                height={15}
                                rx={4}
                                className="fill-emerald-600 dark:fill-emerald-500"
                              />
                              <text
                                x={708}
                                y={ty - 6.5}
                                textAnchor="middle"
                                className="fill-white text-[9.5px] font-bold font-mono"
                              >
                                {confidenceTarget}% Target
                              </text>
                            </g>
                          );
                        })()}

                        {/* Candidate Age Bars */}
                        {result.ageCurve.map((pt, idx) => {
                          const count = Math.max(1, result.ageCurve.length);
                          const plotW = 700;
                          const slotW = plotW / count;
                          const barW = Math.min(24, Math.max(8, slotW * 0.64));
                          const cx = 44 + idx * slotW + slotW / 2;
                          const barH = Math.max(2, (pt.successRate / 100) * 145);
                          const barY = 175 - barH;

                          const isSuggested = result.suggestedAge === pt.age;
                          const isCurrent = inputs.retirementAge === pt.age;
                          const isInspected = activeInspectedPoint?.age === pt.age;

                          const fillClass =
                            pt.successRate >= confidenceTarget
                              ? isSuggested
                                ? 'fill-emerald-500 dark:fill-emerald-400'
                                : 'fill-emerald-500/80 dark:fill-emerald-500/75'
                              : pt.successRate >= 70
                              ? 'fill-amber-400 dark:fill-amber-400/85'
                              : 'fill-rose-400 dark:fill-rose-500/80';

                          const showAgeLabel =
                            count <= 16 ||
                            idx % 2 === 0 ||
                            isSuggested ||
                            isCurrent ||
                            idx === count - 1;

                          return (
                            <g
                              key={pt.age}
                              className="cursor-pointer"
                              onMouseEnter={() => setInspectedAge(pt.age)}
                              onClick={() => setInspectedAge(pt.age)}
                            >
                              {/* Invisible hit column for easy hover/tap */}
                              <rect
                                x={cx - slotW / 2}
                                y={20}
                                width={slotW}
                                height={185}
                                fill="transparent"
                              />

                              {/* Subtle highlight backdrop on inspected column */}
                              {isInspected && (
                                <rect
                                  x={cx - slotW / 2 + 1}
                                  y={26}
                                  width={Math.max(4, slotW - 2)}
                                  height={150}
                                  rx={5}
                                  className="fill-indigo-500/10 dark:fill-indigo-400/12"
                                />
                              )}

                              {/* Bar */}
                              <rect
                                x={cx - barW / 2}
                                y={barY}
                                width={barW}
                                height={barH}
                                rx={3.5}
                                className={`${fillClass} transition-all duration-200 ${
                                  isSuggested ? 'stroke-emerald-700 dark:stroke-emerald-200 stroke-[1.5]' : ''
                                }`}
                              />

                              {/* Ideal Age Crown Marker */}
                              {isSuggested && (
                                <g>
                                  <circle
                                    cx={cx}
                                    cy={Math.max(12, barY - 10)}
                                    r={4.5}
                                    className="fill-emerald-600 dark:fill-emerald-400"
                                  />
                                  <text
                                    x={cx}
                                    y={Math.max(11, barY - 18)}
                                    textAnchor="middle"
                                    className="fill-emerald-700 dark:fill-emerald-300 text-[9.5px] font-extrabold font-mono"
                                  >
                                    Ideal
                                  </text>
                                </g>
                              )}

                              {/* Current Plan Age Ring Marker */}
                              {isCurrent && (
                                <circle
                                  cx={cx}
                                  cy={181}
                                  r={3.5}
                                  className="fill-white dark:fill-slate-900 stroke-indigo-600 dark:stroke-indigo-400 stroke-[2]"
                                />
                              )}

                              {/* X-axis Age Label */}
                              {showAgeLabel && (
                                <text
                                  x={cx}
                                  y={201}
                                  textAnchor="middle"
                                  className={`text-[10px] font-mono ${
                                    isSuggested
                                      ? 'fill-emerald-700 dark:fill-emerald-300 font-extrabold'
                                      : isCurrent
                                      ? 'fill-indigo-700 dark:fill-indigo-300 font-bold'
                                      : 'fill-slate-500 dark:fill-slate-400'
                                  }`}
                                >
                                  {pt.age}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Active Bar Inspection Strip */}
                    {activeInspectedPoint && (
                      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-extrabold text-slate-900 dark:text-slate-50 font-mono">
                            Retire @ Age {activeInspectedPoint.age}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            Success:{' '}
                            <strong
                              className={`font-mono ${
                                activeInspectedPoint.successRate >= confidenceTarget
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : activeInspectedPoint.successRate >= 70
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {activeInspectedPoint.successRate.toFixed(1)}%
                            </strong>{' '}
                            <span className="text-slate-400 dark:text-slate-500">
                              ({activeInspectedPoint.successfulTrials}/{activeInspectedPoint.totalTrials})
                            </span>
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            Median Nest Egg:{' '}
                            <strong className="font-mono text-slate-900 dark:text-slate-100">
                              {formatCompactCurrency(activeInspectedPoint.medianNestEggAtRetirementReal)}
                            </strong>
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            P10 / P50 Terminal:{' '}
                            <strong className="font-mono text-slate-900 dark:text-slate-100">
                              {formatCompactCurrency(activeInspectedPoint.p10TerminalWealthReal)} / {formatCompactCurrency(activeInspectedPoint.medianTerminalWealthReal)}
                            </strong>
                          </span>
                          {activeInspectedPoint.medianDepletionAge !== null && activeInspectedPoint.successRate < 100 && (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              Failed paths median depletion: Age {activeInspectedPoint.medianDepletionAge}
                            </span>
                          )}
                        </div>

                        {activeInspectedPoint.age !== inputs.retirementAge && (
                          <button
                            type="button"
                            onClick={() => handleApplySuggestedAge(activeInspectedPoint.age)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-[11px] font-bold transition whitespace-nowrap self-start md:self-auto cursor-pointer shrink-0"
                          >
                            <span>Set Age {activeInspectedPoint.age}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Chart 2: Monte Carlo Wealth Trajectory Cone (P10 / P25 / P50 / P75 / P90) */
                  coneChartGeometry && (
                    <div className="flex flex-col gap-3">
                      <div className="w-full overflow-x-auto pb-1">
                        <svg
                          viewBox={`0 0 ${coneChartGeometry.width} ${coneChartGeometry.height}`}
                          className="w-full min-w-[520px] h-auto select-none"
                          role="img"
                          aria-label={`Monte Carlo liquid portfolio percentile fan chart for retirement at Age ${coneChartGeometry.focusAge}`}
                          onMouseLeave={() => setHoveredConeIndex(null)}
                        >
                          {/* Y-Axis Gridlines */}
                          {coneChartGeometry.yTicks.map((t, i) => (
                            <g key={i}>
                              <line
                                x1={coneChartGeometry.padL}
                                x2={coneChartGeometry.width - coneChartGeometry.padR}
                                y1={t.y}
                                y2={t.y}
                                className="stroke-slate-200 dark:stroke-slate-800"
                                strokeWidth={1}
                              />
                              <text
                                x={coneChartGeometry.padL - 8}
                                y={t.y + 3.5}
                                textAnchor="end"
                                className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                              >
                                {formatCompactCurrency(t.val)}
                              </text>
                            </g>
                          ))}

                          {/* P10 - P90 Outer Confidence Band */}
                          <path
                            d={coneChartGeometry.band10_90}
                            className="fill-indigo-500/12 dark:fill-indigo-400/12"
                          />

                          {/* P25 - P75 Interquartile Band */}
                          <path
                            d={coneChartGeometry.band25_75}
                            className="fill-indigo-500/22 dark:fill-indigo-400/22"
                          />

                          {/* P90 & P10 Boundary Lines */}
                          <path
                            d={coneChartGeometry.lineP90}
                            fill="none"
                            className="stroke-emerald-500/70 dark:stroke-emerald-400/70"
                            strokeWidth={1.25}
                            strokeDasharray="3 3"
                          />
                          <path
                            d={coneChartGeometry.lineP10}
                            fill="none"
                            className="stroke-rose-500/80 dark:stroke-rose-400/80"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                          />

                          {/* Median P50 Line */}
                          <path
                            d={coneChartGeometry.lineP50}
                            fill="none"
                            className="stroke-indigo-600 dark:stroke-indigo-400"
                            strokeWidth={2.5}
                          />

                          {/* Suggested Retirement Age Vertical Marker */}
                          {coneChartGeometry.retireX !== null && (
                            <g>
                              <line
                                x1={coneChartGeometry.retireX}
                                x2={coneChartGeometry.retireX}
                                y1={coneChartGeometry.padT}
                                y2={coneChartGeometry.height - coneChartGeometry.padB}
                                strokeDasharray="4 3"
                                className="stroke-emerald-600 dark:stroke-emerald-400"
                                strokeWidth={1.5}
                              />
                              <rect
                                x={Math.min(coneChartGeometry.width - 96, Math.max(coneChartGeometry.padL, coneChartGeometry.retireX - 38))}
                                y={2}
                                width={76}
                                height={15}
                                rx={4}
                                className="fill-emerald-600 dark:fill-emerald-500"
                              />
                              <text
                                x={Math.min(coneChartGeometry.width - 58, Math.max(coneChartGeometry.padL + 38, coneChartGeometry.retireX))}
                                y={12.5}
                                textAnchor="middle"
                                className="fill-white text-[9.5px] font-bold font-mono"
                              >
                                Retire @ {coneChartGeometry.focusAge}
                              </text>
                            </g>
                          )}

                          {/* Interactive Hover Crosshair */}
                          {hoveredConeIndex !== null && hoveredConePoint && (
                            <g>
                              <line
                                x1={coneChartGeometry.xForIndex(hoveredConeIndex)}
                                x2={coneChartGeometry.xForIndex(hoveredConeIndex)}
                                y1={coneChartGeometry.padT}
                                y2={coneChartGeometry.height - coneChartGeometry.padB}
                                className="stroke-slate-400 dark:stroke-slate-500"
                                strokeWidth={1}
                              />
                              <circle
                                cx={coneChartGeometry.xForIndex(hoveredConeIndex)}
                                cy={coneChartGeometry.yForVal(hoveredConePoint.p50Real)}
                                r={4}
                                className="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900 stroke-[2]"
                              />
                              <circle
                                cx={coneChartGeometry.xForIndex(hoveredConeIndex)}
                                cy={coneChartGeometry.yForVal(hoveredConePoint.p10Real)}
                                r={3.5}
                                className="fill-rose-500 stroke-white dark:stroke-slate-900 stroke-[1.5]"
                              />
                              <circle
                                cx={coneChartGeometry.xForIndex(hoveredConeIndex)}
                                cy={coneChartGeometry.yForVal(hoveredConePoint.p90Real)}
                                r={3.5}
                                className="fill-emerald-500 stroke-white dark:stroke-slate-900 stroke-[1.5]"
                              />
                            </g>
                          )}

                          {/* X-Axis Labels */}
                          {coneChartGeometry.xTicks.map((t) => (
                            <text
                              key={t.age}
                              x={t.x}
                              y={coneChartGeometry.height - 10}
                              textAnchor="middle"
                              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                            >
                              Age {t.age}
                            </text>
                          ))}

                          {/* Hover Hit Slices */}
                          {result.suggestedTrajectory.map((pt, idx) => {
                            const sliceW = coneChartGeometry.plotW / Math.max(1, result.suggestedTrajectory.length - 1);
                            const x = coneChartGeometry.xForIndex(idx) - sliceW / 2;
                            return (
                              <rect
                                key={pt.age}
                                x={Math.max(coneChartGeometry.padL, x)}
                                y={coneChartGeometry.padT}
                                width={Math.max(4, sliceW)}
                                height={coneChartGeometry.plotH}
                                fill="transparent"
                                className="cursor-crosshair"
                                onMouseEnter={() => setHoveredConeIndex(idx)}
                                onClick={() => setHoveredConeIndex(idx)}
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* Wealth Cone Readout Bar */}
                      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {hoveredConePoint ? (
                          <>
                            <span className="font-extrabold font-mono text-slate-900 dark:text-slate-50">
                              Age {hoveredConePoint.age} (Today&apos;s $)
                            </span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                              <span className="text-rose-600 dark:text-rose-400">
                                P10 Stressed: <strong>{formatCompactCurrency(hoveredConePoint.p10Real)}</strong>
                              </span>
                              <span className="text-indigo-600 dark:text-indigo-400">
                                P50 Median: <strong>{formatCompactCurrency(hoveredConePoint.p50Real)}</strong>
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                P90 Upside: <strong>{formatCompactCurrency(hoveredConePoint.p90Real)}</strong>
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            Showing liquid portfolio percentile cone (in today&apos;s $) for retiring at{' '}
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">Age {coneChartGeometry.focusAge}</strong>. Hover or tap along the curve to inspect any age.
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Transparent Step-by-Step "How We Arrived at This Result" Guide */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/35 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMethodology((prev) => !prev)}
                  aria-expanded={showMethodology}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>
                      How we arrived at {result.suggestedAge !== null ? `Age ${result.suggestedAge}` : 'this result'} — Plain-English Breakdown
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    <span>{showMethodology ? 'Hide details' : 'Show details'}</span>
                    {showMethodology ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {showMethodology && (
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-3.5 border-t border-slate-200/70 dark:border-slate-700/60">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* Step 1 */}
                      <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                          1. Your Starting Savings &amp; Contributions
                        </span>
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          We start with your current investable portfolio of{' '}
                          <strong className="font-mono text-slate-900 dark:text-slate-100">
                            {formatExactCurrency(startingLiquidPortfolio)}
                          </strong>{' '}
                          (RRSP, TFSA, FHSA &amp; Non-Registered) and add your{' '}
                          <strong className="font-mono text-slate-900 dark:text-slate-100">
                            {formatExactCurrency(result.effectiveAnnualSavings)}/yr
                          </strong>{' '}
                          savings pace ({result.effectiveSavingsRatePercent.toFixed(1)}% of household income, including any employer match) each working year until retirement.
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                          2. Testing {result.numTrials} Random Market Futures
                        </span>
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          Real markets don&apos;t grow in a straight line. Using a{' '}
                          <strong className="text-slate-900 dark:text-slate-100">Monte Carlo simulation</strong>, we generate {result.numTrials} randomized market lifetimes centered on your expected returns ({result.weightedPreReturnPercent.toFixed(1)}% pre-retirement / {result.weightedPostReturnPercent.toFixed(1)}% retired) with{' '}
                          <strong className="font-mono text-slate-900 dark:text-slate-100">±{result.volatilityPercent}%</strong> annual volatility and inflation swings — capturing the risk of a market crash right as you retire.
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                          3. Canadian Taxes, Pensions &amp; Living Costs
                        </span>
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          Each retirement year deducts your inflation-adjusted target lifestyle (
                          <strong className="font-mono text-slate-900 dark:text-slate-100">
                            {formatExactCurrency(result.effectiveTargetIncomeToday)}/yr
                          </strong>{' '}
                          in today&apos;s dollars), ongoing housing or debt payments, {inputs.province} &amp; federal income taxes, and OAS clawbacks — while crediting CPP (Age {inputs.cppStartAge}), OAS (Age {inputs.oasStartAge}), and any spouse or rental income.
                        </p>
                      </div>

                      {/* Step 4 */}
                      <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                          4. Finding Your Earliest Safe Age
                        </span>
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          We test every candidate retirement age from{' '}
                          <strong className="font-mono text-slate-900 dark:text-slate-100">
                            Age {result.ageCurve[0]?.age ?? inputs.retirementAge}
                          </strong>{' '}
                          to{' '}
                          <strong className="font-mono text-slate-900 dark:text-slate-100">
                            Age {result.ageCurve[result.ageCurve.length - 1]?.age ?? inputs.retirementAge}
                          </strong>{' '}
                          using the exact same {result.numTrials} market sequences. The earliest age where at least{' '}
                          <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                            {confidenceTarget}%
                          </strong>{' '}
                          of futures stay funded all the way to Age {inputs.lifeExpectancy} without depleting your investments is recommended.
                        </p>
                      </div>
                    </div>

                    {/* Quick Plain-English Glossary */}
                    <div className="rounded-xl px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span>Key Terms Explained</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 leading-snug">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-100">Today&apos;s $:</strong> Adjusted for inflation so future balances reflect what money buys today.
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-100">P50 (Typical):</strong> The middle result — half of simulated futures ended higher, half lower.
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-100">P10 (Bad-Luck):</strong> Only 1 in 10 simulated futures performed worse — tests rough markets.
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-100">Liquid Solvency:</strong> Checks that investable accounts last to Age {inputs.lifeExpectancy} without relying on selling your home.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
});

RetirementAgeOptimizer.displayName = 'RetirementAgeOptimizer';
