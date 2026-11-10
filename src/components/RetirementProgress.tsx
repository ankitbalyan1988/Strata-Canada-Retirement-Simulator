import React, { useState, useMemo } from 'react';
import { 
  Gauge, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Wallet, 
  PiggyBank, 
  Sparkles, 
  CheckCircle2, 
  Anchor, 
  Target,
  Zap,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { RetirementInputs, SimulationSummary, YearSimulationResult } from '../types/retirement';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateSavingsPulse, SavingsPulseResult } from '../utils/simulator';

export interface RetirementProgressProps {
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  yearlyResults?: YearSimulationResult[];
}

type ProgressMode = 'readiness' | 'pacing' | 'nestegg';

// Utility for polar to cartesian coordinates
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

// Utility to describe SVG arc path
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const clampedEnd = Math.max(startAngle + 0.05, endAngle);
  const start = polarToCartesian(x, y, radius, clampedEnd);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

const RetirementProgressComponent: React.FC<RetirementProgressProps> = (props) => {
  const storeInputs = useSimulationStore(useShallow((state) => state.inputs));
  const storeSummary = useSimulationStore(useShallow((state) => state.summary));
  const storeOptimisticSummary = useSimulationStore(useShallow((state) => state.optimisticSummary));
  const storeYearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const storePulse = useSimulationStore(useShallow((state) => state.pulse));
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const isSectionCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.progress));

  const inputs = props.inputs ?? storeInputs;
  const summary = props.summary ?? storeOptimisticSummary ?? storeSummary;
  const yearlyResults = props.yearlyResults ?? storeYearlyResults;

  const [activeMode, setActiveMode] = useState<ProgressMode>('readiness');

  const isExpanded = !isSectionCollapsed;

  // Currency formatters
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

  // Primary & Spouse Balances
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;
  const primaryLiquid = (inputs.rrspBalance || 0) + (inputs.tfsaBalance || 0) + (inputs.fhsaBalance || 0) + (inputs.nonRegBalance || 0);
  const spouseLiquid = isCouple && spouse ? (spouse.rrspBalance || 0) + (spouse.tfsaBalance || 0) + (spouse.fhsaBalance || 0) + (spouse.nonRegBalance || 0) : 0;
  const totalCurrentLiquidPortfolio = primaryLiquid + spouseLiquid;

  const isBlankCanvas = (
    (inputs.currentAnnualIncome || 0) === 0 &&
    (inputs.targetRetirementSpendingToday || 0) === 0 &&
    totalCurrentLiquidPortfolio === 0
  );

  const currentAge = inputs.currentAge || 35;
  const retirementAge = inputs.retirementAge || 65;
  const yearsToRetire = Math.max(0, retirementAge - currentAge);

  // Compute Savings Pulse for pacing mode
  const pulse: SavingsPulseResult = useMemo(() => {
    if (storePulse && typeof storePulse.currentMonthlySavings === 'number') return storePulse;
    return calculateSavingsPulse(inputs, summary);
  }, [storePulse, inputs, summary]);

  // Target Nest Egg at retirement
  const targetNestEgg = summary.netWorthAtRetirement || 1;
  const liquidTargetNestEgg = summary.liquidNetWorthAtRetirement || summary.netWorthAtRetirement || 1;

  // 1. Readiness Metric (0 to 100)
  const readinessValue = isBlankCanvas ? 0 : Math.min(100, Math.max(0, summary.readinessScore || 0));

  // 2. Savings Pacing Metric (Current monthly savings vs required)
  const pacingValue = isBlankCanvas ? 0 : pulse.requiredMonthlySavings > 0
    ? Math.min(150, Math.max(0, Math.round((pulse.currentMonthlySavings / pulse.requiredMonthlySavings) * 100)))
    : 100;

  // 3. Nest Egg Accumulated Today (% of projected target at retirement age)
  const nestEggAccumulatedValue = isBlankCanvas ? 0 : targetNestEgg > 0
    ? Math.min(100, Math.max(0, Math.round((totalCurrentLiquidPortfolio / targetNestEgg) * 100)))
    : 0;

  // Current Gauge Selected Value & Configuration
  const currentMetricConfig = useMemo(() => {
    if (activeMode === 'readiness') {
      const val = readinessValue;
      let statusLabel = 'Fully Funded';
      let statusDesc = `All ${summary.totalYearsInRetirement || 20} retirement years covered with zero depletion`;
      let colorClass = 'text-emerald-600 dark:text-emerald-400';
      let strokeColor = '#10b981';
      let strokeColorEnd = '#06b6d4';

      if (isBlankCanvas) {
        statusLabel = 'Fresh Canvas';
        statusDesc = 'Awaiting personal income, accounts, and goal inputs';
        colorClass = 'text-slate-500 dark:text-slate-400';
        strokeColor = '#94a3b8';
        strokeColorEnd = '#64748b';
      } else if (val < 65) {
        statusLabel = 'Shortfall Risk';
        statusDesc = summary.portfolioDepletionAge 
          ? `Assets depleted at Age ${summary.portfolioDepletionAge} (${summary.yearsFunded}/${summary.totalYearsInRetirement} yrs funded)`
          : 'High probability of portfolio exhaustion before life expectancy';
        colorClass = 'text-rose-600 dark:text-rose-400';
        strokeColor = '#f43f5e';
        strokeColorEnd = '#e11d48';
      } else if (val < 85) {
        statusLabel = 'Moderate Progress';
        statusDesc = `${summary.yearsFunded} of ${summary.totalYearsInRetirement} years funded; minor adjustments close gap`;
        colorClass = 'text-amber-600 dark:text-amber-400';
        strokeColor = '#f59e0b';
        strokeColorEnd = '#d97706';
      } else if (val < 100) {
        statusLabel = 'Comfortable Track';
        statusDesc = `Solvent through Age ${summary.portfolioDepletionAge || inputs.lifeExpectancy}`;
        colorClass = 'text-sky-600 dark:text-sky-400';
        strokeColor = '#0284c7';
        strokeColorEnd = '#0ea5e9';
      }

      return {
        value: val,
        displayValue: `${val}%`,
        label: 'Retirement Readiness',
        statusLabel,
        statusDesc,
        colorClass,
        strokeColor,
        strokeColorEnd,
        maxScale: 100,
        subtext: isBlankCanvas ? 'Zero pre-loaded data' : `${summary.yearsFunded}/${summary.totalYearsInRetirement} yrs funded`
      };
    }

    if (activeMode === 'pacing') {
      const val = pacingValue;
      let statusLabel = 'On Track';
      let statusDesc = `${formatCur(pulse.currentMonthlySavings)}/mo matches target pace`;
      let colorClass = 'text-emerald-600 dark:text-emerald-400';
      let strokeColor = '#10b981';
      let strokeColorEnd = '#06b6d4';

      if (isBlankCanvas) {
        statusLabel = 'Fresh Canvas';
        statusDesc = 'Enter monthly contributions to evaluate savings pace';
        colorClass = 'text-slate-500 dark:text-slate-400';
        strokeColor = '#94a3b8';
        strokeColorEnd = '#64748b';
      } else if (val >= 110) {
        statusLabel = 'Ahead of Target';
        statusDesc = `Surplus of ${formatCur(Math.max(0, pulse.currentMonthlySavings - pulse.requiredMonthlySavings))}/mo builds safety buffer`;
        colorClass = 'text-emerald-600 dark:text-emerald-400';
        strokeColor = '#10b981';
        strokeColorEnd = '#14b8a6';
      } else if (val < 70) {
        statusLabel = 'Savings Gap';
        statusDesc = `Monthly shortfall of ${formatCur(pulse.monthlyGap)}/mo detected`;
        colorClass = 'text-rose-600 dark:text-rose-400';
        strokeColor = '#f43f5e';
        strokeColorEnd = '#e11d48';
      } else if (val < 95) {
        statusLabel = 'Moderate Gap';
        statusDesc = `Need ${formatCur(pulse.monthlyGap)}/mo additional savings to stay on track`;
        colorClass = 'text-amber-600 dark:text-amber-400';
        strokeColor = '#f59e0b';
        strokeColorEnd = '#d97706';
      }

      return {
        value: Math.min(100, val),
        displayValue: `${val}%`,
        label: 'Monthly Savings Pacing',
        statusLabel,
        statusDesc,
        colorClass,
        strokeColor,
        strokeColorEnd,
        maxScale: 100,
        subtext: isBlankCanvas ? 'Awaiting contributions' : `${formatCur(pulse.currentMonthlySavings)}/mo vs ${formatCur(pulse.requiredMonthlySavings)}/mo req`
      };
    }

    // activeMode === 'nestegg'
    const val = nestEggAccumulatedValue;
    let statusLabel = 'Accumulating';
    let statusDesc = `${formatCur(totalCurrentLiquidPortfolio)} accumulated toward ${formatCur(targetNestEgg)}`;
    let colorClass = 'text-indigo-600 dark:text-indigo-400';
    let strokeColor = '#6366f1';
    let strokeColorEnd = '#8b5cf6';

    if (isBlankCanvas) {
      statusLabel = 'Fresh Canvas';
      statusDesc = 'Current liquid portfolio is $0';
      colorClass = 'text-slate-500 dark:text-slate-400';
      strokeColor = '#94a3b8';
      strokeColorEnd = '#64748b';
    } else if (val >= 80) {
      statusLabel = 'Near Peak Nest Egg';
      statusDesc = 'Portfolio is near full target terminal capital';
      colorClass = 'text-emerald-600 dark:text-emerald-400';
      strokeColor = '#10b981';
      strokeColorEnd = '#06b6d4';
    } else if (val >= 40) {
      statusLabel = 'Compounding Phase';
      statusDesc = 'Registered accounts are compounding efficiently';
      colorClass = 'text-sky-600 dark:text-sky-400';
      strokeColor = '#0284c7';
      strokeColorEnd = '#6366f1';
    }

    return {
      value: val,
      displayValue: `${val}%`,
      label: 'Nest Egg Accumulated',
      statusLabel,
      statusDesc,
      colorClass,
      strokeColor,
      strokeColorEnd,
      maxScale: 100,
      subtext: isBlankCanvas ? 'Zero wealth baseline' : `${formatCur(totalCurrentLiquidPortfolio)} of ${formatCur(targetNestEgg)} target`
    };
  }, [activeMode, readinessValue, pacingValue, nestEggAccumulatedValue, summary, isBlankCanvas, pulse, inputs, totalCurrentLiquidPortfolio, targetNestEgg]);

  // SVG Gauge Geometry Constants
  // Center: (140, 130), Radius: 90. Arc sweeps 240 degrees from -120 to +120
  const gaugeCenter = { x: 140, y: 130 };
  const gaugeRadius = 90;
  const startAngle = -120;
  const totalSweep = 240;
  const endAngle = startAngle + totalSweep; // +120

  // Clamped ratio (0.0 to 1.0)
  const progressRatio = Math.min(1, Math.max(0, currentMetricConfig.value / currentMetricConfig.maxScale));
  const currentAngle = startAngle + progressRatio * totalSweep;

  // Background and Progress Paths
  const backgroundArc = describeArc(gaugeCenter.x, gaugeCenter.y, gaugeRadius, startAngle, endAngle);
  const progressArc = describeArc(gaugeCenter.x, gaugeCenter.y, gaugeRadius, startAngle, currentAngle);

  // Active needle marker dot coordinate
  const needleMarker = polarToCartesian(gaugeCenter.x, gaugeCenter.y, gaugeRadius, currentAngle);

  // Tick marks
  const tickPercents = [0, 25, 50, 75, 100];
  const ticks = tickPercents.map((pct) => {
    const angle = startAngle + (pct / 100) * totalSweep;
    const outer = polarToCartesian(gaugeCenter.x, gaugeCenter.y, gaugeRadius + 6, angle);
    const inner = polarToCartesian(gaugeCenter.x, gaugeCenter.y, gaugeRadius - 6, angle);
    const textPos = polarToCartesian(gaugeCenter.x, gaugeCenter.y, gaugeRadius - 20, angle);
    return { pct, outer, inner, textPos };
  });

  // Canadian Pension Coverage percentage
  const totalLifetimePensions = summary.lifetimeCppReceived + summary.lifetimeOasReceived;
  const totalRetirementSpend = (summary.averageAnnualRetirementSpendNominal || 1) * (summary.totalYearsInRetirement || 1);
  const pensionCoveragePercent = summary.lifetimeEmploymentIncome > 0 && totalRetirementSpend > 0
    ? Math.min(100, Math.round((totalLifetimePensions / totalRetirementSpend) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col transition duration-200">
      
      {/* Component Header with Segmented View Switch & Collapse Toggle */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 shrink-0">
            <Gauge className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight">
                Retirement Progress & Readiness Today
              </h3>
              {summary.isFullyFunded && !isBlankCanvas && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Fully Funded</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live actuarial gauge tracking longevity survivability, savings velocity, and net worth milestone pacing
            </p>
          </div>
        </div>

        {/* Mode Selector Segmented Controls & Collapse */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveMode('readiness')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeMode === 'readiness'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Readiness Score
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('pacing')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeMode === 'pacing'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Savings Pacing
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('nestegg')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeMode === 'nestegg'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Nest Egg Progress
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggleSectionCollapse('progress')}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label={isExpanded ? 'Collapse progress section' : 'Expand progress section'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="p-5 flex flex-col lg:flex-row items-center gap-6 animate-in fade-in duration-200">
          
          {/* LEFT: Circular Speedometer Gauge */}
          <div className="flex flex-col items-center justify-center shrink-0 w-full lg:w-[310px] bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60">
            <div className="relative w-[280px] h-[200px] flex items-center justify-center">
              <svg
                viewBox="0 0 280 215"
                className="w-full h-full select-none"
                role="progressbar"
                aria-valuenow={currentMetricConfig.value}
                aria-valuemin={0}
                aria-valuemax={currentMetricConfig.maxScale}
                aria-label={currentMetricConfig.label}
              >
                <defs>
                  {/* Dynamic Gradient for the Active Gauge Stroke */}
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={currentMetricConfig.strokeColor} />
                    <stop offset="100%" stopColor={currentMetricConfig.strokeColorEnd} />
                  </linearGradient>

                  {/* Marker Glow Filter */}
                  <filter id="gaugeMarkerGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={currentMetricConfig.strokeColor} floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Background Inactive Track */}
                <path
                  d={backgroundArc}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700/80"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Active Progress Arc */}
                {currentMetricConfig.value > 0 && (
                  <path
                    d={progressArc}
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}

                {/* Dial Ticks */}
                {ticks.map((t) => (
                  <g key={`tick-${t.pct}`}>
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
                      x={t.textPos.x}
                      y={t.textPos.y + 3}
                      textAnchor="middle"
                      className="text-[9.5px] font-mono fill-slate-400 dark:fill-slate-500 font-semibold"
                    >
                      {t.pct}%
                    </text>
                  </g>
                ))}

                {/* Needle Glowing Marker Head */}
                {currentMetricConfig.value > 0 && (
                  <circle
                    cx={needleMarker.x}
                    cy={needleMarker.y}
                    r="8"
                    fill="#ffffff"
                    stroke={currentMetricConfig.strokeColor}
                    strokeWidth="3.5"
                    filter="url(#gaugeMarkerGlow)"
                    className="transition-all duration-700 ease-out"
                  />
                )}

                {/* Center Gauge Reading */}
                <g className="select-none">
                  {/* Big Number */}
                  <text
                    x={gaugeCenter.x}
                    y={gaugeCenter.y - 12}
                    textAnchor="middle"
                    className="font-mono font-extrabold text-3xl sm:text-4xl fill-slate-900 dark:fill-slate-50 tracking-tight"
                  >
                    {currentMetricConfig.displayValue}
                  </text>

                  {/* Status Text Tag */}
                  <text
                    x={gaugeCenter.x}
                    y={gaugeCenter.y + 12}
                    textAnchor="middle"
                    className={`text-xs font-bold ${currentMetricConfig.colorClass}`}
                  >
                    {currentMetricConfig.statusLabel}
                  </text>

                  {/* Subtitle */}
                  <text
                    x={gaugeCenter.x}
                    y={gaugeCenter.y + 28}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {currentMetricConfig.subtext}
                  </text>
                </g>
              </svg>
            </div>

            {/* Concise Gauge Summary Text */}
            <div className="w-full text-center mt-1 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <p className="text-[11.5px] text-slate-600 dark:text-slate-300 font-medium">
                {currentMetricConfig.statusDesc}
              </p>
            </div>
          </div>

          {/* RIGHT: Real-time Metric Breakdown & Milestones Grid */}
          <div className="flex-1 w-full flex flex-col gap-4">
            
            {/* 4 Real-time Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              
              {/* Stat 1: Current Portfolio */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-xs transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Portfolio Today</span>
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="my-1.5">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 tracking-tight">
                    {formatCur(totalCurrentLiquidPortfolio)}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                  Registered: <strong className="text-slate-700 dark:text-slate-200">{formatChip(primaryLiquid + spouseLiquid)}</strong>
                </div>
              </div>

              {/* Stat 2: Target at Retirement */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-xs transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Target Nest Egg (A{retirementAge})</span>
                  <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="my-1.5">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 tracking-tight">
                    {formatCur(targetNestEgg)}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                  Liquid: <strong className="text-slate-700 dark:text-slate-200">{formatChip(liquidTargetNestEgg)}</strong>
                </div>
              </div>

              {/* Stat 3: Longevity Horizon */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-xs transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Longevity Solvency</span>
                  <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="my-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 tracking-tight">
                    {isBlankCanvas ? '0' : summary.yearsFunded}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    / {summary.totalYearsInRetirement || 20} Yrs
                  </span>
                </div>
                <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                  {summary.portfolioDepletionAge 
                    ? <span className="text-rose-600 dark:text-rose-400">Depletes Age {summary.portfolioDepletionAge}</span>
                    : <span className="text-emerald-600 dark:text-emerald-400">Funded to Age {inputs.lifeExpectancy || 85}</span>
                  }
                </div>
              </div>

              {/* Stat 4: Monthly Inflow Pacing */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-xs transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Monthly Savings Pace</span>
                  <PiggyBank className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="my-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 tracking-tight">
                    {formatCur(pulse.currentMonthlySavings)}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">/mo</span>
                </div>
                <div className="text-[10.5px] font-mono flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Req: {formatCur(pulse.requiredMonthlySavings)}/mo</span>
                  <span className={pulse.monthlyGap <= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                    {pulse.monthlyGap <= 0 ? 'On Track' : `-${formatCur(pulse.monthlyGap)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Strategic Milestone Strip */}
            <div className="bg-slate-100/70 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              
              <div className="flex items-center gap-4 flex-wrap">
                {/* Years to Retirement */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-500 dark:text-slate-400">Career Horizon:</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-100">{yearsToRetire} Years to Age {retirementAge}</strong>
                </div>

                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

                {/* Crossover Milestone */}
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Crossover Milestone:</span>
                  {summary.crossoverAge ? (
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">Age {summary.crossoverAge}</strong>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Post-Retirement</span>
                  )}
                </div>

                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

                {/* Coast FIRE */}
                <div className="flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Coast FIRE:</span>
                  {summary.coastFireAge ? (
                    <strong className="font-mono text-sky-600 dark:text-sky-400">Age {summary.coastFireAge}</strong>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Not Reached</span>
                  )}
                </div>
              </div>

              {/* Canadian Pension Safety Net */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 self-start sm:self-auto shrink-0 font-mono">
                <span>CPP + OAS Safety Floor:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">~{pensionCoveragePercent}% of lifetime spend</strong>
              </div>
            </div>

            {/* Contextual Canadian Strategic Recommendation / Pro Tip */}
            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1">
                {isBlankCanvas ? (
                  <p>
                    <strong className="text-slate-800 dark:text-slate-100">Blank Canvas Mode:</strong> Enter your financial profile or select a Canadian pre-filled persona to model CRA tax shelters (RRSP/TFSA/FHSA) and see your real-time readiness score.
                  </p>
                ) : summary.isFullyFunded ? (
                  <p>
                    <strong className="text-emerald-700 dark:text-emerald-400">Plan is 100% Fully Funded:</strong> Your current savings velocity and Canadian tax shelter compounding ensure zero asset depletion through age {inputs.lifeExpectancy || 85}. You can explore early retirement or strategic RRSP meltdown draws between age {retirementAge} and 71 to minimize clawbacks.
                  </p>
                ) : (
                  <p>
                    <strong className="text-amber-700 dark:text-amber-400">Closing the Solvency Gap:</strong> Delaying CPP benefits toward Age 70 provides an inflation-indexed +8.4%/year actuarial boost (+42% maximum increase), or increasing monthly TFSA contributions by {formatCur(Math.max(50, pulse.monthlyGap))} will protect longevity.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveView('inputs')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 shrink-0 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Adjust</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export const RetirementProgress = React.memo(RetirementProgressComponent);
