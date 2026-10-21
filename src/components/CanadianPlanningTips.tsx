import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  ShieldCheck, 
  Lightbulb, 
  Scale, 
  Landmark,
  Users
} from 'lucide-react';

export const CanadianPlanningTips: React.FC = () => {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const tips = [
    {
      title: 'RRSP to RRIF Conversion at Age 71',
      icon: <Landmark className="w-4 h-4 text-blue-600" />,
      content: (
        <div className="space-y-1.5 text-xs text-slate-600">
          <p>
            Under CRA tax rules, your RRSP must be closed or converted to a <strong>Registered Retirement Income Fund (RRIF)</strong> by December 31 of the year you turn <strong>71</strong>.
          </p>
          <p>
            Starting at age 72, you must withdraw a minimum percentage each calendar year (e.g., 5.40% at 72, 8.51% at 85, climbing to 20% at 95+). All withdrawals are 100% taxable as ordinary income.
          </p>
          <p className="text-blue-700 font-medium">
            Pro Tip: If your RRSP is large, an "RRSP Meltdown" strategy between your retirement age and age 71 can spread the tax burden across lower marginal brackets and prevent large OAS clawbacks later.
          </p>
        </div>
      )
    },
    {
      title: 'TFSA: The Canadian Superpower in Decumulation',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="space-y-1.5 text-xs text-slate-600">
          <p>
            The <strong>Tax-Free Savings Account (TFSA)</strong> is funded with after-tax dollars, and all capital gains, dividends, and withdrawals are completely tax-free forever.
          </p>
          <p>
            Crucially, <strong>TFSA withdrawals are NOT considered income</strong> on your Canadian tax return. They never trigger OAS recovery clawbacks and do not reduce federal income-tested tax credits (like the Age Amount or GST/HST credit).
          </p>
          <p className="text-emerald-700 font-medium">
            Best Practice: Holding TFSA balances as long as possible allows maximum compound tax-free growth and gives you a tax-free emergency fund in late retirement.
          </p>
        </div>
      )
    },
    {
      title: 'CPP Timing: Take at 60, 65, or 70?',
      icon: <Scale className="w-4 h-4 text-indigo-600" />,
      content: (
        <div className="space-y-1.5 text-xs text-slate-600">
          <p>
            You can start your Canada Pension Plan (CPP) retirement pension anytime between age 60 and 70:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Taking CPP before 65:</strong> Your benefit is permanently reduced by <strong>0.6% per month (7.2% per year)</strong>. At age 60, you receive 36% less than at age 65.</li>
            <li><strong>Standard age 65:</strong> 100% baseline entitlement (~$16,920/yr in 2025/2026).</li>
            <li><strong>Delaying past 65:</strong> Your benefit permanently increases by <strong>0.7% per month (8.4% per year)</strong> up to age 70 (a <strong>+42% permanent enhancement</strong>!).</li>
          </ul>
          <p className="text-indigo-700 font-medium">
            Takeaway: If you are in good health, delaying CPP acts as guaranteed, government-backed, inflation-protected longevity insurance.
          </p>
        </div>
      )
    },
    {
      title: 'OAS Clawback (Recovery Tax) Defense',
      icon: <HelpCircle className="w-4 h-4 text-amber-600" />,
      content: (
        <div className="space-y-1.5 text-xs text-slate-600">
          <p>
            Old Age Security (OAS) is paid starting at age 65. However, if your individual net taxable world income exceeds the CRA threshold (approx <strong>$93,208</strong> for 2025/2026), you must repay <strong>15 cents of every dollar</strong> above the threshold (the OAS Recovery Tax).
          </p>
          <p>
            If your net income reaches approx $150,000+, your entire OAS is clawed back to $0.
          </p>
          <p className="text-amber-700 font-medium">
            Defense: Utilize TFSA withdrawals, spread RRSP draws before 71, or use non-registered capital return to keep net taxable income comfortably below $93k.
          </p>
        </div>
      )
    },
    {
      title: 'Couples & Pension Income Splitting (CRA Form T1032)',
      icon: <Users className="w-4 h-4 text-rose-600" />,
      content: (
        <div className="space-y-1.5 text-xs text-slate-600">
          <p>
            Canadian couples have a massive tax planning advantage: starting at <strong>age 65</strong>, up to <strong>50% of eligible pension and RRIF income</strong> can be allocated to your spouse on your tax return.
          </p>
          <p>
            This enables couples to equalize taxable income brackets, dramatically reduce household marginal tax rates, double the federal <strong>$2,000 Pension Income Amount</strong> tax credit, and shield higher earners from OAS clawback.
          </p>
          <p className="text-rose-700 font-medium">
            MapleRetire automatically models CRA pension income splitting when you select Married and turn on the optimization toggle!
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col gap-3 transition duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
            <Lightbulb className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Canadian Retirement Rules & Wealth Guide
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                5 CRA Strategies
              </span>
            </div>
            <p className="text-xs text-slate-500">Essential CRA tax principles every Canadian professional should know</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-600 hover:text-slate-900:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80:bg-slate-750 transition border border-slate-200 font-medium self-start sm:self-auto cursor-pointer"
          title={isExpanded ? 'Collapse Wealth Guide' : 'Expand Wealth Guide'}
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? 'Collapse' : 'Expand Guide'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {tips.map((tip, idx) => {
            const isOpen = openSection === idx;
            return (
              <div key={tip.title} className="py-2.5">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-rose-600:text-rose-400 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {tip.icon}
                    <span>{tip.title}</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="mt-2.5 pl-6 pr-2 pb-1 text-slate-600">
                    {tip.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
