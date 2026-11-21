import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  Scale,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Layers,
  Landmark,
  Eye,
  EyeOff
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore } from '../../store/useSimulationStore';
import { SectionCollapseButton } from '../SectionCollapseButton';

type ViewMode = 'balance_sheet' | 'breakdown';
type HorizonFilter = 'all' | 'working' | 'retirement';

interface NetWorthTimelinePoint {
  age: number;
  year: number;
  isRetired: boolean;
  liquidAssets: number;
  realEstateAssets: number;
  totalAssets: number;
  mortgageLiability: number;
  consumerDebtLiability: number;
  totalLiabilities: number;
  /** Negative values for clean diverging balance-sheet visualization below $0 */
  negativeTotalLiabilities: number;
  negativeMortgage: number;
  negativeConsumerDebt: number;
  netWorth: number;
}

function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}k`;
  }
  return `${sign}$${Math.round(abs).toLocaleString('en-CA')}`;
}

function formatFullCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString('en-CA')}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: NetWorthTimelinePoint }>;
}

const BalanceSheetTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const equityRatio =
    point.totalAssets > 0
      ? Math.max(0, Math.min(100, Math.round((point.netWorth / point.totalAssets) * 100)))
      : 100;

  return (
    <div className="w-64 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-xl p-3.5 text-xs">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            Age {point.age}
          </span>
          <span className="ml-1.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
            ({point.year})
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            point.isRetired
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50'
              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/50'
          }`}
        >
          {point.isRetired ? 'Retirement' : 'Accumulation'}
        </span>
      </div>

      {/* Assets Section */}
      <div className="space-y-1 mb-2.5">
        <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Total Assets</span>
          </span>
          <span className="font-mono">{formatFullCurrency(point.totalAssets)}</span>
        </div>
        <div className="pl-3.5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Liquid Portfolio</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {formatFullCurrency(point.liquidAssets)}
            </span>
          </div>
          {point.realEstateAssets > 0 && (
            <div className="flex items-center justify-between">
              <span>Real Estate Value</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatFullCurrency(point.realEstateAssets)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Liabilities Section */}
      <div className="space-y-1 mb-2.5">
        <div className="flex items-center justify-between font-bold text-rose-600 dark:text-rose-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Total Liabilities</span>
          </span>
          <span className="font-mono">
            {point.totalLiabilities > 0 ? `-${formatFullCurrency(point.totalLiabilities)}` : '$0'}
          </span>
        </div>
        {point.totalLiabilities > 0 && (
          <div className="pl-3.5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {point.mortgageLiability > 0 && (
              <div className="flex items-center justify-between">
                <span>Mortgage Balance</span>
                <span className="font-mono text-rose-600/90 dark:text-rose-400/90">
                  -{formatFullCurrency(point.mortgageLiability)}
                </span>
              </div>
            )}
            {point.consumerDebtLiability > 0 && (
              <div className="flex items-center justify-between">
                <span>Consumer Debt</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  -{formatFullCurrency(point.consumerDebtLiability)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Net Worth Footer */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
            <span className="w-2.5 h-0.5 bg-indigo-500 rounded-full" />
            <span>Net Worth</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {equityRatio}% debt-free equity
          </span>
        </div>
        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
          {formatFullCurrency(point.netWorth)}
        </span>
      </div>
    </div>
  );
};

export const NetWorthOverTimeVisualizer: React.FC = React.memo(() => {
  const { yearlyResults, summary, retirementAge, lifeExpectancy, theme } = useSimulationStore(
    useShallow((state) => ({
      yearlyResults: state.yearlyResults,
      summary: state.summary,
      retirementAge: state.inputs.retirementAge,
      lifeExpectancy: state.inputs.lifeExpectancy,
      theme: state.theme
    }))
  );

  const isCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.netWorthOverTime));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const [viewMode, setViewMode] = useState<ViewMode>('balance_sheet');
  const [horizon, setHorizon] = useState<HorizonFilter>('all');
  const [showAssets, setShowAssets] = useState<boolean>(true);
  const [showLiabilities, setShowLiabilities] = useState<boolean>(true);
  const [showNetWorthLine, setShowNetWorthLine] = useState<boolean>(true);

  const isDark = theme === 'dark';

  // Transform yearly simulation ledger into reconciled Assets vs. Liabilities timeline
  const fullSeries = useMemo<NetWorthTimelinePoint[]>(() => {
    if (!yearlyResults || yearlyResults.length === 0) return [];

    return yearlyResults.map((yr) => {
      const liquidAssets =
        (yr.rrspBalance || 0) +
        (yr.rrifBalance || 0) +
        (yr.tfsaBalance || 0) +
        (yr.fhsaBalance || 0) +
        (yr.nonRegBalance || 0);

      const ownershipRatio =
        yr.homeEquity > 0
          ? Math.min(1, Math.max(0, (yr.realEstateShare || 0) / yr.homeEquity))
          : yr.homeValue > 0
          ? 1
          : 0;

      const mortgageLiability = Math.max(
        0,
        Math.round((yr.remainingMortgage || 0) * ownershipRatio)
      );
      const consumerDebtLiability = Math.max(0, Math.round(yr.remainingDebt || 0));

      // Ownership-adjusted real estate gross value ensures exact identity:
      // totalAssets - totalLiabilities === liquidAssets + realEstateShare - remainingDebt === totalNetWorth
      const realEstateAssets = Math.max(
        0,
        Math.round((yr.realEstateShare || 0) + mortgageLiability)
      );
      const totalAssets = Math.round(liquidAssets + realEstateAssets);
      const totalLiabilities = Math.round(mortgageLiability + consumerDebtLiability);
      const netWorth = Math.round(totalAssets - totalLiabilities);

      return {
        age: yr.age,
        year: yr.year,
        isRetired: yr.isRetired,
        liquidAssets: Math.round(liquidAssets),
        realEstateAssets,
        totalAssets,
        mortgageLiability,
        consumerDebtLiability,
        totalLiabilities,
        negativeTotalLiabilities: -totalLiabilities,
        negativeMortgage: -mortgageLiability,
        negativeConsumerDebt: -consumerDebtLiability,
        netWorth
      };
    });
  }, [yearlyResults]);

  const chartData = useMemo(() => {
    if (horizon === 'working') {
      const working = fullSeries.filter((p) => !p.isRetired);
      return working.length > 0 ? working : fullSeries;
    }
    if (horizon === 'retirement') {
      const retired = fullSeries.filter((p) => p.isRetired);
      return retired.length > 0 ? retired : fullSeries;
    }
    return fullSeries;
  }, [fullSeries, horizon]);

  const metrics = useMemo(() => {
    if (fullSeries.length === 0) {
      return {
        peakAssets: 0,
        peakAssetsAge: retirementAge,
        startingLiabilities: 0,
        peakLiabilities: 0,
        retirementLiabilities: 0,
        debtFreeAge: null as number | null,
        hasAnyLiabilities: false,
        netWorthAtRetire: 0,
        terminalNetWorth: 0
      };
    }

    let peakAssets = 0;
    let peakAssetsAge = fullSeries[0].age;
    let peakLiabilities = 0;
    let hadLiability = false;
    let debtFreeAge: number | null = null;

    for (const pt of fullSeries) {
      if (pt.totalAssets > peakAssets) {
        peakAssets = pt.totalAssets;
        peakAssetsAge = pt.age;
      }
      if (pt.totalLiabilities > peakLiabilities) {
        peakLiabilities = pt.totalLiabilities;
      }
      if (pt.totalLiabilities > 0) {
        hadLiability = true;
        debtFreeAge = null;
      } else if (hadLiability && debtFreeAge === null) {
        debtFreeAge = pt.age;
      }
    }

    const retirementPoint =
      fullSeries.find((p) => p.age === retirementAge) || fullSeries[fullSeries.length - 1];
    const terminalPoint = fullSeries[fullSeries.length - 1];

    return {
      peakAssets,
      peakAssetsAge,
      startingLiabilities: fullSeries[0].totalLiabilities,
      peakLiabilities,
      retirementLiabilities: retirementPoint?.totalLiabilities ?? 0,
      debtFreeAge,
      hasAnyLiabilities: peakLiabilities > 0,
      netWorthAtRetire: retirementPoint?.netWorth ?? summary.netWorthAtRetirement,
      terminalNetWorth: terminalPoint?.netWorth ?? summary.netWorthAtLifeExpectancy
    };
  }, [fullSeries, retirementAge, summary]);

  const hasRetirementInRange = useMemo(
    () => chartData.some((d) => d.age === retirementAge),
    [chartData, retirementAge]
  );

  const hasDebtFreeInRange = useMemo(
    () =>
      metrics.debtFreeAge !== null &&
      chartData.some((d) => d.age === metrics.debtFreeAge),
    [chartData, metrics.debtFreeAge]
  );

  if (chartData.length === 0) return null;

  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const axisTickColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <section
      aria-label="Net Worth Over Time: Assets versus Liabilities"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors"
    >
      {/* Header Toolbar */}
      <div
        className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${
          isCollapsed ? '' : 'border-b border-slate-100 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Net Worth Over Time
              </h3>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
                Assets vs. Liabilities
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Projected balance sheet tracking total asset accumulation against mortgages & consumer debt through Age {lifeExpectancy}
            </p>
          </div>
        </div>

        {/* Interactive View, Horizon Controls & Collapse Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {!isCollapsed && (
            <>
              {/* View Mode Switcher */}
              <div
                role="group"
                aria-label="Chart display mode"
                className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('balance_sheet')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === 'balance_sheet'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Balance Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('breakdown')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === 'breakdown'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Asset & Debt Split
                </button>
              </div>

              {/* Phase Horizon Filter */}
              <div
                role="group"
                aria-label="Timeline horizon filter"
                className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold"
              >
                {(
                  [
                    { id: 'all', label: 'Full Timeline' },
                    { id: 'working', label: 'Working' },
                    { id: 'retirement', label: 'Retirement' }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHorizon(opt.id)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      horizon === opt.id
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <SectionCollapseButton
            isCollapsed={isCollapsed}
            onToggle={() => toggleSectionCollapse('netWorthOverTime')}
            sectionLabel="Net Worth Over Time Visualizer"
          />
        </div>
      </div>

      {!isCollapsed && (
        <>

      {/* Balance Sheet Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:px-5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Peak Total Assets</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
            {formatCompactCurrency(metrics.peakAssets)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Reached at Age {metrics.peakAssetsAge}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:px-5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <CreditCard className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Peak Liabilities</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {metrics.hasAnyLiabilities ? formatCompactCurrency(metrics.peakLiabilities) : '$0'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {metrics.debtFreeAge !== null
              ? `Debt-free by Age ${metrics.debtFreeAge}`
              : metrics.hasAnyLiabilities
              ? `${formatCompactCurrency(metrics.retirementLiabilities)} at Age ${retirementAge}`
              : 'No mortgage or loan debt'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:px-5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Landmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Net Worth @ Age {retirementAge}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
            {formatCompactCurrency(metrics.netWorthAtRetire)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Assets minus liabilities at retirement
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:px-5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>Ending Net Worth</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
            {formatCompactCurrency(metrics.terminalNetWorth)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Projected estate @ Age {lifeExpectancy}
          </div>
        </div>
      </div>

      {/* Interactive Series Toggle Legend */}
      <div className="px-4 sm:px-5 pt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAssets((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
              showAssets
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span>{viewMode === 'balance_sheet' ? 'Total Assets' : 'Liquid + Real Estate'}</span>
            {showAssets ? <Eye className="w-3 h-3 opacity-60" /> : <EyeOff className="w-3 h-3 opacity-60" />}
          </button>

          <button
            type="button"
            onClick={() => setShowLiabilities((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
              showLiabilities
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
            <span>{viewMode === 'balance_sheet' ? 'Total Liabilities' : 'Mortgage + Consumer Debt'}</span>
            {showLiabilities ? <Eye className="w-3 h-3 opacity-60" /> : <EyeOff className="w-3 h-3 opacity-60" />}
          </button>

          <button
            type="button"
            onClick={() => setShowNetWorthLine((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
              showNetWorthLine
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
            }`}
          >
            <span className="w-3 h-0.5 rounded-full bg-indigo-500" />
            <span>Net Worth</span>
            {showNetWorthLine ? <Eye className="w-3 h-3 opacity-60" /> : <EyeOff className="w-3 h-3 opacity-60" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Layers className="w-3.5 h-3.5" />
          <span>
            {metrics.hasAnyLiabilities
              ? 'Liabilities plotted below $0 baseline for direct equity comparison'
              : 'Hover any age to inspect exact asset & net worth composition'}
          </span>
        </div>
      </div>

      {/* Recharts Responsive Container */}
      <div className="p-3 sm:p-5 h-[340px] sm:h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 18, right: 16, left: 6, bottom: 8 }}
          >
            <defs>
              <linearGradient id="nwTotalAssetsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.34} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="nwLiquidAssetsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.38} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="nwRealEstateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="nwLiabilitiesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.42} />
              </linearGradient>
              <linearGradient id="nwConsumerDebtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.45} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />

            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: axisTickColor }}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
              tickFormatter={(age) => `${age}`}
              minTickGap={22}
            />

            <YAxis
              tick={{ fontSize: 11, fill: axisTickColor }}
              tickLine={false}
              axisLine={false}
              width={66}
              tickFormatter={(v) => formatCompactCurrency(Number(v))}
            />

            <Tooltip
              content={<BalanceSheetTooltip />}
              cursor={{
                stroke: isDark ? '#475569' : '#94a3b8',
                strokeWidth: 1,
                strokeDasharray: '4 4'
              }}
            />

            {/* Zero Balance Sheet Baseline */}
            <ReferenceLine
              y={0}
              stroke={isDark ? '#475569' : '#94a3b8'}
              strokeWidth={1.25}
            />

            {/* Retirement Age Marker */}
            {hasRetirementInRange && (
              <ReferenceLine
                x={retirementAge}
                stroke="#6366f1"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Retire (${retirementAge})`,
                  position: 'insideTopRight',
                  fill: isDark ? '#a5b4fc' : '#4f46e5',
                  fontSize: 11,
                  fontWeight: 700
                }}
              />
            )}

            {/* Debt-Free Milestone Marker */}
            {hasDebtFreeInRange && metrics.debtFreeAge !== null && metrics.debtFreeAge !== retirementAge && (
              <ReferenceLine
                x={metrics.debtFreeAge}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth={1.25}
                label={{
                  value: `Debt-Free (${metrics.debtFreeAge})`,
                  position: 'insideBottomRight',
                  fill: isDark ? '#6ee7b7' : '#059669',
                  fontSize: 10,
                  fontWeight: 700
                }}
              />
            )}

            {/* Mode 1: Balance Sheet (Total Assets vs Total Liabilities) */}
            {viewMode === 'balance_sheet' && showAssets && (
              <Area
                type="monotone"
                dataKey="totalAssets"
                name="Total Assets"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#nwTotalAssetsGrad)"
                isAnimationActive={false}
              />
            )}

            {viewMode === 'balance_sheet' && showLiabilities && metrics.hasAnyLiabilities && (
              <Area
                type="monotone"
                dataKey="negativeTotalLiabilities"
                name="Total Liabilities"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#nwLiabilitiesGrad)"
                isAnimationActive={false}
              />
            )}

            {/* Mode 2: Stacked Asset & Liability Breakdown */}
            {viewMode === 'breakdown' && showAssets && (
              <>
                <Area
                  type="monotone"
                  dataKey="liquidAssets"
                  stackId="assets"
                  name="Liquid Portfolio"
                  stroke="#10b981"
                  strokeWidth={1.75}
                  fill="url(#nwLiquidAssetsGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="realEstateAssets"
                  stackId="assets"
                  name="Real Estate Value"
                  stroke="#0ea5e9"
                  strokeWidth={1.75}
                  fill="url(#nwRealEstateGrad)"
                  isAnimationActive={false}
                />
              </>
            )}

            {viewMode === 'breakdown' && showLiabilities && metrics.hasAnyLiabilities && (
              <>
                <Area
                  type="monotone"
                  dataKey="negativeMortgage"
                  stackId="liabilities"
                  name="Mortgage Balance"
                  stroke="#f43f5e"
                  strokeWidth={1.75}
                  fill="url(#nwLiabilitiesGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="negativeConsumerDebt"
                  stackId="liabilities"
                  name="Consumer Debt"
                  stroke="#f59e0b"
                  strokeWidth={1.75}
                  fill="url(#nwConsumerDebtGrad)"
                  isAnimationActive={false}
                />
              </>
            )}

            {/* Net Worth Line Overlay */}
            {showNetWorthLine && (
              <Line
                type="monotone"
                dataKey="netWorth"
                name="Net Worth"
                stroke={isDark ? '#818cf8' : '#4f46e5'}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: isDark ? '#818cf8' : '#4f46e5',
                  stroke: isDark ? '#0f172a' : '#ffffff',
                  strokeWidth: 2
                }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
        </>
      )}
    </section>
  );
});

NetWorthOverTimeVisualizer.displayName = 'NetWorthOverTimeVisualizer';
