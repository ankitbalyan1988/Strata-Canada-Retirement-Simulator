import React, { useState } from 'react';
import { 
  Menu,
  SlidersHorizontal,
  Globe,
  Landmark,
  LayoutDashboard,
  ChevronsDown,
  ChevronsUp,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { useSimulationStore, AppView } from '../store/useSimulationStore';
import { TopScenarioSwitcher } from './TopScenarioSwitcher';

export const Header: React.FC = () => {
  const isCalculating = useSimulationStore((state) => state.isCalculating);
  const activeView = useSimulationStore((state) => state.activeView);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);
  const toggleMobileSidebar = useSimulationStore((state) => state.toggleMobileSidebar);
  const toggleCollapseAll = useSimulationStore((state) => state.toggleCollapseAll);
  const hasMultipleScenarios = useSimulationStore((state) => state.history.length > 1);

  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  // Granular atomic boolean selector: only re-renders when the collapsed state boolean actually flips
  const areAllSectionsCollapsed = useSimulationStore((state) => {
    const viewSectionsMap: Record<AppView, string[]> = {
      inputs: ['planning'],
      dashboard: ['retirementAgeSimulator', 'stressTest', 'pulse', 'charts', 'ledger', 'breakEven'],
      estate: ['estate'],
      expat: ['expat']
    };
    const relevantKeys = viewSectionsMap[state.activeView] || Object.keys(state.collapsedSections);
    return relevantKeys.length > 0 && relevantKeys.every((k) => Boolean(state.collapsedSections[k]));
  });

  const viewTitles: Record<AppView, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
    dashboard: {
      title: 'Dashboard & Results',
      subtitle: 'Retirement KPIs, net worth trajectory, cash flows & tax brackets',
      icon: LayoutDashboard
    },
    inputs: {
      title: 'Profile & Plan Inputs',
      subtitle: 'Income, expenses, accounts, waterfall priorities & assumptions',
      icon: SlidersHorizontal
    },
    estate: {
      title: 'Estate Planning Module',
      subtitle: 'Terminal deemed disposition (ITA s.70(5)), probate fees & inheritance',
      icon: Landmark
    },
    expat: {
      title: 'Expat Planning Module',
      subtitle: 'Emigration, Section 128.1 departure tax & bilateral tax treaties',
      icon: Globe
    }
  };

  const currentViewMeta = viewTitles[activeView] || viewTitles.dashboard;
  const ViewIcon = currentViewMeta.icon;

  return (
    <header className="bg-white/95 dark:bg-[#11141A]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 sticky top-0 z-30 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-3 gap-3">
          
          {/* Left: Mobile Drawer Trigger + Active View Header */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Menu Button (visible on mobile/tablet) */}
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="flex lg:hidden items-center justify-center w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80 transition cursor-pointer shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Current View Title & Status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 shrink-0">
                <ViewIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] leading-tight truncate">
                    {currentViewMeta.title}
                  </h1>
                  {isCalculating && (
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Updating...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block truncate max-w-lg">
                  {currentViewMeta.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Top-of-UI Global Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* Scenario Switcher Dropdown (only visible when multiple scenarios exist) */}
            {hasMultipleScenarios && <TopScenarioSwitcher />}

            {/* Clean Canvas ($0) Button */}
            {!isConfirmingClear ? (
              <button
                type="button"
                onClick={() => setIsConfirmingClear(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer shadow-2xs"
                title="Clear all entered data and return to blank canvas ($0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Clean Canvas ($0)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/70 p-1 rounded-xl border border-rose-300 dark:border-rose-800 text-xs">
                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 px-1.5">
                  Wipe to $0?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetToBlankCanvas();
                    setIsConfirmingClear(false);
                  }}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-1.5 py-0.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Expand/Collapse All Sections Toggle */}
            <button
              type="button"
              onClick={toggleCollapseAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80 transition shadow-2xs cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
              title={areAllSectionsCollapsed ? 'Expand all sections across application' : 'Collapse all sections across application'}
              aria-label={areAllSectionsCollapsed ? 'Expand all sections' : 'Collapse all sections'}
            >
              {areAllSectionsCollapsed ? (
                <>
                  <ChevronsDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Expand All</span>
                </>
              ) : (
                <>
                  <ChevronsUp className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span className="hidden sm:inline">Collapse All</span>
                </>
              )}
            </button>

            {/* View Live Dashboard Results Button */}
            {activeView !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
                title="Return to Dashboard to inspect results"
              >
                <span>View Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
