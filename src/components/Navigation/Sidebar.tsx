import React from 'react';
import { 
  LayoutDashboard, 
  SlidersHorizontal, 
  Landmark, 
  Globe, 
  Scale, 
  Layers, 
  History, 
  Wand2, 
  FileDown, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  X,
  MapPin,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Plane,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { useSimulationStore, AppView } from '../../store/useSimulationStore';
import { PROVINCIAL_BRACKETS } from '../../utils/canadianTax';
import { CanadianProvince } from '../../types/retirement';

export const Sidebar: React.FC = () => {
  const activeView = useSimulationStore((state) => state.activeView);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const isSidebarCollapsed = useSimulationStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useSimulationStore((state) => state.toggleSidebarCollapsed);
  const isMobileSidebarOpen = useSimulationStore((state) => state.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useSimulationStore((state) => state.setIsMobileSidebarOpen);

  const theme = useSimulationStore((state) => state.theme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const province = useSimulationStore((state) => state.inputs.province);
  const applyProvince = useSimulationStore((state) => state.applyProvince);
  const currentAge = useSimulationStore((state) => state.inputs.currentAge);
  const retirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const readinessScore = useSimulationStore((state) => state.optimisticSummary.readinessScore);
  const netWorthAtRetirement = useSimulationStore((state) => state.optimisticSummary.netWorthAtRetirement);
  const historyCount = useSimulationStore((state) => state.history.length);
  const toggleHistoryPanel = useSimulationStore((state) => state.toggleHistoryPanel);
  const setIsCompareModalOpen = useSimulationStore((state) => state.setIsCompareModalOpen);
  const setIsSnapshotCompareModalOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const setIsWealthGuideModalOpen = useSimulationStore((state) => state.setIsWealthGuideModalOpen);
  const exportPdf = useSimulationStore((state) => state.exportPdf);
  const isExportingPdf = useSimulationStore((state) => state.isExportingPdf);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);

  const planExpatExit = useSimulationStore((state) => 
    state.inputs.planExpatExit ?? Boolean(state.inputs.expat?.planToEmigrate)
  );

  const navItems: Array<{
    id: AppView;
    label: string;
    shortLabel: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    activeHighlight?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard & Results',
      shortLabel: 'Dashboard',
      subtitle: 'KPIs, charts & ledger',
      icon: LayoutDashboard,
      activeHighlight: 'emerald'
    },
    {
      id: 'inputs',
      label: 'Profile & Plan Inputs',
      shortLabel: 'Inputs',
      subtitle: 'Income, accounts & debts',
      icon: SlidersHorizontal,
      badge: `Age ${currentAge} → ${retirementAge}`,
      activeHighlight: 'blue'
    },
    {
      id: 'estate',
      label: 'Estate Planning',
      shortLabel: 'Estate',
      subtitle: 'Death taxes & probate',
      icon: Landmark,
      activeHighlight: 'purple'
    },
    {
      id: 'expat',
      label: 'Expat Planning',
      shortLabel: 'Expat',
      subtitle: 'Cross-border & departure',
      icon: Globe,
      badge: planExpatExit ? 'Active' : undefined,
      activeHighlight: 'amber'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Aside Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-[#11141A] border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out ${
          // Width logic
          isSidebarCollapsed ? 'w-[72px]' : 'w-64'
        } ${
          // Mobile slide-over transform
          isMobileSidebarOpen 
            ? 'translate-x-0 shadow-2xl' 
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header & Toggle */}
        <div className="h-16 px-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div 
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-3 cursor-pointer select-none group overflow-hidden ${
              isSidebarCollapsed ? 'justify-center w-full' : ''
            }`}
            title="Strata Canada — Canadian Wealth Intelligence"
          >
            {/* Architectural Monogram Icon */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xs shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V7C20 8.10457 19.1046 9 18 9H6C4.89543 9 4 8.10457 4 7V7Z" fill="white" fillOpacity="0.95" />
                <path d="M7 12C7 10.8954 7.89543 10 9 10H20C20 11.1046 19.1046 12 18 12H9C7.89543 12 7 11.1046 7 12V12Z" fill="white" fillOpacity="0.75" />
                <path d="M4 17C4 15.8954 4.89543 15 6 15H17C18.1046 15 19 15.8954 19 17V17C19 18.1046 18.1046 19 17 19H6C4.89543 19 4 18.1046 4 17V17Z" fill="white" fillOpacity="0.95" />
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white dark:border-[#11141A]" />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                    Strata
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                    Canada
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Retirement & Wealth
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
              title="Collapse sidebar (compact icon mode)"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex lg:hidden items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close navigation"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 flex flex-col gap-5 select-none scrollbar-thin">
          
          {/* Main Views Navigation Section */}
          <div className="flex flex-col gap-1">
            {!isSidebarCollapsed && (
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </div>
            )}

            {navItems.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  title={isSidebarCollapsed ? `${item.label} — ${item.subtitle}` : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left w-full ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {/* Left Active Accent Pill Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500" />
                  )}

                  {/* Nav Icon */}
                  <div className={`shrink-0 transition-transform group-hover:scale-105 ${
                    isActive 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Expanded Nav Label & Subtitle */}
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs truncate">
                          {item.shortLabel}
                        </span>
                        {item.badge && (
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                            item.id === 'expat' && planExpatExit
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expanded Live Summary Scorecard Snippet */}
          {!isSidebarCollapsed && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Plan Health</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {readinessScore}% Funded
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Nest Egg @ {retirementAge}:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${((netWorthAtRetirement || 0) / 1_000_000).toFixed(2)}M
                </span>
              </div>
            </div>
          )}

          {/* Interactive Tools & Modals Section */}
          <div className="flex flex-col gap-1">
            {!isSidebarCollapsed && (
              <div className="px-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tools & Scenarios
              </div>
            )}

            {/* Compare Ages */}
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              title={isSidebarCollapsed ? 'Compare Retirement Ages' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Scale className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              {!isSidebarCollapsed && <span>Compare Ages</span>}
            </button>

            {/* Compare Snapshots */}
            <button
              type="button"
              onClick={() => setIsSnapshotCompareModalOpen(true)}
              title={isSidebarCollapsed ? `Compare Saved Snapshots (${historyCount})` : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Compare Snapshots</span>
                  {historyCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                      {historyCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Simulation History Drawer */}
            <button
              type="button"
              onClick={toggleHistoryPanel}
              title={isSidebarCollapsed ? `Simulation Version History (${historyCount})` : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Plan History</span>
                  {historyCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                      {historyCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* AI Persona Prompt Modal */}
            <button
              type="button"
              onClick={() => setIsAIPersonaModalOpen(true)}
              title={isSidebarCollapsed ? 'AI Persona Generator' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-500 shrink-0" />
              {!isSidebarCollapsed && <span>AI Persona Generator</span>}
            </button>

            {/* Canadian Retirement Rules & Wealth Guide */}
            <button
              type="button"
              onClick={() => setIsWealthGuideModalOpen(true)}
              title={isSidebarCollapsed ? 'Canadian Retirement Rules & Wealth Guide' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Rules & Wealth Guide</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                    5 CRA
                  </span>
                </div>
              )}
            </button>

            {/* Export PDF */}
            <button
              type="button"
              onClick={exportPdf}
              disabled={isExportingPdf}
              title={isSidebarCollapsed ? 'Export Executive PDF Plan' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition cursor-pointer disabled:opacity-50 ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <FileDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              {!isSidebarCollapsed && (
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Export PDF Plan'}</span>
              )}
            </button>

            {/* Clean Canvas / Clear All Data */}
            <button
              type="button"
              onClick={resetToBlankCanvas}
              title={isSidebarCollapsed ? 'Clean Canvas / Reset to $0' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <RotateCcw className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              {!isSidebarCollapsed && <span>Clean Canvas ($0)</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
          
          {/* Province selector */}
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Province:</span>
              </div>
              <select
                value={province}
                onChange={(e) => applyProvince(e.target.value as CanadianProvince)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden cursor-pointer text-xs"
              >
                {Object.entries(PROVINCIAL_BRACKETS).map(([code, p]) => (
                  <option key={code} value={code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div 
              className="flex items-center justify-center py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"
              title={`Province: ${province}`}
            >
              <span className="px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-[10.5px]">
                {province}
              </span>
            </div>
          )}

          {/* Theme & Expand/Collapse Row */}
          <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'flex-col' : 'justify-between'}`}>
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer ${
                isSidebarCollapsed ? 'w-full justify-center px-0' : ''
              }`}
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {!isSidebarCollapsed && (
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              )}
            </button>

            {/* Desktop Expand / Collapse Button */}
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
