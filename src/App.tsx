import React, { Suspense } from 'react';
import { Sidebar } from './components/Navigation/Sidebar';
import { Header } from './components/Header';
import { DashboardTabBar } from './components/Navigation/DashboardTabBar';
import { LedgerTabContent } from './components/Tabs/LedgerTabContent';
import { MainDashboardTabContent } from './components/Tabs/MainDashboardTabContent';
import { StressTestTabContent } from './components/Tabs/StressTestTabContent';
import { WhatIfTabContent } from './components/Tabs/WhatIfTabContent';
import { InputPanel } from './components/InputPanel';
import { PersonaSelectionPanel } from './components/PersonaSelectionPanel';
import { ExpatRetirementModule } from './components/ExpatRetirementModule';
import { SimulationHistoryPanel } from './components/SimulationHistoryPanel';
import { useSimulationStore } from './store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  Sun, 
  Moon, 
  ChevronsDown,
  ChevronsUp,
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  Landmark,
  Globe,
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  ChevronRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

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
const SnapshotComparisonModal = React.lazy(() =>
  import('./components/SnapshotComparisonModal').then((m) => ({ default: m.SnapshotComparisonModal }))
);
const CanadianWealthGuideModal = React.lazy(() =>
  import('./components/CanadianWealthGuideModal').then((m) => ({ default: m.CanadianWealthGuideModal }))
);

export default function App() {
  const isCompareModalOpen = useSimulationStore((state) => state.isCompareModalOpen);
  const isSnapshotCompareModalOpen = useSimulationStore((state) => state.isSnapshotCompareModalOpen);
  const isAIPersonaModalOpen = useSimulationStore((state) => state.isAIPersonaModalOpen);
  const isWealthGuideModalOpen = useSimulationStore((state) => state.isWealthGuideModalOpen);
  const theme = useSimulationStore((state) => state.theme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const resetToDefault = useSimulationStore((state) => state.resetToDefault);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);
  const activePresetId = useSimulationStore((state) => state.activePresetId);

  // Navigation & View state
  const activeView = useSimulationStore((state) => state.activeView);
  const activeDashboardTab = useSimulationStore((state) => state.activeDashboardTab);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const isSidebarCollapsed = useSimulationStore((state) => state.isSidebarCollapsed);

  const planExpatExit = useSimulationStore((state) => 
    state.inputs.planExpatExit ?? Boolean(state.inputs.expat?.planToEmigrate)
  );

  const inputs = useSimulationStore((state) => state.inputs);
  const isBlankCanvas = activePresetId === 'blank' || (
    inputs.currentAnnualIncome === 0 &&
    inputs.rrspBalance === 0 &&
    inputs.tfsaBalance === 0 &&
    inputs.nonRegBalance === 0
  );

  const collapsedSections = useSimulationStore(useShallow((state) => state.collapsedSections));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const toggleCollapseAll = useSimulationStore((state) => state.toggleCollapseAll);
  const isChartsCollapsed = Boolean(collapsedSections.charts);
  const areAllInputsCollapsed = Boolean(collapsedSections.personaSelection) && Boolean(collapsedSections.planning);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-50 flex font-['Plus_Jakarta_Sans'] selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Collapsible Left Navigation Bar */}
      <Sidebar />

      {/* Main App Workspace Canvas */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <Header />

        {/* Dynamic Section Views */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
          
          {/* ========================================================= */}
          {/* SECTION 1: DASHBOARD & RESULTS (HOMEPAGE)                 */}
          {/* ========================================================= */}
          {activeView === 'dashboard' && (
            <div className="flex flex-col gap-6">
              {/* Horizontal Dashboard Navigation Bar */}
              <DashboardTabBar />

              {/* Tab 1: Main Dashboard (KPIs until savings pulse + dedicated portlets) */}
              {activeDashboardTab === 'dashboard' && (
                <div role="tabpanel" id="dashboard-tabpanel-dashboard" aria-labelledby="dashboard-tab-dashboard">
                  <MainDashboardTabContent />
                </div>
              )}

              {/* Tab 2: Annual Simulation Ledger & Milestone Schedule (with RRSP/RRIF break-even below it) */}
              {activeDashboardTab === 'ledger' && (
                <div role="tabpanel" id="dashboard-tabpanel-ledger" aria-labelledby="dashboard-tab-ledger">
                  <LedgerTabContent />
                </div>
              )}

              {/* Tab 3: Plan Stress Test & Economic Resilience */}
              {activeDashboardTab === 'stresstest' && (
                <div role="tabpanel" id="dashboard-tabpanel-stresstest" aria-labelledby="dashboard-tab-stresstest">
                  <StressTestTabContent />
                </div>
              )}

              {/* Tab 4: What-If Analysis */}
              {activeDashboardTab === 'whatif' && (
                <div role="tabpanel" id="dashboard-tabpanel-whatif" aria-labelledby="dashboard-tab-whatif">
                  <WhatIfTabContent />
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: PROFILE & PLAN INPUTS                          */}
          {/* ========================================================= */}
          {activeView === 'inputs' && (
            <div className="flex flex-col gap-6">
              {/* Inputs Section Banner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        <SlidersHorizontal className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          Profile & Plan Configuration Console
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Modify income, expenses, accounts, waterfall priorities, pensions, and growth rates. All calculations update live across your dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={toggleCollapseAll}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      title={areAllInputsCollapsed ? "Expand all sections on this page" : "Collapse all sections on this page"}
                    >
                      {areAllInputsCollapsed ? <ChevronsDown className="w-3.5 h-3.5" /> : <ChevronsUp className="w-3.5 h-3.5" />}
                      <span>{areAllInputsCollapsed ? 'Expand All' : 'Collapse All'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetToBlankCanvas}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition cursor-pointer"
                      title="Clear all entered data and return to blank canvas ($0)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clean Canvas ($0)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                      title="Return to Dashboard to inspect results"
                    >
                      <span>View Live Dashboard Results</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Persona Selection & AI Profile Generator Module */}
              <PersonaSelectionPanel />

              {/* Complete Household Planning Structure Input Panel */}
              <InputPanel />

              {/* Bottom Quick Return to Dashboard Banner */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      All changes are active in live memory
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Switch to the dashboard at any time to inspect your retirement nest egg, cash flows, and tax bracket projections.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('dashboard')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0 inline-flex items-center gap-2"
                >
                  <span>Go to Dashboard & Results</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: ESTATE PLANNING MODULE                         */}
          {/* ========================================================= */}
          {activeView === 'estate' && (
            <div className="flex flex-col gap-6">
              {/* Estate Planning Section Banner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          Canadian Estate Planning & Deemed Disposition Module
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Evaluate deemed disposition at death (CRA Section 70(5)), provincial probate fees, terminal tax liability, surviving spouse rollovers, and tax-efficient wealth distribution.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveView('inputs')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Edit Asset Inputs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                    >
                      <span>Return to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Canadian Estate Planning & Pending Reserves Liquidation Module */}
              <Suspense
                fallback={
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/80 shadow-xs animate-pulse min-h-[160px] flex items-center justify-center text-slate-400 text-sm">
                    Loading Canadian Estate Planning Module...
                  </div>
                }
              >
                <EstatePlanningModule />
              </Suspense>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 4: EXPAT PLANNING MODULE                          */}
          {/* ========================================================= */}
          {activeView === 'expat' && (
            <div className="flex flex-col gap-6">
              {/* Expat Planning Section Banner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Canadian Expat & Non-Resident Retirement Planning
                          {planExpatExit && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                              Active in Plan
                            </span>
                          )}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Model cross-border emigration, Section 128.1 departure tax (deemed disposition), CRA Part XIII non-resident withholding taxes, and bilateral double-taxation treaty relief across 20+ countries.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveView('inputs')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Edit Base Inputs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                    >
                      <span>Return to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expat Retirement & Cross-Border Emigration Module */}
              <ExpatRetirementModule />
            </div>
          )}

          {/* CRA & Statistics Canada National Benchmark Section (Positioned at bottom of main page) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 px-5 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors mt-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base select-none">🇨🇦</span>
              <span className="font-semibold text-slate-900 dark:text-slate-50">National Benchmark:</span>
              <span className="text-slate-500 dark:text-slate-400">
                Statistics Canada & CRA 2025/2026 Baseline (Avg Full-Time Salary $68.4k • TFSA $41.5k • RRSP $112k • Retire Age 64 • Life Expectancy 85)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                CRA 2025/26 Indexed
              </span>
            </div>
          </div>

        </main>

        {/* Scenario Comparison Modal (Lazy Loaded) */}
        <Suspense fallback={null}>
          {isCompareModalOpen && <ScenarioComparisonModal />}
        </Suspense>

        {/* Snapshot Comparison Modal (Lazy Loaded) */}
        <Suspense fallback={null}>
          {isSnapshotCompareModalOpen && <SnapshotComparisonModal />}
        </Suspense>

        {/* AI Persona Generator Modal (Lazy Loaded) */}
        <Suspense fallback={null}>
          {isAIPersonaModalOpen && <AIPersonaModal />}
        </Suspense>

        {/* Canadian Retirement Rules & Wealth Guide Modal (Lazy Loaded) */}
        <Suspense fallback={null}>
          {isWealthGuideModalOpen && <CanadianWealthGuideModal />}
        </Suspense>

        {/* Simulation Version History Side-Panel Drawer */}
        <SimulationHistoryPanel />

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-slate-500 dark:text-slate-400 text-xs transition-colors mt-auto">
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
    </div>
  );
}
