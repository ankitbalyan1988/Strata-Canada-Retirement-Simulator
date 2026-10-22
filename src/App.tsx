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
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { Layers, Wallet } from 'lucide-react';

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

function MainAppContent() {
  const {
    inputs,
    yearlyResults,
    isStressTestActive,
    setIsStressTestActive,
    stressTiming,
    setStressTiming,
    stressSimulation,
    activeChartTab,
    setActiveChartTab,
    isCompareModalOpen,
    isAIPersonaModalOpen
  } = useSimulation();

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* CRA & StatCan National Benchmark Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 px-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base select-none">🇨🇦</span>
            <span className="font-semibold text-white">Initial Baseline:</span>
            <span className="text-slate-300">
              CRA & Statistics Canada National Averages (Avg Full-Time Salary $68.4k • TFSA $41.5k • RRSP $112k • Retire Age 64 • Life Expectancy 85 • CPP 64%)
            </span>
          </div>
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-950/80 border border-rose-800/40 px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
            CRA & StatCan Averages
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
            <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveChartTab('networth')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'networth'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Net Worth Trajectory</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartTab('cashflow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'cashflow'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Post-Retirement Cash Flows</span>
              </button>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline">
              Hover over points to inspect Canadian account details
            </span>
          </div>

          {activeChartTab === 'networth' ? (
            <NetWorthChart
              yearlyResults={yearlyResults}
              stressYearlyResults={isStressTestActive ? stressSimulation?.yearlyResults : undefined}
              retirementAge={inputs.retirementAge}
              isStressTestActive={isStressTestActive}
              onToggleStressTest={() => setIsStressTestActive((prev) => !prev)}
              stressTiming={stressTiming}
              onChangeStressTiming={setStressTiming}
            />
          ) : (
            <IncomeStreamChart
              yearlyResults={yearlyResults}
              retirementAge={inputs.retirementAge}
            />
          )}
        </div>

        {/* Annual Simulation Ledger Table */}
        <MilestoneTable />

        {/* Canadian Estate Planning & Pending Reserves Liquidation Module (Lazy Loaded) */}
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm animate-pulse min-h-[140px] flex items-center justify-center text-slate-400 text-sm">
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
      <footer className="border-t border-slate-200 bg-white py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">🍁</span>
            <span className="font-semibold text-slate-800">MapleRetire</span>
            <span>— Canadian Wealth & Retirement Intelligence</span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-400">
            Based on CRA 2025/2026 indexed tax brackets, CPP enhancements, OAS clawback formulas, and RRIF prescribed rates. For educational planning purposes.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <MainAppContent />
    </SimulationProvider>
  );
}
