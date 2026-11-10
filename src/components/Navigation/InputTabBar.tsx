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
  Globe
} from 'lucide-react';

interface TabItem {
  id: InputTab;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  extraBadge?: string | number;
}

export const InputTabBar: React.FC = () => {
  const activeInputTab = useSimulationStore((state) => state.activeInputTab);
  const setActiveInputTab = useSimulationStore((state) => state.setActiveInputTab);
  const inputs = useSimulationStore(useShallow((state) => state.inputs));

  const isMarried = inputs.maritalStatus === 'married';
  const hasDebts = inputs.hasOngoingOrFutureDebts ?? Boolean(inputs.debts && inputs.debts.length > 0);

  const housingStatus: 'own' | 'rent' = inputs.housingStatus ?? (
    inputs.realEstate?.ownsHome && inputs.realEstate?.purchaseType !== 'future'
      ? 'own'
      : (inputs.realEstate?.purchaseType === 'future' ? 'rent' : (inputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
  );

  const planFutureHomePurchase: boolean = inputs.planFutureHomePurchase ?? Boolean(
    inputs.realEstate?.ownsHome && inputs.realEstate?.purchaseType === 'future'
  );

  const showRealEstateSection = housingStatus === 'own' || (housingStatus === 'rent' && planFutureHomePurchase);
  const planExpatExit: boolean = inputs.planExpatExit ?? Boolean(inputs.expat?.planToEmigrate);

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
      id: 'accounts',
      title: 'Primary Accounts',
      badge: 'RRSP, TFSA, FHSA',
      icon: PiggyBank,
      show: true
    },
    {
      id: 'debts',
      title: 'Debts & Loans',
      badge: 'Liabilities',
      icon: CreditCard,
      show: hasDebts,
      extraBadge: inputs.debts && inputs.debts.length > 0 ? inputs.debts.length : undefined
    },
    {
      id: 'realestate',
      title: housingStatus === 'rent' ? 'Future Home' : 'Real Estate',
      badge: housingStatus === 'rent' ? `Buy @ ${inputs.realEstate?.futurePurchaseAge || inputs.currentAge + 3}` : 'Property & Equity',
      icon: Home,
      show: showRealEstateSection
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
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-xs transition-colors"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
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
                  {tab.extraBadge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
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
