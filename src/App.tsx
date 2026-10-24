import React, { Suspense } from 'react';
import { Header } from './components/Header';
import { HeroRetirementSlider } from './components/HeroRetirementSlider';
import { RetirementScorecard } from './components/RetirementScorecard';
import { SavingsPulse } from './components/SavingsPulse';
import { NetWorthChart } from './components/Charts/NetWorthChart';
import { IncomeStreamChart } from './components/Charts/IncomeStreamChart';
import { InputPanel } from './components/InputPanel';
import { MilestoneTable } from './components/MilestoneTable';
import { ExpatRetirementModule } from './components/ExpatRetirementModule';
import { CanadianPlanningTips } from './components/CanadianPlanningTips';
import { AIPersonaDescriptorBar } from './components/AIPersonaDescriptorBar';
import { useSimulationStore } from './store/useSimulationStore';
import { Layers, Wallet, Sun, Moon } from 'lucide-react';

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
  const yearlyResults = useSimulationStore((state) => state.yearlyResults);
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const setIsStressTestActive = useSimulationStore((state) => state.setIsStressTestActive);
  const stressTiming = useSimulationStore((state) => state.stressTiming);
  const setStressTiming = useSimulationStore((state) => state.setStressTiming);
  const stressSimulation = useSimulationStore((state) => state.stressSimulation);
  const activeChartTab = useSimulationStore((state) => state.activeChartTab);
  const setActiveChartTab = useSimulationStore((state) => state.setActiveChartTab);
  const isCompareModalOpen = useSimulationStore((state) => state.isCompareModalOpen);
  const isAIPersonaModalOpen = useSimulationStore((state) => state.isAIPersonaModalOpen);
  const theme = useSimulationStore((state) => state.theme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);

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
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
            CRA 2025/26 Indexed
          </span>
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

        {/* Visual Charts Container with Tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex rounded-xl bg-slate-200/60 dark:bg-slate-800/60 p-1 text-xs font-semibold border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setActiveChartTab('networth')}
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
                onClick={() => setActiveChartTab('cashflow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'cashflow'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Post-Retirement Cash Flows</span>
              </button>
            </div>

            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
              Hover over points to inspect Canadian account details
            </span>
          </div>

          {activeChartTab === 'networth' ? (
            <NetWorthChart
              yearlyResults={yearlyResults}
              stressYearlyResults={isStressTestActive ? stressSimulation?.yearlyResults : undefined}
              retirementAge={retirementAge}
              isStressTestActive={isStressTestActive}
              onToggleStressTest={() => setIsStressTestActive((prev) => !prev)}
              stressTiming={stressTiming}
              onChangeStressTiming={setStressTiming}
            />
          ) : (
            <IncomeStreamChart
              yearlyResults={yearlyResults}
              retirementAge={retirementAge}
            />
          )}
        </div>

        {/* Annual Simulation Ledger Table */}
        <MilestoneTable />

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

        {/* Canadian Expat & Non-Resident Retirement Planning Module */}
        <ExpatRetirementModule />

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
