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
  BookOpen,
  Users,
  Calendar,
  ShieldAlert,
  Sliders,
  User,
  Receipt,
  PiggyBank,
  CreditCard,
  Home,
  Heart,
  ArrowRightLeft,
  HelpCircle,
  Command
} from 'lucide-react';
import { useSimulationStore, AppView, DashboardTab, InputTab } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { PROVINCIAL_BRACKETS } from '../../utils/canadianTax';
import { CanadianProvince } from '../../types/retirement';
import { isMacPlatform } from '../../utils/keyboardShortcuts';
import { getDebtQualifierFlags } from '../../utils/debtCalculator';

export const Sidebar: React.FC = () => {
  const activeView = useSimulationStore((state) => state.activeView);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const isSidebarCollapsed = useSimulationStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useSimulationStore((state) => state.toggleSidebarCollapsed);
  const isMobileSidebarOpen = useSimulationStore((state) => state.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useSimulationStore((state) => state.setIsMobileSidebarOpen);

  const activeDashboardTab = useSimulationStore((state) => state.activeDashboardTab);
  const setActiveDashboardTab = useSimulationStore((state) => state.setActiveDashboardTab);
  const activeInputTab = useSimulationStore((state) => state.activeInputTab);
  const setActiveInputTab = useSimulationStore((state) => state.setActiveInputTab);
  const isStressTestActive = useSimulationStore((state) => state.isStressTestActive);
  const whatIfSettings = useSimulationStore((state) => state.whatIfSettings);

  const theme = useSimulationStore((state) => state.theme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const inputs = useSimulationStore((state) => state.inputs);
  const province = inputs.province;
  const applyProvince = useSimulationStore((state) => state.applyProvince);
  const currentAge = inputs.currentAge;
  const retirementAge = inputs.retirementAge;
  const readinessScore = useSimulationStore((state) => state.optimisticSummary.readinessScore);
  const netWorthAtRetirement = useSimulationStore((state) => state.optimisticSummary.netWorthAtRetirement);
  const history = useSimulationStore(useShallow((state) => state.history));
  const activeSnapshotId = useSimulationStore((state) => state.activeSnapshotId);
  const restoreSnapshot = useSimulationStore((state) => state.restoreSnapshot);
  const historyCount = history.length;
  const toggleHistoryPanel = useSimulationStore((state) => state.toggleHistoryPanel);
  const setIsCompareModalOpen = useSimulationStore((state) => state.setIsCompareModalOpen);
  const setIsSnapshotCompareModalOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const setIsWealthGuideModalOpen = useSimulationStore((state) => state.setIsWealthGuideModalOpen);
  const setIsHelpGuideModalOpen = useSimulationStore((state) => state.setIsHelpGuideModalOpen);
  const setIsCommandPaletteOpen = useSimulationStore((state) => state.setIsCommandPaletteOpen);
  const exportPdf = useSimulationStore((state) => state.exportPdf);
  const isExportingPdf = useSimulationStore((state) => state.isExportingPdf);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);
  const isMac = React.useMemo(() => isMacPlatform(), []);

  const planExpatExit = inputs.planExpatExit ?? Boolean(inputs.expat?.planToEmigrate);
  const isMarried = inputs.maritalStatus === 'married';
  const debtFlags = getDebtQualifierFlags(inputs);
  const hasDebts = debtFlags.hasDebtModule;
  const isFutureOnlyDebtMode = debtFlags.isFutureOnlyDebtMode;
  const housingStatus: 'own' | 'rent' = inputs.housingStatus ?? (
    inputs.realEstate?.ownsHome && inputs.realEstate?.purchaseType !== 'future'
      ? 'own'
      : (inputs.realEstate?.purchaseType === 'future' ? 'rent' : (inputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
  );
  const planFutureHomePurchase = inputs.planFutureHomePurchase ?? Boolean(
    inputs.realEstate?.ownsHome && inputs.realEstate?.purchaseType === 'future'
  );
  const showRealEstateSection = housingStatus === 'own' || (housingStatus === 'rent' && planFutureHomePurchase);

  const hasWhatIfActive =
    whatIfSettings.isActive &&
    (whatIfSettings.returnDelta !== 0 ||
      whatIfSettings.appreciationDelta !== 0 ||
      whatIfSettings.inflationDelta !== 0);

  const DASHBOARD_SUBTABS: Array<{
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard, badge: 'KPIs' },
    { id: 'ledger', label: 'Simulation Ledger', icon: Calendar, badge: 'Annual' },
    { id: 'cashflows', label: 'Cash Flows', icon: ArrowRightLeft, badge: 'Flows' },
    { id: 'stresstest', label: 'Plan Stress Test', icon: ShieldAlert, badge: isStressTestActive ? 'Active' : undefined },
    { id: 'whatif', label: 'What-If Analysis', icon: Sliders, badge: hasWhatIfActive ? 'Active' : undefined }
  ];

  const INPUT_SUBTABS: Array<{
    id: InputTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'personal', label: 'Primary Profile', icon: User },
    { id: 'expenses', label: 'Living Expenses', icon: Receipt },
    { id: 'accounts', label: 'Primary Accounts', icon: PiggyBank },
    ...(showRealEstateSection ? [{ id: 'realestate' as InputTab, label: housingStatus === 'rent' ? 'Future Home' : 'Real Estate', icon: Home }] : []),
    ...(hasDebts ? [{ id: 'debts' as InputTab, label: isFutureOnlyDebtMode ? 'Future Debts & Loans' : 'Debts & Loans', icon: CreditCard }] : []),
    ...(isMarried ? [{ id: 'spouse' as InputTab, label: 'Spouse Profile', icon: Heart }] : []),
    { id: 'pensions', label: 'CPP & OAS Pensions', icon: Landmark },
    { id: 'market', label: 'Returns & Inflation', icon: TrendingUp },
    { id: 'strategy', label: 'Drawdown Strategy', icon: ArrowRightLeft },
    ...(planExpatExit ? [{ id: 'expat' as InputTab, label: 'Expat Relocation', icon: Globe }] : [])
  ];

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
              const isDashboard = item.id === 'dashboard';
              const isInputs = item.id === 'inputs';

              // Current active sub-tab title for subtitle hint
              const activeSubLabel = isDashboard
                ? DASHBOARD_SUBTABS.find((t) => t.id === activeDashboardTab)?.label || 'Main Dashboard'
                : isInputs
                  ? INPUT_SUBTABS.find((t) => t.id === activeInputTab)?.label || 'Primary Profile'
                  : null;

              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setActiveView(item.id)}
                      title={isSidebarCollapsed ? `${item.label} — ${activeSubLabel || item.subtitle}` : undefined}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out cursor-pointer text-left w-full select-none ${
                        isActive
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 hover:border-slate-200 dark:hover:border-slate-700/60 border border-transparent'
                      } ${isSidebarCollapsed ? 'justify-center px-0 h-11' : ''}`}
                    >
                      {/* Left Active Accent Pill Bar with Luminous Glow */}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1.5 rounded-r-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-in fade-in duration-200" />
                      )}

                      {/* Nav Icon with subtle hover micro-interaction */}
                      <div className={`shrink-0 p-1 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 scale-105' 
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:scale-110'
                      }`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>

                      {/* Expanded Nav Label & Subtitle */}
                      {!isSidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs truncate font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                              {item.shortLabel}
                            </span>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              {item.badge && !isActive && (
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                                  item.id === 'expat' && planExpatExit
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                  {item.badge}
                                </span>
                              )}

                              {isActive ? (
                                <span className="relative flex h-2 w-2" title="Active View">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                              )}
                            </div>
                          </div>

                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {isActive && activeSubLabel ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                ● {activeSubLabel}
                              </span>
                            ) : (
                              item.subtitle
                            )}
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Collapsed Mode Flyout Menu for Instant Sub-tab Browsing */}
                    {isSidebarCollapsed && (
                      <div className="absolute left-full top-0 ml-2.5 z-50 hidden group-hover:flex flex-col bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xl p-2 min-w-[200px] border border-slate-700 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2 py-1 border-b border-slate-700/80 mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.label}</span>
                          {isActive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Collapsed Dashboard Sub-tabs */}
                        {isDashboard && (
                          <div className="flex flex-col gap-0.5 pt-0.5">
                            {DASHBOARD_SUBTABS.map((sub) => {
                              const isSubActive = isActive && activeDashboardTab === sub.id;
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveView('dashboard');
                                    setActiveDashboardTab(sub.id);
                                  }}
                                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                                    isSubActive
                                      ? 'bg-emerald-500/25 text-emerald-200 font-semibold'
                                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <SubIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{sub.label}</span>
                                  </div>
                                  {sub.badge && (
                                    <span className="text-[9px] text-slate-400 px-1 rounded bg-slate-800">
                                      {sub.badge}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Collapsed Inputs Sub-tabs */}
                        {isInputs && (
                          <div className="flex flex-col gap-0.5 pt-0.5 max-h-64 overflow-y-auto scrollbar-thin">
                            {INPUT_SUBTABS.map((sub) => {
                              const isSubActive = isActive && activeInputTab === sub.id;
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveView('inputs');
                                    setActiveInputTab(sub.id);
                                  }}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                                    isSubActive
                                      ? 'bg-emerald-500/25 text-emerald-200 font-semibold'
                                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                                  }`}
                                >
                                  <SubIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded Sub-tabs Drawer for Dashboard (Interactive Discoverability) */}
                  {!isSidebarCollapsed && isDashboard && isActive && (
                    <div className="ml-4 pl-3 border-l-2 border-emerald-500/20 dark:border-emerald-500/15 flex flex-col gap-1 py-1 my-0.5 animate-in slide-in-from-left-2 duration-200">
                      {DASHBOARD_SUBTABS.map((sub) => {
                        const isSubActive = activeDashboardTab === sub.id;
                        const SubIcon = sub.icon;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setActiveView('dashboard');
                              setActiveDashboardTab(sub.id);
                            }}
                            className={`group/sub flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ease-out cursor-pointer text-left ${
                              isSubActive
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold shadow-2xs border border-emerald-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:translate-x-1'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                                isSubActive
                                  ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                                  : 'text-slate-400 dark:text-slate-500 group-hover/sub:text-emerald-500 group-hover/sub:scale-110'
                              }`} />
                              <span className="truncate">{sub.label}</span>
                            </div>

                            {sub.badge && (
                              <span className={`text-[9.5px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${
                                isSubActive
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                              }`}>
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded Sub-tabs Drawer for Profile & Plan Inputs (Interactive Discoverability) */}
                  {!isSidebarCollapsed && isInputs && isActive && (
                    <div className="ml-4 pl-3 border-l-2 border-emerald-500/20 dark:border-emerald-500/15 flex flex-col gap-0.5 py-1 my-0.5 animate-in slide-in-from-left-2 duration-200">
                      {INPUT_SUBTABS.map((sub) => {
                        const isSubActive = activeInputTab === sub.id;
                        const SubIcon = sub.icon;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setActiveView('inputs');
                              setActiveInputTab(sub.id);
                            }}
                            className={`group/sub flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ease-out cursor-pointer text-left ${
                              isSubActive
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold shadow-2xs border border-emerald-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:translate-x-1'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                                isSubActive
                                  ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                                  : 'text-slate-400 dark:text-slate-500 group-hover/sub:text-emerald-500 group-hover/sub:scale-110'
                              }`} />
                              <span className="truncate">{sub.label}</span>
                            </div>

                            {isSubActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Scale className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-150 shrink-0" />
              {!isSidebarCollapsed && <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Compare Ages</span>}
            </button>

            {/* Compare Snapshots */}
            <button
              type="button"
              onClick={() => setIsSnapshotCompareModalOpen(true)}
              title={isSidebarCollapsed ? `Compare Saved Snapshots (${historyCount})` : undefined}
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Compare Snapshots</span>
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
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Plan History</span>
                  {historyCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                      {historyCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Quick Scenario Switcher when multiple scenarios exist */}
            {historyCount > 1 && !isSidebarCollapsed && (
              <div className="px-1 py-1">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-500" />
                      <span>Switch Scenario:</span>
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{historyCount}</span>
                  </div>
                  <select
                    value={activeSnapshotId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        restoreSnapshot(e.target.value);
                      }
                    }}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate cursor-pointer"
                  >
                    <option value="" disabled>Select scenario...</option>
                    {history.map((snap) => (
                      <option key={snap.id} value={snap.id}>
                        {snap.label} (Age {snap.metrics.retirementAge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Standard or AI Personas Modal */}
            <button
              type="button"
              onClick={() => setIsAIPersonaModalOpen(true)}
              title={isSidebarCollapsed ? 'Standard or AI Personas' : undefined}
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Users className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {!isSidebarCollapsed && <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Standard or AI Personas</span>}
            </button>

            {/* Canadian Retirement Rules & Wealth Guide */}
            <button
              type="button"
              onClick={() => setIsWealthGuideModalOpen(true)}
              title={isSidebarCollapsed ? 'Canadian Retirement Rules & Wealth Guide' : undefined}
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Rules & Wealth Guide</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                    7 CRA
                  </span>
                </div>
              )}
            </button>

            {/* Application Help Guide (Functional & Technical) */}
            <button
              type="button"
              onClick={() => setIsHelpGuideModalOpen(true)}
              title={isSidebarCollapsed ? 'Application Help & Architecture Guide' : undefined}
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Help & Tech Guide</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                    Manual
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
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer disabled:opacity-50 ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <FileDown className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-150 shrink-0" />
              {!isSidebarCollapsed && (
                <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{isExportingPdf ? 'Exporting PDF...' : 'Export PDF Plan'}</span>
              )}
            </button>

            {/* Clean Canvas / Clear All Data */}
            <button
              type="button"
              onClick={resetToBlankCanvas}
              title={isSidebarCollapsed ? 'Clean Canvas / Reset to $0' : undefined}
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:translate-x-1 transition-all duration-150 ease-out cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <RotateCcw className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:-rotate-45 transition-all duration-200 shrink-0" />
              {!isSidebarCollapsed && <span className="transition-colors">Clean Canvas ($0)</span>}
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

          {/* User Account / Planner Profile Card (Bottom Left Corner) */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
            {inputs.userName?.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setActiveView('inputs');
                  setActiveInputTab('personal');
                }}
                className={`group/user flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-emerald-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 cursor-pointer shadow-2xs w-full text-left ${
                  isSidebarCollapsed ? 'justify-center p-1.5' : ''
                }`}
                title={`${inputs.userName.trim()} (Primary Planner) — Click to view profile`}
                aria-label={`Logged in as ${inputs.userName.trim()}. Click to manage profile.`}
              >
                {/* Avatar with Initials and Active Online Dot */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white font-bold text-xs shadow-xs group-hover/user:scale-105 transition-transform">
                    {(() => {
                      const trimmed = inputs.userName.trim();
                      const parts = trimmed.split(/\s+/).filter(Boolean);
                      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                    })()}
                  </div>
                  <span 
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#11141A] ring-1 ring-emerald-400/40" 
                    title="Active Plan Session"
                  />
                </div>

                {/* Name & Account Details (Expanded Sidebar) */}
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover/user:text-emerald-700 dark:group-hover/user:text-emerald-300 transition-colors">
                          {inputs.userName.trim()}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                        <span>•</span>
                        <span>Age {inputs.currentAge}</span>
                        <span>•</span>
                        <span className="uppercase">{province}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/user:text-emerald-600 dark:group-hover/user:text-emerald-400 group-hover/user:translate-x-0.5 transition-all shrink-0" />
                  </div>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveView('inputs');
                  setActiveInputTab('personal');
                }}
                className={`group/user flex items-center gap-2.5 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 hover:bg-emerald-50/70 dark:hover:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-400 transition-all duration-200 cursor-pointer w-full text-left ${
                  isSidebarCollapsed ? 'justify-center p-1.5' : ''
                }`}
                title="Guest Session — Click to personalize your name and plan"
                aria-label="Guest session. Click to enter your name."
              >
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover/user:text-emerald-600 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white dark:border-[#11141A]" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover/user:text-emerald-600 transition-colors">
                      Enter Your Name
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      Personalize your plan
                    </div>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
