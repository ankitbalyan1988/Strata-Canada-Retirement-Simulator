import React, { useState, useMemo, useCallback } from 'react';
import { YearSimulationResult, RetirementInputs } from '../types/retirement';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  Wallet, 
  Receipt, 
  Landmark, 
  PiggyBank, 
  ShieldCheck, 
  DollarSign, 
  Info, 
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export interface CashFlowVisualizerProps {
  yearlyResults: YearSimulationResult[];
  inputs: RetirementInputs;
}

type ViewMode = 'all' | 'inflows' | 'outflows' | 'surplus';
type HorizonFilter = 'all' | 'working' | 'retirement';

export const CashFlowVisualizer: React.FC<CashFlowVisualizerProps> = ({
  yearlyResults,
  inputs
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('all');
  const [hoveredAge, setHoveredAge] = useState<number | null>(null);

  const retirementAge = inputs.retirementAge;

  // Filter dataset by horizon
  const displayData = useMemo(() => {
    if (horizonFilter === 'working') {
      return yearlyResults.filter((y) => !y.isRetired);
    }
    if (horizonFilter === 'retirement') {
      return yearlyResults.filter((y) => y.isRetired);
    }
    return yearlyResults;
  }, [yearlyResults, horizonFilter]);

  // Executive High-Level KPI aggregates
  const kpis = useMemo(() => {
    let currentInflow = 0;
    let retirementInflow = 0;
    let retirementOutflow = 0;
    let lifetimeTaxes = 0;
    let currentSavings = 0;
    let totalLifetimeSavings = 0;

    yearlyResults.forEach((yr) => {
      lifetimeTaxes += yr.totalTaxPaid;
      totalLifetimeSavings += (yr.rrspContribution + yr.tfsaContribution + yr.fhsaContribution + yr.nonRegContribution);

      if (yr.age === inputs.currentAge) {
        currentInflow = yr.employmentIncome + (yr.spouseEmploymentIncome || 0);
        currentSavings = (yr.rrspContribution + yr.tfsaContribution + yr.fhsaContribution + yr.nonRegContribution);
      }
      if (yr.age === retirementAge) {
        retirementInflow = yr.cppIncome + yr.oasNetIncome + yr.totalWithdrawals;
        retirementOutflow = yr.targetSpendingNominal + yr.debtPayment;
      }
    });

    return {
      currentInflow,
      retirementInflow,
      retirementOutflow,
      lifetimeTaxes,
      currentSavings,
      totalLifetimeSavings
    };
  }, [yearlyResults, inputs.currentAge, retirementAge]);

  // Compute Max Y value across visible dataset
  const maxY = useMemo(() => {
    if (displayData.length === 0) return 100000;
    let peak = 50000;
    displayData.forEach((d) => {
      const inflow = d.employmentIncome + (d.spouseEmploymentIncome || 0) + d.cppIncome + (d.spouseCppIncome || 0) + d.oasNetIncome + (d.spouseOasNetIncome || 0) + d.totalWithdrawals + (d.homeSaleProceeds || 0);
      const outflow = d.targetSpendingNominal + d.debtPayment;
      const outflowWithTax = outflow + d.totalTaxPaid;
      peak = Math.max(peak, inflow, outflowWithTax);
    });
    return Math.ceil((peak * 1.15) / 10000) * 10000;
  }, [displayData]);

  // Chart dimensions
  const svgWidth = 900;
  const svgHeight = 360;
  const padding = { top: 40, right: 35, bottom: 50, left: 80 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const minAge = displayData[0]?.age ?? inputs.currentAge;
  const maxAge = displayData[displayData.length - 1]?.age ?? inputs.lifeExpectancy;
  const ageSpan = Math.max(1, maxAge - minAge);

  const getX = useCallback(
    (age: number) => padding.left + ((age - minAge) / ageSpan) * chartWidth,
    [minAge, ageSpan, chartWidth, padding.left]
  );

  const getY = useCallback(
    (val: number) => {
      const clamped = Math.max(0, val);
      return padding.top + chartHeight - (clamped / maxY) * chartHeight;
    },
    [maxY, chartHeight, padding.top]
  );

  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1.0].map((frac) => frac * maxY);
  }, [maxY]);

  const xTicks = useMemo(() => {
    return displayData.filter(
      (d) => d.age % 5 === 0 || d.age === minAge || d.age === maxAge || d.age === retirementAge
    );
  }, [displayData, minAge, maxAge, retirementAge]);

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${Math.round(val / 1000)}k`;
  };

  const hoveredRow = useMemo(() => {
    if (hoveredAge === null) return null;
    return yearlyResults.find((d) => d.age === hoveredAge) || null;
  }, [hoveredAge, yearlyResults]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col gap-6 transition-colors">
      
      {/* 1. Header & Title Block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>Current & Projected Cash Flows</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 font-mono">
                  Full Lifetime Horizon
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic projection of annual income inflows, living expenses, CRA & provincial income taxes, and net savings surplus
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Horizon Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Horizon Filter (Working / Retirement / All) */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setHorizonFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                horizonFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Years
            </button>
            <button
              type="button"
              onClick={() => setHorizonFilter('working')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                horizonFilter === 'working'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Working Only
            </button>
            <button
              type="button"
              onClick={() => setHorizonFilter('retirement')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                horizonFilter === 'retirement'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Retirement Only
            </button>
          </div>

          {/* Visualization Stream Mode */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Inflow vs Outflow
            </button>
            <button
              type="button"
              onClick={() => setViewMode('inflows')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'inflows'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Income Streams
            </button>
            <button
              type="button"
              onClick={() => setViewMode('outflows')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'outflows'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expenses & Taxes
            </button>
            <button
              type="button"
              onClick={() => setViewMode('surplus')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'surplus'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Net Savings Surplus
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Current Inflow */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-indigo-500" />
              Current Inflow (Age {inputs.currentAge})
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Earned</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            ${Math.round(kpis.currentInflow).toLocaleString()}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">/yr</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Employment income & household cash flow
          </div>
        </div>

        {/* Card 2: Retirement Target Outflow */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              Retirement Target (Age {retirementAge})
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Indexed</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            ${Math.round(kpis.retirementOutflow).toLocaleString()}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">/yr</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Living expenses target (nominal inflation-adjusted)
          </div>
        </div>

        {/* Card 3: Lifetime Taxes */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-rose-500" />
              Lifetime Taxes Paid
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">CRA & Prov</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            ${Math.round(kpis.lifetimeTaxes).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Federal and {inputs.province} provincial income tax
          </div>
        </div>

        {/* Card 4: Annual Savings Potential */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
              Current Annual Savings
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ${Math.round(kpis.currentSavings).toLocaleString()}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">/yr</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            RRSP, TFSA, FHSA, and Non-Reg allocations
          </div>
        </div>
      </div>

      {/* 3. Interactive SVG Chart Area */}
      <div className="flex flex-col gap-2">
        {/* Stream Color Legend */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold">Streams:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500"></span>
              Salary / Earned Inflow
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600"></span>
              CPP & OAS Pensions
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500"></span>
              Portfolio Withdrawals
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
              Living Expenses
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
              CRA Income Tax
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
              Potential Savings Surplus
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Hover bars to inspect annual breakdown</span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="relative w-full overflow-x-auto pb-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[720px] select-none"
            onMouseLeave={() => setHoveredAge(null)}
          >
            <defs>
              <linearGradient id="cfInflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="cfOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="cfTaxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#E11D48" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="cfSurplusGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Y Grid Lines */}
            {yTicks.map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="currentColor"
                    className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                  >
                    {formatCur(val)}
                  </text>
                </g>
              );
            })}

            {/* Retirement Age Divider Line */}
            {retirementAge >= minAge && retirementAge <= maxAge && (
              <g>
                <line
                  x1={getX(retirementAge)}
                  y1={padding.top}
                  x2={getX(retirementAge)}
                  y2={padding.top + chartHeight}
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <rect
                  x={getX(retirementAge) - 46}
                  y={padding.top - 24}
                  width="92"
                  height="20"
                  rx="6"
                  fill="#10B981"
                  className="shadow-sm"
                />
                <text
                  x={getX(retirementAge)}
                  y={padding.top - 10}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  className="text-[10px] font-bold font-mono"
                >
                  RETIRE AGE {retirementAge}
                </text>
              </g>
            )}

            {/* X Axis Labels */}
            {xTicks.map((d) => {
              const x = getX(d.age);
              return (
                <g key={d.age}>
                  <line
                    x1={x}
                    y1={padding.top + chartHeight}
                    x2={x}
                    y2={padding.top + chartHeight + 6}
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-700"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    fill="currentColor"
                    className={`text-[10px] font-mono ${
                      d.age === retirementAge
                        ? 'fill-emerald-600 dark:fill-emerald-400 font-bold'
                        : 'fill-slate-500 dark:fill-slate-400 font-medium'
                    }`}
                  >
                    Age {d.age}
                  </text>
                </g>
              );
            })}

            {/* Bars for Each Year */}
            {displayData.map((d) => {
              const xCenter = getX(d.age);
              const totalInflow = d.employmentIncome + (d.spouseEmploymentIncome || 0) + d.cppIncome + (d.spouseCppIncome || 0) + d.oasNetIncome + (d.spouseOasNetIncome || 0) + d.totalWithdrawals + (d.homeSaleProceeds || 0);
              const totalOutflow = d.targetSpendingNominal + d.debtPayment;
              const totalTaxes = d.totalTaxPaid;
              const savings = (d.rrspContribution + d.tfsaContribution + d.fhsaContribution + d.nonRegContribution);
              const netSurplus = Math.max(0, d.netSpendableCashflow);

              const isHovered = hoveredAge === d.age;
              const barWidth = Math.max(4, Math.min(18, (chartWidth / displayData.length) * 0.76));

              return (
                <g
                  key={d.age}
                  onMouseEnter={() => setHoveredAge(d.age)}
                  className="cursor-pointer transition-opacity"
                  opacity={hoveredAge === null || isHovered ? 1 : 0.45}
                >
                  {/* Invisible broad hitbox for smooth hovering */}
                  <rect
                    x={xCenter - barWidth}
                    y={padding.top}
                    width={barWidth * 2}
                    height={chartHeight}
                    fill="transparent"
                  />

                  {/* Mode 1: All (Side by Side Inflow vs Outflow+Tax) */}
                  {viewMode === 'all' && (
                    <>
                      {/* Left bar: Inflows (Green) */}
                      {totalInflow > 0 && (
                        <rect
                          x={xCenter - barWidth}
                          y={getY(totalInflow)}
                          width={barWidth * 0.48}
                          height={padding.top + chartHeight - getY(totalInflow)}
                          rx="2"
                          fill="url(#cfInflowGrad)"
                        />
                      )}

                      {/* Right bar: Outflows (Amber) stacked with Taxes (Rose) */}
                      {totalOutflow > 0 && (
                        <rect
                          x={xCenter + barWidth * 0.04}
                          y={getY(totalOutflow)}
                          width={barWidth * 0.48}
                          height={padding.top + chartHeight - getY(totalOutflow)}
                          rx="2"
                          fill="url(#cfOutflowGrad)"
                        />
                      )}
                      {totalTaxes > 0 && (
                        <rect
                          x={xCenter + barWidth * 0.04}
                          y={getY(totalOutflow + totalTaxes)}
                          width={barWidth * 0.48}
                          height={getY(totalOutflow) - getY(totalOutflow + totalTaxes)}
                          rx="2"
                          fill="url(#cfTaxGrad)"
                        />
                      )}
                    </>
                  )}

                  {/* Mode 2: Inflows Breakdown (Salary, CPP, OAS, Withdrawals) */}
                  {viewMode === 'inflows' && (
                    <>
                      {(() => {
                        let bottom = padding.top + chartHeight;
                        const salary = d.employmentIncome + (d.spouseEmploymentIncome || 0);
                        const pensions = d.cppIncome + (d.spouseCppIncome || 0) + d.oasNetIncome + (d.spouseOasNetIncome || 0);
                        const draws = d.totalWithdrawals;

                        return (
                          <g>
                            {salary > 0 && (
                              <rect
                                x={xCenter - barWidth * 0.4}
                                y={bottom - (salary / maxY) * chartHeight}
                                width={barWidth * 0.8}
                                height={(salary / maxY) * chartHeight}
                                rx="2"
                                fill="#6366F1" // Indigo
                              />
                            )}
                            {pensions > 0 && (
                              <rect
                                x={xCenter - barWidth * 0.4}
                                y={bottom - ((salary + pensions) / maxY) * chartHeight}
                                width={barWidth * 0.8}
                                height={(pensions / maxY) * chartHeight}
                                rx="2"
                                fill="#2563EB" // Blue
                              />
                            )}
                            {draws > 0 && (
                              <rect
                                x={xCenter - barWidth * 0.4}
                                y={bottom - ((salary + pensions + draws) / maxY) * chartHeight}
                                width={barWidth * 0.8}
                                height={(draws / maxY) * chartHeight}
                                rx="2"
                                fill="#14B8A6" // Teal
                              />
                            )}
                          </g>
                        );
                      })()}
                    </>
                  )}

                  {/* Mode 3: Outflows & Taxes Breakdown */}
                  {viewMode === 'outflows' && (
                    <>
                      {(() => {
                        let bottom = padding.top + chartHeight;
                        const living = d.targetSpendingNominal;
                        const debt = d.debtPayment;
                        const tax = d.totalTaxPaid;

                        return (
                          <g>
                            {living > 0 && (
                              <rect
                                x={xCenter - barWidth * 0.4}
                                y={bottom - (living / maxY) * chartHeight}
                                width={barWidth * 0.8}
                                height={(living / maxY) * chartHeight}
                                rx="2"
                                fill="#F59E0B" // Amber
                              />
                            )}
                            {debt > 0 && (
                              <rect
                                x={xCenter - barWidth * 0.4}
                                y={bottom - ((living + debt) / maxY) * chartHeight}
                                width={barWidth * 0.8}
                                height={(debt / maxY) * chartHeight}
                                rx="2"
                                fill="#EA580C" // Orange
                              />
                            )}
                            {tax > 0 && (
                              <rect
                                x={xCenter - barWidth * 0.4}
                                y={bottom - ((living + debt + tax) / maxY) * chartHeight}
                                width={barWidth * 0.8}
                                height={(tax / maxY) * chartHeight}
                                rx="2"
                                fill="#F43F5E" // Rose
                              />
                            )}
                          </g>
                        );
                      })()}
                    </>
                  )}

                  {/* Mode 4: Net Surplus & Registered Savings */}
                  {viewMode === 'surplus' && (
                    <>
                      {savings > 0 && (
                        <rect
                          x={xCenter - barWidth * 0.4}
                          y={getY(savings)}
                          width={barWidth * 0.8}
                          height={padding.top + chartHeight - getY(savings)}
                          rx="2"
                          fill="url(#cfSurplusGrad)"
                        />
                      )}
                      {netSurplus > 0 && (
                        <rect
                          x={xCenter - barWidth * 0.4}
                          y={getY(savings + netSurplus)}
                          width={barWidth * 0.8}
                          height={getY(savings) - getY(savings + netSurplus)}
                          rx="2"
                          fill="url(#cfInflowGrad)"
                        />
                      )}
                    </>
                  )}

                  {/* Hover indicator point */}
                  {isHovered && (
                    <circle
                      cx={xCenter}
                      cy={getY(totalInflow)}
                      r="4"
                      fill="#FFFFFF"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 4. Interactive Hover Inspector Card */}
      {hoveredRow && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-700/80 shadow-lg animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
                Age {hoveredRow.age}
              </span>
              <span className="text-slate-400 font-mono text-sm">
                Year {hoveredRow.year}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                hoveredRow.isRetired
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
              }`}>
                {hoveredRow.isRetired ? 'Retirement Phase' : 'Working Phase'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                Effective Tax: <strong className="text-white">{(hoveredRow.effectiveTaxRate * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-slate-400">
                Marginal Bracket: <strong className="text-white">{(hoveredRow.marginalTaxRate * 100).toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 text-xs">
            {/* Inflow Breakdown */}
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Cash Inflows</span>
              <div className="text-base font-bold font-mono text-emerald-400">
                ${Math.round(
                  hoveredRow.employmentIncome +
                  (hoveredRow.spouseEmploymentIncome || 0) +
                  hoveredRow.cppIncome +
                  (hoveredRow.spouseCppIncome || 0) +
                  hoveredRow.oasNetIncome +
                  (hoveredRow.spouseOasNetIncome || 0) +
                  hoveredRow.totalWithdrawals +
                  (hoveredRow.homeSaleProceeds || 0)
                ).toLocaleString()}
              </div>
              <ul className="text-[11px] text-slate-300 space-y-0.5 mt-1">
                {hoveredRow.employmentIncome > 0 && (
                  <li>• Salary: ${Math.round(hoveredRow.employmentIncome).toLocaleString()}</li>
                )}
                {(hoveredRow.cppIncome + hoveredRow.oasNetIncome) > 0 && (
                  <li>• CPP & OAS: ${Math.round(hoveredRow.cppIncome + hoveredRow.oasNetIncome).toLocaleString()}</li>
                )}
                {hoveredRow.totalWithdrawals > 0 && (
                  <li>• Withdrawals: ${Math.round(hoveredRow.totalWithdrawals).toLocaleString()}</li>
                )}
              </ul>
            </div>

            {/* Outflows Breakdown */}
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Living & Debt Outflows</span>
              <div className="text-base font-bold font-mono text-amber-400">
                ${Math.round(hoveredRow.targetSpendingNominal + hoveredRow.debtPayment).toLocaleString()}
              </div>
              <ul className="text-[11px] text-slate-300 space-y-0.5 mt-1">
                <li>• Living Target: ${Math.round(hoveredRow.targetSpendingNominal).toLocaleString()}</li>
                {hoveredRow.debtPayment > 0 && (
                  <li>• Debt / Loans: ${Math.round(hoveredRow.debtPayment).toLocaleString()}</li>
                )}
              </ul>
            </div>

            {/* Taxes */}
            <div>
              <span className="text-slate-400 font-semibold block mb-1">CRA & Provincial Tax</span>
              <div className="text-base font-bold font-mono text-rose-400">
                ${Math.round(hoveredRow.totalTaxPaid).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                Taxable Income: ${Math.round(hoveredRow.taxableIncome).toLocaleString()}
              </div>
            </div>

            {/* Savings & Surplus */}
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Savings & Net Surplus</span>
              <div className="text-base font-bold font-mono text-indigo-400">
                ${Math.round(
                  (hoveredRow.rrspContribution + hoveredRow.tfsaContribution + hoveredRow.fhsaContribution + hoveredRow.nonRegContribution) +
                  Math.max(0, hoveredRow.netSpendableCashflow)
                ).toLocaleString()}
              </div>
              <ul className="text-[11px] text-slate-300 space-y-0.5 mt-1">
                <li>• Registered Savings: ${Math.round(hoveredRow.rrspContribution + hoveredRow.tfsaContribution + hoveredRow.fhsaContribution + hoveredRow.nonRegContribution).toLocaleString()}</li>
                <li>• Cash Surplus Buffer: ${Math.round(hoveredRow.netSpendableCashflow).toLocaleString()}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
