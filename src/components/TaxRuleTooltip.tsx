import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, HelpCircle, X, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';

export interface TaxRuleData {
  id: string;
  badge: string;
  title: string;
  limit?: string;
  taxImplication: string;
  craRule: string;
  citation?: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'indigo';
}

export const CRA_TAX_RULES: Record<string, TaxRuleData> = {
  // FHSA Rules
  fhsa_annual: {
    id: 'fhsa_annual',
    badge: 'CRA 2025 Rule',
    title: '2025 FHSA Contribution Limit & Deductibility',
    limit: '$8,000 / year (Lifetime cap: $40,000)',
    taxImplication: 'Triple tax benefit: Contributions reduce your taxable income (like an RRSP), investments compound 100% tax-free, and qualifying first-home withdrawals are completely tax-free (like a TFSA).',
    craRule: 'Annual statutory limit is $8,000 per calendar year. Unused room carries forward up to $8,000 max (allowing up to a $16,000 contribution in a single year). The account has a 15-year statutory lifetime (or until Dec 31 of year turning 71). If not used for a qualifying home, it can roll over 100% tax-free directly into your RRSP/RRIF without consuming any of your RRSP room!',
    citation: 'CRA Form T4FHSA • Income Tax Act §146.6',
    badgeColor: 'amber'
  },
  fhsa_room: {
    id: 'fhsa_room',
    badge: 'CRA Lifetime Cap',
    title: 'FHSA Remaining Lifetime Room',
    limit: 'Maximum $40,000 lifetime per individual',
    taxImplication: 'Every dollar contributed provides a dollar-for-dollar deduction against your marginal income tax bracket. Couples buying together can contribute up to $80,000 combined for $80,000 in deductions and tax-free down payment funding.',
    craRule: 'Lifetime contribution room is strictly capped at $40,000. Carry-forward room only starts accumulating after an FHSA account is officially opened with a financial institution.',
    citation: 'CRA Guide RC4820',
    badgeColor: 'amber'
  },
  fhsa_balance: {
    id: 'fhsa_balance',
    badge: 'Tax-Free Withdrawal',
    title: 'FHSA Balance & Home Purchase Rules',
    limit: 'Qualifying withdrawal: 100% tax-free',
    taxImplication: 'Unlike the RRSP Home Buyers’ Plan (HBP), FHSA withdrawals for a first home never have to be repaid to the CRA. Can be stacked alongside the $60,000 RRSP HBP for up to $100,000 per individual ($200,000 per couple).',
    craRule: 'Must be a Canadian resident buying or building a qualifying first home in Canada with a written agreement entered before Oct 1 of the calendar year following the withdrawal.',
    citation: 'CRA Form RC725',
    badgeColor: 'amber'
  },

  // RRSP Rules
  rrsp_annual: {
    id: 'rrsp_annual',
    badge: 'CRA 2025 Limit',
    title: '2025 RRSP Contribution Limit & Tax Deduction',
    limit: '18% of prior year earned income up to $32,490 (2025) / $31,560 (2024)',
    taxImplication: 'Contributions generate an immediate tax deduction against your top marginal tax bracket, often generating refunds between 30% and 53.5%. Investment earnings compound completely tax-deferred.',
    craRule: 'Unused contribution room carries forward indefinitely. Total room is reduced by any employer Pension Adjustments (PA). Contributions made within the first 60 days of the calendar year can be deducted on the prior tax year return.',
    citation: 'CRA Form T4RSP • Income Tax Act §146',
    badgeColor: 'blue'
  },
  rrsp_balance: {
    id: 'rrsp_balance',
    badge: 'Tax-Deferred',
    title: 'RRSP Balance & Decumulation Taxation',
    limit: 'Tax-deferred until withdrawal',
    taxImplication: 'Withdrawals are treated as 100% regular taxable income (T4RSP) and subject to upfront withholding tax (10% to 30%). In retirement, strategic decumulation keeps you in low tax brackets.',
    craRule: 'Must convert your RRSP to a RRIF or registered annuity by December 31 of the year you turn 71. Mandatory minimum annual withdrawals start the following year (age 72: 5.40%, scaling upward). At death, remaining balance is 100% taxable on the final return unless transferred to a surviving spouse.',
    citation: 'CRA Guide T4040 • Form T4RIF',
    badgeColor: 'blue'
  },
  employer_match: {
    id: 'employer_match',
    badge: 'Group RRSP / DPSP',
    title: 'Employer RRSP & DPSP Matching Rules',
    limit: 'Consumes employee statutory RRSP room',
    taxImplication: 'Immediate 100% guaranteed return on your contributed funds. Employer contributions are either reported as taxable income offset by an equal RRSP deduction (Group RRSP) or reported via Box 52 Pension Adjustment on your T4 (DPSP).',
    craRule: 'Total employee + employer contributions cannot exceed your official CRA statutory deduction limit. Overcontributing beyond $2,000 lifetime grace triggers a 1%/month CRA penalty.',
    citation: 'CRA Guide T4040 • DPSP Rules',
    badgeColor: 'blue'
  },

  // TFSA Rules
  tfsa_annual: {
    id: 'tfsa_annual',
    badge: 'CRA 2025 Limit',
    title: '2025 TFSA Dollar Limit & Recontribution Rules',
    limit: '$7,000 / year (Cumulative lifetime room: $102,000 in 2025)',
    taxImplication: '100% tax-free growth: Capital gains, Canadian dividends, and interest never pay a cent of Canadian tax. Withdrawals are completely non-taxable and never trigger OAS or GIS clawbacks.',
    craRule: 'Unused room carries forward indefinitely for Canadian residents age 18+. Any amount withdrawn from a TFSA is automatically re-added to your contribution room on January 1st of the following calendar year.',
    citation: 'CRA Form RC343 • Income Tax Act §146.2',
    badgeColor: 'emerald'
  },
  tfsa_balance: {
    id: 'tfsa_balance',
    badge: '100% Tax-Free',
    title: 'TFSA Balance & Estate Protection',
    limit: 'Tax-free for life and upon death',
    taxImplication: 'Unlike RRSPs/RRIFs, TFSA balances at death do not trigger a massive deemed income disposition. Naming a spouse as "Successor Annuitant" allows the entire account to roll over tax-free without using the spouse\'s contribution room.',
    craRule: 'Over-contributions are penalized at 1% per month on the highest excess balance. Foreign withholding tax on US dividends (15%) applies in TFSAs unlike RRSPs.',
    citation: 'CRA Guide RC4466',
    badgeColor: 'emerald'
  },

  // Non-Registered / Taxable Accounts
  nonreg_balance: {
    id: 'nonreg_balance',
    badge: 'Taxable Account',
    title: 'Non-Registered Investment Taxation',
    limit: 'No contribution ceiling',
    taxImplication: 'Capital gains are taxed at 50% inclusion rate (66.67% on annual gains exceeding $250,000 under recent federal legislation). Eligible Canadian dividends benefit from the Federal Dividend Tax Credit.',
    craRule: 'Interest and foreign dividend income are taxed at 100% full marginal income rates. Capital losses can offset capital gains in the current year, be carried back 3 years, or carried forward indefinitely.',
    citation: 'CRA Schedule 3 • Form T5',
    badgeColor: 'purple'
  },

  // Employment Income & Trajectory
  employment_income: {
    id: 'employment_income',
    badge: 'Earned Income',
    title: 'Employment Earnings & CRA Room Generation',
    limit: 'Subject to graduated federal & provincial tax brackets',
    taxImplication: 'Earned income generates 18% new RRSP contribution room for the following tax year (up to $32,490 for 2025). High earners can maximize pension savings while reducing high marginal taxes.',
    craRule: 'Employment earnings require mandatory CPP contributions up to the Year’s Maximum Pensionable Earnings (YMPE $71,300 in 2025) and enhanced CPP2 contributions up to the YAMPE ($81,200 in 2025). Qualifies for the Canada Employment Amount tax credit.',
    citation: 'CRA T4 Slip • Line 10100',
    badgeColor: 'indigo'
  },
  wage_trajectory: {
    id: 'wage_trajectory',
    badge: 'Real Wage Growth',
    title: 'Wage Trajectory vs Bracket Indexation',
    limit: 'Real growth above or below inflation',
    taxImplication: 'Wage growth above inflation pushes earnings into higher marginal tax brackets. However, federal and provincial tax brackets, the basic personal amount, and RRSP/TFSA limits are indexed annually to CPI inflation.',
    craRule: 'CRA adjusts personal income tax brackets and credit amounts on January 1st each year based on Statistics Canada Consumer Price Index data.',
    citation: 'CRA Annual Indexation Factors',
    badgeColor: 'indigo'
  },

  // Timeline & Longevity
  current_age: {
    id: 'current_age',
    badge: 'Planning Horizon',
    title: 'Current Age & Accumulation Window',
    taxImplication: 'Sets the number of remaining earning and contribution years before decumulation begins. Longer horizons allow higher compounding in equity portfolios.',
    craRule: 'FHSA accounts must be closed after 15 years or by age 71. RRSPs must be converted to RRIFs by December 31 of age 71.',
    citation: 'CRA Registered Plans Lifecycle',
    badgeColor: 'blue'
  },
  retirement_age: {
    id: 'retirement_age',
    badge: 'Decumulation Transition',
    title: 'Retirement Age & Pension Milestones',
    taxImplication: 'The transition from employment earnings to retirement withdrawals. Earliest CPP start is age 60; standard age 65; latest deferral age 70. OAS begins at 65.',
    craRule: 'Retiring before age 65 means no pension income splitting or $2,000 pension tax credit from RRIF withdrawals until age 65 (unless receiving qualifying defined benefit company pension).',
    citation: 'ITA §118(7) • Pension Tax Credit',
    badgeColor: 'blue'
  },
  life_expectancy: {
    id: 'life_expectancy',
    badge: 'Longevity Protection',
    title: 'Life Expectancy & Depletion Horizon',
    taxImplication: 'Planning for longevity (e.g. age 90–95) protects against outliving assets and prevents premature tax spikes from forced late-life RRIF liquidations.',
    craRule: 'According to Statistics Canada, average life expectancy for a 65-year-old Canadian is 85 for men and 87 for women, with 25% living past 90.',
    citation: 'FP Canada Projection Standards',
    badgeColor: 'blue'
  },

  // Living Expenses
  living_expenses: {
    id: 'living_expenses',
    badge: 'Net Cash Flow',
    title: 'Retirement Living Expenses & Gross-Up Math',
    taxImplication: 'Your lifestyle expenses represent net after-tax cash needed. Because withdrawals from RRSPs/RRIFs are 100% taxable, your portfolio must generate a higher gross withdrawal to cover the CRA income tax bill.',
    craRule: 'TFSA and principal residence capital are non-taxable cash flow sources that do not inflate your taxable income or trigger OAS recovery clawbacks.',
    citation: 'CRA Net World Income Standards',
    badgeColor: 'emerald'
  },

  // Pensions
  cpp_start_age: {
    id: 'cpp_start_age',
    badge: 'CPP Actuarial Rule',
    title: 'Canada Pension Plan (CPP) Start Age',
    limit: 'Flexible start between Age 60 and 70',
    taxImplication: 'CPP is 100% taxable as ordinary pension income (T4A(P)). Delaying CPP acts as an inflation-protected longevity annuity with a guaranteed 8.4% annual boost after 65.',
    craRule: 'Starting early at 60 incurs a permanent 36% lifetime penalty (-0.6% per month before 65). Delaying past 65 provides a permanent +42% lifetime boost (+0.7% per month after 65, up to age 70). Fully indexed to CPI every January.',
    citation: 'Service Canada • CPP Act',
    badgeColor: 'emerald'
  },
  oas_start_age: {
    id: 'oas_start_age',
    badge: 'OAS & Clawback Rule',
    title: 'Old Age Security (OAS) & Recovery Tax',
    limit: 'Flexible start between Age 65 and 70',
    taxImplication: 'Delaying OAS past 65 increases monthly payments by +0.6% per month (+36% at age 70). Payments permanently increase by an additional 10% automatically at age 75.',
    craRule: 'Subject to the CRA OAS Recovery Tax (Clawback): If your annual net world income exceeds $90,997 (2025 threshold), 15 cents of every dollar above the threshold must be repaid to the CRA. At ~$148,000 income, OAS is 100% wiped out.',
    citation: 'Income Tax Act §180.2 • Form T4A(OAS)',
    badgeColor: 'amber'
  },

  // Real Estate & Home Buying
  hbp_downpayment: {
    id: 'hbp_downpayment',
    badge: 'CRA Home Buyers\' Plan',
    title: 'RRSP Home Buyers\' Plan (HBP)',
    limit: '$60,000 per person ($120,000 for couples)',
    taxImplication: 'Enables tax-free borrowing from your RRSP to buy or build a qualifying first home. Budget 2024 increased the limit from $35,000 to $60,000 and extended the repayment grace period to 5 years.',
    craRule: 'Repayments must be made in equal annual installments over 15 years (1/15th per year). Any missed annual repayment is permanently added to your taxable income for that year and cannot be made up later.',
    citation: 'CRA Form T1036 • HBP Guidelines',
    badgeColor: 'blue'
  },
  property_tax: {
    id: 'property_tax',
    badge: 'Municipal Assessment',
    title: 'Property Taxes & Home Ownership Carrying Costs',
    taxImplication: 'Property taxes and condo fees are personal living expenses and cannot be deducted on personal tax returns in Canada.',
    craRule: 'Municipalities calculate property tax as: Assessed Market Value × Local Mill Rate. Increases over time with municipal budget adjustments and inflation.',
    citation: 'Provincial Assessment Acts',
    badgeColor: 'purple'
  },
  principal_residence: {
    id: 'principal_residence',
    badge: 'Principal Residence Exemption',
    title: 'Principal Residence Exemption (PRE)',
    limit: '100% Tax-Free Capital Gains',
    taxImplication: 'Capital appreciation on your primary home is 100% exempt from Canadian income tax when sold, providing an enormous tax shelter for homeowner equity.',
    craRule: 'Must be designated on Schedule 3 and Form T2091 when sold. Each family unit can designate only one property as principal residence for each tax year.',
    citation: 'Income Tax Act §40(2)(b) • CRA Folio S1-F3-C2',
    badgeColor: 'emerald'
  },

  // Spouse & Pension Splitting
  spousal_rrsp: {
    id: 'spousal_rrsp',
    badge: 'Income Splitting',
    title: 'Spousal RRSP & Pension Income Splitting',
    limit: 'Uses contributor\'s RRSP room',
    taxImplication: 'High-earning spouse contributes and receives immediate tax deduction at high marginal rate; funds belong to lower-earning spouse and are taxed at their lower tax rate when withdrawn in retirement.',
    craRule: 'CRA 3-Year Attribution Rule: If the spouse withdraws within 2 calendar years of any spousal contribution, the withdrawal is attributed back to the contributing spouse and taxed at their rate. At age 65+, eligible pension income can also be split up to 50% on Form T1032.',
    citation: 'Income Tax Act §146(8.3) & §60.03 • Form T1032',
    badgeColor: 'purple'
  },

  // Debts & Interest Deductibility
  debt_interest: {
    id: 'debt_interest',
    badge: 'Interest Deductibility',
    title: 'Canadian Interest Deductibility Rules',
    taxImplication: 'Personal debt interest (credit cards, auto loans, mortgages) is NOT tax-deductible in Canada. However, interest paid on funds borrowed to earn taxable investment or business income is 100% tax-deductible under ITA §20(1)(c).',
    craRule: 'Direct use rule: borrowed money must be traceable to income-producing investments (e.g., dividend stocks or rental property) to qualify for tax deductions.',
    citation: 'Income Tax Act §20(1)(c)',
    badgeColor: 'rose'
  },

  // Drawdown Strategy
  drawdown_strategy: {
    id: 'drawdown_strategy',
    badge: 'Tax Decumulation',
    title: 'Tax-Optimized Decumulation Waterfall',
    taxImplication: 'Order of account drawdowns dictates lifetime tax paid. By drawing RRSP/RRIF early (RRSP meltdown) up to the bottom tax bracket, you prevent forced large RRIF withdrawals later that trigger OAS clawback and high terminal estate taxes.',
    craRule: 'TFSAs should generally be preserved as the final account to withdraw because tax-free compounding accelerates exponentially over longer horizons and leaves zero tax liability to beneficiaries.',
    citation: 'CRA Tax Planning Guidelines',
    badgeColor: 'emerald'
  }
};

export interface TaxRuleTooltipProps {
  ruleId?: string;
  customRule?: Partial<TaxRuleData>;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const TaxRuleTooltip: React.FC<TaxRuleTooltipProps> = ({
  ruleId,
  customRule,
  size = 'sm',
  className = '',
  position = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    arrowLeft: number;
    isBottom: boolean;
    width: number;
  }>({
    left: 0,
    arrowLeft: 160,
    isBottom: false,
    width: 320
  });

  const rule: TaxRuleData = {
    ...(ruleId && CRA_TAX_RULES[ruleId] ? CRA_TAX_RULES[ruleId] : {
      id: 'general_rule',
      badge: 'CRA Tax Rule',
      title: 'Tax & Contribution Information',
      taxImplication: 'Tax implications apply to this Canadian retirement input.',
      craRule: 'Verify with CRA statutory guidelines.'
    }),
    ...customRule
  };

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Constrain width nicely on small screens vs desktop
    const tooltipWidth = Math.min(320, viewportWidth - 24);
    const estimatedHeight = 260; // typical height of expanded tooltip card

    // Auto vertical flip: if space above trigger is less than estimatedHeight, show below
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const shouldShowBelow = spaceAbove < estimatedHeight && spaceBelow > spaceAbove;

    // Clamp horizontal position so tooltip is NEVER cut off by screen edges
    const idealLeft = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    const clampedLeft = Math.max(12, Math.min(idealLeft, viewportWidth - tooltipWidth - 12));

    // Arrow pointer points directly to the center of the trigger button
    const arrowX = triggerRect.left + triggerRect.width / 2 - clampedLeft;
    const clampedArrowX = Math.max(16, Math.min(arrowX, tooltipWidth - 16));

    if (shouldShowBelow) {
      setCoords({
        top: Math.round(triggerRect.bottom + 8),
        left: Math.round(clampedLeft),
        arrowLeft: Math.round(clampedArrowX),
        isBottom: true,
        width: tooltipWidth
      });
    } else {
      setCoords({
        bottom: Math.round(viewportHeight - triggerRect.top + 8),
        left: Math.round(clampedLeft),
        arrowLeft: Math.round(clampedArrowX),
        isBottom: false,
        width: tooltipWidth
      });
    }
  }, []);

  // Update position on open and listen to scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Color mappings
  const badgeClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  }[rule.badgeColor || 'blue'];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  }[size];

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => {
        updatePosition();
        setIsOpen(true);
      }}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updatePosition();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`Tax info: ${rule.title}`}
        aria-expanded={isOpen}
        className="inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-help select-none"
      >
        <Info className={iconSizes} />
      </button>

      {/* Popover Card Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popoverRef}
          role="tooltip"
          className="fixed z-[9999] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl text-left pointer-events-auto select-text animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto scrollbar-thin"
          style={{
            width: `${coords.width}px`,
            left: `${coords.left}px`,
            ...(coords.isBottom ? { top: `${coords.top}px` } : { bottom: `${coords.bottom}px` })
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                {rule.badge}
              </span>
              {rule.limit && (
                <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {rule.limit}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close tooltip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title */}
          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug mb-1.5">
            {rule.title}
          </h4>

          {/* Tax Implication Box */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-0.5 text-[10px] uppercase tracking-wider">
              💡 Tax Implication:
            </span>
            {rule.taxImplication}
          </div>

          {/* CRA Rule Details */}
          <div className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1 mb-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[10px] uppercase tracking-wider">
              📋 Statutory CRA Rule:
            </span>
            <p>{rule.craRule}</p>
          </div>

          {/* Citation Footer */}
          {rule.citation && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9.5px] text-slate-400 dark:text-slate-500 font-mono">
              <span className="truncate">{rule.citation}</span>
              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
            </div>
          )}

          {/* Pointer Triangle / Arrow */}
          {coords.isBottom ? (
            <div 
              className="absolute -top-1 w-2.5 h-2.5 -translate-x-1/2 rotate-45 bg-white dark:bg-slate-900 border-l border-t border-slate-200 dark:border-slate-700/80 pointer-events-none" 
              style={{ left: `${coords.arrowLeft}px` }}
            />
          ) : (
            <div 
              className="absolute -bottom-1 w-2.5 h-2.5 -translate-x-1/2 rotate-45 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700/80 pointer-events-none" 
              style={{ left: `${coords.arrowLeft}px` }}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
