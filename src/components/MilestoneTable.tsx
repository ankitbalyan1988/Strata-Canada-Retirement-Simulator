import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { YearSimulationResult, RetirementInputs, CanadianProvince, SimulationSummary } from '../types/retirement';
import { 
  Table, 
  Search, 
  FileSpreadsheet, 
  Loader2,
  Sparkles,
  Calculator,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  X,
  Bot,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Anchor,
  Gem,
  Home,
  Target,
  Mountain,
  Landmark,
  FileText,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  Percent,
  CreditCard,
  Flame
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

interface LedgerAiExplanation {
  summary: string;
  formula: string;
  mathBreakdown: string[];
  contextualGuidance: string;
  suggestedFollowUps?: string[];
  source?: string;
}

export interface MilestoneTableProps {
  yearlyResults?: YearSimulationResult[];
  retirementAge?: number;
  province?: CanadianProvince;
  inputs?: RetirementInputs;
  summary?: SimulationSummary;
  isRecalculatingLedger?: boolean;
}

export const MilestoneTable: React.FC<MilestoneTableProps> = (props) => {
  const storeYearlyResults = useSimulationStore((state) => state.yearlyResults);
  const storeRetirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const storeProvince = useSimulationStore((state) => state.inputs.province);
  const storeInputs = useSimulationStore((state) => state.inputs);
  const storeSummary = useSimulationStore((state) => state.summary);
  const storeIsRecalculatingLedger = useSimulationStore((state) => state.isRecalculatingLedger);
  const isTableCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.ledger));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const yearlyResults = props.yearlyResults ?? storeYearlyResults;
  const retirementAge = props.retirementAge ?? storeRetirementAge;
  const province = props.province ?? storeProvince;
  const inputs = props.inputs ?? storeInputs;
  const summary = props.summary ?? storeSummary;
  const isRecalculatingLedger = props.isRecalculatingLedger ?? storeIsRecalculatingLedger;
  const isExpanded = !isTableCollapsed;

  const [filterMode, setFilterMode] = useState<'milestones' | 'retirement' | 'all'>('milestones');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedAge, setHighlightedAge] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [taxRateMode, setTaxRateMode] = useState<'effective' | 'marginal' | 'both'>('effective');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Close full screen on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // AI Explainer State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [selectedAge, setSelectedAge] = useState<number | ''>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [aiExplanation, setAiExplanation] = useState<LedgerAiExplanation | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const formatCur = (val: number) => {
    if (val === 0) return '-';
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Filtered dataset memoized for stable virtualization
  const filteredData = useMemo(() => {
    return yearlyResults.filter((yr) => {
      // Search filter
      if (searchTerm) {
        const matchAge = String(yr.age).includes(searchTerm);
        const matchNotes = yr.notes.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchBadges = yr.milestoneBadges?.some(
          (b) =>
            b.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.shortLabel.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!matchAge && !matchNotes && !matchBadges) return false;
      }

      if (filterMode === 'retirement') {
        return yr.isRetired;
      }

      if (filterMode === 'milestones') {
        const isMeltdownStart =
          inputs?.drawdownStrategy === 'rrsp_meltdown' &&
          yr.age === (inputs.meltdownStartAge ?? retirementAge);

        return (
          yr.age === yearlyResults[0]?.age ||
          yr.age === retirementAge ||
          isMeltdownStart ||
          yr.isRrspMeltdownStartMilestone ||
          yr.isCrossoverMilestone ||
          yr.isCoastFireMilestone ||
          yr.isMillionaireMilestone ||
          yr.isMortgageFreeMilestone ||
          yr.isDebtFreeMilestone ||
          yr.isPeakWealthMilestone ||
          yr.age === summary?.crossoverAge ||
          yr.age === summary?.coastFireAge ||
          yr.age === summary?.millionaireAge ||
          yr.age === summary?.mortgagePayoffAge ||
          yr.age === summary?.debtPayoffAge ||
          yr.age === summary?.peakNetWorthAge ||
          yr.age === 60 ||
          yr.age === 65 ||
          yr.age === 70 ||
          yr.age === 71 ||
          yr.age === 72 ||
          yr.age === 75 ||
          yr.age === 80 ||
          yr.age === 85 ||
          yr.age === 90 ||
          yr.age === yearlyResults[yearlyResults.length - 1]?.age ||
          yr.homeSoldThisYear ||
          yr.notes.length > 0 ||
          (yr.milestoneBadges && yr.milestoneBadges.length > 0)
        );
      }

      return true; // 'all'
    });
  }, [yearlyResults, searchTerm, filterMode, retirementAge, summary, inputs]);

  // DOM Virtualizer for 80+ dynamic simulation rows
  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const scrollToAge = (age: number) => {
    setHighlightedAge(age);
    if (filterMode !== 'all' && filterMode !== 'milestones') {
      setFilterMode('all');
    }
    const targetIdx = filteredData.findIndex((r) => r.age === age);
    if (targetIdx !== -1) {
      rowVirtualizer.scrollToIndex(targetIdx, { align: 'center', behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const el = document.getElementById(`row-age-${age}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    setTimeout(() => {
      setHighlightedAge(null);
    }, 3500);
  };

  // Dynamic suggestions tailored to this specific user's milestone results
  const dynamicSuggestions = useMemo(() => {
    const list: { label: string; question: string; age?: number; metric?: string }[] = [];
    
    // 1. Crossover Point (Returns Outgrow Expenses)
    if (summary?.crossoverAge) {
      list.push({
        label: `🚀 Crossover @ Age ${summary.crossoverAge}`,
        question: `How was my Crossover Point calculated at Age ${summary.crossoverAge} where investment returns ($${Math.round(summary.crossoverInvestmentGrowth).toLocaleString()}/yr) surpass required living expenses ($${Math.round(summary.crossoverLivingExpenses).toLocaleString()}/yr)?`,
        age: summary.crossoverAge,
        metric: 'Investment Returns'
      });
    }

    // 2. Coast FIRE / Zero-Contribution Viability
    if (summary?.coastFireAge !== undefined && summary?.coastFireAge !== null) {
      list.push({
        label: `⚓ Coast FIRE @ Age ${summary.coastFireAge}`,
        question: `How was Coast FIRE (Zero-Contribution Viability) calculated at Age ${summary.coastFireAge} and why will stopping future savings still 100% fund my intended retirement through age ${inputs?.lifeExpectancy || 85}?`,
        age: summary.coastFireAge,
        metric: 'Coast FIRE'
      });
    }

    // 3. Retirement target year Net Worth & Tax
    const retireRow = yearlyResults.find(r => r.age === retirementAge);
    if (retireRow) {
      list.push({
        label: `Net Worth @ Age ${retirementAge}`,
        question: `How is my Total Net Worth of $${Math.round(retireRow.totalNetWorth).toLocaleString()} calculated at retirement age ${retirementAge}?`,
        age: retirementAge,
        metric: 'Total Net Worth'
      });
    }

    // 4. Millionaire milestone
    if (summary?.millionaireAge) {
      list.push({
        label: `💎 $1M Net Worth @ Age ${summary.millionaireAge}`,
        question: `How does my portfolio reach the $1,000,000 net worth milestone at Age ${summary.millionaireAge}?`,
        age: summary.millionaireAge,
        metric: 'Total Net Worth'
      });
    }

    // 5. Age 65 CPP & OAS pension start
    const age65Row = yearlyResults.find(r => r.age === 65);
    if (age65Row) {
      list.push({
        label: `CPP & OAS @ Age 65`,
        question: `What is the exact formula used to calculate my CPP ($${Math.round(age65Row.cppIncome).toLocaleString()}) and OAS ($${Math.round(age65Row.oasNetIncome).toLocaleString()}) at Age 65?`,
        age: 65,
        metric: 'CPP'
      });
    }

    // 6. Age 71/72 RRIF Conversion & Mandatory Minimums
    const age72Row = yearlyResults.find(r => r.age === 72);
    if (age72Row && age72Row.rrspBalance > 0) {
      list.push({
        label: `RRIF Minimums @ Age 72`,
        question: `Why does my RRSP/RRIF withdrawal change at Age 71/72 and how is the CRA mandatory minimum withdrawal calculated?`,
        age: 72,
        metric: 'RRSP / RRIF'
      });
    }

    // 7. Future Home Purchase
    if (summary?.isFutureHomeBuyer && summary?.futurePurchaseAge) {
      list.push({
        label: `🏡 Home Purchase @ Age ${summary.futurePurchaseAge}`,
        question: `How does purchasing a home at Age ${summary.futurePurchaseAge} impact my FHSA, down payment savings, and long-term net worth?`,
        age: summary.futurePurchaseAge,
        metric: 'Home Equity'
      });
    }

    // 8. Mortgage Freedom
    if (summary?.mortgagePayoffAge) {
      list.push({
        label: `🏡 Mortgage Free @ Age ${summary.mortgagePayoffAge}`,
        question: `How does paying off my home loan at Age ${summary.mortgagePayoffAge} redirect cash flow toward retirement wealth?`,
        age: summary.mortgagePayoffAge,
        metric: 'Home Equity'
      });
    }

    // 9. Consumer Debt Freedom
    if (summary?.debtPayoffAge) {
      list.push({
        label: `💳 Debt Freedom @ Age ${summary.debtPayoffAge}`,
        question: `How was my Debt Freedom milestone calculated at Age ${summary.debtPayoffAge} and how much cash flow is permanently freed for retirement savings?`,
        age: summary.debtPayoffAge,
        metric: 'Debt Payments'
      });
    }

    // 10. Strategic RRSP Break-Even Meltdown
    if (inputs?.drawdownStrategy === 'rrsp_meltdown') {
      const meltdownAge = inputs.meltdownStartAge ?? retirementAge;
      list.push({
        label: `🔥 RRSP Meltdown @ Age ${meltdownAge}`,
        question: `How does initiating an RRSP meltdown at Age ${meltdownAge} smooth my tax brackets, eliminate post-72 OAS clawbacks, and boost my estate wealth?`,
        age: meltdownAge,
        metric: 'RRSP'
      });
    }

    return list;
  }, [yearlyResults, retirementAge, inputs, summary]);

  const handleAskAi = async (customQuery?: string, targetAge?: number, targetMetric?: string) => {
    const query = (customQuery || aiQuestion).trim();
    if (!query) return;

    const age = targetAge !== undefined ? targetAge : (selectedAge !== '' ? Number(selectedAge) : undefined);
    const metric = targetMetric || selectedMetric;

    setIsLoadingAi(true);
    setAiError(null);
    setAiExplanation(null);

    // Find row data for target age or retirement age
    const row = yearlyResults.find(r => r.age === (age || retirementAge)) || yearlyResults[0];

    try {
      const res = await fetch('/api/explain-ledger-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          selectedAge: age,
          selectedMetric: metric,
          rowData: row,
          planContext: {
            currentAge: inputs?.currentAge,
            retirementAge,
            lifeExpectancy: inputs?.lifeExpectancy,
            province: province || inputs?.province || 'ON',
            isMarried: inputs?.maritalStatus === 'married',
            drawdownStrategy: inputs?.drawdownStrategy,
            inflationRate: inputs?.inflationRate,
            currentAnnualIncome: inputs?.currentAnnualIncome,
            targetRetirementSpendingToday: inputs?.targetRetirementSpendingToday,
            cppStartAge: inputs?.cppStartAge,
            cppEstimatedPercentOfMax: inputs?.cppEstimatedPercentOfMax
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate AI calculation explanation.');
      }

      const data = await res.json();
      if (data.explanation) {
        setAiExplanation(data.explanation);
      } else {
        throw new Error('Invalid explanation structure received from AI engine.');
      }
    } catch (err: any) {
      console.error('Error fetching ledger explanation:', err);
      setAiError(err.message || 'Unable to communicate with AI analyst. Please try again.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCellClick = (metricName: string, value: number, age: number) => {
    setIsAiOpen(true);
    setSelectedAge(age);
    setSelectedMetric(metricName);
    const q = `How is the ${metricName} value of ${formatCur(value)} calculated at Age ${age}?`;
    setAiQuestion(q);
    handleAskAi(q, age, metricName);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const { exportMilestoneTableToExcel } = await import('../utils/excelExport');
      await exportMilestoneTableToExcel({
        data: filteredData,
        filterMode,
        retirementAge,
        province,
        inputs
      });
    } catch (err) {
      console.error('Failed to export Excel spreadsheet:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getModeLabel = () => {
    if (filterMode === 'milestones') return 'Milestones (Key Events)';
    if (filterMode === 'retirement') return 'Retirement Only';
    return 'All Years';
  };

  return (
    <div className={
      isFullscreen
        ? "fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col p-3 sm:p-5 shadow-2xl overflow-hidden transition duration-200"
        : "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col transition duration-200"
    }>
      
      {/* 1. Header & Controls */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Table className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base flex items-center gap-2 flex-wrap">
              <span>Annual Simulation Ledger & Milestone Schedule</span>
              {isFullscreen && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Full Screen View
                </span>
              )}
              {isRecalculatingLedger && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 text-[10px] font-semibold animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Updating ledger...</span>
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Compounding balances, decumulation sources, CRA RRIF guidelines, and marginal vs effective taxes</span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Click any number or milestone card to inspect actuarial formulas</span>
            </span>
          </p>
        </div>

        {/* Filter Controls, Tax Rate Selector, Fullscreen & Export */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Tax Rate Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-semibold">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1.5 hidden sm:inline flex items-center gap-1">
              <Percent className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Tax Rate:</span>
            </span>
            <button
              type="button"
              onClick={() => setTaxRateMode('effective')}
              className={`px-2 py-1 rounded-lg text-xs transition cursor-pointer ${
                taxRateMode === 'effective'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Show Effective Tax Rate % (Total tax paid divided by gross income)"
            >
              Effective %
            </button>
            <button
              type="button"
              onClick={() => setTaxRateMode('marginal')}
              className={`px-2 py-1 rounded-lg text-xs transition cursor-pointer ${
                taxRateMode === 'marginal'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Show Marginal Tax Bracket % (Highest bracket rate applied to taxable income)"
            >
              Marginal %
            </button>
            <button
              type="button"
              onClick={() => setTaxRateMode('both')}
              className={`px-2 py-1 rounded-lg text-xs transition cursor-pointer ${
                taxRateMode === 'both'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Show both Effective and Marginal Tax Rates side-by-side"
            >
              Both
            </button>
          </div>

          {/* Ask AI Explainer Button */}
          <button
            type="button"
            onClick={() => setIsAiOpen(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs border cursor-pointer ${
              isAiOpen
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-400/30'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
            }`}
            title="Ask AI to explain any number, calculation formula, or milestone in this table"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiOpen ? 'text-amber-300 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>Ask AI</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search age, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 w-28 sm:w-36"
            />
          </div>

          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700/80 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('milestones')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                filterMode === 'milestones'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Milestones ({filteredData.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('retirement')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                filterMode === 'retirement'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Retirement
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Years ({yearlyResults.length})
            </button>
          </div>

          {/* Full Screen / Maximize Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? 'Exit Full Screen View (Press Esc)' : 'Maximize Table to Full Screen'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-xs cursor-pointer ${
              isFullscreen
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700/80'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-white" />
                <span>Exit Fullscreen</span>
                <span className="text-[9.5px] px-1 py-0.2 rounded bg-black/20 text-white font-mono hidden md:inline">Esc</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Maximize</span>
              </>
            )}
          </button>

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            title={`Export ${getModeLabel()} view to Excel spreadsheet with live dynamic formulas`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 dark:text-emerald-400" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Export Excel</span>
              </>
            )}
          </button>

          {/* Collapse / Expand Table Button */}
          <button
            type="button"
            onClick={() => toggleSectionCollapse('ledger')}
            title={isExpanded ? 'Collapse Annual Ledger Table' : 'Expand Annual Ledger Table'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 shadow-xs transition cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Summary Bar */}
      {!isExpanded && (
        <div 
          onClick={() => toggleSectionCollapse('ledger')}
          className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800 border-t border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2.5 transition cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white">Annual Simulation Ledger ({yearlyResults.length} Years):</span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Ages <strong className="text-slate-900 dark:text-white">{inputs?.currentAge || 30} – {inputs?.lifeExpectancy || 85}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Retiring @ <strong className="text-emerald-600 dark:text-emerald-400">{retirementAge}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Peak Net Worth: <strong className="text-slate-900 dark:text-white">${Math.round(summary?.peakNetWorth || 0).toLocaleString()}</strong> (@ Age {summary?.peakNetWorthAge})
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Ending Net Worth: <strong className="text-emerald-600 dark:text-emerald-400">${Math.round(summary?.netWorthAtLifeExpectancy || 0).toLocaleString()}</strong>
            </span>
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 ml-auto">
            <span>Show Full Milestone Ledger & Table</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {isExpanded && (
        <>
      {/* 2. Key Milestone Schedule Showcase Cards (Top Dashboard) */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Strategic Milestone Schedule & Velocity Markers</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Click any milestone card to highlight and jump to that year in the ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
          
          {/* Card 1: Returns Outgrow Living Expenses (The Crossover Point) */}
          <button
            type="button"
            onClick={() => summary?.crossoverAge && scrollToAge(summary.crossoverAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.crossoverAge
                ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                <span>Crossover Point</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {summary?.crossoverAge ? `Age ${summary.crossoverAge}` : 'Post-Plan'}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                {summary?.crossoverAge ? 'Returns > Expenses' : 'Requires higher capital'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.crossoverAge ? `+${formatCur(summary.crossoverInvestmentGrowth)}/yr return` : 'Ongoing saving'}
            </div>
          </button>

          {/* Card 2: Zero-Contribution Viability (Coast FIRE) */}
          <button
            type="button"
            onClick={() => summary?.coastFireAge && scrollToAge(summary.coastFireAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.coastFireAge !== undefined && summary?.coastFireAge !== null
                ? 'bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100/80 dark:hover:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/20 text-cyan-950 dark:text-cyan-300 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-cyan-800 dark:text-cyan-400 flex items-center gap-1">
                <Anchor className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span>Coast FIRE</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-cyan-600 dark:text-cyan-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {summary?.coastFireAge !== undefined && summary?.coastFireAge !== null
                  ? (summary.coastFireAge === inputs?.currentAge ? 'Viable Today!' : `Age ${summary.coastFireAge}`)
                  : 'Requires Work'}
              </div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                {summary?.coastFireAge !== undefined && summary?.coastFireAge !== null ? '$0 Future Savings' : 'Keep contributing'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.coastFireAge !== undefined && summary?.coastFireAge !== null ? `${formatCur(summary.coastFireNetWorth)} invested` : 'N/A'}
            </div>
          </button>

          {/* Card 3: $1M Millionaire Milestone */}
          <button
            type="button"
            onClick={() => summary?.millionaireAge && scrollToAge(summary.millionaireAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.millionaireAge
                ? 'bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100/80 dark:hover:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/20 text-cyan-950 dark:text-cyan-300 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-cyan-800 dark:text-cyan-400 flex items-center gap-1">
                <Gem className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span>$1M Net Worth</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-cyan-600 dark:text-cyan-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {summary?.millionaireAge ? `Age ${summary.millionaireAge}` : 'N/A'}
              </div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                {summary?.millionaireAge ? '7-Figure Portfolio' : 'Below $1M'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.millionaireAge ? '$1,000,000+ Net Worth' : 'Target'}
            </div>
          </button>

          {/* Card 4: Mortgage Freedom */}
          <button
            type="button"
            onClick={() => summary?.mortgagePayoffAge && scrollToAge(summary.mortgagePayoffAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.mortgagePayoffAge
                ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <Home className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Mortgage Free</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {summary?.mortgagePayoffAge ? `Age ${summary.mortgagePayoffAge}` : (inputs?.realEstate?.ownsHome ? 'Paid Off' : 'No Mortgage')}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                {summary?.mortgagePayoffAge ? 'Debt Eliminated' : 'No loan active'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              $0 Loan Balance
            </div>
          </button>

          {/* Card 5: Target Retirement Day */}
          <button
            type="button"
            onClick={() => scrollToAge(retirementAge)}
            className="text-left p-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 text-rose-950 dark:text-rose-300 transition shadow-2xs hover:shadow-xs group relative flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Retire Target</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-rose-600 dark:text-rose-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                Age {retirementAge}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                Decumulation Starts
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.netWorthAtRetirement ? `${formatCur(summary.netWorthAtRetirement)} nest egg` : 'Starting wealth'}
            </div>
          </button>

          {/* Card 6: Peak Lifetime Wealth Apex */}
          <button
            type="button"
            onClick={() => summary?.peakNetWorthAge && scrollToAge(summary.peakNetWorthAge)}
            className="text-left p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 text-indigo-950 dark:text-indigo-300 transition shadow-2xs hover:shadow-xs group relative flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                <Mountain className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Peak Wealth</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {summary?.peakNetWorthAge ? `Age ${summary.peakNetWorthAge}` : 'Apex'}
              </div>
              <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                Lifetime Maximum
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.peakNetWorth ? formatCur(summary.peakNetWorth) : 'Peak Assets'}
            </div>
          </button>

          {/* Card 7: Consumer Debt Freedom */}
          {Boolean(summary?.debtPayoffAge || (inputs?.debts && inputs.debts.length > 0)) && (
            <button
              type="button"
              onClick={() => summary?.debtPayoffAge && scrollToAge(summary.debtPayoffAge)}
              className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
                summary?.debtPayoffAge
                  ? 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/20 text-rose-950 dark:text-rose-300 shadow-2xs hover:shadow-xs'
                  : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Debt Free</span>
                </span>
                <ArrowUpRight className="w-3 h-3 text-rose-600 dark:text-rose-400 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  {summary?.debtPayoffAge ? `Age ${summary.debtPayoffAge}` : 'No Debts'}
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                  {summary?.debtPayoffAge ? 'Loans Extinguished' : 'Debt Free Today'}
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                {summary?.totalInitialDebt ? `${formatCur(summary.totalInitialDebt)} cleared` : '$0 Loans'}
              </div>
            </button>
          )}

          {/* Card 8: Strategic RRSP Break-Even Meltdown */}
          {inputs?.drawdownStrategy === 'rrsp_meltdown' && (
            <button
              type="button"
              onClick={() => {
                const targetAge = inputs.meltdownStartAge ?? retirementAge;
                scrollToAge(targetAge);
              }}
              className="text-left p-2.5 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100/80 dark:hover:bg-blue-500/20 text-blue-950 dark:text-blue-300 transition shadow-2xs hover:shadow-xs group relative flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-blue-600 dark:text-blue-400 fill-blue-500" />
                  <span>RRSP Meltdown</span>
                </span>
                <ArrowUpRight className="w-3 h-3 text-blue-600 dark:text-blue-400 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  Age {inputs.meltdownStartAge ?? retirementAge}
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                  Tax Arbitrage Active
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                {inputs.meltdownTargetStrategy === 'oas_threshold'
                  ? 'Ceiling: ~$93k OAS'
                  : inputs.meltdownTargetStrategy === 'even_meltdown'
                  ? 'Even Meltdown to 71'
                  : 'Ceiling: ~$57k (Bkt 1)'}
              </div>
            </button>
          )}

        </div>
      </div>

      {/* 3. AI Calculation & Formula Explainer Drawer */}
      {isAiOpen && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 border-b border-indigo-900/60 flex flex-col gap-4 animate-in fade-in duration-200">
          
          {/* AI Drawer Top Header */}
          <div className="flex items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/60">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    AI Simulation & Milestone Explainer
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    CRA Actuarial Intelligence
                  </span>
                </div>
                <p className="text-xs text-slate-300 hidden sm:block">
                  Ask about Crossover points, Coast FIRE viability, tax formulas, or any balance sheet metric
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="Close AI Explainer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Curiosity Suggestions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Featured Milestone & Calculation Inquiries:</span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Click any suggestion to generate formula & math
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {dynamicSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiQuestion(item.question);
                    if (item.age !== undefined) setSelectedAge(item.age);
                    if (item.metric) setSelectedMetric(item.metric);
                    handleAskAi(item.question, item.age, item.metric);
                  }}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 hover:text-white border border-indigo-700/50 hover:border-indigo-500 transition shadow-2xs flex items-center gap-1.5"
                >
                  <span className="font-semibold">{item.label}</span>
                  <ChevronRight className="w-3 h-3 text-indigo-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Question Bar */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <select
              value={selectedAge}
              onChange={(e) => setSelectedAge(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-slate-800/90 border border-slate-700 text-xs rounded-xl px-2.5 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0"
              aria-label="Select target age"
            >
              <option value="">Any Age</option>
              {yearlyResults.map(r => (
                <option key={r.age} value={r.age}>
                  Age {r.age} {r.age === retirementAge ? '(Retire)' : r.isCrossoverMilestone ? '(Crossover)' : r.isCoastFireMilestone ? '(Coast FIRE)' : ''}
                </option>
              ))}
            </select>

            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 text-xs rounded-xl px-2.5 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0"
              aria-label="Select target metric"
            >
              <option value="">Any Metric</option>
              <option value="Investment Returns">Investment Returns (Compounding)</option>
              <option value="Coast FIRE">Coast FIRE / Zero-Contribution</option>
              <option value="Total Net Worth">Total Net Worth</option>
              <option value="Tax Paid">Tax Paid</option>
              <option value="CPP">CPP</option>
              <option value="OAS (Net)">OAS (Net)</option>
              <option value="RRSP">RRSP</option>
              <option value="RRIF">RRIF (CRA Guidelines)</option>
              <option value="RRSP / RRIF">RRSP / RRIF</option>
              <option value="TFSA">TFSA</option>
              <option value="FHSA">FHSA</option>
              <option value="Home Equity">Home Equity</option>
              <option value="Withdrawals">Withdrawals</option>
              <option value="Debt Payments">Debt Payments</option>
              <option value="Spendable Cash">Spendable Cash</option>
            </select>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ask about formulas (e.g. 'How is Crossover calculated?' or 'Why is Coast FIRE reached at Age 42?')"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoadingAi) {
                    handleAskAi();
                  }
                }}
                className="w-full bg-slate-800/90 border border-slate-700 text-xs rounded-xl pl-3 pr-9 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {aiQuestion && (
                <button
                  type="button"
                  onClick={() => setAiQuestion('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleAskAi()}
              disabled={isLoadingAi || !aiQuestion.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
            >
              {isLoadingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explain Milestone</span>
                </>
              )}
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoadingAi && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-indigo-800/50 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-200">
                  Actuarial Engine Analyzing Milestone & Formulas...
                </span>
                <span className="text-[11px] text-slate-400">
                  Calculating compounding returns, decumulation viability, and statutory tax parameters for Age {selectedAge || retirementAge}.
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {aiError && !isLoadingAi && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/50 text-rose-200 text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* AI Explanation Result Cards */}
          {aiExplanation && !isLoadingAi && (
            <div className="flex flex-col gap-3 pt-2 border-t border-indigo-900/50">
              {/* 1. Summary */}
              <div className="p-3.5 rounded-xl bg-indigo-900/40 border border-indigo-800/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Actuarial Calculation Summary</span>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed font-sans font-medium">
                  {aiExplanation.summary}
                </p>
              </div>

              {/* 2. Formula */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Canadian Formula & Standard</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Statutory / Actuarial Standard
                  </span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                  <code>{aiExplanation.formula}</code>
                </div>
              </div>

              {/* 3. Step-by-Step Breakdown */}
              {aiExplanation.mathBreakdown && aiExplanation.mathBreakdown.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-2">
                  <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">
                    Step-by-Step Number Breakdown
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    {aiExplanation.mathBreakdown.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 bg-slate-800/60 p-2 rounded-lg border border-slate-800">
                        <span className="w-4 h-4 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Strategic Guidance */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Strategic Impact & Lifestyle Freedom</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {aiExplanation.contextualGuidance}
                </p>
              </div>

              {/* Follow-Ups */}
              {aiExplanation.suggestedFollowUps && aiExplanation.suggestedFollowUps.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Suggested follow-up questions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiExplanation.suggestedFollowUps.map((followUp, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => {
                          setAiQuestion(followUp);
                          handleAskAi(followUp);
                        }}
                        className="text-left text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 transition"
                      >
                        {followUp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strategic RRSP Meltdown Impact Banner on Milestone Ledger */}
      {inputs?.drawdownStrategy === 'rrsp_meltdown' && (
        <div className="mx-3 sm:mx-4 my-2.5 p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-slate-50/60 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900/40 border border-blue-200/90 dark:border-blue-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs shrink-0 mt-0.5">
              <Flame className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Strategic Milestone Active: RRSP Meltdown Strategy (Age {inputs.meltdownStartAge ?? retirementAge} to 71)
                </span>
                <span className="px-2 py-0.2 rounded font-mono font-bold text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                  Ceiling: {inputs.meltdownTargetStrategy === 'oas_threshold' ? 'OAS Clawback Threshold (~$93,208)' : inputs.meltdownTargetStrategy === 'even_meltdown' ? 'Even Spread to 71' : 'Federal Bracket 1 (~$57,375)'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                <span>
                  🔹 <strong className="text-blue-700 dark:text-blue-300 font-semibold">Tax Impact:</strong> Early withdrawals lock in low marginal tax brackets (15%–20.05%) instead of 43.4%–53.5% post-72 RRIF brackets.
                </span>
                <span>
                  🔹 <strong className="text-emerald-700 dark:text-emerald-300 font-semibold">Wealth Impact:</strong> Unspent proceeds are reinvested into TFSA & Non-Reg, defusing OAS clawback.
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => scrollToAge(inputs.meltdownStartAge ?? retirementAge)}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Flame className="w-3 h-3 fill-white" />
              <span>Jump to Meltdown (Age {inputs.meltdownStartAge ?? retirementAge})</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToAge(72)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px] transition cursor-pointer"
            >
              <span>Inspect Age 72</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Table Data Container */}
      <div
        ref={tableContainerRef}
        className={`overflow-x-auto relative transition-opacity duration-200 ${
          isRecalculatingLedger ? 'opacity-60' : 'opacity-100'
        } ${isFullscreen ? 'flex-1 max-h-none h-full' : 'max-h-[520px]'}`}
      >
        {isRecalculatingLedger && (
          <div className="sticky top-12 left-4 z-20 pointer-events-none inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-800/95 text-white text-xs font-sans font-medium shadow-md backdrop-blur-xs border border-slate-700/60 mb-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Updating deep ledger...</span>
          </div>
        )}
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/90 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3 min-w-[190px]">Age / Milestone Phase</th>
              <th className="py-2.5 px-3 text-right min-w-[110px]">RRSP</th>
              <th className="py-2.5 px-3 text-right min-w-[135px]">RRIF & CRA Min</th>
              <th className="py-2.5 px-3 text-right">TFSA</th>
              <th className="py-2.5 px-3 text-right">FHSA</th>
              <th className="py-2.5 px-3 text-right">Non-Reg</th>
              <th className="py-2.5 px-3 text-right text-orange-600 dark:text-orange-400">Home Equity</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white bg-slate-100/50 dark:bg-slate-800/40">Total Net Worth</th>
              <th className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10">Inv. Returns</th>
              <th className="py-2.5 px-3 text-right">CPP</th>
              <th className="py-2.5 px-3 text-right">OAS (Net)</th>
              <th className="py-2.5 px-3 text-right min-w-[170px]">Withdrawals & Sources</th>
              <th className="py-2.5 px-3 text-right min-w-[125px]">
                {taxRateMode === 'effective' && 'Tax Paid (Eff. %)'}
                {taxRateMode === 'marginal' && 'Tax Paid (Marg. %)'}
                {taxRateMode === 'both' && 'Tax Paid (Eff. / Marg.)'}
              </th>
              <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 min-w-[110px]">Debt Payments</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">Spendable Cash</th>
              <th className="py-2.5 px-3 text-right text-slate-400 dark:text-slate-500">Living Target</th>
              <th className="py-2.5 px-3 min-w-[260px]">Milestone Schedule Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans text-xs">
                  No simulation years match the current search or filter criteria.
                </td>
              </tr>
            ) : null}

            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={17} />
              </tr>
            )}

            {virtualRows.map((virtualRow) => {
              const row = filteredData[virtualRow.index];
              if (!row) return null;
              const isRetirementMilestone = row.age === retirementAge;
              const isRrifMandatory = row.age === 71 || row.age === 72;
              const hasNotes = row.notes.length > 0;
              const isHighlighted = highlightedAge === row.age;
              const isMeltdownStart = Boolean(
                row.isRrspMeltdownStartMilestone ||
                (inputs?.drawdownStrategy === 'rrsp_meltdown' && row.age === (inputs.meltdownStartAge ?? retirementAge))
              );
              const isMeltdownActive = Boolean(
                row.isRrspMeltdownActive ||
                (inputs?.drawdownStrategy === 'rrsp_meltdown' &&
                  row.age >= (inputs.meltdownStartAge ?? retirementAge) &&
                  row.age < 72 &&
                  (row.rrspWithdrawal > 0 || row.rrifWithdrawal > 0))
              );

              return (
                <tr
                  id={`row-age-${row.age}`}
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all ${
                    isHighlighted
                      ? 'bg-emerald-100/90 dark:bg-emerald-950/80 ring-2 ring-emerald-500 z-10'
                      : isMeltdownStart
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 font-semibold'
                      : row.isCrossoverMilestone
                      ? 'bg-emerald-50/70 dark:bg-emerald-500/10 font-semibold text-emerald-950 dark:text-emerald-300'
                      : row.isCoastFireMilestone
                      ? 'bg-cyan-50/70 dark:bg-cyan-500/10 font-semibold text-cyan-950 dark:text-cyan-300'
                      : isRetirementMilestone
                      ? 'bg-rose-50/70 dark:bg-rose-500/10 font-semibold text-rose-950 dark:text-rose-300'
                      : isRrifMandatory
                      ? 'bg-amber-50/50 dark:bg-amber-500/10'
                      : isMeltdownActive
                      ? 'bg-blue-50/25 dark:bg-blue-950/20'
                      : row.isRetired
                      ? 'bg-slate-50/60 dark:bg-slate-800/50'
                      : virtualRow.index % 2 === 1
                      ? 'bg-slate-50/40 dark:bg-slate-800/40'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Age & Milestone Phase Badges */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                        Age {row.age}
                        {row.isCouple && row.spouseAge !== undefined && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal"> (Sp {row.spouseAge})</span>
                        )}
                      </span>

                      {/* Primary Work/Retire Badge */}
                      {isRetirementMilestone && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold flex items-center gap-1 shadow-2xs">
                          <Target className="w-2.5 h-2.5" />
                          <span>Retire Target</span>
                        </span>
                      )}
                      {!row.isRetired && !isRetirementMilestone && (
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Work
                        </span>
                      )}
                      {row.isRetired && !isRetirementMilestone && (
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                          Retire
                        </span>
                      )}

                      {/* Strategic RRSP Meltdown Milestone Badge */}
                      {isMeltdownStart && (
                        <span 
                          title="Strategic RRSP Meltdown Milestone: Accelerated early draw begins here to lock in lowest lifetime tax brackets"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 flex items-center gap-1 shadow-2xs animate-pulse"
                        >
                          <Flame className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 fill-blue-500" />
                          <span>Meltdown Start</span>
                        </span>
                      )}
                      {isMeltdownActive && !isMeltdownStart && (
                        <span 
                          title="RRSP Meltdown active: Accelerated draw utilizing low tax bracket"
                          className="text-[8.5px] px-1 py-0.2 rounded font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5"
                        >
                          <Flame className="w-2 h-2 text-blue-600 dark:text-blue-400" />
                          <span>Meltdown</span>
                        </span>
                      )}

                      {/* Milestone Badge 1: Crossover Point (Returns > Expenses) */}
                      {row.isCrossoverMilestone && (
                        <span 
                          title={`Crossover Milestone: Returns ($${Math.round(row.totalInvestmentGrowth).toLocaleString()}/yr) outgrow living expenses ($${Math.round(row.targetSpendingNominal).toLocaleString()}/yr)`}
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1 shadow-2xs animate-pulse"
                        >
                          <Zap className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                          <span>Crossover</span>
                        </span>
                      )}

                      {/* Milestone Badge 2: Coast FIRE (Zero-Contribution Viability) */}
                      {row.isCoastFireMilestone && (
                        <span 
                          title="Coast FIRE: Zero further contributions needed to 100% fund retirement living expenses"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-50 dark:bg-cyan-500/15 text-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 flex items-center gap-1 shadow-2xs"
                        >
                          <Anchor className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                          <span>Coast FIRE</span>
                        </span>
                      )}

                      {/* Milestone Badge 3: Millionaire */}
                      {row.isMillionaireMilestone && (
                        <span 
                          title="Millionaire Milestone: Total Net Worth surpasses $1,000,000"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-50 dark:bg-cyan-500/15 text-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 flex items-center gap-1"
                        >
                          <Gem className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                          <span>$1M NW</span>
                        </span>
                      )}

                      {/* Milestone Badge 4: Mortgage Free */}
                      {row.isMortgageFreeMilestone && (
                        <span 
                          title="Mortgage Free: Home loan amortized to $0 balance"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1"
                        >
                          <Home className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Mortgage Free</span>
                        </span>
                      )}

                      {/* Milestone Badge 4B: Consumer Debt Free */}
                      {row.isDebtFreeMilestone && (
                        <span 
                          title="Consumer Debt Free: All personal, vehicle, and student loans amortized to $0 balance"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-teal-50 dark:bg-teal-500/15 text-teal-900 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 flex items-center gap-1 shadow-2xs"
                        >
                          <CreditCard className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                          <span>Debt Free</span>
                        </span>
                      )}

                      {/* Milestone Badge 5: Peak Wealth */}
                      {row.isPeakWealthMilestone && (
                        <span 
                          title="Peak Lifetime Wealth Apex"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1"
                        >
                          <Mountain className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Peak Wealth</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsAiOpen(true);
                          setSelectedAge(row.age);
                          const q = `How are the numbers, tax brackets, and milestone values calculated for Age ${row.age}?`;
                          setAiQuestion(q);
                          handleAskAi(q, row.age);
                        }}
                        className="opacity-40 hover:opacity-100 p-0.5 rounded text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition ml-auto"
                        title={`Ask AI to explain Age ${row.age} calculations`}
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* RRSP Balance (Age < 72) */}
                  <td 
                    onClick={() => {
                      if (row.age < 72) {
                        handleCellClick('RRSP', row.rrspBalance, row.age);
                      }
                    }}
                    title={row.age < 72 ? `Click to ask AI how RRSP balance (${formatCur(row.rrspBalance)}) was calculated at Age ${row.age}` : 'RRSP converted to RRIF by age 71 per CRA guidelines'}
                    className={`py-2.5 px-3 text-right select-none ${
                      row.age < 72 
                        ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:underline transition-colors' 
                        : 'text-slate-400 dark:text-slate-500 text-[10.5px]'
                    }`}
                  >
                    {row.age < 72 ? (
                      <div>{formatCur(row.rrspBalance)}</div>
                    ) : (
                      <span className="italic">Converted</span>
                    )}
                  </td>

                  {/* RRIF Balance & CRA Minimum Guidelines (Age 72+) */}
                  <td 
                    onClick={() => {
                      if (row.age >= 72) {
                        handleCellClick('RRIF', row.rrifBalance, row.age);
                      }
                    }}
                    title={
                      row.age >= 72
                        ? `RRIF Balance: ${formatCur(row.rrifBalance)} | Statutory CRA Min: ${formatCur(row.rrifMinimumWithdrawal)} | Withdrawn: ${formatCur(row.rrifWithdrawal)}`
                        : 'RRIF account begins at statutory age 71 conversion from RRSP'
                    }
                    className={`py-2.5 px-3 text-right select-none ${
                      row.age >= 72 
                        ? 'text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-950/40 hover:underline transition-colors' 
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {row.age >= 72 ? (
                      <div>
                        <div className="font-semibold">{formatCur(row.rrifBalance)}</div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          {row.isRrifMinMet ? (
                            <span 
                              title={`Statutory CRA withdrawal guideline satisfied (prescribed minimum: ${formatCur(row.rrifMinimumWithdrawal)})`}
                              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-sans font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30"
                            >
                              <span>CRA Min Met</span>
                              <span>✓</span>
                            </span>
                          ) : row.rrifMinimumWithdrawal > 0 ? (
                            <span 
                              title={`Below prescribed CRA statutory guideline (${formatCur(row.rrifMinimumWithdrawal)})`}
                              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-sans font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30"
                            >
                              <span>Min: {formatCur(row.rrifMinimumWithdrawal)}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>

                  {/* TFSA */}
                  <td 
                    onClick={() => handleCellClick('TFSA', row.tfsaBalance, row.age)}
                    title={`Click to ask AI how TFSA balance (${formatCur(row.tfsaBalance)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.tfsaBalance)}
                  </td>

                  {/* FHSA */}
                  <td 
                    onClick={() => handleCellClick('FHSA', row.fhsaBalance, row.age)}
                    title={`Click to ask AI how FHSA balance (${formatCur(row.fhsaBalance)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-950/40 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.fhsaBalance)}
                  </td>

                  {/* Non-Reg */}
                  <td 
                    onClick={() => handleCellClick('Non-Reg', row.nonRegBalance, row.age)}
                    title={`Click to ask AI how Non-Registered balance (${formatCur(row.nonRegBalance)}) was calculated at Age ${row.age}${row.rrspMeltdownSurplusReinvested ? ` (includes +${formatCur(row.rrspMeltdownSurplusReinvested)} from RRSP meltdown reinvestment)` : ''}`}
                    className="py-2.5 px-3 text-right text-purple-600 dark:text-purple-400 cursor-pointer hover:bg-purple-50/80 dark:hover:bg-purple-950/40 hover:underline transition-colors select-none"
                  >
                    <div>
                      <div>{formatCur(row.nonRegBalance)}</div>
                      {Boolean(row.rrspMeltdownSurplusReinvested && row.rrspMeltdownSurplusReinvested > 0) && (
                        <div 
                          title={`+${formatCur(row.rrspMeltdownSurplusReinvested || 0)} after-tax RRSP meltdown proceeds deposited into Non-Reg to continue compounding`}
                          className="text-[9px] font-sans font-semibold text-blue-600 dark:text-blue-400 leading-tight mt-0.5 flex items-center justify-end gap-0.5"
                        >
                          <span>+{formatCur(row.rrspMeltdownSurplusReinvested || 0)}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Real Estate Share */}
                  <td 
                    onClick={() => {
                      if (row.realEstateShare > 0) {
                        handleCellClick('Home Equity', row.realEstateShare, row.age);
                      }
                    }}
                    title={row.realEstateShare > 0 ? `Click to ask AI how Home Equity (${formatCur(row.realEstateShare)}) was calculated at Age ${row.age}` : undefined}
                    className={`py-2.5 px-3 text-right text-orange-600 dark:text-orange-400 font-medium select-none ${row.realEstateShare > 0 ? 'cursor-pointer hover:bg-orange-50/80 dark:hover:bg-orange-950/40 hover:underline transition-colors' : ''}`}
                  >
                    {row.realEstateShare > 0 ? formatCur(row.realEstateShare) : row.homeSoldThisYear ? 'Sold' : '-'}
                  </td>

                  {/* Total Net Worth */}
                  <td 
                    onClick={() => handleCellClick('Total Net Worth', row.totalNetWorth, row.age)}
                    title={`Click to ask AI how Total Net Worth (${formatCur(row.totalNetWorth)}) was calculated at Age ${row.age}${row.remainingDebt > 0 ? ` (reflects -${formatCur(row.remainingDebt)} consumer debt)` : ''}`}
                    className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white bg-slate-100/40 dark:bg-slate-800/40 cursor-pointer hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline transition-colors select-none"
                  >
                    <div>
                      <div>{formatCur(row.totalNetWorth)}</div>
                      {row.remainingDebt > 0 && (
                        <div 
                          title={`Remaining consumer debt: -${formatCur(row.remainingDebt)}`}
                          className="text-[9px] font-sans font-normal text-rose-500 dark:text-rose-400 leading-tight mt-0.5"
                        >
                          -{formatCur(row.remainingDebt)} debt
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Investment Returns / Compounding Growth */}
                  <td 
                    onClick={() => handleCellClick('Investment Returns', row.totalInvestmentGrowth, row.age)}
                    title={`Click to ask AI how Investment Returns (${formatCur(row.totalInvestmentGrowth)}) were generated at Age ${row.age}`}
                    className={`py-2.5 px-3 text-right font-bold cursor-pointer transition-colors select-none ${
                      row.totalInvestmentGrowth >= row.targetSpendingNominal && row.targetSpendingNominal > 0
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10 hover:bg-emerald-100/90 dark:hover:bg-emerald-500/20 underline decoration-emerald-400'
                        : 'text-emerald-600/90 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10 hover:underline'
                    }`}
                  >
                    +{formatCur(row.totalInvestmentGrowth)}
                  </td>

                  {/* CPP */}
                  <td 
                    onClick={() => handleCellClick('CPP', row.cppIncome, row.age)}
                    title={`Click to ask AI how CPP pension (${formatCur(row.cppIncome)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:underline transition-colors select-none"
                  >
                    {formatCur(row.cppIncome)}
                  </td>

                  {/* OAS */}
                  <td 
                    onClick={() => handleCellClick('OAS (Net)', row.oasNetIncome, row.age)}
                    title={`Click to ask AI how Net OAS pension (${formatCur(row.oasNetIncome)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:underline transition-colors select-none"
                  >
                    {formatCur(row.oasNetIncome)}
                  </td>

                  {/* Withdrawals & Breakdown of Sources */}
                  <td 
                    onClick={() => handleCellClick('Withdrawals', row.totalWithdrawals, row.age)}
                    title={`Click to ask AI how withdrawals (${formatCur(row.totalWithdrawals)}) were calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:underline transition-colors select-none"
                  >
                    {row.totalWithdrawals > 0 ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-slate-900 dark:text-white">{formatCur(row.totalWithdrawals)}</span>
                        <div className="flex flex-wrap items-center justify-end gap-1 max-w-[210px]">
                          {row.nonRegWithdrawal > 0 && (
                            <span 
                              title={`Non-Registered Account Withdrawal: ${formatCur(row.nonRegWithdrawal)}`}
                              className="text-[8.5px] px-1.5 py-0.2 rounded font-sans font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30"
                            >
                              Non-Reg {formatCur(row.nonRegWithdrawal)}
                            </span>
                          )}
                          {row.rrspWithdrawal > 0 && (
                            <span 
                              title={
                                isMeltdownActive
                                  ? `Strategic RRSP Meltdown Withdrawal: ${formatCur(row.rrspWithdrawal)} (accelerated draw to utilize lower tax bracket)`
                                  : `RRSP Withdrawal: ${formatCur(row.rrspWithdrawal)}`
                              }
                              className={`text-[8.5px] px-1.5 py-0.2 rounded font-sans font-semibold border ${
                                isMeltdownActive
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold flex items-center gap-0.5'
                                  : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                              }`}
                            >
                              {isMeltdownActive && <Flame className="w-2.5 h-2.5 fill-white text-white shrink-0" />}
                              <span>{isMeltdownActive ? 'Meltdown ' : 'RRSP '}{formatCur(row.rrspWithdrawal)}</span>
                            </span>
                          )}
                          {row.rrifWithdrawal > 0 && (
                            <span 
                              title={`RRIF Withdrawal: ${formatCur(row.rrifWithdrawal)} ${row.isRrifMinMet ? '(CRA Guideline Satisfied)' : ''}`}
                              className="text-[8.5px] px-1.5 py-0.2 rounded font-sans font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                            >
                              RRIF {formatCur(row.rrifWithdrawal)}
                            </span>
                          )}
                          {row.tfsaWithdrawal > 0 && (
                            <span 
                              title={`Tax-Free TFSA Withdrawal: ${formatCur(row.tfsaWithdrawal)}`}
                              className="text-[8.5px] px-1.5 py-0.2 rounded font-sans font-semibold bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30"
                            >
                              TFSA {formatCur(row.tfsaWithdrawal)}
                            </span>
                          )}
                          {row.fhsaWithdrawalOrTransfer > 0 && (
                            <span 
                              title={`FHSA Withdrawal/Transfer: ${formatCur(row.fhsaWithdrawalOrTransfer)}`}
                              className="text-[8.5px] px-1.5 py-0.2 rounded font-sans font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            >
                              FHSA {formatCur(row.fhsaWithdrawalOrTransfer)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>

                  {/* Taxes Paid & Rate (Effective vs Marginal) */}
                  <td 
                    onClick={() => handleCellClick('Tax Paid', row.totalTaxPaid, row.age)}
                    title={`Total Tax: ${formatCur(row.totalTaxPaid)} | Effective Rate: ${(row.effectiveTaxRate * 100).toFixed(1)}% | Marginal Bracket: ${(row.marginalTaxRate * 100).toFixed(1)}%`}
                    className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-medium cursor-pointer hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:underline transition-colors select-none"
                  >
                    <div>{formatCur(row.totalTaxPaid)}</div>
                    {row.totalTaxPaid > 0 && (
                      <div className="text-[9.5px] mt-0.5 font-mono">
                        {taxRateMode === 'effective' && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            {(row.effectiveTaxRate * 100).toFixed(1)}% eff
                          </span>
                        )}
                        {taxRateMode === 'marginal' && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {(row.marginalTaxRate * 100).toFixed(1)}% marg
                          </span>
                        )}
                        {taxRateMode === 'both' && (
                          <span className="text-slate-500 dark:text-slate-400">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">{(row.effectiveTaxRate * 100).toFixed(1)}%</span>
                            {' / '}
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{(row.marginalTaxRate * 100).toFixed(1)}%</span>
                          </span>
                        )}
                      </div>
                    )}
                    {isMeltdownActive && (
                      <div 
                        title="Early RRSP draw locks in lower tax bracket today, preventing 43.4%-53.5% tax brackets at Age 72+"
                        className="text-[8.5px] font-sans font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center justify-end gap-0.5"
                      >
                        <Flame className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                        <span>Tax Arbitrage</span>
                      </div>
                    )}
                    {inputs?.drawdownStrategy === 'rrsp_meltdown' && row.age >= 72 && row.oasClawback === 0 && (
                      <div 
                        title="OAS protected: Zero clawback due to reduced mandatory RRIF minimums"
                        className="text-[8.5px] font-sans font-bold text-emerald-600 dark:text-emerald-400 mt-0.5"
                      >
                        ✓ 0% OAS Clawback
                      </div>
                    )}
                  </td>

                  {/* Debt Payments */}
                  <td 
                    onClick={() => handleCellClick('Debt Payments', row.debtPayment, row.age)}
                    title={
                      row.debtPayment > 0
                        ? `Click to inspect: Debt Outflow ${formatCur(row.debtPayment)} (Principal: ${formatCur(row.debtPrincipalPaid || 0)}, Interest: ${formatCur(row.debtInterestPaid || 0)}) | Remaining Balance: ${formatCur(row.remainingDebt || 0)}`
                        : (row.remainingDebt || 0) > 0
                        ? `Remaining Debt Balance: ${formatCur(row.remainingDebt)}`
                        : 'Debt-Free: No active consumer debt service'
                    }
                    className="py-2.5 px-3 text-right font-medium cursor-pointer hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:underline transition-colors select-none"
                  >
                    {row.debtPayment > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">
                          -{formatCur(row.debtPayment)}
                        </span>
                        {(row.remainingDebt || 0) > 0 && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-normal">
                            bal {formatCur(row.remainingDebt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 font-mono font-normal">
                        {row.isDebtFreeMilestone ? (
                          <span className="text-[9.5px] font-sans font-bold text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                            Paid Off
                          </span>
                        ) : (
                          '-'
                        )}
                      </span>
                    )}
                  </td>

                  {/* Spendable Cashflow */}
                  <td 
                    onClick={() => handleCellClick('Spendable Cash', row.netSpendableCashflow, row.age)}
                    title={`Click to ask AI how Net Spendable Cashflow (${formatCur(row.netSpendableCashflow)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.netSpendableCashflow)}
                  </td>

                  {/* Living Target (Expenses) */}
                  <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                    {formatCur(row.targetSpendingNominal)}
                  </td>

                  {/* Milestone Notes & Strategy Highlights */}
                  <td className="py-2.5 px-3 font-sans text-[11px] leading-snug">
                    {hasNotes ? (
                      <div className="flex flex-col gap-1">
                        {row.notes.map((note, nIdx) => {
                          const isMeltdownNote = note.includes('RRSP Meltdown') || note.includes('Meltdown Surplus');
                          const isCrossover = note.includes('Crossover Milestone');
                          const isCoast = note.includes('Coast FIRE Milestone');
                          const isMillionaire = note.includes('Millionaire Milestone');
                          const isMortgage = note.includes('Mortgage Freedom');
                          const isRetire = note.includes('Target Retirement');
                          const isPeak = note.includes('Peak Net Worth');

                          return (
                            <div 
                              key={nIdx}
                              className={`p-1 px-1.5 rounded-md text-[10.5px] ${
                                isMeltdownNote
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-semibold border border-blue-200 dark:border-blue-800'
                                  : isCrossover
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-500/20'
                                  : isCoast
                                  ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-500/20'
                                  : isMillionaire
                                  ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-500/20'
                                  : isMortgage
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-500/20'
                                  : isRetire
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-500/20'
                                  : isPeak
                                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-500/20'
                                  : 'text-slate-700 dark:text-slate-300 font-medium'
                              }`}
                            >
                              {note}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={17} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
};
