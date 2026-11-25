import React from 'react';
import { useSimulationStore, InputTab } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  User,
  Receipt,
  PiggyBank,
  CreditCard,
  Home,
  Heart,
  Landmark,
  TrendingUp,
  ArrowRightLeft,
  Globe,
  Sparkles
} from 'lucide-react';
import { getDebtQualifierFlags, getEffectiveDebts } from '../../utils/debtCalculator';
import { getActiveAdditionalProperties } from '../../utils/mortgage';

interface TabItem {
  id: InputTab;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  extraBadge?: string | number;
}

export const InputTabBar: React.FC = React.memo(() => {
  const activeInputTab = useSimulationStore((state) => state.activeInputTab);
  const setActiveInputTab = useSimulationStore((state) => state.setActiveInputTab);
  const isFocusMode = useSimulationStore((state) => state.isFocusMode);
  const focusModeZone = useSimulationStore((state) => state.focusModeZone);
  const {
    isMarried,
    hasDebts,
    isFutureOnlyDebtMode,
    debtsCount,
    earliestFutureDebtAge,
    housingStatus,
    showRealEstateSection,
    futurePurchaseDisplayAge,
    propertyCount,
    additionalPropertiesCount,
    planExpatExit,
    activeLifeEventsCount
  } = useSimulationStore(
    useShallow((state) => {
      const inp = state.inputs;
      const debtFlags = getDebtQualifierFlags(inp);
      const effectiveDebts = getEffectiveDebts(inp);
      const activeAdditional = getActiveAdditionalProperties(inp);
      const hStatus: 'own' | 'rent' = inp.housingStatus ?? (
        inp.realEstate?.ownsHome && inp.realEstate?.purchaseType !== 'future'
          ? 'own'
          : (inp.realEstate?.purchaseType === 'future' ? 'rent' : (inp.realEstate?.ownsHome === false ? 'rent' : 'own'))
      );
      const planFutureHome: boolean = inp.planFutureHomePurchase ?? Boolean(
        inp.realEstate?.ownsHome && inp.realEstate?.purchaseType === 'future'
      );
      const primaryCount = (hStatus === 'own' || (hStatus === 'rent' && planFutureHome)) ? 1 : 0;
      const totalProps = primaryCount + activeAdditional.length;
      const enabledLifeEvents = (inp.lifeEvents || []).filter((e) => e.enabled).length;
      return {
        isMarried: inp.maritalStatus === 'married',
        hasDebts: debtFlags.hasDebtModule,
        isFutureOnlyDebtMode: debtFlags.isFutureOnlyDebtMode,
        debtsCount: effectiveDebts.length,
        earliestFutureDebtAge: debtFlags.isFutureOnlyDebtMode && effectiveDebts.length > 0
          ? Math.min(...effectiveDebts.map((d) => d.startAge ?? inp.currentAge + 1))
          : undefined,
        housingStatus: hStatus,
        showRealEstateSection: hStatus === 'own' || (hStatus === 'rent' && planFutureHome) || activeAdditional.length > 0,
        futurePurchaseDisplayAge: inp.realEstate?.futurePurchaseAge || inp.currentAge + 3,
        propertyCount: totalProps,
        additionalPropertiesCount: activeAdditional.length,
        planExpatExit: inp.planExpatExit ?? Boolean(inp.expat?.planToEmigrate),
        activeLifeEventsCount: enabledLifeEvents
      };
    })
  );

  const TABS: TabItem[] = [
    {
      id: 'personal',
      title: 'Primary Profile',
      badge: 'Career & Timeline',
      icon: User,
      show: true
    },
    {
      id: 'expenses',
      title: 'Living Expenses',
      badge: 'Monthly Budget',
      icon: Receipt,
      show: true
    },
    {
      id: 'events',
      title: 'Life Events & Shocks',
      badge: 'Windfalls & Pauses',
      icon: Sparkles,
      show: true,
      extraBadge: activeLifeEventsCount > 0 ? activeLifeEventsCount : undefined
    },
    {
      id: 'accounts',
      title: 'Primary Accounts',
      badge: 'RRSP, TFSA, FHSA',
      icon: PiggyBank,
      show: true
    },
    {
      id: 'debts',
      title: isFutureOnlyDebtMode ? 'Future Debts & Loans' : 'Debts & Loans',
      badge: isFutureOnlyDebtMode
        ? (earliestFutureDebtAge ? `Starts @ ${earliestFutureDebtAge}` : 'Future Loans')
        : 'Liabilities',
      icon: CreditCard,
      show: hasDebts,
      extraBadge: debtsCount > 0 ? debtsCount : undefined
    },
    {
      id: 'realestate',
      title: housingStatus === 'rent' ? (additionalPropertiesCount > 0 ? 'Real Estate' : 'Future Home') : 'Real Estate',
      badge: housingStatus === 'rent'
        ? (additionalPropertiesCount > 0 ? `Buy @ ${futurePurchaseDisplayAge} + ${additionalPropertiesCount}` : `Buy @ ${futurePurchaseDisplayAge}`)
        : (propertyCount > 1 ? `${propertyCount} Properties` : 'Property & Equity'),
      icon: Home,
      show: showRealEstateSection,
      extraBadge: propertyCount > 1 ? propertyCount : undefined
    },
    {
      id: 'spouse',
      title: 'Spouse Profile',
      badge: 'Dual Accounts',
      icon: Heart,
      show: isMarried
    },
    {
      id: 'pensions',
      title: 'CPP & OAS Pensions',
      badge: 'Public Benefits',
      icon: Landmark,
      show: true
    },
    {
      id: 'market',
      title: 'Returns & Inflation',
      badge: 'Growth & CPI',
      icon: TrendingUp,
      show: true
    },
    {
      id: 'strategy',
      title: 'Drawdown Strategy',
      badge: 'Tax Decumulation',
      icon: ArrowRightLeft,
      show: true
    },
    {
      id: 'expat',
      title: 'Expat Relocation',
      badge: 'Departure Tax',
      icon: Globe,
      show: planExpatExit
    }
  ];

  const visibleTabs = TABS.filter((t) => t.show);

  return (
    <div
      role="tablist"
      aria-label="Profile and plan input horizontal navigation"
      data-focus-zone="input-tabs"
      className={`bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-xs transition-colors ${
        isFocusMode && focusModeZone === 'tabs'
          ? 'border-emerald-500/70 dark:border-emerald-400/70 ring-2 ring-emerald-500/15'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {visibleTabs.map((tab) => {
          const isActive = activeInputTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              id={`input-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`input-tabpanel-${tab.id}`}
              type="button"
              onClick={() => setActiveInputTab(tab.id)}
              className={`flex-1 min-w-[155px] sm:min-w-max max-w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all duration-150 cursor-pointer select-none group relative ${
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold leading-snug whitespace-normal sm:whitespace-nowrap">
                    {tab.title}
                  </span>
                  {tab.extraBadge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 leading-none ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}>
                      {tab.extraBadge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold leading-tight whitespace-normal sm:whitespace-nowrap ${
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
});

InputTabBar.displayName = 'InputTabBar';
