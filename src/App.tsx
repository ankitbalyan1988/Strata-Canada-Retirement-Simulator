import React, { Suspense } from 'react';
import { Sidebar } from './components/Navigation/Sidebar';
import { Header } from './components/Header';
import { DashboardTabBar } from './components/Navigation/DashboardTabBar';
import { InputTabBar } from './components/Navigation/InputTabBar';
import { LedgerTabContent } from './components/Tabs/LedgerTabContent';
import { MainDashboardTabContent } from './components/Tabs/MainDashboardTabContent';
import { StressTestTabContent } from './components/Tabs/StressTestTabContent';
import { WhatIfTabContent } from './components/Tabs/WhatIfTabContent';
import { InputPanel } from './components/InputPanel';
import { SimulationHistoryPanel } from './components/SimulationHistoryPanel';
import { ModuleLoadingFallback } from './components/ModuleLoadingFallback';
import { useSimulationStore } from './store/useSimulationStore';
import { 
  Users,
  Sun, 
  Moon, 
  ChevronsDown, 
  ChevronsUp, 
  RotateCcw, 
  Sparkles, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';

// Dynamic route-level code-split modules and modals to optimize critical rendering path
const EstatePlanningModule = React.lazy(() =>
  import('./components/EstatePlanningModule').then((m) => ({ default: m.EstatePlanningModule }))
);
const ExpatRetirementModule = React.lazy(() =>
  import('./components/ExpatRetirementModule').then((m) => ({ default: m.ExpatRetirementModule }))
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
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const isWealthGuideModalOpen = useSimulationStore((state) => state.isWealthGuideModalOpen);
  const theme = useSimulationStore((state) => state.theme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);

  // Navigation & View state
  const activeView = useSimulationStore((state) => state.activeView);
  const activeDashboardTab = useSimulationStore((state) => state.activeDashboardTab);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const isSidebarCollapsed = useSimulationStore((state) => state.isSidebarCollapsed);

  const toggleCollapseAll = useSimulationStore((state) => state.toggleCollapseAll);
  const areAllInputsCollapsed = useSimulationStore((state) => 
    Boolean(state.collapsedSections.planning)
  );

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
          <Suspense fallback={<ModuleLoadingFallback />}>
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
            <div className="flex flex-col gap-5 sm:gap-6">
              {/* Horizontal Navigation: Profile & Plan Input Tabs Bar */}
              <InputTabBar />

              {/* Complete Household Planning Structure Input Panel */}
              <InputPanel />
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: ESTATE PLANNING MODULE                         */}
          {/* ========================================================= */}
          {activeView === 'estate' && (
            <div className="flex flex-col gap-6">
              <Suspense
                fallback={
                  <ModuleLoadingFallback
                    moduleName="Canadian Estate Planning & Deemed Disposition"
                    subtitle="Compiling deemed disposition at death (CRA Sec. 70(5)), provincial probate schedules, and terminal tax liabilities..."
                    icon="estate"
                    themeColor="purple"
                  />
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
              <Suspense
                fallback={
                  <ModuleLoadingFallback
                    moduleName="Canadian Expat & Non-Resident Retirement Planning"
                    subtitle="Compiling cross-border emigration, deemed departure tax (CRA Sec. 128.1), and bilateral treaty schedules..."
                    icon="expat"
                    themeColor="amber"
                  />
                }
              >
                <ExpatRetirementModule />
              </Suspense>
            </div>
          )}
          </Suspense>
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
