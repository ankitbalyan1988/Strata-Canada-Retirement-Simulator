import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  CalendarClock,
  Flag, 
  Landmark, 
  Receipt, 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  Home, 
  Flame, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Info, 
  Layers,
  CheckCircle2,
  Calendar,
  Wallet,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { YearSimulationResult } from '../types/retirement';

export type MilestoneCategory = 'all' | 'pension' | 'cra_tax' | 'wealth' | 'lifestyle';

export interface TimelineMilestone {
  id: string;
  age: number;
  year: number;
  title: string;
  shortTitle: string;
  category: 'pension' | 'cra_tax' | 'wealth' | 'lifestyle' | 'career';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  pinBorderColor: string;
  pinRingColor: string;
  isKeyTurningPoint?: boolean;
  isWarning?: boolean;
  tagline: string;
  description: string;
  craStatutoryRule?: string;
  planningTakeaway: string;
}

export const RetirementMilestoneTimeline: React.FC = () => {
  const inputs = useSimulationStore(useShallow((state) => state.inputs));
  const summary = useSimulationStore(useShallow((state) => state.summary));
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));

  const [activeCategory, setActiveCategory] = useState<MilestoneCategory>('all');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [hoveredMilestoneId, setHoveredMilestoneId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  const handleSelectMilestone = (id: string) => {
    setSelectedMilestoneId(id);
    const cardEl = cardRefs.current[id];
    if (cardEl && scrollContainerRef.current) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -280 : 280;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft += e.deltaY;
        updateScrollButtons();
      }
    }
  };

  const currentAge = inputs.currentAge;
  const retirementAge = inputs.retirementAge;
  const lifeExpectancy = inputs.lifeExpectancy;
  const startYear = yearlyResults[0]?.year || new Date().getFullYear();
  const endYear = yearlyResults[yearlyResults.length - 1]?.year || (startYear + (lifeExpectancy - currentAge));
  const totalYears = Math.max(1, lifeExpectancy - currentAge);
  const workingYears = Math.max(0, retirementAge - currentAge);
  const retirementYears = Math.max(0, lifeExpectancy - retirementAge);

  // Format currency helper
  const formatCur = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '$0';
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Compile all plan milestones dynamically from inputs, summary, and yearlyResults
  const allMilestones = useMemo<TimelineMilestone[]>(() => {
    const list: TimelineMilestone[] = [];
    const getYear = (age: number) => {
      const match = yearlyResults.find((y) => y.age === age);
      return match ? match.year : startYear + (age - currentAge);
    };

    // 1. Current Age / Plan Baseline
    list.push({
      id: 'current_age',
      age: currentAge,
      year: getYear(currentAge),
      title: 'Current Age & Plan Launch',
      shortTitle: 'Plan Launch',
      category: 'career',
      icon: Clock,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      pinBorderColor: 'border-indigo-600',
      pinRingColor: 'ring-indigo-300 dark:ring-indigo-800',
      tagline: 'Working accumulation phase active',
      description: `Baseline starting point for your Canadian wealth simulation at Age ${currentAge}. Monthly contributions and employer matches are actively compounding.`,
      planningTakeaway: 'Maximizing tax deductions in high marginal tax brackets today builds compounding momentum across registered shelters (RRSP, TFSA, FHSA).'
    });

    // 2. FHSA / Home Purchase (if planned)
    const homePurchaseAge = inputs.fhsaHomePurchaseAge || (inputs.planFutureHomePurchase ? currentAge + 3 : null);
    if (homePurchaseAge && homePurchaseAge > currentAge && homePurchaseAge < retirementAge) {
      list.push({
        id: 'home_purchase',
        age: homePurchaseAge,
        year: getYear(homePurchaseAge),
        title: 'Qualifying First Home Purchase',
        shortTitle: 'Home Buy',
        category: 'lifestyle',
        icon: Home,
        iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        pinBorderColor: 'border-cyan-500',
        pinRingColor: 'ring-cyan-300 dark:ring-cyan-800',
        tagline: 'Tax-free FHSA & RRSP HBP withdrawal',
        description: `Qualifying first home acquisition. FHSA funds are withdrawn 100% tax-free with zero CRA repayment obligation, stacked with up to $60,000 from the RRSP Home Buyers' Plan.`,
        craStatutoryRule: 'CRA allows tax-free FHSA qualifying withdrawals up to $40,000 lifetime limit plus tax-deferred RRSP HBP loan repaid over 15 years.',
        planningTakeaway: 'Home equity serves as an inflation-hedged wealth anchor that can later be tapped via downsizing or reverse mortgage.'
      });
    }

    // 3. Coast FIRE Milestone (if achieved before retirement)
    if (summary?.coastFireAge && summary.coastFireAge >= currentAge && summary.coastFireAge < retirementAge) {
      list.push({
        id: 'coast_fire',
        age: summary.coastFireAge,
        year: getYear(summary.coastFireAge),
        title: 'Coast FIRE Tipping Point',
        shortTitle: 'Coast FIRE',
        category: 'wealth',
        icon: TrendingUp,
        iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
        iconColor: 'text-teal-600 dark:text-teal-400',
        pinBorderColor: 'border-teal-500',
        pinRingColor: 'ring-teal-300 dark:ring-teal-800',
        tagline: 'Compounding alone covers target retirement',
        description: `Your invested liquid portfolio reaches critical velocity. Even if you contribute $0 in all future years, existing compounding will fully fund your retirement at Age ${retirementAge}.`,
        planningTakeaway: 'Unlocks ultimate career flexibility—enabling part-time work, sabbatical, consulting, or passion pursuits without endangering retirement security.'
      });
    }

    // 4. Financial Crossover Milestone (Investment returns >= living expenses)
    if (summary?.crossoverAge && summary.crossoverAge >= currentAge && summary.crossoverAge <= lifeExpectancy) {
      list.push({
        id: 'crossover',
        age: summary.crossoverAge,
        year: getYear(summary.crossoverAge),
        title: 'Financial Crossover Day',
        shortTitle: 'Crossover',
        category: 'wealth',
        icon: Sparkles,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        pinBorderColor: 'border-emerald-500',
        pinRingColor: 'ring-emerald-300 dark:ring-emerald-800',
        tagline: 'Investment growth exceeds 100% of living expenses',
        description: `The pivotal inflection point where annual portfolio investment returns match and exceed 100% of household annual living expenses ($${Math.round(summary.crossoverLivingExpenses || 0).toLocaleString()}/yr).`,
        planningTakeaway: 'At this stage, your money makes more money per year than your household spends, accelerating true financial independence.'
      });
    }

    // 5. Debt / Mortgage Free Milestone
    const debtFreeAge = summary?.mortgagePayoffAge || summary?.debtPayoffAge;
    if (debtFreeAge && debtFreeAge > currentAge && debtFreeAge <= lifeExpectancy) {
      list.push({
        id: 'debt_free',
        age: debtFreeAge,
        year: getYear(debtFreeAge),
        title: 'Mortgage & Debt Freedom',
        shortTitle: 'Debt Free',
        category: 'wealth',
        icon: ShieldCheck,
        iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
        iconColor: 'text-blue-600 dark:text-blue-400',
        pinBorderColor: 'border-blue-500',
        pinRingColor: 'ring-blue-300 dark:ring-blue-800',
        tagline: 'Amortization complete ($0 liabilities)',
        description: `All fixed mortgage and consumer debts are fully amortized to $0. Monthly debt service payments disappear completely, freeing up significant discretionary cash flow.`,
        planningTakeaway: 'Freed monthly debt payments can be strategically redirected into TFSA and non-registered investment accounts for rapid decumulation buffer.'
      });
    }

    // 6. $1,000,000 Liquid Wealth Milestone
    if (summary?.millionaireAge && summary.millionaireAge >= currentAge && summary.millionaireAge <= lifeExpectancy) {
      list.push({
        id: 'millionaire',
        age: summary.millionaireAge,
        year: getYear(summary.millionaireAge),
        title: '$1M Net Worth Milestone',
        shortTitle: '$1M Wealth',
        category: 'wealth',
        icon: Coins,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
        iconColor: 'text-amber-600 dark:text-amber-400',
        pinBorderColor: 'border-amber-500',
        pinRingColor: 'ring-amber-300 dark:ring-amber-800',
        tagline: 'Seven-figure balance achieved',
        description: `Total household net worth crosses the $1,000,000 CAD threshold for the first time in the simulation.`,
        planningTakeaway: 'Provides substantial psychological peace of mind and resilience against sequence-of-returns shocks.'
      });
    }

    // 7. RRSP Meltdown Start Age (if selected strategy)
    if (inputs.drawdownStrategy === 'rrsp_meltdown' && inputs.meltdownStartAge && inputs.meltdownStartAge >= currentAge) {
      list.push({
        id: 'rrsp_meltdown',
        age: inputs.meltdownStartAge,
        year: getYear(inputs.meltdownStartAge),
        title: 'RRSP Meltdown Decumulation Start',
        shortTitle: 'RRSP Meltdown',
        category: 'cra_tax',
        icon: Flame,
        iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400',
        iconColor: 'text-rose-600 dark:text-rose-400',
        pinBorderColor: 'border-rose-500',
        pinRingColor: 'ring-rose-300 dark:ring-rose-800',
        tagline: 'Strategic early de-cumulation to curb future RRIF tax brackets',
        description: `Strategic voluntary RRSP drawdowns commence prior to age 71 to lock in lower 15%–20.05% marginal tax brackets and avoid OAS clawback spikes in later retirement.`,
        craStatutoryRule: 'Voluntary withdrawals taxed at personal marginal rates; unspent proceeds shifted into TFSA and non-registered shelters.',
        planningTakeaway: 'Defuses future terminal estate tax liabilities (CRA §70(5)) where RRSP/RRIF balances can be taxed at up to 53.53%.'
      });
    }

    // 8. Target Retirement Day (DECISIVE TURNING POINT)
    list.push({
      id: 'retirement_day',
      age: retirementAge,
      year: getYear(retirementAge),
      title: 'Target Retirement Day',
      shortTitle: 'Retirement Day',
      category: 'career',
      icon: Flag,
      iconBg: 'bg-amber-500 text-white shadow-sm',
      iconColor: 'text-amber-500',
      pinBorderColor: 'border-amber-500',
      pinRingColor: 'ring-amber-400 dark:ring-amber-700',
      isKeyTurningPoint: true,
      tagline: 'Career transition from accumulation to decumulation',
      description: `The decisive inflection point of your life plan. Active employment ends and strategic portfolio decumulation begins to fund your target nominal spending of $${Math.round(summary?.averageAnnualRetirementSpendNominal || 60000).toLocaleString()}/yr.`,
      planningTakeaway: 'Safe withdrawal rate waterfall engages across RRSP, TFSA, and non-registered assets to minimize lifetime tax drag.'
    });

    // 9. Canada Pension Plan (CPP) Activation
    list.push({
      id: 'cpp_activation',
      age: inputs.cppStartAge,
      year: getYear(inputs.cppStartAge),
      title: `CPP Pension Benefit Activation (Age ${inputs.cppStartAge})`,
      shortTitle: `CPP (Age ${inputs.cppStartAge})`,
      category: 'pension',
      icon: Landmark,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
      iconColor: 'text-blue-600 dark:text-blue-400',
      pinBorderColor: 'border-blue-600',
      pinRingColor: 'ring-blue-300 dark:ring-blue-800',
      tagline: inputs.cppStartAge < 65 
        ? `Early claiming: -${((65 - inputs.cppStartAge) * 7.2).toFixed(1)}% permanent reduction` 
        : inputs.cppStartAge > 65 
        ? `Delayed claiming: +${((inputs.cppStartAge - 65) * 8.4).toFixed(1)}% enhanced payout`
        : 'Standard statutory entitlement age 65',
      description: `Canada Pension Plan benefits commence. Indexed annually to Statistics Canada Consumer Price Index (CPI) to provide inflation-guaranteed lifetime longevity protection.`,
      craStatutoryRule: 'CRA & Service Canada rules: Early claims (age 60-64) penalized 0.6%/month (up to -36%); delayed claims (age 66-70) boosted by 0.7%/month (up to +42%). Fully taxable.',
      planningTakeaway: inputs.cppStartAge >= 68
        ? 'Delaying CPP acts as an exceptional government-backed longevity annuity hedge with an 8.4%/yr return multiplier.'
        : 'Starting CPP early supplies immediate guaranteed cashflow, easing reliance on portfolio withdrawals.'
    });

    // 10. Old Age Security (OAS) Activation
    list.push({
      id: 'oas_activation',
      age: inputs.oasStartAge,
      year: getYear(inputs.oasStartAge),
      title: `OAS Pension Benefit Activation (Age ${inputs.oasStartAge})`,
      shortTitle: `OAS (Age ${inputs.oasStartAge})`,
      category: 'pension',
      icon: Landmark,
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400',
      iconColor: 'text-sky-600 dark:text-sky-400',
      pinBorderColor: 'border-sky-500',
      pinRingColor: 'ring-sky-300 dark:ring-sky-800',
      tagline: inputs.oasStartAge > 65 
        ? `Delayed OAS: +${((inputs.oasStartAge - 65) * 7.2).toFixed(1)}% enhancement` 
        : 'Standard baseline entitlement (Age 65)',
      description: `Old Age Security monthly benefits commence. Universal federal pension funded from general tax revenues, adjusted quarterly for Canadian inflation.`,
      craStatutoryRule: 'Statutory recovery tax (OAS clawback) applies a 15% surtax on net individual income exceeding the CRA threshold (~$93,208 for 2025/2026). At age 75, base OAS automatically increases by 10%.',
      planningTakeaway: 'Keep taxable retirement income under the clawback threshold by utilizing TFSA withdrawals and splitting pension income with a spouse.'
    });

    // 11. Age 71 Mandatory RRIF Conversion Deadline
    if (lifeExpectancy >= 71) {
      list.push({
        id: 'rrif_conversion',
        age: 71,
        year: getYear(71),
        title: 'Mandatory RRIF Conversion Deadline (Age 71)',
        shortTitle: 'RRIF Deadline (71)',
        category: 'cra_tax',
        icon: Receipt,
        iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400',
        iconColor: 'text-purple-600 dark:text-purple-400',
        pinBorderColor: 'border-purple-600',
        pinRingColor: 'ring-purple-300 dark:ring-purple-800',
        tagline: 'CRA deadline: Convert all RRSPs to RRIF or Annuity by Dec 31',
        description: `Statutory milestone under Income Tax Act Section 146. You must convert all RRSP accounts to a Registered Retirement Income Fund (RRIF) or purchase a registered annuity before December 31. No new contributions can be deposited.`,
        craStatutoryRule: 'Failure to convert by Dec 31 results in the entire RRSP balance being deemed fully withdrawn and 100% taxable in that tax year.',
        planningTakeaway: 'You can base minimum RRIF withdrawals on a younger spouse’s age to lower mandatory annual taxable draws.'
      });
    }

    // 12. Age 72 First Mandatory RRIF Minimum Withdrawal
    if (lifeExpectancy >= 72) {
      list.push({
        id: 'rrif_min_draw',
        age: 72,
        year: getYear(72),
        title: 'First Mandatory RRIF Minimum Draw (Age 72)',
        shortTitle: 'RRIF Min (72)',
        category: 'cra_tax',
        icon: Receipt,
        iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400',
        iconColor: 'text-violet-600 dark:text-violet-400',
        pinBorderColor: 'border-violet-500',
        pinRingColor: 'ring-violet-300 dark:ring-violet-800',
        tagline: 'CRA minimum prescribed schedule starts at 5.40%',
        description: `First calendar year of statutory required RRIF withdrawals. CRA mandates a minimum percentage (5.40% at age 72, climbing annually) must be withdrawn and included in taxable income.`,
        craStatutoryRule: 'CRA statutory minimum factor = 1 / (90 - age) until age 70, then fixed prescribed table starting at 5.40% at age 72, 6.58% at age 80, and 20.0% at age 95+.',
        planningTakeaway: 'Any mandatory RRIF withdrawal not required for living expenses should be immediately swept into your TFSA to resume tax-sheltered compounding.'
      });
    }

    // 13. Peak Lifetime Net Worth (if distinct from retirement day)
    if (summary?.peakNetWorthAge && summary.peakNetWorthAge !== retirementAge && summary.peakNetWorthAge <= lifeExpectancy) {
      list.push({
        id: 'peak_net_worth',
        age: summary.peakNetWorthAge,
        year: getYear(summary.peakNetWorthAge),
        title: `Peak Net Worth Milestone (Age ${summary.peakNetWorthAge})`,
        shortTitle: 'Peak Wealth',
        category: 'wealth',
        icon: TrendingUp,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        pinBorderColor: 'border-emerald-600',
        pinRingColor: 'ring-emerald-300 dark:ring-emerald-800',
        tagline: `All-time high net worth of ${formatCur(summary.peakNetWorth)}`,
        description: `Your portfolio reaches its highest nominal value before decumulation outflows outpace investment returns.`,
        planningTakeaway: 'Represents the pinnacle of financial buffer, providing maximum insulation against sequence-of-returns shocks.'
      });
    }

    // 14. Depletion Warning (if simulation runs out of funds early)
    if (summary?.portfolioDepletionAge && summary.portfolioDepletionAge <= lifeExpectancy) {
      list.push({
        id: 'portfolio_depletion',
        age: summary.portfolioDepletionAge,
        year: getYear(summary.portfolioDepletionAge),
        title: `Portfolio Depletion Risk (Age ${summary.portfolioDepletionAge})`,
        shortTitle: 'Depletion Alert',
        category: 'wealth',
        icon: AlertTriangle,
        iconBg: 'bg-rose-500 text-white shadow-sm',
        iconColor: 'text-rose-500',
        pinBorderColor: 'border-rose-600',
        pinRingColor: 'ring-rose-400 dark:ring-rose-800',
        isWarning: true,
        tagline: `Liquid assets exhausted ${lifeExpectancy - summary.portfolioDepletionAge} years before life expectancy`,
        description: `Under current spending and return assumptions, liquid retirement accounts reach $0 at Age ${summary.portfolioDepletionAge}. Only government pensions (CPP/OAS) remain.`,
        planningTakeaway: 'Modestly decreasing discretionary living spending, boosting pre-retirement savings, or delaying CPP can completely eliminate this gap.'
      });
    }

    // 15. Simulation Horizon / Life Expectancy
    list.push({
      id: 'life_expectancy',
      age: lifeExpectancy,
      year: getYear(lifeExpectancy),
      title: `Plan Horizon & Estate Succession (Age ${lifeExpectancy})`,
      shortTitle: 'Estate Horizon',
      category: 'lifestyle',
      icon: CalendarClock,
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      iconColor: 'text-slate-700 dark:text-slate-300',
      pinBorderColor: 'border-slate-600 dark:border-slate-400',
      pinRingColor: 'ring-slate-300 dark:ring-slate-700',
      tagline: 'Terminal estate deemed disposition under CRA §70(5)',
      description: `Target simulation life expectancy. Estate succession, probate fees, and final terminal return taxation occur here, distributing remaining net worth to chosen heirs and charities.`,
      craStatutoryRule: 'CRA Section 70(5) deems all capital property disposed of at fair market value immediately prior to death. Spousal rollovers defer tax (s.70(6)).',
      planningTakeaway: 'Review beneficiary designations on RRSP/TFSA to ensure assets bypass probate and avoid administrative executor delays.'
    });

    // Deduplicate any accidental duplicate ids and sort by age ascending
    const unique = Array.from(new Map(list.map((m) => [m.id, m])).values());
    unique.sort((a, b) => a.age - b.age);
    return unique;
  }, [inputs, summary, yearlyResults, currentAge, retirementAge, lifeExpectancy, startYear]);

  // Filtered milestones based on active category tab
  const filteredMilestones = useMemo(() => {
    if (activeCategory === 'all') return allMilestones;
    if (activeCategory === 'pension') {
      return allMilestones.filter((m) => m.category === 'pension');
    }
    if (activeCategory === 'cra_tax') {
      return allMilestones.filter((m) => m.category === 'cra_tax');
    }
    if (activeCategory === 'wealth') {
      return allMilestones.filter((m) => m.category === 'wealth' || m.category === 'career');
    }
    if (activeCategory === 'lifestyle') {
      return allMilestones.filter((m) => m.category === 'lifestyle');
    }
    return allMilestones;
  }, [allMilestones, activeCategory]);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [filteredMilestones, updateScrollButtons]);

  // Default selected milestone: Target Retirement Day or first available
  const activeMilestone = useMemo(() => {
    if (selectedMilestoneId) {
      const found = allMilestones.find((m) => m.id === selectedMilestoneId);
      if (found) return found;
    }
    // Default to retirement day if present, otherwise first milestone
    return allMilestones.find((m) => m.id === 'retirement_day') || allMilestones[0];
  }, [allMilestones, selectedMilestoneId]);

  // Calculate percentage along track (0% to 100%)
  const getPercentPosition = (age: number) => {
    const clamped = Math.max(currentAge, Math.min(lifeExpectancy, age));
    return ((clamped - currentAge) / totalYears) * 100;
  };

  const retirementPercent = getPercentPosition(retirementAge);

  // Group milestones that fall on the exact same age for the timeline track
  const groupedMilestonesByAge = useMemo(() => {
    const groups: { [age: number]: TimelineMilestone[] } = {};
    filteredMilestones.forEach((m) => {
      if (!groups[m.age]) groups[m.age] = [];
      groups[m.age].push(m);
    });
    return groups;
  }, [filteredMilestones]);

  // Anti-collision / vertical tier staggering for timeline milestone pins
  // When pins are closer than 5.5% (~45-55px), they are staggered across vertical tiers
  // so stalks, pin icons, and age labels never collide or obscure each other.
  const { pinTiers, maxTier } = useMemo(() => {
    const sortedAges = Object.keys(groupedMilestonesByAge)
      .map(Number)
      .sort((a, b) => a - b);

    const tiers: { [age: number]: number } = {};
    let currentTier = 0;
    let lastPct = -100;
    let highestTier = 0;

    sortedAges.forEach((age) => {
      const pct = getPercentPosition(age);
      // Distance threshold: if within 5.5% of previous pin
      if (pct - lastPct < 5.5) {
        currentTier = (currentTier + 1) % 3;
      } else {
        currentTier = 0;
      }

      tiers[age] = currentTier;
      if (currentTier > highestTier) {
        highestTier = currentTier;
      }
      lastPct = pct;
    });

    return { pinTiers: tiers, maxTier: highestTier };
  }, [groupedMilestonesByAge, currentAge, lifeExpectancy, totalYears]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 transition-colors duration-200">
      {/* 1. Header Bar: Title, Context Metrics, Category Segmented Control */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100/60 dark:border-indigo-800/60 shadow-xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2 flex-wrap">
                Interactive Retirement Roadmap & Milestones
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {allMilestones.length} Key Milestones
                </span>
              </h3>
              {/* Clean unboxed metadata with subtle typographic separators */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span>Simulation Span: Age {currentAge} ({startYear}) – Age {lifeExpectancy} ({endYear})</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{totalYears} Years Modeled</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">{workingYears} Yrs Working</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{retirementYears} Yrs Retirement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs overflow-x-auto scrollbar-none w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Milestones
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('pension')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === 'pension'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Govt & Pensions
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('cra_tax')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === 'cra_tax'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            CRA & Tax Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('wealth')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === 'wealth'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Wealth & Freedom
          </button>
        </div>
      </div>

      {/* 2. Visual Horizontal Interactive Progress Bar & Phase Segments */}
      <div className="pt-6 pb-4">
        {/* Phase Track Labels */}
        <div className="flex items-center justify-between text-xs font-medium pb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              Working & Accumulation Phase
            </span>
            <span className="text-slate-400 dark:text-slate-500">({workingYears} years · Age {currentAge} to {retirementAge})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              Retirement Decumulation Phase
            </span>
            <span className="text-slate-400 dark:text-slate-500">({retirementYears} years · Age {retirementAge} to {lifeExpectancy})</span>
          </div>
        </div>

        {/* Dual Segmented Lifecycle Track */}
        <div className="relative w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700 shadow-inner">
          {/* Working Phase Segment */}
          <div
            style={{ width: `${retirementPercent}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 relative"
          />
          {/* Retirement Phase Segment */}
          <div
            style={{ width: `${100 - retirementPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 relative"
          />
        </div>

        {/* Age Axis Scale (Ticks every 5 or 10 years) */}
        <div className="relative w-full h-5 mt-1 select-none">
          {Array.from({ length: Math.floor(totalYears / 5) + 1 }).map((_, i) => {
            const ageTick = currentAge + i * 5;
            if (ageTick > lifeExpectancy) return null;
            const pct = getPercentPosition(ageTick);
            const isRetireTick = ageTick === retirementAge;

            return (
              <div
                key={ageTick}
                style={{ left: `${pct}%` }}
                className="absolute -translate-x-1/2 flex flex-col items-center"
              >
                <div
                  className={`w-0.5 ${
                    isRetireTick ? 'h-2.5 bg-amber-500 font-bold' : 'h-1.5 bg-slate-300 dark:bg-slate-600'
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 ${
                    isRetireTick
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {ageTick}
                </span>
              </div>
            );
          })}
        </div>

        {/* Milestone Interactive Pin Nodes Placed on Timeline */}
        <div className={`relative w-full mt-2 transition-all duration-300 ${maxTier >= 2 ? 'h-32' : maxTier === 1 ? 'h-24 sm:h-26' : 'h-16 sm:h-18'}`}>
          {Object.entries(groupedMilestonesByAge).map(([ageStr, milestonesAtAge]) => {
            const age = Number(ageStr);
            const pct = getPercentPosition(age);
            const safePct = Math.max(2, Math.min(98, pct));
            const tier = pinTiers[age] || 0;
            const isContainsActive = milestonesAtAge.some((m) => m.id === activeMilestone.id);
            const primaryMilestone = milestonesAtAge[0];
            const isRetirement = milestonesAtAge.some((m) => m.isKeyTurningPoint);
            const isWarning = milestonesAtAge.some((m) => m.isWarning);
            const IconComponent = primaryMilestone.icon;

            return (
              <div
                key={age}
                style={{ left: `${safePct}%` }}
                className="absolute -translate-x-1/2 top-0 z-10 flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  const currentIndex = milestonesAtAge.findIndex((m) => m.id === activeMilestone.id);
                  const nextMilestone = currentIndex >= 0 
                    ? milestonesAtAge[(currentIndex + 1) % milestonesAtAge.length]
                    : primaryMilestone;
                  handleSelectMilestone(nextMilestone.id);
                }}
                onMouseEnter={() => setHoveredMilestoneId(primaryMilestone.id)}
                onMouseLeave={() => setHoveredMilestoneId(null)}
              >
                {/* Connecting Pin Stalk with Dynamic Anti-Collision Staggering */}
                <div
                  style={{ height: tier === 2 ? '48px' : tier === 1 ? '26px' : '10px' }}
                  className={`w-0.5 transition-all duration-200 ${
                    isContainsActive
                      ? 'bg-indigo-600 dark:bg-indigo-400'
                      : isRetirement
                      ? 'bg-amber-500'
                      : isWarning
                      ? 'bg-rose-500'
                      : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
                  }`}
                />

                {/* Pin Head Button */}
                <button
                  type="button"
                  className={`relative flex items-center justify-center rounded-xl p-1.5 transition-all shadow-xs cursor-pointer ${
                    isContainsActive
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-900/60 scale-110 z-20'
                      : isRetirement
                      ? 'bg-amber-500 text-white ring-2 ring-amber-200 dark:ring-amber-900/60 hover:scale-105'
                      : isWarning
                      ? 'bg-rose-500 text-white ring-2 ring-rose-200 dark:ring-rose-900/60 hover:scale-105'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:scale-105'
                  }`}
                  title={`${milestonesAtAge.map((m) => m.title).join(' • ')} (Age ${age})`}
                >
                  <IconComponent className="w-3.5 h-3.5" />

                  {/* Multi-milestone badge counter if >=2 events at this age */}
                  {milestonesAtAge.length > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-bold flex items-center justify-center border border-white dark:border-slate-900">
                      {milestonesAtAge.length}
                    </span>
                  )}
                </button>

                {/* Anti-collision Floating Pill Label */}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs whitespace-nowrap transition-all border mt-1 select-none ${
                    isContainsActive
                      ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/90 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-300/40'
                      : isRetirement
                      ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800'
                      : isWarning
                      ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800'
                      : 'text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-slate-800/95 border-slate-200/90 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
                  }`}
                >
                  Age {age}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Horizontal Scrollable Milestone Quick Cards Strip */}
      <div className="pt-3 pb-1">
        {/* Strip Header with Controls */}
        <div className="flex items-center justify-between pb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Milestone Schedule
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {filteredMilestones.length}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              • Scroll horizontally or use arrows to explore all milestones
            </span>
          </div>

          {/* Quick Arrow Scroll Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollByAmount('left')}
              disabled={!canScrollLeft}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
              title="Scroll left to earlier milestones"
              aria-label="Scroll left to earlier milestones"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              disabled={!canScrollRight}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
              title="Scroll right to later milestones"
              aria-label="Scroll right to later milestones"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scroll Container with Floating Arrow Overlays */}
        <div className="relative group/scroll">
          {/* Floating Left Arrow Overlay */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount('left')}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition cursor-pointer"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onWheel={handleWheel}
            className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {filteredMilestones.map((m) => {
              const isSelected = m.id === activeMilestone.id;
              const Icon = m.icon;
              const yearsUntil = m.age - currentAge;

              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    cardRefs.current[m.id] = el;
                  }}
                  type="button"
                  onClick={() => handleSelectMilestone(m.id)}
                  className={`flex-shrink-0 w-64 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-200/70 dark:ring-indigo-900/60 shadow-xs'
                      : m.isKeyTurningPoint
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-50/70 dark:hover:bg-amber-950/30'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`p-1 rounded-lg shrink-0 ${m.iconBg}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        Age {m.age} ({m.year})
                      </span>
                    </div>

                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${
                      yearsUntil === 0 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' 
                        : yearsUntil > 0 
                        ? 'bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {yearsUntil === 0 ? 'Today' : `In ${yearsUntil} yrs`}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-1">
                    {m.title}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {m.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Floating Right Arrow Overlay */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition cursor-pointer"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
