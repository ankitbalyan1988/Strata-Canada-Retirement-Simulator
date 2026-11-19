import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Info,
  Landmark,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';

type PulseBasis = 'projected' | 'today';
type DisplayPeriod = 'monthly' | 'annual';

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  };
}

function describeSemiArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const safeEnd = Math.max(startAngle + 0.05, endAngle);
  const start = polarToCartesian(cx, cy, radius, safeEnd);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = safeEnd - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArc, 0, end.x, end.y].join(' ');
}

export const RetirementReadinessPulse: React.FC = React.memo(() => {
  const [basis, setBasis] = useState<PulseBasis>('projected');
  const [period, setPeriod] = useState<DisplayPeriod>('monthly');

  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    inflationRate,
    targetRetirementSpendingToday,
    currentAnnualIncome,
    maritalStatus,
    spouseAnnualIncome,
    currentLiquidPortfolio
  } = useSimulationStore(
    useShallow((state) => {
      const inp = state.inputs;
      const isCouple = inp.maritalStatus === 'married' && Boolean(inp.spouse);
      const sp = isCouple ? inp.spouse : undefined;
      const primaryLiquid =
        (inp.rrspBalance || 0) +
        (inp.tfsaBalance || 0) +
        (inp.fhsaBalance || 0) +
        (inp.nonRegBalance || 0);
      const spouseLiquid = sp
        ? (sp.rrspBalance || 0) +
          (sp.tfsaBalance || 0) +
          (sp.fhsaBalance || 0) +
          (sp.nonRegBalance || 0)
        : 0;

      return {
        currentAge: inp.currentAge,
        retirementAge: inp.retirementAge,
        lifeExpectancy: inp.lifeExpectancy,
        inflationRate: inp.inflationRate ?? 2.1,
        targetRetirementSpendingToday: inp.targetRetirementSpendingToday || 0,
        currentAnnualIncome: inp.currentAnnualIncome || 0,
        maritalStatus: inp.maritalStatus,
        spouseAnnualIncome: sp?.annualIncome || 0,
        currentLiquidPortfolio: primaryLiquid + spouseLiquid
      };
    })
  );

  const summary = useSimulationStore(useShallow((state) => state.optimisticSummary ?? state.summary));
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const setActiveInputTab = useSimulationStore((state) => state.setActiveInputTab);

  const metrics = useMemo(() => {
    const isCouple = maritalStatus === 'married';
    const totalHouseholdIncome = currentAnnualIncome + (isCouple ? spouseAnnualIncome : 0);
    const isBlankCanvas =
      totalHouseholdIncome === 0 &&
      targetRetirementSpendingToday === 0 &&
      currentLiquidPortfolio === 0;

    const retiredYears = yearlyResults.filter((r) => r.isRetired);
    const retirementYearsCount = Math.max(1, retiredYears.length || summary.totalYearsInRetirement || 1);

    let sumTargetOutflowsToday = 0;
    let sumFundedOutflowsToday = 0;
    let sumShortfallToday = 0;
    let sumPensionToday = 0;
    let sumPortfolioDrawToday = 0;
    let sumOtherIncomeToday = 0;

    retiredYears.forEach((r) => {
      const inf = Math.pow(1 + inflationRate / 100, Math.max(0, r.year - 1));
      const yearOutflowNominal = Math.max(0, r.targetSpendingNominal + (r.debtPayment || 0));
      const yearShortfallNominal = Math.max(0, r.cashflowGap || 0);
      const yearFundedNominal = Math.max(0, yearOutflowNominal - yearShortfallNominal);

      const cppOasNominal = Math.max(0, (r.cppIncome || 0) + (r.oasNetIncome || 0));
      const drawNominal = Math.max(0, r.totalWithdrawals || 0);
      const otherNominal = Math.max(
        0,
        (!r.isSpouseRetired ? r.spouseEmploymentIncome || 0 : 0) + (r.rentalIncomeThisYear || 0)
      );

      const grossSourcesNominal = cppOasNominal + drawNominal + otherNominal;
      let yearPensionFunded = 0;
      let yearPortfolioFunded = 0;
      let yearOtherFunded = 0;

      if (grossSourcesNominal > 0 && yearFundedNominal > 0) {
        // Attribute funded spending proportionally across active retirement cashflow sources
        yearPensionFunded = (cppOasNominal / grossSourcesNominal) * yearFundedNominal;
        yearPortfolioFunded = (drawNominal / grossSourcesNominal) * yearFundedNominal;
        yearOtherFunded = (otherNominal / grossSourcesNominal) * yearFundedNominal;
      }

      sumTargetOutflowsToday += yearOutflowNominal / inf;
      sumFundedOutflowsToday += yearFundedNominal / inf;
      sumShortfallToday += yearShortfallNominal / inf;
      sumPensionToday += yearPensionFunded / inf;
      sumPortfolioDrawToday += yearPortfolioFunded / inf;
      sumOtherIncomeToday += yearOtherFunded / inf;
    });

    const avgOutflowTargetToday =
      retiredYears.length > 0 ? sumTargetOutflowsToday / retiredYears.length : targetRetirementSpendingToday;
    const effectiveTargetAnnualToday =
      targetRetirementSpendingToday > 0 ? targetRetirementSpendingToday : avgOutflowTargetToday;

    const avgFundedAnnualToday =
      retiredYears.length > 0 ? sumFundedOutflowsToday / retiredYears.length : 0;
    const avgShortfallAnnualToday =
      retiredYears.length > 0 ? sumShortfallToday / retiredYears.length : 0;
    const avgPensionAnnualToday =
      retiredYears.length > 0 ? sumPensionToday / retiredYears.length : 0;
    const avgPortfolioDrawAnnualToday =
      retiredYears.length > 0 ? sumPortfolioDrawToday / retiredYears.length : 0;
    const avgOtherAnnualToday =
      retiredYears.length > 0 ? sumOtherIncomeToday / retiredYears.length : 0;

    // Terminal liquid surplus capacity (conservative sustainable annual headroom above target)
    const lastResult = yearlyResults[yearlyResults.length - 1];
    let annualSurplusBufferToday = 0;
    if (lastResult && avgShortfallAnnualToday <= 1) {
      const endInf = Math.pow(1 + inflationRate / 100, Math.max(0, lastResult.year - 1));
      const endLiquidToday =
        ((lastResult.rrspBalance || 0) +
          (lastResult.rrifBalance || 0) +
          (lastResult.tfsaBalance || 0) +
          (lastResult.fhsaBalance || 0) +
          (lastResult.nonRegBalance || 0)) /
        endInf;
      // Discount 25% for blended tax drag on RRIF/Non-Reg terminal draws and spread over retirement horizon
      annualSurplusBufferToday = Math.max(0, (endLiquidToday * 0.75) / retirementYearsCount);
    }

    const projectedCoverageRatioPct =
      avgOutflowTargetToday > 0 && !isBlankCanvas
        ? Math.min(100, Math.round((avgFundedAnnualToday / avgOutflowTargetToday) * 100))
        : 0;

    const surplusBufferPct =
      avgOutflowTargetToday > 0 && annualSurplusBufferToday > 0 && projectedCoverageRatioPct >= 100
        ? Math.round((annualSurplusBufferToday / avgOutflowTargetToday) * 100)
        : 0;

    // Baseline Today (Earned Income Floor): 4% safe withdrawal on current savings + projected CPP/OAS floor
    const todaySafePortfolioIncomeAnnual = currentLiquidPortfolio * 0.04;
    const todayEarnedFloorAnnual = todaySafePortfolioIncomeAnnual + avgPensionAnnualToday;
    const todayCoverageRatioPct =
      effectiveTargetAnnualToday > 0 && !isBlankCanvas
        ? Math.round((todayEarnedFloorAnnual / effectiveTargetAnnualToday) * 100)
        : 0;

    const activeCoveragePct =
      basis === 'projected'
        ? projectedCoverageRatioPct
        : Math.min(200, Math.max(0, todayCoverageRatioPct));

    const gaugeFillPct = Math.min(100, Math.max(0, activeCoveragePct));

    const activeDeliveredAnnual =
      basis === 'projected' ? avgFundedAnnualToday : todayEarnedFloorAnnual;
    const activeTargetAnnual =
      basis === 'projected' ? avgOutflowTargetToday : effectiveTargetAnnualToday;

    const activeDeltaAnnual =
      basis === 'projected'
        ? avgShortfallAnnualToday > 1
          ? -avgShortfallAnnualToday
          : annualSurplusBufferToday
        : todayEarnedFloorAnnual - effectiveTargetAnnualToday;

    // Year-1 at retirement snapshot (in today's $)
    const firstRetiredYear = retiredYears[0];
    let year1IncomeToday = 0;
    if (firstRetiredYear) {
      const y1Inf = Math.pow(1 + inflationRate / 100, Math.max(0, firstRetiredYear.year - 1));
      const y1Outflow = Math.max(0, firstRetiredYear.targetSpendingNominal + (firstRetiredYear.debtPayment || 0));
      year1IncomeToday = Math.max(0, y1Outflow - (firstRetiredYear.cashflowGap || 0)) / y1Inf;
    }

    const pensionSharePct =
      activeTargetAnnual > 0 ? Math.min(100, (avgPensionAnnualToday / activeTargetAnnual) * 100) : 0;
    const portfolioSharePct =
      activeTargetAnnual > 0
        ? Math.min(
            Math.max(0, 100 - pensionSharePct),
            ((basis === 'projected' ? avgPortfolioDrawAnnualToday : todaySafePortfolioIncomeAnnual) /
              activeTargetAnnual) *
              100
          )
        : 0;
    const otherSharePct =
      basis === 'projected' && activeTargetAnnual > 0
        ? Math.min(Math.max(0, 100 - pensionSharePct - portfolioSharePct), (avgOtherAnnualToday / activeTargetAnnual) * 100)
        : 0;
    const gapSharePct = Math.max(0, 100 - pensionSharePct - portfolioSharePct - otherSharePct);

    return {
      isBlankCanvas,
      isCouple,
      effectiveTargetAnnualToday,
      avgOutflowTargetToday,
      avgFundedAnnualToday,
      avgShortfallAnnualToday,
      annualSurplusBufferToday,
      surplusBufferPct,
      avgPensionAnnualToday,
      avgPortfolioDrawAnnualToday,
      avgOtherAnnualToday,
      todaySafePortfolioIncomeAnnual,
      todayEarnedFloorAnnual,
      projectedCoverageRatioPct,
      todayCoverageRatioPct,
      activeCoveragePct,
      gaugeFillPct,
      activeDeliveredAnnual,
      activeTargetAnnual,
      activeDeltaAnnual,
      year1IncomeToday,
      pensionSharePct,
      portfolioSharePct,
      otherSharePct,
      gapSharePct
    };
  }, [
    basis,
    maritalStatus,
    currentAnnualIncome,
    spouseAnnualIncome,
    targetRetirementSpendingToday,
    currentLiquidPortfolio,
    yearlyResults,
    summary.totalYearsInRetirement,
    inflationRate
  ]);

  const divisor = period === 'monthly' ? 12 : 1;
  const periodSuffix = period === 'monthly' ? '/mo' : '/yr';

  const formatVal = (annualVal: number) => `$${Math.round(annualVal / divisor).toLocaleString()}`;
  const formatCompact = (annualVal: number) => {
    const val = annualVal / divisor;
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (period === 'annual' && Math.abs(val) >= 10_000) {
      return `$${(val / 1000).toFixed(1)}k`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Visual theme tone based on gauge coverage percentage
  const statusConfig = useMemo(() => {
    if (metrics.isBlankCanvas || metrics.activeTargetAnnual <= 0) {
      return {
        label: 'Awaiting Income Target',
        subLabel: 'Enter target retirement spending & accounts to compute pulse',
        badgeClass:
          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dotClass: 'bg-slate-400',
        textClass: 'text-slate-500 dark:text-slate-400',
        strokeStart: '#94a3b8',
        strokeEnd: '#64748b'
      };
    }

    if (metrics.activeCoveragePct >= 100) {
      return {
        label: metrics.surplusBufferPct > 0 && basis === 'projected'
          ? `100% Target Met (+${metrics.surplusBufferPct}% Buffer)`
          : '100% Income Target Met',
        subLabel:
          basis === 'projected'
            ? `Every retirement year through Age ${lifeExpectancy} is fully funded`
            : 'Current portfolio + CPP/OAS already covers your full spending goal',
        badgeClass:
          'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/20',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        strokeStart: '#10b981',
        strokeEnd: '#14b8a6'
      };
    }

    if (metrics.activeCoveragePct >= 80) {
      return {
        label: 'Close to Target',
        subLabel:
          basis === 'projected'
            ? `Within ${100 - metrics.activeCoveragePct}% of full lifetime income replacement`
            : `${metrics.activeCoveragePct}% of income goal already secured today`,
        badgeClass:
          'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-500/20',
        dotClass: 'bg-sky-500',
        textClass: 'text-sky-600 dark:text-sky-400',
        strokeStart: '#0284c7',
        strokeEnd: '#6366f1'
      };
    }

    if (metrics.activeCoveragePct >= 55) {
      return {
        label: basis === 'projected' ? 'Moderate Income Gap' : 'Building Base Floor',
        subLabel:
          basis === 'projected'
            ? summary.portfolioDepletionAge
              ? `Portfolio depletes at Age ${summary.portfolioDepletionAge}; pensions carry remaining years`
              : 'Additional savings or pension deferral strengthens late-retirement coverage'
            : `Existing savings + projected pensions cover ${metrics.activeCoveragePct}% of target`,
        badgeClass:
          'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/20',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
        strokeStart: '#f59e0b',
        strokeEnd: '#ea580c'
      };
    }

    return {
      label: basis === 'projected' ? 'Significant Income Gap' : 'Early Accumulation',
      subLabel:
        basis === 'projected'
          ? `Current inputs fund ${metrics.activeCoveragePct}% of your target retirement lifestyle`
          : `Today's baseline covers ${metrics.activeCoveragePct}% — ongoing savings bridge the rest`,
      badgeClass:
        'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/20',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-600 dark:text-rose-400',
      strokeStart: '#f43f5e',
      strokeEnd: '#e11d48'
    };
  }, [metrics, basis, lifeExpectancy, summary.portfolioDepletionAge]);

  // 180° Semi-Circular Gauge Geometry (-90° left to +90° right)
  const cx = 140;
  const cy = 132;
  const radius = 98;
  const startAngle = -90;
  const sweep = 180;
  const endAngle = 90;
  const currentAngle = startAngle + (metrics.gaugeFillPct / 100) * sweep;

  const trackArc = describeSemiArc(cx, cy, radius, startAngle, endAngle);
  const activeArc = describeSemiArc(cx, cy, radius, startAngle, currentAngle);
  const pointerPos = polarToCartesian(cx, cy, radius, currentAngle);

  const gaugeTicks = [0, 25, 50, 75, 100].map((pct) => {
    const angle = startAngle + (pct / 100) * sweep;
    return {
      pct,
      outer: polarToCartesian(cx, cy, radius + 7, angle),
      inner: polarToCartesian(cx, cy, radius - 7, angle),
      label: polarToCartesian(cx, cy, radius - 22, angle)
    };
  });

  return (
    <section
      aria-label="Retirement Readiness Pulse"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col transition-colors duration-200"
    >
      {/* Header Strip */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              {!metrics.isBlankCanvas && (
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.dotClass}`}
                />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusConfig.dotClass}`} />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                Retirement Readiness Pulse
              </h3>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
              >
                {metrics.isBlankCanvas ? (
                  <Info className="w-3 h-3" />
                ) : metrics.activeCoveragePct >= 100 ? (
                  <ShieldCheck className="w-3 h-3" />
                ) : metrics.activeCoveragePct >= 80 ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                <span>{statusConfig.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {statusConfig.subLabel}
            </p>
          </div>
        </div>

        {/* Interactive Mode & Period Switchers */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setBasis('projected')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                basis === 'projected'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Full retirement income coverage based on your ongoing contributions through retirement"
            >
              Projected Plan
            </button>
            <button
              type="button"
              onClick={() => setBasis('today')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                basis === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Income target covered today by existing savings (4% safe draw) plus projected CPP & OAS"
            >
              Ready Today
            </button>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                period === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('annual')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                period === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Annual
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Income Progress Gauge + Income Target Breakdown */}
      <div className="p-5 flex flex-col lg:flex-row items-stretch gap-6">
        {/* LEFT: Semi-Circular Income Target Progress Gauge */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full lg:w-[310px] bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60">
          <div className="relative w-full max-w-[280px] aspect-[280/168] flex items-center justify-center">
            <svg
              viewBox="0 0 280 168"
              className="w-full h-full select-none overflow-visible"
              role="progressbar"
              aria-valuenow={Math.min(100, Math.max(0, metrics.activeCoveragePct))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Retirement income target coverage: ${metrics.activeCoveragePct}%`}
            >
              <defs>
                <linearGradient id="readinessPulseGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={statusConfig.strokeStart} />
                  <stop offset="100%" stopColor={statusConfig.strokeEnd} />
                </linearGradient>
                <filter id="readinessPulseGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow
                    dx="0"
                    dy="1"
                    stdDeviation="2.5"
                    floodColor={statusConfig.strokeStart}
                    floodOpacity="0.45"
                  />
                </filter>
              </defs>

              {/* Background Semi-Circle Track */}
              <path
                d={trackArc}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700/80"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Active Income Progress Arc */}
              {metrics.gaugeFillPct > 0 && (
                <path
                  d={activeArc}
                  fill="none"
                  stroke="url(#readinessPulseGaugeGrad)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              )}

              {/* Scale Ticks */}
              {gaugeTicks.map((t) => (
                <g key={t.pct}>
                  <line
                    x1={t.inner.x}
                    y1={t.inner.y}
                    x2={t.outer.x}
                    y2={t.outer.y}
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-600"
                    strokeWidth="1.5"
                  />
                  <text
                    x={t.label.x}
                    y={t.label.y + 3}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500 font-semibold"
                  >
                    {t.pct}%
                  </text>
                </g>
              ))}

              {/* Pointer Dot */}
              {metrics.gaugeFillPct > 0 && (
                <circle
                  cx={pointerPos.x}
                  cy={pointerPos.y}
                  r="7.5"
                  fill="#ffffff"
                  stroke={statusConfig.strokeStart}
                  strokeWidth="3.5"
                  filter="url(#readinessPulseGlow)"
                  className="transition-all duration-700 ease-out"
                />
              )}

              {/* Center Gauge Readout */}
              <g className="select-none">
                <text
                  x={cx}
                  y={cy - 22}
                  textAnchor="middle"
                  className="font-mono font-extrabold text-3xl sm:text-4xl fill-slate-900 dark:fill-slate-50 tracking-tight"
                >
                  {metrics.isBlankCanvas ? '0%' : `${metrics.activeCoveragePct}%`}
                </text>
                <text
                  x={cx}
                  y={cy - 3}
                  textAnchor="middle"
                  className={`text-[11px] font-bold ${statusConfig.textClass}`}
                >
                  {basis === 'projected' ? 'of Income Target Funded' : 'of Target Built Today'}
                </text>
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-medium fill-slate-500 dark:fill-slate-400"
                >
                  {metrics.isBlankCanvas
                    ? 'No spending target set'
                    : `${formatCompact(metrics.activeDeliveredAnnual)}${periodSuffix} vs ${formatCompact(metrics.activeTargetAnnual)}${periodSuffix}`}
                </text>
              </g>
            </svg>
          </div>

          <div className="w-full pt-2 mt-1 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono">
            <span>Retirement Horizon:</span>
            <strong className="text-slate-900 dark:text-slate-100">
              Age {retirementAge} → {lifeExpectancy}
            </strong>
          </div>
        </div>

        {/* RIGHT: Target vs Funded Income Metrics & Income Pillar Mix */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
          {/* 3 Highlight Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Income */}
            <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Income Target
                </span>
                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span className="font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 tracking-tight">
                  {formatVal(metrics.activeTargetAnnual)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {periodSuffix}
                </span>
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                Lifestyle goal in today&apos;s $ ({formatVal(metrics.effectiveTargetAnnualToday)}
                {periodSuffix})
              </div>
            </div>

            {/* Funded / Earned Income */}
            <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {basis === 'projected' ? 'Projected Funded' : 'Earned Floor Today'}
                </span>
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span className="font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 tracking-tight">
                  {formatVal(metrics.activeDeliveredAnnual)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {periodSuffix}
                </span>
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                {basis === 'projected'
                  ? `Year 1 @ A${retirementAge}: ${formatCompact(metrics.year1IncomeToday)}${periodSuffix}`
                  : `4% draw (${formatCompact(metrics.todaySafePortfolioIncomeAnnual)}) + CPP/OAS`}
              </div>
            </div>

            {/* Surplus Buffer or Shortfall Delta */}
            <div
              className={`rounded-xl p-3.5 border flex flex-col justify-between ${
                metrics.isBlankCanvas
                  ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/70'
                  : metrics.activeDeltaAnnual >= 0
                  ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20'
                  : 'bg-rose-50/50 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {metrics.activeDeltaAnnual >= 0 ? 'Sustainable Cushion' : 'Income Gap'}
                </span>
                <TrendingUp
                  className={`w-3.5 h-3.5 ${
                    metrics.isBlankCanvas
                      ? 'text-slate-400'
                      : metrics.activeDeltaAnnual >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span
                  className={`font-mono font-extrabold text-xl sm:text-2xl tracking-tight ${
                    metrics.isBlankCanvas
                      ? 'text-slate-500 dark:text-slate-400'
                      : metrics.activeDeltaAnnual >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {metrics.isBlankCanvas
                    ? '$0'
                    : `${metrics.activeDeltaAnnual >= 0 ? '+' : '-'}${formatVal(Math.abs(metrics.activeDeltaAnnual))}`}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {periodSuffix}
                </span>
              </div>
              <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                {metrics.isBlankCanvas
                  ? 'Set target to measure delta'
                  : metrics.activeDeltaAnnual >= 0
                  ? basis === 'projected'
                    ? 'After-tax headroom above goal'
                    : 'Current assets exceed goal'
                  : basis === 'projected'
                  ? 'Avg uncovered retirement gap'
                  : 'Gap left for ongoing savings'}
              </div>
            </div>
          </div>

          {/* Stacked Income Target Fulfillment Bar */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>How Your Retirement Income Target Is Funded</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {metrics.isBlankCanvas
                  ? '0% allocated'
                  : `${Math.round(metrics.pensionSharePct + metrics.portfolioSharePct + metrics.otherSharePct)}% covered`}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200/70 dark:border-slate-700/70">
              {metrics.pensionSharePct > 0 && (
                <div
                  style={{ width: `${metrics.pensionSharePct}%` }}
                  className="h-full bg-blue-500 transition-all duration-500"
                  title={`CPP & OAS Pensions: ${Math.round(metrics.pensionSharePct)}%`}
                />
              )}
              {metrics.portfolioSharePct > 0 && (
                <div
                  style={{ width: `${metrics.portfolioSharePct}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500"
                  title={`Portfolio Drawdowns: ${Math.round(metrics.portfolioSharePct)}%`}
                />
              )}
              {metrics.otherSharePct > 0 && (
                <div
                  style={{ width: `${metrics.otherSharePct}%` }}
                  className="h-full bg-purple-500 transition-all duration-500"
                  title={`Rental / Working Spouse: ${Math.round(metrics.otherSharePct)}%`}
                />
              )}
              {!metrics.isBlankCanvas && metrics.gapSharePct > 0.5 && (
                <div
                  style={{ width: `${metrics.gapSharePct}%` }}
                  className="h-full bg-rose-400/45 dark:bg-rose-500/40 transition-all duration-500"
                  title={`Uncovered Gap: ${Math.round(metrics.gapSharePct)}%`}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>
                  CPP &amp; OAS: <strong>{formatVal(metrics.avgPensionAnnualToday)}{periodSuffix}</strong> ({Math.round(metrics.pensionSharePct)}%)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Portfolio: <strong>{formatVal(basis === 'projected' ? metrics.avgPortfolioDrawAnnualToday : metrics.todaySafePortfolioIncomeAnnual)}{periodSuffix}</strong> ({Math.round(metrics.portfolioSharePct)}%)
                </span>
              </span>
              {metrics.otherSharePct > 0.5 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>
                    Rental/Spouse: <strong>{formatVal(metrics.avgOtherAnnualToday)}{periodSuffix}</strong> ({Math.round(metrics.otherSharePct)}%)
                  </span>
                </span>
              )}
              {!metrics.isBlankCanvas && metrics.gapSharePct > 0.5 && (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>
                    Gap: <strong>{Math.round(metrics.gapSharePct)}%</strong>
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Contextual Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs bg-white dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span>
                {metrics.isBlankCanvas ? (
                  <>Set your desired retirement spending and portfolio balances to track your income readiness gauge.</>
                ) : metrics.projectedCoverageRatioPct >= 100 ? (
                  <>
                    Based on current inputs ({Math.max(0, retirementAge - currentAge)} yrs to retirement), your household meets <strong>100%</strong> of its {formatVal(metrics.effectiveTargetAnnualToday)}{periodSuffix} target—and has already built <strong>{metrics.todayCoverageRatioPct}%</strong> today.
                  </>
                ) : (
                  <>
                    Boosting monthly savings, adjusting your retirement age, or deferring CPP/OAS toward Age 70 helps close the remaining <strong>{100 - metrics.projectedCoverageRatioPct}%</strong> income gap.
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveView('inputs');
                  setActiveInputTab(metrics.projectedCoverageRatioPct < 100 ? 'pensions' : 'expenses');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition cursor-pointer whitespace-nowrap"
              >
                <Landmark className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{metrics.projectedCoverageRatioPct < 100 ? 'Tune CPP & Savings' : 'Edit Spending Target'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

RetirementReadinessPulse.displayName = 'RetirementReadinessPulse';
