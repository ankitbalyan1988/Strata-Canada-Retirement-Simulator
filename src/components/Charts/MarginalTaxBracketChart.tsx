import React, { useState, useMemo, useCallback } from 'react';
import { YearSimulationResult, CanadianProvince } from '../../types/retirement';
import {
  Percent,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  DollarSign,
  Calendar,
  Info
} from 'lucide-react';

interface MarginalTaxBracketChartProps {
  yearlyResults: YearSimulationResult[];
  retirementAge: number;
  province?: CanadianProvince;
  isCouple?: boolean;
}

export const MarginalTaxBracketChart: React.FC<MarginalTaxBracketChartProps> = ({
  yearlyResults,
  retirementAge,
  province = 'ON',
  isCouple = false
}) => {
  const [hoveredAge, setHoveredAge] = useState<number | null>(null);
  const [showEffectiveRate, setShowEffectiveRate] = useState<boolean>(true);
  const [highTaxThreshold, setHighTaxThreshold] = useState<number>(40); // 40% default high-tax mark
  const [timeframe, setTimeframe] = useState<'all' | 'retirement'>('all');

  // Filtered dataset based on timeframe toggle
  const chartData = useMemo(() => {
    if (!yearlyResults || yearlyResults.length === 0) return [];
    if (timeframe === 'retirement') {
      const retiredOnly = yearlyResults.filter((y) => y.isRetired);
      return retiredOnly.length > 0 ? retiredOnly : yearlyResults;
    }
    return yearlyResults;
  }, [yearlyResults, timeframe]);

  // Overall statistics and tax spikes
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        peakRate: 0,
        peakAge: 0,
        peakTaxableIncome: 0,
        peakYear: 0,
        minRate: 0,
        minAge: 0,
        highTaxYearsCount: 0,
        hasOasClawback: false,
        totalOasClawback: 0,
        avgRetirementMarginal: 0,
        meltdownWindowYears: [] as number[],
        rrifSpikeAge: null as number | null
      };
    }

    let peakRate = 0;
    let peakAge = chartData[0].age;
    let peakTaxableIncome = 0;
    let peakYear = chartData[0].year;
    let minRate = 1.0;
    let minAge = chartData[0].age;
    let highTaxCount = 0;
    let totalClawback = 0;
    let retiredMarginalSum = 0;
    let retiredCount = 0;

    chartData.forEach((d) => {
      if (d.marginalTaxRate > peakRate) {
        peakRate = d.marginalTaxRate;
        peakAge = d.age;
        peakTaxableIncome = d.taxableIncome;
        peakYear = d.year;
      }
      if (d.isRetired && d.marginalTaxRate < minRate) {
        minRate = d.marginalTaxRate;
        minAge = d.age;
      }
      if (d.marginalTaxRate * 100 >= highTaxThreshold) {
        highTaxCount++;
      }
      if (d.oasClawback > 0) {
        totalClawback += d.oasClawback;
      }
      if (d.isRetired) {
        retiredMarginalSum += d.marginalTaxRate;
        retiredCount++;
      }
    });

    // Check for RRIF spike around age 71-73
    const pre71 = chartData.find((d) => d.age === 70);
    const post71 = chartData.find((d) => d.age === 72 || d.age === 73);
    let rrifSpikeAge: number | null = null;
    if (pre71 && post71 && post71.marginalTaxRate > pre71.marginalTaxRate + 0.05) {
      rrifSpikeAge = 72;
    }

    // Identify low-tax window between retirement age and age 71 where early RRSP meltdown can occur
    const meltdownWindowYears = chartData
      .filter((d) => d.isRetired && d.age < 71 && d.marginalTaxRate * 100 < 35)
      .map((d) => d.age);

    return {
      peakRate,
      peakAge,
      peakTaxableIncome,
      peakYear,
      minRate: minRate === 1.0 ? 0 : minRate,
      minAge,
      highTaxYearsCount: highTaxCount,
      hasOasClawback: totalClawback > 0,
      totalOasClawback: totalClawback,
      avgRetirementMarginal: retiredCount > 0 ? retiredMarginalSum / retiredCount : 0,
      meltdownWindowYears,
      rrifSpikeAge
    };
  }, [chartData, highTaxThreshold]);

  // Chart Dimensions & Scales
  const svgWidth = 860;
  const svgHeight = 355;
  const padding = { top: 56, right: 30, bottom: 45, left: 65 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Max Y domain for tax rate: 60%
  const yDomainMax = 60; // 0% to 60%

  const minAge = chartData[0]?.age ?? retirementAge;
  const maxAge = chartData[chartData.length - 1]?.age ?? retirementAge;
  const ageSpan = Math.max(1, maxAge - minAge);

  const getX = useCallback(
    (age: number) => padding.left + ((age - minAge) / ageSpan) * chartWidth,
    [minAge, ageSpan, chartWidth, padding.left]
  );

  const getY = useCallback(
    (ratePct: number) => {
      const clamped = Math.max(0, Math.min(yDomainMax, ratePct));
      return padding.top + chartHeight - (clamped / yDomainMax) * chartHeight;
    },
    [yDomainMax, chartHeight, padding.top]
  );

  // SVG Area & Line Paths
  const marginalLinePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.age).toFixed(1)} ${getY(d.marginalTaxRate * 100).toFixed(1)}`)
      .join(' ');
  }, [chartData, getX, getY]);

  const marginalAreaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const points = chartData.map((d) => `${getX(d.age).toFixed(1)} ${getY(d.marginalTaxRate * 100).toFixed(1)}`).join(' L ');
    const firstX = getX(chartData[0].age).toFixed(1);
    const lastX = getX(chartData[chartData.length - 1].age).toFixed(1);
    const baseY = (padding.top + chartHeight).toFixed(1);
    return `M ${firstX} ${baseY} L ${points} L ${lastX} ${baseY} Z`;
  }, [chartData, getX, getY, chartHeight, padding.top]);

  const effectiveLinePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.age).toFixed(1)} ${getY(d.effectiveTaxRate * 100).toFixed(1)}`)
      .join(' ');
  }, [chartData, getX, getY]);

  // High-tax boundary Y position
  const highTaxY = getY(highTaxThreshold);

  // Hovered item data
  const hoveredItem = useMemo(() => {
    if (hoveredAge === null) return null;
    return chartData.find((d) => d.age === hoveredAge) ?? null;
  }, [hoveredAge, chartData]);

  // Raw Milestone points on chart
  const milestones = useMemo(() => {
    const list: { age: number; label: string; color: string; sublabel?: string }[] = [];
    if (minAge <= retirementAge && retirementAge <= maxAge) {
      const label = retirementAge === 71 
        ? 'Age 71 (Retire + RRIF)' 
        : retirementAge === 65 
        ? 'Age 65 (Retire + Pensions)' 
        : `Retire (Age ${retirementAge})`;
      list.push({ age: retirementAge, label, color: '#10b981' });
    }
    if (minAge <= 65 && 65 <= maxAge && retirementAge !== 65) {
      list.push({ age: 65, label: 'Age 65 (OAS/CPP)', color: '#0284c7' });
    }
    if (minAge <= 71 && 71 <= maxAge && retirementAge !== 71) {
      list.push({ age: 71, label: 'Age 71 (RRIF Rollover)', color: '#d97706' });
    }
    return list;
  }, [minAge, maxAge, retirementAge]);

  // Smart Multi-Tier Milestone Layout with collision avoidance & leader lines
  interface PositionedMilestone {
    age: number;
    label: string;
    color: string;
    x: number;
    badgeX: number;
    badgeY: number;
    badgeWidth: number;
    badgeHeight: number;
    tier: number;
  }

  const positionedMilestones = useMemo<PositionedMilestone[]>(() => {
    const sorted = [...milestones].sort((a, b) => a.age - b.age);
    if (sorted.length === 0) return [];

    const minClearance = 96; // Minimum pixels between badge centers on the same horizontal tier
    const result: PositionedMilestone[] = [];

    sorted.forEach((m, i) => {
      const x = getX(m.age);
      const badgeWidth = m.label.length >= 20 ? 116 : m.label.length >= 16 ? 100 : 90;
      const badgeHeight = 18;

      let tier = 0;
      let badgeX = x;

      if (i > 0) {
        const prev = result[i - 1];
        const dist = Math.abs(x - prev.x);
        if (dist < minClearance) {
          // Horizontal collision detected: alternate tier (Tier 1 is elevated above Tier 0)
          tier = prev.tier === 0 ? 1 : 0;

          // If extremely close (e.g. 1 year apart, ~18px), gently nudge badge centers apart
          if (dist < 32) {
            badgeX = x + 10;
            if (prev.badgeX === prev.x) {
              prev.badgeX = prev.x - 10;
            }
          }
        }
      }

      // Clamp badgeX within SVG chart margins to avoid clipping at chart edges
      const halfW = badgeWidth / 2;
      const minX = padding.left + halfW + 2;
      const maxX = padding.left + chartWidth - halfW - 2;
      badgeX = Math.max(minX, Math.min(maxX, badgeX));

      // Tier 0 (lower): padding.top - 21 (Y: 35 to 53)
      // Tier 1 (upper): padding.top - 43 (Y: 13 to 31) - 4px clearance between tracks
      const badgeY = tier === 1 ? padding.top - 43 : padding.top - 21;

      result.push({
        age: m.age,
        label: m.label,
        color: m.color,
        x,
        badgeX,
        badgeY,
        badgeWidth,
        badgeHeight,
        tier
      });
    });

    return result;
  }, [milestones, getX, padding.left, padding.top, chartWidth]);

  // Intelligent collision-free X-axis ticks (guarantees >= 52px spacing, eliminating label overlaps)
  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];

    const minPixelDistance = 52;
    const criticalAges = new Set<number>();
    criticalAges.add(chartData[0].age);
    criticalAges.add(chartData[chartData.length - 1].age);
    if (retirementAge >= minAge && retirementAge <= maxAge) {
      criticalAges.add(retirementAge);
    }

    const regularStep = Math.max(4, Math.round(ageSpan / 7));
    const candidateAges: number[] = [];

    for (let a = minAge; a <= maxAge; a++) {
      if (criticalAges.has(a) || (a - minAge) % regularStep === 0) {
        candidateAges.push(a);
      }
    }
    candidateAges.sort((a, b) => a - b);

    const accepted: number[] = [];
    
    // Always insert critical milestone ages first
    for (const ca of Array.from(criticalAges).sort((a, b) => a - b)) {
      accepted.push(ca);
    }

    // Now insert candidate regular ages that don't collide with existing accepted ticks
    for (const cand of candidateAges) {
      if (accepted.includes(cand)) continue;
      const candX = getX(cand);
      const hasConflict = accepted.some((acc) => Math.abs(getX(acc) - candX) < minPixelDistance);
      if (!hasConflict) {
        accepted.push(cand);
      }
    }

    accepted.sort((a, b) => a - b);

    return accepted
      .map((a) => chartData.find((d) => d.age === a))
      .filter((d): d is YearSimulationResult => Boolean(d));
  }, [chartData, minAge, maxAge, ageSpan, retirementAge, getX]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Projected Marginal Tax Bracket Over Time
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {province} Combined Fed + Prov
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Identifies bracket jumps, RRIF mandatory minimum cliffs, OAS clawback zones, and early RRSP meltdown opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Actionable Top Summary Stats */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Peak Bracket:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {(stats.peakRate * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-400">(Age {stats.peakAge})</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">High-Tax Years (≥{highTaxThreshold}%):</span>
            <span className={`font-bold ${stats.highTaxYearsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stats.highTaxYearsCount} yrs
            </span>
          </div>

          {stats.hasOasClawback ? (
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>OAS Clawback: <strong>${Math.round(stats.totalOasClawback).toLocaleString()}</strong></span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span>100% OAS Preserved</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
        {/* Left: Toggles & Threshold */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Timeframe Filter */}
          <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                timeframe === 'all'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lifetime Timeline
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('retirement')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                timeframe === 'retirement'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Retirement Only (Age {retirementAge}+)
            </button>
          </div>

          {/* Effective Tax Rate Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showEffectiveRate}
              onChange={(e) => setShowEffectiveRate(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-600"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-sky-500 inline-block border-t border-dashed border-sky-400"></span>
              Compare Effective Rate
            </span>
          </label>

          {/* High-Tax Threshold Selector */}
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span>High-Tax Alert Level:</span>
            <select
              value={highTaxThreshold}
              onChange={(e) => setHighTaxThreshold(Number(e.target.value))}
              aria-label="High-Tax Alert Threshold Level"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value={35}>≥ 35% Bracket</option>
              <option value={40}>≥ 40% Bracket (Standard)</option>
              <option value={45}>≥ 45% Bracket (Upper Tier)</option>
              <option value={50}>≥ 50% Bracket (Top Surtax)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3.5 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500"></span>
            <span className="font-semibold text-slate-900 dark:text-white">Marginal Tax Bracket</span>
          </div>
          {showEffectiveRate && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-500"></span>
              <span>Effective (Avg) Tax Rate</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900"></span>
            <span>High-Tax Spike (≥{highTaxThreshold}%)</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible font-sans"
          onMouseLeave={() => setHoveredAge(null)}
        >
          <defs>
            {/* Marginal Area Gradient */}
            <linearGradient id="marginalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* High Tax Zone Pattern / Gradient */}
            <linearGradient id="highTaxZoneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Shaded High-Tax Warning Band (highTaxThreshold to 60%) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={Math.max(0, highTaxY - padding.top)}
            fill="url(#highTaxZoneGrad)"
          />
          <line
            x1={padding.left}
            y1={highTaxY}
            x2={padding.left + chartWidth}
            y2={highTaxY}
            stroke="#f43f5e"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.65"
          />
          <text
            x={padding.left + chartWidth - 6}
            y={highTaxY - 6}
            textAnchor="end"
            fontSize="10"
            fontWeight="600"
            fill="#f43f5e"
            opacity="0.8"
          >
            High Tax Zone (≥{highTaxThreshold}%)
          </text>

          {/* Horizontal Grid Guidelines (0%, 10%, 20%, 30%, 40%, 50%, 60%) */}
          {[0, 10, 20, 30, 40, 50, 60].map((rate) => {
            const y = getY(rate);
            return (
              <g key={`y-grid-${rate}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                  strokeDasharray={rate === 0 ? undefined : '2 4'}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  className="fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  {rate}%
                </text>
              </g>
            );
          })}

          {/* Milestone Vertical Reference Lines (Retirement, Age 65, Age 71) with Multi-Tier Collision Avoidance */}
          {positionedMilestones.map((m) => {
            const isHovered = hoveredAge === m.age;
            const badgeHalfW = m.badgeWidth / 2;
            const hasLeaderLine = m.tier === 1 || Math.abs(m.badgeX - m.x) > 2;

            return (
              <g
                key={`milestone-${m.age}`}
                className="cursor-pointer group"
                onClick={() => setHoveredAge(m.age)}
                onMouseEnter={() => setHoveredAge(m.age)}
              >
                {/* Full-height vertical reference dashed line */}
                <line
                  x1={m.x}
                  y1={padding.top}
                  x2={m.x}
                  y2={padding.top + chartHeight}
                  stroke={m.color}
                  strokeWidth={isHovered ? '2' : '1.5'}
                  strokeDasharray="4 3"
                  opacity={isHovered ? '0.9' : '0.55'}
                  className="transition-all"
                />

                {/* Leader line connecting elevated/offset badge down to timeline anchor */}
                {hasLeaderLine && (
                  <path
                    d={`M ${m.badgeX} ${m.badgeY + m.badgeHeight} L ${m.badgeX} ${padding.top - 5} L ${m.x} ${padding.top}`}
                    stroke={m.color}
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    fill="none"
                    opacity={isHovered ? '0.85' : '0.6'}
                  />
                )}

                {/* Anchor indicator dot on top grid line */}
                <circle
                  cx={m.x}
                  cy={padding.top}
                  r="2.5"
                  fill={m.color}
                />

                {/* Staggered Milestone Pill Badge */}
                <rect
                  x={m.badgeX - badgeHalfW}
                  y={m.badgeY}
                  width={m.badgeWidth}
                  height={m.badgeHeight}
                  rx="5"
                  fill="currentColor"
                  className={`text-white dark:text-slate-900 transition-all ${
                    isHovered
                      ? 'filter drop-shadow-md'
                      : 'filter drop-shadow-xs'
                  }`}
                  stroke={m.color}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                />

                {/* Badge color indicator dot */}
                <circle
                  cx={m.badgeX - badgeHalfW + 7.5}
                  cy={m.badgeY + m.badgeHeight / 2}
                  r="2.5"
                  fill={m.color}
                />

                {/* Badge Label */}
                <text
                  x={m.badgeX + 3}
                  y={m.badgeY + m.badgeHeight / 2 + 3.5}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight={isHovered ? 'bold' : '600'}
                  fill={m.color}
                  className="select-none pointer-events-none"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* Area Fill under Marginal Tax Rate */}
          <path d={marginalAreaPath} fill="url(#marginalGradient)" />

          {/* Effective Tax Rate Line (Dashed) */}
          {showEffectiveRate && (
            <path
              d={effectiveLinePath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}

          {/* Primary Marginal Tax Rate Line */}
          <path
            d={marginalLinePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* High-Tax Data Points & Markers */}
          {chartData.map((d) => {
            const x = getX(d.age);
            const yMarginal = getY(d.marginalTaxRate * 100);
            const isHighTax = d.marginalTaxRate * 100 >= highTaxThreshold;
            const isPeak = d.age === stats.peakAge;
            const hasClawback = d.oasClawback > 0;

            if (isPeak) {
              return (
                <g key={`point-${d.age}`}>
                  <circle cx={x} cy={yMarginal} r="7" fill="#f43f5e" opacity="0.3" className="animate-ping" />
                  <circle cx={x} cy={yMarginal} r="5.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            }

            if (hasClawback) {
              return (
                <g key={`point-${d.age}`}>
                  <circle cx={x} cy={yMarginal} r="4.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                </g>
              );
            }

            if (isHighTax) {
              return (
                <g key={`point-${d.age}`}>
                  <circle cx={x} cy={yMarginal} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                </g>
              );
            }

            return null;
          })}

          {/* Interactive Hover Vertical Cursor & Active Indicator */}
          {hoveredItem && (
            <g>
              <line
                x1={getX(hoveredItem.age)}
                y1={padding.top}
                x2={getX(hoveredItem.age)}
                y2={padding.top + chartHeight}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoveredItem.age)}
                cy={getY(hoveredItem.marginalTaxRate * 100)}
                r="6.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              {showEffectiveRate && (
                <circle
                  cx={getX(hoveredItem.age)}
                  cy={getY(hoveredItem.effectiveTaxRate * 100)}
                  r="5"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
            </g>
          )}

          {/* Invisible interactive hover rects for seamless scrubbing */}
          {chartData.map((d, i) => {
            const curX = getX(d.age);
            const prevX = i > 0 ? getX(chartData[i - 1].age) : curX - 10;
            const nextX = i < chartData.length - 1 ? getX(chartData[i + 1].age) : curX + 10;
            const leftBound = (curX + prevX) / 2;
            const rightBound = (curX + nextX) / 2;
            const width = Math.max(8, rightBound - leftBound);

            return (
              <rect
                key={`hit-${d.age}`}
                x={leftBound}
                y={padding.top}
                width={width}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredAge(d.age)}
                onMouseMove={() => setHoveredAge(d.age)}
              />
            );
          })}

          {/* X-Axis Labels (Ages & Years) with collision-free spacing */}
          {xAxisTicks.map((d) => {
            const x = getX(d.age);
            const isRetirement = d.age === retirementAge;

            return (
              <g key={`x-axis-${d.age}`}>
                <line
                  x1={x}
                  y1={padding.top + chartHeight}
                  x2={x}
                  y2={padding.top + chartHeight + (isRetirement ? 7 : 5)}
                  stroke="currentColor"
                  className={isRetirement ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}
                  strokeWidth={isRetirement ? '1.8' : '1'}
                />
                <text
                  x={x}
                  y={padding.top + chartHeight + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isRetirement ? 'bold' : '500'}
                  className={
                    isRetirement
                      ? 'fill-emerald-600 dark:fill-emerald-400'
                      : 'fill-slate-600 dark:fill-slate-400'
                  }
                >
                  Age {d.age}
                </text>
                <text
                  x={x}
                  y={padding.top + chartHeight + 30}
                  textAnchor="middle"
                  fontSize="9.5"
                  className={
                    isRetirement
                      ? 'fill-emerald-600/80 dark:fill-emerald-400/80 font-medium'
                      : 'fill-slate-400 dark:fill-slate-500'
                  }
                >
                  {d.year}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredItem && (
          <div
            className={`absolute top-2 pointer-events-none transition-all duration-75 z-20 w-80 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl text-xs ${
              getX(hoveredItem.age) > svgWidth * 0.55 ? 'left-6 sm:left-12' : 'right-6 sm:right-12'
            }`}
          >
            {/* Header: Age & Year */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Age {hoveredItem.age} ({hoveredItem.year})
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {hoveredItem.isRetired ? 'Retirement Phase' : 'Working / Accumulation Phase'}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  hoveredItem.marginalTaxRate * 100 >= highTaxThreshold
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {(hoveredItem.marginalTaxRate * 100).toFixed(1)}% Bracket
              </span>
            </div>

            {/* Tax Rates & Dollar Summary */}
            <div className="grid grid-cols-2 gap-2 mb-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <div>
                <div className="text-[10px] text-slate-400">Marginal Bracket:</div>
                <div className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                  {(hoveredItem.marginalTaxRate * 100).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-400">Combined Fed + {province}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Effective (Avg) Rate:</div>
                <div className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">
                  {(hoveredItem.effectiveTaxRate * 100).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-400">
                  Tax: ${Math.round(hoveredItem.totalTaxPaid).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Income Streams Feeding the Tax Bracket */}
            <div className="space-y-1 mb-2.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Taxable Income Composition:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ${Math.round(hoveredItem.taxableIncome).toLocaleString()}
                </span>
              </div>

              {!hoveredItem.isRetired && hoveredItem.employmentIncome > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>• Employment Salary:</span>
                  <span className="font-medium">${Math.round(hoveredItem.employmentIncome).toLocaleString()}</span>
                </div>
              )}

              {hoveredItem.rrspWithdrawal > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>• RRSP / RRIF Withdrawal:</span>
                  <span className="font-medium">${Math.round(hoveredItem.rrspWithdrawal).toLocaleString()}</span>
                </div>
              )}

              {hoveredItem.cppIncome > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>• Canada Pension Plan (CPP):</span>
                  <span className="font-medium">${Math.round(hoveredItem.cppIncome).toLocaleString()}</span>
                </div>
              )}

              {hoveredItem.oasGrossIncome > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>• Old Age Security (OAS):</span>
                  <span className="font-medium">${Math.round(hoveredItem.oasGrossIncome).toLocaleString()}</span>
                </div>
              )}

              {hoveredItem.oasClawback > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                  <span>⚠️ OAS Clawback (Recovery Tax):</span>
                  <span>-${Math.round(hoveredItem.oasClawback).toLocaleString()}</span>
                </div>
              )}

              {/* Tax-Free Streams Contrast */}
              {hoveredItem.tfsaWithdrawal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>• TFSA (0% Tax Drag):</span>
                  <span className="font-medium">${Math.round(hoveredItem.tfsaWithdrawal).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Dynamic Tax Planning Callout for the hovered year */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {hoveredItem.oasClawback > 0 ? (
                <div className="text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                  <span>
                    <strong>OAS Clawback Zone:</strong> Taxable income exceeds the statutory threshold. Consider drawing more from TFSA or splitting RRIF income to rescue your OAS.
                  </span>
                </div>
              ) : hoveredItem.age >= 71 && hoveredItem.isRrifMandatory ? (
                <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    <strong>Mandatory RRIF Cliff:</strong> Age 71 conversion forces CRA minimum withdrawals of ${Math.round(hoveredItem.rrifMinimumWithdrawal || 0).toLocaleString()}, locking you into this bracket.
                  </span>
                </div>
              ) : hoveredItem.isRetired && hoveredItem.marginalTaxRate * 100 < 25 ? (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    <strong>Low-Tax Arbitrage Window:</strong> Your marginal bracket is only {(hoveredItem.marginalTaxRate * 100).toFixed(1)}%. Optimal year for voluntary RRSP meltdown!
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>
                    Progressive Canadian tax: Every dollar earned above this threshold is taxed at {(hoveredItem.marginalTaxRate * 100).toFixed(1)}%.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actionable Tax Planning Opportunities & Insights Cards */}
      <div className="mt-7 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Actionable Canadian Tax Planning Strategies Detected for Your Timeline
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Peak Tax Cliff & RRIF Spike */}
          <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Peak Tax Years (Age {stats.peakAge})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your highest marginal tax rate reaches <strong className="text-slate-900 dark:text-white">{(stats.peakRate * 100).toFixed(1)}%</strong> at Age {stats.peakAge} on projected taxable income of <strong className="text-slate-900 dark:text-white">${Math.round(stats.peakTaxableIncome).toLocaleString()}</strong>.
                {stats.rrifSpikeAge && ` The jump is driven by mandatory CRA RRIF minimum withdrawal schedules kicking in at age 71.`}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/15 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              💡 <strong>Action:</strong> Run an early RRSP meltdown between ages {Math.max(retirementAge, 60)}–70 to flatten your nest egg before mandatory conversions.
            </div>
          </div>

          {/* Card 2: Low-Bracket Meltdown Window */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                <TrendingDown className="w-4 h-4 shrink-0" />
                <span>Low-Bracket Meltdown Window</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.meltdownWindowYears.length > 0 ? (
                  <>
                    Between Ages <strong className="text-slate-900 dark:text-white">{stats.meltdownWindowYears[0]}–{stats.meltdownWindowYears[stats.meltdownWindowYears.length - 1]}</strong>, your marginal rate sits at a modest <strong className="text-slate-900 dark:text-white">{(stats.minRate * 100).toFixed(1)}%</strong> before CPP/OAS and mandatory RRIF minimums fully kick in.
                  </>
                ) : (
                  <>
                    In your early retirement years, salary stops and tax brackets drop. This creates a valuable tax arbitrage window where RRSP funds can be withdrawn at lower bottom brackets.
                  </>
                )}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-500/15 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              💡 <strong>Arbitrage:</strong> Withdraw RRSP funds at {(stats.minRate * 100).toFixed(1)}% to top up your TFSA, shielding future growth from the {(stats.peakRate * 100).toFixed(1)}% peak bracket.
            </div>
          </div>

          {/* Card 3: OAS Recovery Tax & Income Splitting */}
          <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-400 mb-1.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>OAS & Pension Splitting</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.hasOasClawback ? (
                  <>
                    OAS clawback surtax triggers <strong className="text-rose-600 dark:text-rose-400">${Math.round(stats.totalOasClawback).toLocaleString()}</strong> in cumulative recovery tax because taxable income crosses the CRA threshold (~$93,208+ indexed).
                  </>
                ) : (
                  <>
                    Your taxable income remains safely beneath the OAS recovery tax threshold throughout retirement, preserving 100% of your government benefits without clawback penalty.
                  </>
                )}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-sky-500/15 text-[11px] text-sky-800 dark:text-sky-300 font-medium">
              💡 <strong>Strategy:</strong> {isCouple ? 'Take advantage of 50% Canadian Pension Income Splitting at age 65+ to equalize taxable incomes.' : 'Prioritize TFSA withdrawals during high-income years to stay below the clawback line.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
