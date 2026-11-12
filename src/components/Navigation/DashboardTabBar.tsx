import React from 'react';
import { useSimulationStore, DashboardTab } from '../../store/useSimulationStore';
import {
  Calendar,
  LayoutDashboard,
  Activity,
  Sliders,
  Table,
  ShieldAlert,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

interface TabItem {
  id: DashboardTab;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const TABS: TabItem[] = [
  {
    id: 'dashboard',
    title: 'Main Dashboard',
    badge: 'KPIs & 3 Portlets',
    description: 'Executive KPIs, slider, pulse, and continuous charts',
    icon: LayoutDashboard,
    accentColor: 'emerald'
  },
  {
    id: 'ledger',
    title: 'Annual Simulation Ledger',
    badge: 'Milestones & Break-Even',
    description: 'Year-by-year cash flows, tax details, and RRSP break-even',
    icon: Calendar,
    accentColor: 'blue'
  },
  {
    id: 'cashflows',
    title: 'Current and Projected Cash Flows',
    badge: 'Inflow, Outflow & Taxes',
    description: 'Year-by-year income, living expenses, potential savings & taxes',
    icon: ArrowRightLeft,
    accentColor: 'emerald'
  },
  {
    id: 'stresstest',
    title: 'Plan Stress Test',
    badge: 'Economic Resilience',
    description: 'Historical crash models (2008 GFC, 2000 Dot-com, stagflation)',
    icon: ShieldAlert,
    accentColor: 'amber'
  },
  {
    id: 'whatif',
    title: 'What-If Analysis',
    badge: 'Sensitivity Lab',
    description: 'Interactive sensitivity matrix, return & inflation sliders',
    icon: Sliders,
    accentColor: 'purple'
  }
];

export const DashboardTabBar: React.FC = () => {
  const activeDashboardTab = useSimulationStore((state) => state.activeDashboardTab);
  const setActiveDashboardTab = useSimulationStore((state) => state.setActiveDashboardTab);
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const whatIfSettings = useSimulationStore((state) => state.whatIfSettings);

  const hasWhatIfActive =
    whatIfSettings.isActive &&
    (whatIfSettings.returnDelta !== 0 ||
      whatIfSettings.appreciationDelta !== 0 ||
      whatIfSettings.inflationDelta !== 0);

  return (
    <div
      role="tablist"
      aria-label="Dashboard horizontal views"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-xs transition-colors"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-1.5 sm:gap-2">
        {TABS.map((tab, idx) => {
          const isActive = activeDashboardTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              id={`dashboard-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`dashboard-tabpanel-${tab.id}`}
              type="button"
              onClick={() => setActiveDashboardTab(tab.id)}
              className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all duration-150 cursor-pointer select-none group relative ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isActive
                    ? 'bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold truncate">
                    {tab.title}
                  </span>
                  {tab.id === 'stresstest' && isStressTestActive && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                  )}
                  {tab.id === 'whatif' && hasWhatIfActive && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0"></span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold truncate ${
                      isActive
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
