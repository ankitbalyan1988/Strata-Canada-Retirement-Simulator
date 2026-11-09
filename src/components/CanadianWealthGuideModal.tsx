import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Landmark,
  ShieldCheck,
  Scale,
  HelpCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ChevronsUpDown,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export interface CanadianWealthGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const CanadianWealthGuideModal: React.FC<CanadianWealthGuideModalProps> = (props) => {
  const storeIsOpen = useSimulationStore((state) => state.isWealthGuideModalOpen);
  const storeSetIsOpen = useSimulationStore((state) => state.setIsWealthGuideModalOpen);
  const setActiveView = useSimulationStore((state) => state.setActiveView);

  const isOpen = props.isOpen ?? storeIsOpen;
  const onClose = props.onClose ?? (() => storeSetIsOpen(false));

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true
  });

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const strategies = [
    {
      id: 0,
      category: 'rrsp',
      title: 'RRSP to RRIF Conversion at Age 71',
      badge: 'Mandatory Rule',
      badgeColor: 'blue',
      icon: <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      summary: 'Your RRSP must convert to a RRIF by Dec 31 of your 71st year, triggering annual mandatory minimum withdrawals.',
      content: (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Under CRA tax legislation, your <strong>Registered Retirement Savings Plan (RRSP)</strong> cannot remain open past December 31 of the calendar year in which you turn <strong>71</strong>. You must either convert it into a <strong>Registered Retirement Income Fund (RRIF)</strong> or purchase an annuity.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-2">
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">Age 72 Minimum</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">5.40%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Mandatory starting minimum</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">Age 85 Minimum</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">8.51%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Ramps higher each year</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">Age 95+ Maximum</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">20.00%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Capped statutory rate</span>
            </div>
          </div>
          <p>
            All withdrawals from a RRIF are <strong>100% taxable as ordinary income</strong> and are reported on line 11500 of your T1 return.
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="font-semibold text-emerald-800 dark:text-emerald-300">Pro Tip — The RRSP Meltdown Strategy:</strong> If you accumulate a substantial RRSP/RRIF balance, starting modest decumulation withdrawals between your retirement date and age 71 can preserve your lifetime tax bracket, deplete taxable balances at 20–30% marginal rates, and avoid massive OAS clawback spikes post-71.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 1,
      category: 'tfsa',
      title: 'TFSA: The Canadian Superpower in Decumulation',
      badge: 'Tax-Free Forever',
      badgeColor: 'emerald',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      summary: '100% tax-free capital growth and withdrawals that never trigger OAS clawbacks or reduce income-tested benefits.',
      content: (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong>Tax-Free Savings Account (TFSA)</strong> is funded with after-tax earnings. Crucially, all internal interest, capital gains, Canadian and foreign dividends (subject to standard withholding tax rules), and withdrawals are <strong>entirely tax-free for life</strong>.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              The True Decumulation Advantage
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              TFSA withdrawals are <strong>NOT considered income on your Canadian tax return</strong>. They do not increase your Net World Income (line 23600), meaning they:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>Never trigger the Old Age Security (OAS) recovery clawback tax.</li>
              <li>Never claw back the Guaranteed Income Supplement (GIS).</li>
              <li>Never reduce the Federal Age Amount tax credit or provincial health subsidies.</li>
              <li>Any amount withdrawn is automatically re-added to your contribution room on January 1 of the following calendar year.</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200">
            <strong className="font-semibold text-emerald-800 dark:text-emerald-300">Strategic Recommendation:</strong> Holding high-growth equity portfolios inside your TFSA late into retirement maximizes compound tax-free growth and preserves a 100% tax-free liquid buffer for healthcare or elder care needs.
          </div>
        </div>
      )
    },
    {
      id: 2,
      category: 'cpp_oas',
      title: 'CPP Timing: Take at 60, 65, or 70?',
      badge: 'Longevity Protection',
      badgeColor: 'indigo',
      icon: <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      summary: 'Permanent -36% penalty if started at age 60, or a permanent +42% enhancement if deferred until age 70.',
      content: (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            You can claim your Canada Pension Plan (CPP) retirement pension anytime between your 60th and 70th birthdays. The timing has a profound permanent multiplier on every future cheque for the rest of your life:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40">
              <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">Take Early @ Age 60</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">-36.0%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Reduced by 0.6% each month before 65 (-7.2%/yr)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block">Baseline @ Age 65</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">100.0%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Full baseline CRA entitlement (~$16,920/yr max in 2025/26)</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">Defer @ Age 70</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">+42.0%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Boosted by 0.7% each month after 65 (+8.4%/yr)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200">
            <strong className="font-semibold text-indigo-800 dark:text-indigo-300">Actuarial Reality:</strong> Delaying CPP yields an annualized, risk-free, inflation-indexed return that no retail annuity or GIC can match. If you expect average or above-average health (life expectancy 82+), deferring CPP toward 68–70 is one of Canada's most effective longevity insurance moves.
          </div>
        </div>
      )
    },
    {
      id: 3,
      category: 'cpp_oas',
      title: 'OAS Clawback (Recovery Tax) Defense',
      badge: 'CRA Threshold $93,208',
      badgeColor: 'amber',
      icon: <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      summary: 'Repay 15% of every dollar of net world income above the $93,208 threshold, with full clawback at ~$150k+.',
      content: (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Old Age Security (OAS) is paid to Canadian seniors starting at age 65. However, the federal government enforces the <strong>OAS Recovery Tax</strong> (commonly called the OAS clawback) for higher earners:
          </p>
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
              <span>2025/2026 CRA Clawback Floor:</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">$93,208</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
              <span>Clawback Rate:</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">15% ($0.15 per $1 above floor)</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
              <span>100% Elimination Ceiling:</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">~$150,000+</span>
            </div>
          </div>
          <div className="space-y-1 text-slate-600 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200 font-semibold block">Key Defense Tactics:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Equalize income with your spouse:</strong> Split eligible pension & RRIF income up to 50% so neither spouse crosses the $93k boundary.</li>
              <li><strong>Prioritize TFSA withdrawals:</strong> TFSA distributions do not appear on your tax return and will never trigger an OAS recovery deduction.</li>
              <li><strong>Delay OAS:</strong> Like CPP, you can defer OAS up to age 70 for a permanent +36% increase (+0.6% per month).</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 4,
      category: 'couples',
      title: 'Couples & Pension Income Splitting (CRA Form T1032)',
      badge: '50% Allocation',
      badgeColor: 'rose',
      icon: <Users className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      summary: 'Transfer up to 50% of eligible pension/RRIF income to a spouse, doubling tax credits and leveling brackets.',
      content: (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Canadian couples have a powerful tax advantage under Section 60.03 of the Income Tax Act. Starting at <strong>age 65</strong>, the higher-earning spouse can elect to allocate up to <strong>50% of eligible pension and RRIF withdrawals</strong> to the lower-earning spouse using <strong>CRA Form T1032</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Bracket Smoothing</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                Shifting $40,000 of income from a partner in the 43% marginal bracket to a partner in the 20% bracket saves thousands every year in household cash flow.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Double Pension Credit</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                Both spouses become eligible to claim the federal <strong>$2,000 Pension Income Amount tax credit</strong>, directly generating up to $600+ in annual federal and provincial tax savings.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-emerald-800 dark:text-emerald-300">Automated in Strata:</strong> When you set your status to Married or Common-Law and configure couple assets, Strata dynamically simulates optimal tax-rate smoothing and split ratios for your household.
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredStrategies = activeCategory === 'all'
    ? strategies
    : strategies.filter((s) => s.category === activeCategory);

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const areAllExpanded = filteredStrategies.every((s) => expandedSections[s.id]);

  const toggleAllExpanded = () => {
    const nextState = !areAllExpanded;
    const updated: Record<number, boolean> = { ...expandedSections };
    filteredStrategies.forEach((s) => {
      updated[s.id] = nextState;
    });
    setExpandedSections(updated);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wealth-guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col gap-3 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="wealth-guide-modal-title"
                    className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
                  >
                    Canadian Retirement Rules & Wealth Guide
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    5 CRA Strategies
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    CRA 2025/2026
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Essential CRA tax legislation, decumulation order mechanics, and wealth preservation strategies for Canadian retirees.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="Close guide (Esc)"
              aria-label="Close guide modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filter Navigation and Expand/Collapse All */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Rules (5)' },
                { id: 'rrsp', label: 'RRSP / RRIF' },
                { id: 'tfsa', label: 'TFSA Power' },
                { id: 'cpp_oas', label: 'CPP & OAS' },
                { id: 'couples', label: 'Couples Splitting' }
              ].map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={toggleAllExpanded}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Strategy Items */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredStrategies.map((strat) => {
            const isExpanded = Boolean(expandedSections[strat.id]);
            return (
              <div key={strat.id} className="pt-4 first:pt-0">
                <button
                  type="button"
                  onClick={() => toggleSection(strat.id)}
                  className="w-full flex items-start justify-between gap-3 text-left p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shrink-0 group-hover:scale-105 transition-transform">
                      {strat.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {strat.title}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          {strat.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                        {strat.summary}
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2 pl-4 sm:pl-14 pr-2 pb-2">
                    {strat.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>All 5 strategies are actively computed across Strata's simulation models.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveView('inputs');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Adjust Plan Inputs
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
