import React, { useState, useMemo, useCallback } from 'react';
import { YearSimulationResult } from '../../types/retirement';
import { 
  Layers, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  ShieldCheck, 
  Zap, 
  Flame,
  CheckCircle2,
  Sliders,
  Anchor
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateWhatIfSimulation } from '../../utils/whatIfCalculator';
import { WhatIfSensitivityPanel } from './WhatIfSensitivityPanel';

export interface NetWorthChartProps {
  yearlyResults: YearSimulationResult[];
  stressYearlyResults?: YearSimulationResult[];
  retirementAge: number;
  isStressTestActive?: boolean;
  onToggleStressTest?: () => void;
  stressTiming?: 'at_retirement' | 'immediate' | 'custom';
  onChangeStressTiming?: (timing: 'at_retirement' | 'immediate' | 'custom') => void;
  showStressTestToggle?: boolean;
  showWhatIfToggle?: boolean;
  showWhatIfOverlayLine?: boolean;
}

const NetWorthChartComponent: React.FC<NetWorthChartProps> = ({
  yearlyResults,
  stressYearlyResults,
  retirementAge,
  isStressTestActive = false,
  onToggleStressTest = () => {},
  stressTiming = 'at_retirement',
  onChangeStressTiming = () => {},
  showStressTestToggle = false,
  showWhatIfToggle = false,
  showWhatIfOverlayLine = false
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleAccounts, setVisibleAccounts] = useState({
    rrsp: true,
    tfsa: true,
    fhsa: true,
    nonReg: true,
    realEstate: true,
    totalLine: true
  });

  // What-If State from Centralized Store
  const inputs = useSimulationStore(useShallow((state) => state.inputs));
  const summary = useSimulationStore(useShallow((state) => state.summary));
  const whatIfSettings = useSimulationStore(useShallow((state) => state.whatIfSettings));
  const setIsWhatIfActive = useSimulationStore((state) => state.setIsWhatIfActive);
  const setWhatIfSettings = useSimulationStore((state) => state.setWhatIfSettings);
  const resetWhatIfSettings = useSimulationStore((state) => state.resetWhatIfSettings);

  // Memoized What-If Simulation Result
  const whatIfResult = useMemo(() => {
    if (!whatIfSettings.isActive) return null;
    return calculateWhatIfSimulation(inputs, whatIfSettings, summary, yearlyResults);
  }, [inputs, whatIfSettings, summary, yearlyResults]);

  const whatIfYearlyResults = whatIfResult?.yearlyResults;

  if (!yearlyResults || yearlyResults.length === 0) return null;

  // Chart Dimensions
  const svgWidth = 860;
  const svgHeight = 350;
  const padding = { top: 38, right: 30, bottom: 45, left: 75 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Memoized Y domain scale (considering baseline, stress, and what-if)
  const yDomainMax = useMemo(() => {
    const maxNetWorth = Math.max(
      100000,
      ...yearlyResults.map((y) => y.totalNetWorth),
      ...(showStressTestToggle && stressYearlyResults ? stressYearlyResults.map((y) => y.totalNetWorth) : []),
      ...((showWhatIfToggle || showWhatIfOverlayLine) && whatIfYearlyResults ? whatIfYearlyResults.map((y) => y.totalNetWorth) : [])
    );
    return Math.ceil((maxNetWorth * 1.1) / 100000) * 100000;
  }, [yearlyResults, stressYearlyResults, whatIfYearlyResults, showStressTestToggle, showWhatIfToggle, showWhatIfOverlayLine]);

  const minAge = yearlyResults[0].age;
  const maxAge = yearlyResults[yearlyResults.length - 1].age;
  const ageSpan = Math.max(1, maxAge - minAge);

  const getX = useCallback(
    (age: number) => padding.left + ((age - minAge) / ageSpan) * chartWidth,
    [minAge, ageSpan, chartWidth, padding.left]
  );

  const getY = useCallback(
    (value: number) => {
      const clamped = Math.max(0, value);
      return padding.top + chartHeight - (clamped / yDomainMax) * chartHeight;
    },
    [yDomainMax, chartHeight, padding.top]
  );

  // Memoized SVG polyline points for Baseline Total Net Worth
  const linePoints = useMemo(() => {
    return yearlyResults
      .map((d) => `${getX(d.age)},${getY(d.totalNetWorth)}`)
      .join(' ');
  }, [yearlyResults, getX, getY]);

  // Memoized SVG polyline points for Stress-Tested Net Worth
  const stressLinePoints = useMemo(() => {
    if (!stressYearlyResults) return '';
    return stressYearlyResults
      .map((d) => `${getX(d.age)},${getY(d.totalNetWorth)}`)
      .join(' ');
  }, [stressYearlyResults, getX, getY]);

  // Memoized SVG polyline points for What-If Net Worth
  const whatIfLinePoints = useMemo(() => {
    if (!whatIfYearlyResults) return '';
    return whatIfYearlyResults
      .map((d) => `${getX(d.age)},${getY(d.totalNetWorth)}`)
      .join(' ');
  }, [whatIfYearlyResults, getX, getY]);

  // Memoized area band path between baseline and stress line
  const stressBandPath = useMemo(() => {
    if (!isStressTestActive || !stressYearlyResults || stressYearlyResults.length !== yearlyResults.length) {
      return '';
    }
    const forward = yearlyResults.map((d) => `L ${getX(d.age)},${getY(d.totalNetWorth)}`).join(' ');
    const backward = [...stressYearlyResults].reverse().map((d) => `L ${getX(d.age)},${getY(d.totalNetWorth)}`).join(' ');
    return `M ${getX(yearlyResults[0].age)},${getY(yearlyResults[0].totalNetWorth)} ${forward} ${backward} Z`;
  }, [yearlyResults, stressYearlyResults, isStressTestActive, getX, getY]);

  // Memoized area band path between baseline and What-If line
  const whatIfBandPath = useMemo(() => {
    if (!whatIfSettings.isActive || !whatIfYearlyResults || whatIfYearlyResults.length !== yearlyResults.length) {
      return '';
    }
    const forward = yearlyResults.map((d) => `L ${getX(d.age)},${getY(d.totalNetWorth)}`).join(' ');
    const backward = [...whatIfYearlyResults].reverse().map((d) => `L ${getX(d.age)},${getY(d.totalNetWorth)}`).join(' ');
    return `M ${getX(yearlyResults[0].age)},${getY(yearlyResults[0].totalNetWorth)} ${forward} ${backward} Z`;
  }, [yearlyResults, whatIfYearlyResults, whatIfSettings.isActive, getX, getY]);

  // Memoized baseline gradient area path
  const baselineAreaPath = useMemo(() => {
    if (yearlyResults.length === 0) return '';
    const startX = getX(yearlyResults[0].age);
    const endX = getX(yearlyResults[yearlyResults.length - 1].age);
    const bottomY = padding.top + chartHeight;
    const forward = yearlyResults.map((d) => `L ${getX(d.age)},${getY(d.totalNetWorth)} `).join('');
    return `M ${startX},${bottomY} ${forward} L ${endX},${bottomY} Z`;
  }, [yearlyResults, getX, getY, chartHeight, padding.top]);

  // Memoized Y-axis ticks
  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1.0].map((frac) => frac * yDomainMax);
  }, [yDomainMax]);

  // Memoized X-axis ticks
  const xTicks = useMemo(() => {
    return yearlyResults.filter(
      (d) => d.age % 5 === 0 || d.age === minAge || d.age === maxAge
    );
  }, [yearlyResults, minAge, maxAge]);

  const hoveredData = hoveredIndex !== null ? yearlyResults[hoveredIndex] : null;
  const hoveredStressData = (isStressTestActive && stressYearlyResults && hoveredIndex !== null)
    ? stressYearlyResults[hoveredIndex]
    : null;
  const hoveredWhatIfData = (whatIfSettings.isActive && whatIfYearlyResults && hoveredIndex !== null)
    ? whatIfYearlyResults[hoveredIndex]
    : null;

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${Math.round(val / 1000)}k`;
  };

  // Memoized stress test impact metrics
  const baselineRetireNW = useMemo(
    () => yearlyResults.find((y) => y.age === retirementAge)?.totalNetWorth || 0,
    [yearlyResults, retirementAge]
  );
  const stressRetireNW = useMemo(
    () => stressYearlyResults?.find((y) => y.age === retirementAge)?.totalNetWorth || 0,
    [stressYearlyResults, retirementAge]
  );
  const retireDelta = stressRetireNW - baselineRetireNW;

  const baselineEndNW = useMemo(
    () => yearlyResults[yearlyResults.length - 1]?.totalNetWorth || 0,
    [yearlyResults]
  );
  const stressEndNW = useMemo(
    () => (stressYearlyResults ? stressYearlyResults[stressYearlyResults.length - 1]?.totalNetWorth || 0 : 0),
    [stressYearlyResults]
  );

  const stressDepletionYear = useMemo(
    () => stressYearlyResults?.find((y) => y.isRetired && y.totalNetWorth <= 0)?.age || null,
    [stressYearlyResults]
  );
  const baselineDepletionYear = useMemo(
    () => yearlyResults.find((y) => y.isRetired && y.totalNetWorth <= 0)?.age || null,
    [yearlyResults]
  );

  const passesStressTest = stressDepletionYear === null && stressEndNW >= 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col gap-4 transition-colors">
      
      {/* Chart Header & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base">
              Net Worth & Account Balances Over Time
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Projection from Age {minAge} to Age {maxAge} across Canadian registered & taxable accounts
          </p>
        </div>

        {/* Controls: Stress Test Toggle & Account Toggles */}
        <div className="flex items-center flex-wrap gap-2.5">
          
          {/* MARKET STRESS TEST TOGGLE */}
          {showStressTestToggle && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-xs border border-slate-200 dark:border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={onToggleStressTest}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
                  isStressTestActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Stress Test (-10%)</span>
                <span className={`w-2 h-2 rounded-full ${isStressTestActive ? 'bg-amber-950 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`}></span>
              </button>

              {isStressTestActive && (
                <div className="flex items-center gap-1 pl-1 pr-1 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => onChangeStressTiming('at_retirement')}
                    className={`px-2 py-0.5 rounded transition ${
                      stressTiming === 'at_retirement'
                        ? 'bg-amber-400/25 text-amber-600 dark:text-amber-300 border border-amber-400/40'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Simulate Sequence-of-Returns crash in the retirement milestone year"
                  >
                    At Retire
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeStressTiming('immediate')}
                    className={`px-2 py-0.5 rounded transition ${
                      stressTiming === 'immediate'
                        ? 'bg-amber-400/25 text-amber-600 dark:text-amber-300 border border-amber-400/40'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Simulate immediate 10% market crash today"
                  >
                    Today
                  </button>
                </div>
              )}
            </div>
          )}

          {/* WHAT-IF SENSITIVITY TOGGLE */}
          {showWhatIfToggle && (
            <button
              type="button"
              onClick={() => setIsWhatIfActive((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition text-xs border shadow-xs ${
                whatIfSettings.isActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-900/30 ring-2 ring-purple-400/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-500 dark:text-purple-300" />
              <span>What-If Analysis</span>
              <span className={`w-2 h-2 rounded-full ${whatIfSettings.isActive ? 'bg-purple-200 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`}></span>
            </button>
          )}

          {/* Account Filter Pills */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            {(showWhatIfToggle || showWhatIfOverlayLine) && whatIfSettings.isActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                What-If Line
              </span>
            )}

            <button
              type="button"
              onClick={() => setVisibleAccounts(p => ({ ...p, rrsp: !p.rrsp }))}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition text-[11px] ${
                visibleAccounts.rrsp
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              RRSP
            </button>

            <button
              type="button"
              onClick={() => setVisibleAccounts(p => ({ ...p, tfsa: !p.tfsa }))}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition text-[11px] ${
                visibleAccounts.tfsa
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              TFSA
            </button>

            <button
              type="button"
              onClick={() => setVisibleAccounts(p => ({ ...p, fhsa: !p.fhsa }))}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition text-[11px] ${
                visibleAccounts.fhsa
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              FHSA
            </button>

            <button
              type="button"
              onClick={() => setVisibleAccounts(p => ({ ...p, nonReg: !p.nonReg }))}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition text-[11px] ${
                visibleAccounts.nonReg
                  ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Non-Reg
            </button>

            <button
              type="button"
              onClick={() => setVisibleAccounts(p => ({ ...p, realEstate: !p.realEstate }))}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition text-[11px] ${
                visibleAccounts.realEstate
                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Real Estate
            </button>
          </div>

        </div>
      </div>

      {/* WHAT-IF SENSITIVITY INTERACTIVE PANEL */}
      {showWhatIfToggle && whatIfSettings.isActive && whatIfResult && (
        <WhatIfSensitivityPanel
          whatIfResult={whatIfResult}
          onApplyPreset={(presetSettings) => {
            setWhatIfSettings((prev) => ({
              ...prev,
              ...presetSettings
            }));
          }}
          onUpdateDelta={(field, value) => {
            setWhatIfSettings((prev) => ({
              ...prev,
              [field]: value
            }));
          }}
          onReset={resetWhatIfSettings}
        />
      )}

      {/* Stress Test Live Impact Alert Banner */}
      {showStressTestToggle && isStressTestActive && (
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition animate-in fade-in duration-200 ${
          passesStressTest
            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
            : 'bg-rose-50/80 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-start gap-2.5">
            <span className="p-1 rounded-md bg-white border border-amber-200 text-amber-700 shrink-0 mt-0.5">
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  Market Stress Test Active (-10% Downturn Shock {stressTiming === 'at_retirement' ? 'at Retirement' : stressTiming === 'immediate' ? 'Immediate' : 'Custom Age'})
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  passesStressTest
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {passesStressTest ? 'Plan Survives 10% Downturn' : 'Vulnerable to Shock'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {passesStressTest
                  ? `Your portfolio cushions the 10% market crash and remains funded through age ${maxAge} with $${Math.round(stressEndNW / 1000)}k remaining.`
                  : `A 10% shock accelerates depletion: assets run out at Age ${stressDepletionYear} (${baselineDepletionYear ? `vs Age ${baselineDepletionYear}` : 'instead of fully funded'}).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono text-[11px] bg-white/80 px-3 py-1.5 rounded-lg border border-amber-200/60 self-start sm:self-auto">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Retire Nest Egg</span>
              <span className="font-bold text-slate-800">${Math.round(stressRetireNW / 1000)}k</span>
              <span className="text-[10px] text-rose-600 ml-1 font-semibold">({formatCurrency(retireDelta)})</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Container */}
      <div className="relative w-full overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[620px] select-none"
        >
          <defs>
            <linearGradient id="totalNetWorthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="stressBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.10" />
            </linearGradient>

            <linearGradient id="whatIfBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.06" />
            </linearGradient>

            <linearGradient id="rrspGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="tfsaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="fhsaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="nonRegGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="realEstateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="var(--chart-text-muted)"
                  className="text-[10px] font-mono"
                >
                  {formatCurrency(tickVal)}
                </text>
              </g>
            );
          })}

          {/* X Axis & Ticks */}
          {xTicks.map((d) => {
            const x = getX(d.age);
            return (
              <g key={d.age}>
                <line
                  x1={x}
                  y1={padding.top + chartHeight}
                  x2={x}
                  y2={padding.top + chartHeight + 6}
                  stroke="var(--chart-axis)"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={padding.top + chartHeight + 18}
                  textAnchor="middle"
                  fill="var(--chart-text-secondary)"
                  className="text-[10px] font-mono font-medium"
                >
                  Age {d.age}
                </text>
              </g>
            );
          })}

          {/* Vertical Milestone: Target Retirement Age */}
          {retirementAge >= minAge && retirementAge <= maxAge && (
            <g>
              <line
                x1={getX(retirementAge)}
                y1={padding.top}
                x2={getX(retirementAge)}
                y2={padding.top + chartHeight}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <rect
                x={getX(retirementAge) - 34}
                y={padding.top - 22}
                width="68"
                height="18"
                rx="4"
                fill="#10b981"
              />
              <text
                x={getX(retirementAge)}
                y={padding.top - 10}
                textAnchor="middle"
                fill="#ffffff"
                className="text-[9.5px] font-bold"
              >
                Retire ({retirementAge})
              </text>
            </g>
          )}

          {/* Vertical Milestone: Age 71 RRIF Mandatory Conversion */}
          {71 >= minAge && 71 <= maxAge && (
            <g>
              <line
                x1={getX(71)}
                y1={padding.top + 10}
                x2={getX(71)}
                y2={padding.top + chartHeight}
                stroke="var(--chart-milestone-line)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={getX(71)}
                y={padding.top + 22}
                textAnchor="middle"
                fill="var(--chart-milestone-text)"
                className="text-[9px] font-semibold"
              >
                Age 71 RRIF Roll
              </text>
            </g>
          )}

          {/* Stacked Bars by Account */}
          {yearlyResults.map((d, idx) => {
            const x = getX(d.age);
            const barWidth = Math.max(3, (chartWidth / yearlyResults.length) * 0.72);

            let currentBottomY = padding.top + chartHeight;

            // Non-Reg
            const nonRegHeight = visibleAccounts.nonReg
              ? (d.nonRegBalance / yDomainMax) * chartHeight
              : 0;
            const nonRegY = currentBottomY - nonRegHeight;
            currentBottomY = nonRegY;

            // FHSA
            const fhsaHeight = visibleAccounts.fhsa
              ? (d.fhsaBalance / yDomainMax) * chartHeight
              : 0;
            const fhsaY = currentBottomY - fhsaHeight;
            currentBottomY = fhsaY;

            // TFSA
            const tfsaHeight = visibleAccounts.tfsa
              ? (d.tfsaBalance / yDomainMax) * chartHeight
              : 0;
            const tfsaY = currentBottomY - tfsaHeight;
            currentBottomY = tfsaY;

            // RRSP / RRIF
            const rrspHeight = visibleAccounts.rrsp
              ? (d.rrspBalance / yDomainMax) * chartHeight
              : 0;
            const rrspY = currentBottomY - rrspHeight;
            currentBottomY = rrspY;

            // Real Estate Equity
            const realEstateHeight = visibleAccounts.realEstate && d.realEstateShare > 0
              ? (d.realEstateShare / yDomainMax) * chartHeight
              : 0;
            const realEstateY = currentBottomY - realEstateHeight;

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={d.age}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Hit test invisible wider rect */}
                <rect
                  x={x - (chartWidth / yearlyResults.length) / 2}
                  y={padding.top}
                  width={chartWidth / yearlyResults.length}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Non-Reg rect */}
                {visibleAccounts.nonReg && nonRegHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={nonRegY}
                    width={barWidth}
                    height={nonRegHeight}
                    fill="url(#nonRegGrad)"
                    stroke="#8b5cf6"
                    strokeWidth="0.5"
                    rx="1"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* FHSA rect */}
                {visibleAccounts.fhsa && fhsaHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={fhsaY}
                    width={barWidth}
                    height={fhsaHeight}
                    fill="url(#fhsaGrad)"
                    stroke="#f59e0b"
                    strokeWidth="0.5"
                    rx="1"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* TFSA rect */}
                {visibleAccounts.tfsa && tfsaHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={tfsaY}
                    width={barWidth}
                    height={tfsaHeight}
                    fill="url(#tfsaGrad)"
                    stroke="#10b981"
                    strokeWidth="0.5"
                    rx="1"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* RRSP rect */}
                {visibleAccounts.rrsp && rrspHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={rrspY}
                    width={barWidth}
                    height={rrspHeight}
                    fill="url(#rrspGrad)"
                    stroke="#3b82f6"
                    strokeWidth="0.5"
                    rx="1"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* Real Estate Equity rect */}
                {visibleAccounts.realEstate && realEstateHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={realEstateY}
                    width={barWidth}
                    height={realEstateHeight}
                    fill="url(#realEstateGrad)"
                    stroke="#f97316"
                    strokeWidth="0.5"
                    rx="1"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* Home Sold Milestone Marker */}
                {d.homeSoldThisYear && (
                  <g pointerEvents="none">
                    <line
                      x1={x}
                      y1={padding.top + 28}
                      x2={x}
                      y2={padding.top + chartHeight}
                      stroke="#ea580c"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle cx={x} cy={padding.top + 28} r="4.5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={x}
                      y={padding.top + 20}
                      textAnchor="middle"
                      fill="#ea580c"
                      className="text-[9px] font-bold"
                    >
                      🏡 Sold
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Area under baseline total line */}
          {visibleAccounts.totalLine && (
            <g pointerEvents="none">
              <path
                d={baselineAreaPath}
                fill="url(#totalNetWorthGrad)"
              />

              {/* Baseline Total Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={linePoints}
              />
            </g>
          )}

          {/* MARKET STRESS TEST VISUALIZATION */}
          {showStressTestToggle && isStressTestActive && stressYearlyResults && (
            <g pointerEvents="none">
              {/* Shaded Impact Band between baseline and stress curve */}
              {stressBandPath && (
                <path
                  d={stressBandPath}
                  fill="url(#stressBandGrad)"
                  stroke="#f59e0b"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Stress-Tested Net Worth Line */}
              <polyline
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={stressLinePoints}
              />

              {/* Shock Marker Flag */}
              {stressTiming === 'at_retirement' && (
                <g>
                  <circle
                    cx={getX(retirementAge)}
                    cy={getY(stressRetireNW)}
                    r="5"
                    fill="#d97706"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <rect
                    x={getX(retirementAge) - 30}
                    y={getY(stressRetireNW) + 8}
                    width="60"
                    height="16"
                    rx="3"
                    fill="#d97706"
                  />
                  <text
                    x={getX(retirementAge)}
                    y={getY(stressRetireNW) + 19}
                    textAnchor="middle"
                    fill="#ffffff"
                    className="text-[8.5px] font-bold"
                  >
                    -10% Shock
                  </text>
                </g>
              )}
            </g>
          )}

          {/* WHAT-IF SENSITIVITY VISUALIZATION */}
          {(showWhatIfToggle || showWhatIfOverlayLine) && whatIfSettings.isActive && whatIfYearlyResults && whatIfResult && (
            <g pointerEvents="none">
              {/* Shaded Impact Band between baseline and What-If curve */}
              {whatIfBandPath && (
                <path
                  d={whatIfBandPath}
                  fill="url(#whatIfBandGrad)"
                  stroke="#a855f7"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
              )}

              {/* What-If Net Worth Polyline */}
              <polyline
                fill="none"
                stroke="#9333ea"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={whatIfLinePoints}
              />

              {/* Shifted What-If Crossover Point Marker */}
              {whatIfResult.crossoverImpact.whatIfAge !== null && (() => {
                const row = whatIfYearlyResults.find((r) => r.age === whatIfResult.crossoverImpact.whatIfAge);
                if (!row) return null;
                const x = getX(row.age);
                const y = getY(row.totalNetWorth);
                return (
                  <g key="whatif-crossover-marker">
                    <circle
                      cx={x}
                      cy={y}
                      r="5.5"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <rect
                      x={x - 48}
                      y={Math.max(padding.top - 2, y - 24)}
                      width="96"
                      height="18"
                      rx="4"
                      fill="#065f46"
                      stroke="#34d399"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={Math.max(padding.top - 2, y - 24) + 12.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      className="text-[9px] font-bold"
                    >
                      🚀 Crossover (A{row.age})
                    </text>
                  </g>
                );
              })()}

              {/* Shifted What-If Coast FIRE Marker */}
              {whatIfResult.coastFireImpact.whatIfAge !== null && (() => {
                const row = whatIfYearlyResults.find((r) => r.age === whatIfResult.coastFireImpact.whatIfAge);
                if (!row) return null;
                const x = getX(row.age);
                const y = getY(row.totalNetWorth);
                return (
                  <g key="whatif-coastfire-marker">
                    <circle
                      cx={x}
                      cy={y}
                      r="5.5"
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <rect
                      x={x - 52}
                      y={Math.max(padding.top - 2, y - 24)}
                      width="104"
                      height="18"
                      rx="4"
                      fill="#0e7490"
                      stroke="#22d3ee"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={Math.max(padding.top - 2, y - 24) + 12.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      className="text-[9px] font-bold"
                    >
                      ⚓ Coast FIRE (A{row.age})
                    </text>
                  </g>
                );
              })()}

              {/* What-If Cashflow at Retirement Pin */}
              {(() => {
                const row = whatIfYearlyResults.find((r) => r.age === retirementAge);
                if (!row) return null;
                const x = getX(retirementAge);
                const y = getY(row.totalNetWorth);
                const monthly = Math.round(row.netSpendableCashflow / 12);
                const deltaMonthly = Math.round(whatIfResult.retirementCashflow.deltaNominalMonthly);
                return (
                  <g key="whatif-retire-cashflow-pin">
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="#7c3aed"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <rect
                      x={x - 58}
                      y={Math.min(padding.top + chartHeight - 22, y + 8)}
                      width="116"
                      height="20"
                      rx="4"
                      fill="#581c87"
                      stroke="#c084fc"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={Math.min(padding.top + chartHeight - 22, y + 8) + 13.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      className="text-[9px] font-bold"
                    >
                      💵 ${monthly.toLocaleString()}/mo ({deltaMonthly >= 0 ? '+' : ''}${deltaMonthly})
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Hover Crosshair Marker */}
          {hoveredIndex !== null && hoveredData && (
            <g pointerEvents="none">
              <line
                x1={getX(hoveredData.age)}
                y1={padding.top}
                x2={getX(hoveredData.age)}
                y2={padding.top + chartHeight}
                stroke="var(--chart-crosshair)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredData.age)}
                cy={getY(hoveredData.totalNetWorth)}
                r="5"
                fill="#10b981"
                stroke="var(--chart-marker-stroke)"
                strokeWidth="2"
              />

              {showStressTestToggle && isStressTestActive && hoveredStressData && (
                <circle
                  cx={getX(hoveredStressData.age)}
                  cy={getY(hoveredStressData.totalNetWorth)}
                  r="4"
                  fill="#d97706"
                  stroke="var(--chart-marker-stroke)"
                  strokeWidth="1.5"
                />
              )}

              {(showWhatIfToggle || showWhatIfOverlayLine) && whatIfSettings.isActive && hoveredWhatIfData && (
                <circle
                  cx={getX(hoveredWhatIfData.age)}
                  cy={getY(hoveredWhatIfData.totalNetWorth)}
                  r="4.5"
                  fill="#9333ea"
                  stroke="var(--chart-marker-stroke)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredData && (
          <div
            className="absolute z-20 top-2 pointer-events-none transition-all duration-75 shadow-lg rounded-xl bg-slate-900/95 text-white p-3 border border-slate-700 text-xs backdrop-blur-sm"
            style={{
              left: `${Math.min(
                70,
                Math.max(5, ((hoveredData.age - minAge) / ageSpan) * 100)
              )}%`
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-700/80 pb-1.5 mb-1.5">
              <span className="font-bold text-sm text-zinc-100">
                Age {hoveredData.age}{' '}
                <span className="text-[11px] font-normal text-zinc-400">
                  ({hoveredData.isRetired ? 'Retirement Phase' : 'Working Phase'})
                </span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ${hoveredData.totalNetWorth.toLocaleString()}
              </span>
            </div>

            {/* If Stress Test is active and enabled for chart, display side-by-side comparison in tooltip */}
            {showStressTestToggle && isStressTestActive && hoveredStressData && (
              <div className="mb-2 p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/50 flex flex-col gap-0.5 font-mono text-[11px]">
                <div className="flex justify-between text-amber-300">
                  <span className="flex items-center gap-1 font-sans">
                    <TrendingDown className="w-3 h-3 text-amber-400" />
                    Stress-Tested NW:
                  </span>
                  <span className="font-bold">${hoveredStressData.totalNetWorth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400 text-[10.5px]">
                  <span className="font-sans">Downturn Impact:</span>
                  <span>
                    -${(hoveredData.totalNetWorth - hoveredStressData.totalNetWorth).toLocaleString()}{' '}
                    ({hoveredData.totalNetWorth > 0 ? -Math.round(((hoveredData.totalNetWorth - hoveredStressData.totalNetWorth) / hoveredData.totalNetWorth) * 100) : 0}%)
                  </span>
                </div>
              </div>
            )}

            {/* If What-If is active and enabled for chart, display side-by-side comparison in tooltip */}
            {(showWhatIfToggle || showWhatIfOverlayLine) && whatIfSettings.isActive && hoveredWhatIfData && (
              <div className="mb-2 p-1.5 rounded-lg bg-purple-950/70 border border-purple-700/60 flex flex-col gap-0.5 font-mono text-[11px]">
                <div className="flex justify-between text-purple-300">
                  <span className="flex items-center gap-1 font-sans font-bold">
                    <Sliders className="w-3 h-3 text-purple-400" />
                    What-If Net Worth:
                  </span>
                  <span className="font-bold text-white">${hoveredWhatIfData.totalNetWorth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10.5px]">
                  <span className="font-sans text-slate-400">Net Worth Delta:</span>
                  <span className={hoveredWhatIfData.totalNetWorth >= hoveredData.totalNetWorth ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {hoveredWhatIfData.totalNetWorth >= hoveredData.totalNetWorth ? '+' : ''}
                    ${(hoveredWhatIfData.totalNetWorth - hoveredData.totalNetWorth).toLocaleString()}{' '}
                    ({hoveredData.totalNetWorth > 0 ? (hoveredWhatIfData.totalNetWorth >= hoveredData.totalNetWorth ? '+' : '') + Math.round(((hoveredWhatIfData.totalNetWorth - hoveredData.totalNetWorth) / hoveredData.totalNetWorth) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between text-[10.5px]">
                  <span className="font-sans text-slate-400">Spendable Cashflow:</span>
                  <span className="text-purple-200">
                    ${Math.round(hoveredWhatIfData.netSpendableCashflow / 12).toLocaleString()}/mo
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-blue-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  RRSP/RRIF:
                </span>
                <span>${hoveredData.rrspBalance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  TFSA:
                </span>
                <span>${hoveredData.tfsaBalance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  FHSA:
                </span>
                <span>${hoveredData.fhsaBalance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Non-Reg:
                </span>
                <span>${hoveredData.nonRegBalance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-orange-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  Home Equity:
                </span>
                <span>${(hoveredData.realEstateShare || 0).toLocaleString()}</span>
              </div>

              {hoveredData.remainingDebt > 0 && (
                <div className="flex items-center justify-between gap-2 col-span-2 border-t border-slate-800/80 pt-1 text-rose-400 font-semibold">
                  <span className="flex items-center gap-1 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Remaining Debt Liability:
                  </span>
                  <span>-${hoveredData.remainingDebt.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Real Estate Sale Event Callout */}
            {hoveredData.homeSoldThisYear && (
              <div className="mt-2 p-1.5 rounded-lg bg-orange-950/80 border border-orange-600/70 text-orange-200 text-[10.5px]">
                <span className="font-bold block text-orange-300">🏡 Home Disposed / Downsized:</span>
                <span>
                  +${hoveredData.homeSaleProceeds.toLocaleString()} net proceeds deposited into Taxable Non-Reg Account (100% Tax-Free PRE).
                </span>
              </div>
            )}

            {/* Income & Tax info for this year */}
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10.5px] text-slate-300 flex flex-col gap-0.5">
              {hoveredData.debtPayment > 0 && (
                <div className="flex justify-between text-rose-300 font-medium">
                  <span className="text-slate-400">Debt Repayment Service:</span>
                  <span>-${hoveredData.debtPayment.toLocaleString()}/yr</span>
                </div>
              )}
              {hoveredData.isRetired ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Spendable Cashflow:</span>
                    <span className="font-semibold text-emerald-400">${hoveredData.netSpendableCashflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Tax Paid (Eff. Rate):</span>
                    <span className="text-rose-300">${hoveredData.totalTaxPaid.toLocaleString()} ({(hoveredData.effectiveTaxRate * 100).toFixed(1)}%)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Employment Income:</span>
                    <span>${hoveredData.employmentIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Annual Saved / Invested:</span>
                    <span className="text-emerald-400">
                      ${(hoveredData.rrspContribution + hoveredData.tfsaContribution + hoveredData.fhsaContribution + hoveredData.nonRegContribution).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {hoveredData.notes.length > 0 && (
              <div className="mt-1.5 text-[10px] text-amber-300 bg-amber-950/60 p-1 rounded border border-amber-800/40">
                {hoveredData.notes[0]}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export const NetWorthChart = React.memo(NetWorthChartComponent);
