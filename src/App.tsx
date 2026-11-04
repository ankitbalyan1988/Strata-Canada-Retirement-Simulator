import React, { Suspense } from 'react';
import { Header } from './components/Header';
import { HeroRetirementSlider } from './components/HeroRetirementSlider';
import { RetirementScorecard } from './components/RetirementScorecard';
import { SavingsPulse } from './components/SavingsPulse';
import { NetWorthChart } from './components/Charts/NetWorthChart';
import { IncomeStreamChart } from './components/Charts/IncomeStreamChart';
import { MarginalTaxBracketChart } from './components/Charts/MarginalTaxBracketChart';
import { InputPanel } from './components/InputPanel';
import { MilestoneTable } from './components/MilestoneTable';
import { ExpatRetirementModule } from './components/ExpatRetirementModule';
import { CanadianPlanningTips } from './components/CanadianPlanningTips';
import { AIPersonaDescriptorBar } from './components/AIPersonaDescriptorBar';
import { RrspBreakEvenModule } from './components/RrspBreakEvenModule';
import { StressTestHealthCard } from './components/StressTestHealthCard';
import { SimulationHistoryPanel } from './components/SimulationHistoryPanel';
import { useSimulationStore } from './store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { Layers, Wallet, Percent, Sun, Moon, ChevronsDown, ChevronsUp, ChevronDown, ChevronUp } from 'lucide-react';

// Dynamic lazy-loaded modules and modals to optimize critical rendering path
const EstatePlanningModule = React.lazy(() =>
  import('./components/EstatePlanningModule').then((m) => ({ default: m.EstatePlanningModule }))
);
const ScenarioComparisonModal = React.lazy(() =>
  import('./components/ScenarioComparisonModal').then((m) => ({ default: m.ScenarioComparisonModal }))
);
const AIPersonaModal = React.lazy(() =>
  import('./components/AIPersonaModal').then((m) => ({ default: m.AIPersonaModal }))
);

export default function App() {
  const retirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const province = useSimulationStore((state) => state.inputs.province);
  const isCouple = useSimulationStore((state) => state.inputs.maritalStatus === 'married');
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const setIsStressTestActive = useSimulationStore((state) => state.setIsStressTestActive);
  const stressTiming = useSimulationStore((state) => state.stressTiming);
  const setStressTiming = useSimulationStore((state) => state.setStressTiming);
  const stressSimulation = useSimulationStore(useShallow((state) => state.stressSimulation));
  const activeChartTab = useSimulationStore((state) => state.activeChartTab);
  const setActiveChartTab = useSimulationStore((state) => state.setActiveChartTab);
  const isCompareModalOpen = useSimulationStore((state) => state.isCompareModalOpen);
  const isAIPersonaModalOpen = useSimulationStore((state) => state.isAIPersonaModalOpen);
  const theme = useSimulationStore((state) => state.theme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const planExpatExit = useSimulationStore((state) => 
    state.inputs.planExpatExit ?? Boolean(state.inputs.expat?.planToEmigrate)
  );

  const collapsedSections = useSimulationStore(useShallow((state) => state.collapsedSections));
  const toggleCollapseAll = useSimulationStore((state) => state.toggleCollapseAll);
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const areAllSectionsCollapsed = React.useMemo(() => {
    const values = Object.values(collapsedSections);
    return values.length > 0 && values.every(Boolean);
  }, [collapsedSections]);
  const isChartsCollapsed = Boolean(collapsedSections.charts);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-50 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* CRA & StatCan National Benchmark Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs transition-colors">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base select-none">🇨🇦</span>
            <span className="font-semibold text-slate-900 dark:text-slate-50">National Benchmark:</span>
            <span className="text-slate-500 dark:text-slate-400">
              Statistics Canada & CRA 2025/2026 Baseline (Avg Full-Time Salary $68.4k • TFSA $41.5k • RRSP $112k • Retire Age 64 • Life Expectancy 85)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
            {/* Global Collapse / Expand All Sections Button */}
            <button
              type="button"
              onClick={toggleCollapseAll}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400"
              title={areAllSectionsCollapsed ? 'Expand all sections across dashboard' : 'Collapse all sections across dashboard'}
              aria-label={areAllSectionsCollapsed ? 'Expand all sections' : 'Collapse all sections'}
            >
              {areAllSectionsCollapsed ? (
                <>
                  <ChevronsDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Expand All Sections</span>
                </>
              ) : (
                <>
                  <ChevronsUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Collapse All Sections</span>
                </>
              )}
            </button>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
              CRA 2025/26 Indexed
            </span>
          </div>
        </div>

        {/* AI Persona Descriptor Bar */}
        <AIPersonaDescriptorBar />

        {/* User Inputs & Controls Panel (Household Planning Structure) */}
        <InputPanel />

        {/* Hero Interactive Retirement Age Simulator */}
        <HeroRetirementSlider />

        {/* Financial KPI Scorecard */}
        <RetirementScorecard />

        {/* Savings Pulse: Live Monthly Goal Pacing & Trajectory Comparison */}
        <SavingsPulse />

        {/* Actionable Stress Test & Plan Resilience Scorecard */}
        <StressTestHealthCard />

        {/* Visual Charts Container with Tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex rounded-xl bg-slate-200/60 dark:bg-slate-800/60 p-1 text-xs font-semibold border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => {
                  if (isChartsCollapsed) toggleSectionCollapse('charts');
                  setActiveChartTab('networth');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'networth'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Net Worth Trajectory</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isChartsCollapsed) toggleSectionCollapse('charts');
                  setActiveChartTab('cashflow');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'cashflow'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Post-Retirement Cash Flows</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isChartsCollapsed) toggleSectionCollapse('charts');
                  setActiveChartTab('taxbracket');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'taxbracket'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Percent className="w-3.5 h-3.5 text-amber-500" />
                <span>Marginal Tax Brackets</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                Hover over points to inspect Canadian account details
              </span>

              {/* Charts Collapse / Expand Button */}
              <button
                type="button"
                onClick={() => toggleSectionCollapse('charts')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs transition cursor-pointer"
                title={isChartsCollapsed ? 'Expand Interactive Charts' : 'Collapse Interactive Charts'}
              >
                {isChartsCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Expand Charts</span>
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

          {isChartsCollapsed ? (
            <div 
              onClick={() => toggleSectionCollapse('charts')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2.5 transition cursor-pointer hover:border-emerald-500/40 shadow-xs"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Visual Interactive Charts:
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
                  Retirement Net Worth: <strong className="text-emerald-600 dark:text-emerald-400">${Math.round(yearlyResults.find(r => r.age === retirementAge)?.totalNetWorth || 0).toLocaleString()}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
                  Mode: <strong className="text-slate-900 dark:text-white">{activeChartTab === 'networth' ? 'Net Worth Trajectory' : activeChartTab === 'cashflow' ? 'Post-Retirement Cash Flows' : 'Marginal Tax Brackets'}</strong>
                </span>
              </div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 ml-auto">
                <span>Show Interactive Charts</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : (
            activeChartTab === 'networth' ? (
              <NetWorthChart
                yearlyResults={yearlyResults}
                stressYearlyResults={isStressTestActive ? stressSimulation?.yearlyResults : undefined}
                retirementAge={retirementAge}
                isStressTestActive={isStressTestActive}
                onToggleStressTest={() => setIsStressTestActive((prev) => !prev)}
                stressTiming={stressTiming}
                onChangeStressTiming={setStressTiming}
              />
            ) : activeChartTab === 'cashflow' ? (
              <IncomeStreamChart
                yearlyResults={yearlyResults}
                retirementAge={retirementAge}
              />
            ) : (
              <MarginalTaxBracketChart
                yearlyResults={yearlyResults}
                retirementAge={retirementAge}
                province={province}
                isCouple={isCouple}
              />
            )
          )}
        </div>

        {/* Annual Simulation Ledger Table */}
        <MilestoneTable />

        {/* RRSP/RRIF Break-Even Withdrawal Analysis Module & Summary Card */}
        <RrspBreakEvenModule />

        {/* Canadian Estate Planning & Pending Reserves Liquidation Module (Lazy Loaded) */}
        <Suspense
          fallback={
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-xs animate-pulse min-h-[140px] flex items-center justify-center text-slate-400 text-sm">
              Loading Canadian Estate Planning Module...
            </div>
          }
        >
          <EstatePlanningModule />
        </Suspense>

        {/* Canadian Expat & Non-Resident Retirement Planning Module (Appears only when user indicates plan to exit Canada) */}
        {planExpatExit && <ExpatRetirementModule />}

        {/* Canadian Educational Planning Guide */}
        <CanadianPlanningTips />
      </main>

      {/* Scenario Comparison Modal (Lazy Loaded) */}
      <Suspense fallback={null}>
        {isCompareModalOpen && <ScenarioComparisonModal />}
      </Suspense>

      {/* AI Persona Generator Modal (Lazy Loaded) */}
      <Suspense fallback={null}>
        {isAIPersonaModalOpen && <AIPersonaModal />}
      </Suspense>

      {/* Simulation Version History Side-Panel Drawer */}
      <SimulationHistoryPanel />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-slate-500 dark:text-slate-400 text-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 7H20V9H4V7Z" fill="white" />
                <path d="M7 12H20V14H7V12Z" fill="white" fillOpacity="0.8" />
                <path d="M4 17H18V19H4V17Z" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">Strata</span>
            <span>— Canadian Wealth & Retirement Intelligence</span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-400 dark:text-slate-500">
            Based on CRA 2025/2026 indexed tax brackets, CPP enhancements, OAS clawback formulas, and RRIF prescribed rates. For educational planning purposes.
          </div>
        </div>
      </footer>

      {/* Floating Quick Theme Toggle (Always Accessible on Screen) */}
      <aside aria-label="Quick Theme Switcher" className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={toggleTheme}
          className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 shadow-md hover:shadow-lg hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition cursor-pointer text-xs font-semibold"
          title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          aria-label={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
        >
          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-110">
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
            )}
          </div>
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </aside>
    </div>
  );
}
