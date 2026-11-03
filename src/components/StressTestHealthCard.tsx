import React, { useMemo, useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { calculateStressTestHealth } from '../utils/stressTestHealthCalculator';
import { StressScenarioOutcome } from '../types/retirement';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowRight,
  Sliders,
  DollarSign,
  Calendar,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export function StressTestHealthCard() {
  const inputs = useSimulationStore((state) => state.inputs);
  const summary = useSimulationStore((state) => state.summary);
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const setIsStressTestActive = useSimulationStore((state) => state.setIsStressTestActive);
  const setStressTiming = useSimulationStore((state) => state.setStressTiming);
  const collapsedSections = useSimulationStore((state) => state.collapsedSections);
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const isCollapsed = Boolean(collapsedSections.stressTest);

  // Compute stress test health analysis
  const health = useMemo(() => {
    return calculateStressTestHealth(inputs, summary);
  }, [inputs, summary]);

  // Selected scenario for detail view
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(health.worstCaseScenario.id);

  const activeScenario: StressScenarioOutcome = useMemo(() => {
    return health.scenarios.find((s) => s.id === selectedScenarioId) || health.worstCaseScenario;
  }, [health, selectedScenarioId]);

  // Health color styling
  const ratingTheme = {
    resilient: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
      ring: 'text-emerald-500',
      icon: ShieldCheck
    },
    moderate: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      ring: 'text-amber-500',
      icon: AlertTriangle
    },
    vulnerable: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300',
      badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
      ring: 'text-rose-500',
      icon: ShieldAlert
    }
  }[health.healthRating];

  const RatingIcon = ratingTheme.icon;

  const handleApplyToChart = (timing: 'at_retirement' | 'immediate') => {
    setStressTiming(timing);
    if (!isStressTestActive) {
      setIsStressTestActive(true);
    }
  };

  return (
    <section 
      aria-label="Stress Test and Plan Resilience Scorecard"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Plan Stress Test & Economic Resilience</span>
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${ratingTheme.badge}`}>
                {health.healthLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actuarial stress modeling across historical Canadian crashes, stagflation, and sequence-of-returns shocks
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => toggleSectionCollapse('stressTest')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title={isCollapsed ? 'Expand Stress Test Card' : 'Collapse Stress Test Card'}
            aria-label={isCollapsed ? 'Expand Stress Test Card' : 'Collapse Stress Test Card'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-rose-500" />
                <span>Show Stress Test</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Compact Bar */}
      {isCollapsed && (
        <div 
          onClick={() => toggleSectionCollapse('stressTest')}
          className="px-4 py-3 bg-slate-50/90 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2.5 transition cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <RatingIcon className={`w-3.5 h-3.5 ${ratingTheme.ring}`} />
              Stress Test Summary:
            </span>
            <span className={`px-2 py-0.5 rounded-lg border font-bold ${ratingTheme.badge}`}>
              Probability of Success: {health.probabilityOfSuccess}%
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Worst-Case Impact: <strong className="text-rose-600 dark:text-rose-400">-{health.worstCaseDropPercent}% Terminal Capital</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Solvency: <strong className={health.worstCaseScenario.isSolvent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {health.worstCaseScenario.isSolvent ? '100% Solvent' : `Depletes @ Age ${health.worstCaseDepletionAge}`}
              </strong>
            </span>
          </div>

          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 ml-auto">
            <span>Inspect Health Details</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Expanded Content Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 flex flex-col gap-6">
          {/* Primary Top KPI Grid (3 Key Health Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Probability of Success Gauge */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Probability of Success
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${ratingTheme.badge}`}>
                  {health.healthRating}
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-1">
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${ratingTheme.ring}`}>
                  {health.probabilityOfSuccess}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  survivability index
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden my-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    health.probabilityOfSuccess >= 85
                      ? 'bg-emerald-500'
                      : health.probabilityOfSuccess >= 65
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${health.probabilityOfSuccess}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                Percentage of historical market cycles and sequence-of-returns trials where your retirement nest egg never exhausts before Age {inputs.lifeExpectancy}.
              </p>
            </div>

            {/* Card 2: Worst-Case Scenario Impact */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/5 via-slate-50 to-slate-50/60 dark:from-rose-500/10 dark:via-slate-800/60 dark:to-slate-800/30 border border-rose-500/20 dark:border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Worst-Case Impact
                </span>
                <span className="text-[10px] text-rose-600 dark:text-rose-300 font-bold bg-rose-100/80 dark:bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/30 truncate max-w-[150px]">
                  {health.worstCaseScenario.name}
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                  -{health.worstCaseDropPercent}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  (-${Math.round(health.worstCaseDropAmount).toLocaleString()})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-t border-rose-100 dark:border-rose-900/30 my-1">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Terminal Nest Egg:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${Math.round(health.worstCaseTerminalNetWorth).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Solvency Status:</span>
                  <span className={`font-bold ${health.worstCaseScenario.isSolvent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {health.worstCaseScenario.isSolvent ? '100% Solvent' : `Depletes Age ${health.worstCaseDepletionAge}`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {health.worstCaseScenario.isSolvent
                  ? `Even under this deep shock, your capital remains positive through Age ${inputs.lifeExpectancy}.`
                  : `Severe market drawdown shortens your retirement longevity horizon by ${Math.abs(health.solvencyMarginYears)} years.`}
              </p>
            </div>

            {/* Card 3: Safe Withdrawal Rate Buffer */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  Withdrawal Rate Stress Buffer
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                  Guyton-Klinger Metric
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {health.actualWithdrawalRatePercent}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  planned vs {health.safeWithdrawalRateFloorPercent}% safe floor
                </span>
              </div>

              <div className="space-y-1 my-2">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Crash Resilience Floor:</span>
                  <span className={health.actualWithdrawalRatePercent <= health.safeWithdrawalRateFloorPercent ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                    {health.actualWithdrawalRatePercent <= health.safeWithdrawalRateFloorPercent ? 'Comfortable Buffer' : 'Tight Margin'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (health.actualWithdrawalRatePercent / 6.0) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Target spend (${inputs.targetRetirementSpendingToday.toLocaleString()}/yr) relative to liquid nest egg. A rate below 4.0% ensures multi-decade survival.
              </p>
            </div>

          </div>

          {/* Interactive Scenario Selector & Comparator */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <span>Interactive Historical Stress Scenarios</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a Canadian market regime to inspect specific drawdowns, terminal net worth, and recovery time
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyToChart('at_retirement')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                    isStressTestActive
                      ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                  }`}
                  title="Visualize shock trajectory in the Net Worth Trajectory Chart"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{isStressTestActive ? 'Stress Shock Active in Chart' : 'Simulate in Trajectory Chart'}</span>
                </button>
              </div>
            </div>

            {/* Scenario Chips */}
            <div className="flex flex-wrap gap-2">
              {health.scenarios.map((scen) => {
                const isSelected = scen.id === selectedScenarioId;
                return (
                  <button
                    key={scen.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(scen.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-rose-500/80 text-slate-900 dark:text-white shadow-xs ring-2 ring-rose-500/20'
                        : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      scen.isSolvent ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    <span>{scen.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {scen.isSolvent ? 'Solvent' : `Depleted @ ${scen.depletionAge}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Scenario Detailed Inspection Box */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeScenario.name}
                  </h5>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    activeScenario.severity === 'extreme'
                      ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                      : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                  }`}>
                    {activeScenario.severity} Shock
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                  {activeScenario.description}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Terminal Wealth</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    ${activeScenario.terminalNetWorth.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-rose-500 font-mono block">
                    {activeScenario.terminalNetWorthDelta < 0 ? `-$${Math.abs(activeScenario.terminalNetWorthDelta).toLocaleString()}` : '+$0'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Years Funded</span>
                  <span className={`text-sm font-bold ${activeScenario.isSolvent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {activeScenario.yearsFunded} / {activeScenario.totalYearsInRetirement} Yrs
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {activeScenario.recoveryYears}yr cycle
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Resilience Levers & Recommendations */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Actionable Canadian Remediation Levers</span>
              </h4>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Prioritized steps to lift stress test success to 95%+
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {health.actionableRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-2 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{rec.title}</span>
                      </span>
                      <span className={`text-[9px] px-2 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                        rec.impact === 'high'
                          ? 'bg-rose-100/80 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {rec.impact} impact
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 dark:text-slate-500">Expected Benefit:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {rec.metricBenefit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
