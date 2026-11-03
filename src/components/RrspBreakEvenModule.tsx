import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  DollarSign,
  AlertTriangle,
  Flame,
  Check,
  RotateCcw
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import {
  calculateRrspBreakEvenAnalysis,
  MeltdownTargetStrategy,
  RrspBreakEvenAgePoint
} from '../utils/rrspBreakEvenCalculator';

export const RrspBreakEvenModule: React.FC = () => {
  const inputs = useSimulationStore((state) => state.inputs);
  const updateField = useSimulationStore((state) => state.updateField);
  const setInputs = useSimulationStore((state) => state.setInputs);
  const storeIsCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.breakEven));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const setSectionCollapse = useSimulationStore((state) => state.setSectionCollapse);

  const isCollapsed = storeIsCollapsed;
  const setIsCollapsed = (collapsed: boolean | ((prev: boolean) => boolean)) => {
    if (typeof collapsed === 'function') {
      toggleSectionCollapse('breakEven');
    } else {
      setSectionCollapse('breakEven', collapsed);
    }
  };
  const [targetStrategy, setTargetStrategy] = useState<MeltdownTargetStrategy>(
    inputs.meltdownTargetStrategy || 'bracket1'
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Sync targetStrategy with store inputs if changed elsewhere
  useEffect(() => {
    if (inputs.meltdownTargetStrategy && inputs.meltdownTargetStrategy !== targetStrategy) {
      setTargetStrategy(inputs.meltdownTargetStrategy);
    }
  }, [inputs.meltdownTargetStrategy]);

  // Run the break-even analysis whenever inputs or target strategy change
  const analysis = useMemo(() => {
    return calculateRrspBreakEvenAnalysis(inputs, targetStrategy);
  }, [inputs, targetStrategy]);

  const formatCur = (val: number) => `$${Math.round(val).toLocaleString()}`;

  const isMeltdownActive = inputs.drawdownStrategy === 'rrsp_meltdown';
  const activeStartAge = inputs.meltdownStartAge ?? analysis.optimalAge;
  const activeCeiling = inputs.meltdownTargetStrategy ?? targetStrategy;

  const handleApplyMeltdown = (startAge?: number) => {
    const ageToApply = startAge ?? analysis.optimalAge;
    setInputs((prev) => ({
      ...prev,
      drawdownStrategy: 'rrsp_meltdown',
      meltdownTargetStrategy: targetStrategy,
      meltdownStartAge: ageToApply
    }));
  };

  const handleRevertToHold = () => {
    updateField('drawdownStrategy', 'tax_efficient');
  };

  const handleSelectStrategy = (strat: MeltdownTargetStrategy) => {
    setTargetStrategy(strat);
    if (isMeltdownActive) {
      updateField('meltdownTargetStrategy', strat);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
      
      {/* Header Bar (Collapsible Toggle) */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
          !isCollapsed ? 'border-b border-slate-100 dark:border-slate-800' : ''
        }`}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                RRSP/RRIF Break-Even Withdrawal Analysis
              </h3>
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                Actuarial Tax Optimization
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculates the exact age at which early RRSP withdrawals beat holding until mandatory Age 72 conversion
            </p>
          </div>
        </div>

        {/* Right side controls: summary preview chips + strategy selector + collapse chevron */}
        <div className="flex items-center gap-3 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
          {/* Key metrics preview visible in header */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Break-Even:</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                Age {analysis.breakEvenAge}
              </span>
            </div>
            {analysis.lifetimeTaxSavingsAtOptimal > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Savings:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  +{formatCur(analysis.lifetimeTaxSavingsAtOptimal)}
                </span>
              </div>
            )}
          </div>

          {/* Strategy Smoothing Selector (visible when expanded) */}
          {!isCollapsed && (
            <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSelectStrategy('bracket1')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  targetStrategy === 'bracket1'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Bracket 1 (~$57k)
              </button>
              <button
                type="button"
                onClick={() => handleSelectStrategy('oas_threshold')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  targetStrategy === 'oas_threshold'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                OAS Threshold (~$93k)
              </button>
              <button
                type="button"
                onClick={() => handleSelectStrategy('even_meltdown')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  targetStrategy === 'even_meltdown'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Even Spread
              </button>
            </div>
          )}

          {/* Chevron Collapse Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            aria-label={isCollapsed ? 'Expand RRSP Break-Even Analysis' : 'Collapse RRSP Break-Even Analysis'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer text-xs font-medium"
          >
            <span className="hidden sm:inline">{isCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary Break-Even Summary Card (Collapsible Content) */}
      {!isCollapsed && (
        <div className="p-5 sm:p-6 flex flex-col gap-5">
        
        {/* Core Decision Banner */}
        <div className="p-4 sm:p-5 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/50 via-slate-50/30 to-indigo-50/40 dark:from-blue-950/20 dark:via-slate-900 dark:to-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-1">
              <span>Primary Verdict</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {analysis.province} Provincial Brackets & CRA 2026 Indexation
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {analysis.headline}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              {analysis.recommendation}
            </p>
          </div>

          {/* Action Button: Apply or Status */}
          <div className="shrink-0 flex items-center gap-2">
            {isMeltdownActive ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span>Active on Ledger: Age {activeStartAge} Meltdown</span>
                    <span className="block text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                      Ceiling: {activeCeiling === 'bracket1' ? 'Bracket 1 (~$57k)' : activeCeiling === 'oas_threshold' ? 'OAS Limit (~$93k)' : 'Even to 71'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRevertToHold}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Revert milestone ledger to standard tax-efficient drawdown (hold RRSP to 72)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Baseline</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleApplyMeltdown(analysis.optimalAge)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <span>Apply Optimal Meltdown (Age {analysis.optimalAge})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Break-Even Age */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Break-Even Start Age
            </span>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                Age {analysis.breakEvenAge}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {analysis.breakEvenAge < 72
                ? 'Earliest age where early draw beats holding to 72'
                : 'Holding until age 72 remains optimal'}
            </span>
          </div>

          {/* Card 2: Optimal Meltdown Age */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Optimal Withdrawal Age
            </span>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                Age {analysis.optimalAge}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Maximizes lifetime after-tax estate wealth
            </span>
          </div>

          {/* Card 3: Lifetime Tax Savings */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Lifetime Tax Savings
            </span>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                +{formatCur(analysis.lifetimeTaxSavingsAtOptimal)}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Income tax + clawback + estate tax saved
            </span>
          </div>

          {/* Card 4: Marginal Rate Spread */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tax Bracket Arbitrage
            </span>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {analysis.earlyMarginalRateAtOptimal}%
              </span>
              <span className="text-xs text-slate-400 font-medium">vs</span>
              <span className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                {analysis.forcedHoldMarginalRateAt72}%
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-tight">
              {analysis.marginalRateSpread > 0 ? `+${analysis.marginalRateSpread}% point tax discount early` : 'Brackets closely aligned'}
            </span>
          </div>

        </div>

        {/* Detailed Mechanics Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Wealth Crossover Point
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Cumulative net worth under early withdrawal overtakes the hold-to-72 strategy at{' '}
              <strong className="text-blue-700 dark:text-blue-300">Age {analysis.crossoverAge}</strong> and expands thereafter.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                OAS Clawback Avoidance
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Defuses <strong className="text-emerald-600 dark:text-emerald-400">{formatCur(analysis.oasClawbackSavedAtOptimal)}</strong>{' '}
              in 15% OAS recovery taxes by reducing mandatory RRIF minimums after age 72.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Terminal Estate Tax Defusal
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Lowers the 53.5% final terminal tax bomb on death by{' '}
              <strong className="text-amber-600 dark:text-amber-400">{formatCur(analysis.terminalEstateTaxSavedAtOptimal)}</strong>.
            </p>
          </div>

        </div>

        {/* Toggle Detailed Comparison Table */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 cursor-pointer"
          >
            <span>
              {isDetailsExpanded ? 'Hide Age-by-Age Comparison Matrix' : 'View Full Age-by-Age Comparison Matrix & Tax Curves'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-normal">
                {analysis.candidateAgePoints.length} candidate ages modeled
              </span>
              {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {/* Expanded Age-by-Age Trajectory Matrix */}
          {isDetailsExpanded && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Start Age</th>
                      <th className="py-2.5 px-3 text-right">Lifetime Tax Burden</th>
                      <th className="py-2.5 px-3 text-right">Tax Savings vs Hold</th>
                      <th className="py-2.5 px-3 text-right">OAS Clawback</th>
                      <th className="py-2.5 px-3 text-right">Terminal Estate Tax</th>
                      <th className="py-2.5 px-3 text-right">Ending Estate Wealth</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* First row: Hold to 72 Baseline */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-medium">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        Age 72 (Hold Strategy)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCur(analysis.holdTotalTaxBurden)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        $0 (Baseline)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        {formatCur(analysis.holdTotalOasClawback)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        {formatCur(analysis.holdTerminalEstateTax)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCur(analysis.holdEndingNetWorth)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] text-slate-500">Hold Baseline</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {!isMeltdownActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                            <Check className="w-3 h-3 text-slate-600 dark:text-slate-300" /> Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRevertToHold}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Apply Hold
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Candidate start ages */}
                    {analysis.candidateAgePoints.map((point: RrspBreakEvenAgePoint) => {
                      const isThisAgeActive =
                        isMeltdownActive &&
                        activeStartAge === point.startAge &&
                        activeCeiling === targetStrategy;

                      return (
                        <tr
                          key={point.startAge}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            point.isOptimal
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-bold'
                              : point.startAge === analysis.breakEvenAge
                              ? 'bg-blue-50/30 dark:bg-blue-950/20'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono">
                            <span className={point.isOptimal ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}>
                              Age {point.startAge}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCur(point.totalTaxBurden)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span className={point.taxSavingsVsHold > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>
                              {point.taxSavingsVsHold > 0 ? `+${formatCur(point.taxSavingsVsHold)}` : formatCur(point.taxSavingsVsHold)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCur(point.totalOasClawback)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCur(point.terminalEstateTax)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                            {formatCur(point.endingNetWorth)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {point.isOptimal ? (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                                Optimal
                              </span>
                            ) : point.startAge === analysis.breakEvenAge ? (
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                                Break-Even
                              </span>
                            ) : point.isBreakEven ? (
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                Favorable
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Sub-optimal
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isThisAgeActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-1 rounded-lg">
                                <Check className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyMeltdown(point.startAge)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                              >
                                Apply Age {point.startAge}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Explanatory notes */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 text-xs">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>How Canadian Tax Math Drives the Break-Even Point</span>
                </div>
                <p>
                  1. <strong>The Early Gap Advantage:</strong> Between retirement and age 65/71 (prior to full CPP, OAS, and mandatory RRIF income), your taxable income is at its lowest career level. Withdrawing early allows you to access money in lower tax brackets (e.g. 20.05% in Ontario) rather than facing forced 43.4% to 53.5% brackets later.
                </p>
                <p>
                  2. <strong>Tax-Free TFSA Compounding:</strong> Unspent proceeds from early withdrawals can be deposited into your Tax-Free Savings Account (TFSA), where future investment growth is 100% tax-free forever with zero impact on OAS clawbacks.
                </p>
                <p>
                  3. <strong>Terminal Tax Bomb Mitigation:</strong> Upon death of the surviving spouse, 100% of an unspent RRIF balance is added to that year&apos;s income and taxed at top marginal rates (~53.53% in Ontario). Strategic meltdown minimizes this terminal estate seizure.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  );
};
