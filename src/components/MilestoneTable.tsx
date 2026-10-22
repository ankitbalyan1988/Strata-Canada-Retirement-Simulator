import React, { useState, useMemo, useRef } from 'react';
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
  ArrowUpRight
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
}

export const MilestoneTable: React.FC<MilestoneTableProps> = (props) => {
  const storeYearlyResults = useSimulationStore((state) => state.yearlyResults);
  const storeRetirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const storeProvince = useSimulationStore((state) => state.inputs.province);
  const storeInputs = useSimulationStore((state) => state.inputs);
  const storeSummary = useSimulationStore((state) => state.summary);

  const yearlyResults = props.yearlyResults ?? storeYearlyResults;
  const retirementAge = props.retirementAge ?? storeRetirementAge;
  const province = props.province ?? storeProvince;
  const inputs = props.inputs ?? storeInputs;
  const summary = props.summary ?? storeSummary;

  const [filterMode, setFilterMode] = useState<'milestones' | 'retirement' | 'all'>('milestones');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedAge, setHighlightedAge] = useState<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
        return (
          yr.age === yearlyResults[0]?.age ||
          yr.age === retirementAge ||
          yr.isCrossoverMilestone ||
          yr.isCoastFireMilestone ||
          yr.isMillionaireMilestone ||
          yr.isMortgageFreeMilestone ||
          yr.isPeakWealthMilestone ||
          yr.age === summary?.crossoverAge ||
          yr.age === summary?.coastFireAge ||
          yr.age === summary?.millionaireAge ||
          yr.age === summary?.mortgagePayoffAge ||
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
  }, [yearlyResults, searchTerm, filterMode, retirementAge, summary]);

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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition duration-200">
      
      {/* 1. Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Table className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              Annual Simulation Ledger & Milestone Schedule
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Year-by-year compounding balances, living expenses crossover, coasting viability, taxes & pensions</span>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="text-indigo-600 font-medium inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Click any number or milestone card to inspect actuarial formulas</span>
            </span>
          </p>
        </div>

        {/* Filter Controls, Ask AI & Export Button */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Ask AI Explainer Button */}
          <button
            type="button"
            onClick={() => setIsAiOpen(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs border ${
              isAiOpen
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white border-transparent shadow-md ring-2 ring-indigo-400/30'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300'
            }`}
            title="Ask AI to explain any number, calculation formula, or milestone in this table"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiOpen ? 'text-amber-300 animate-pulse' : 'text-indigo-600'}`} />
            <span>Ask AI</span>
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-semibold ${
              isAiOpen ? 'bg-white/20 text-white' : 'bg-indigo-200/70 text-indigo-900'
            }`}>
              Formulas & Help
            </span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search age, milestone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 w-32 sm:w-40"
            />
          </div>

          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('milestones')}
              className={`px-2.5 py-1 rounded-md transition ${
                filterMode === 'milestones'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Milestones ({filteredData.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('retirement')}
              className={`px-2.5 py-1 rounded-md transition ${
                filterMode === 'retirement'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Retirement
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Years ({yearlyResults.length})
            </button>
          </div>

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            title={`Export ${getModeLabel()} view to Excel spreadsheet with live dynamic formulas`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Key Milestone Schedule Showcase Cards (Top Dashboard) */}
      <div className="bg-slate-50/80 p-3 sm:p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>Strategic Milestone Schedule & Velocity Markers</span>
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Click any milestone card to highlight and jump to that year in the ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* Card 1: Returns Outgrow Living Expenses (The Crossover Point) */}
          <button
            type="button"
            onClick={() => summary?.crossoverAge && scrollToAge(summary.crossoverAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.crossoverAge
                ? 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/90 text-emerald-950 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 border-slate-200 text-slate-500 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-emerald-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600 fill-emerald-500" />
                <span>Crossover Point</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900">
                {summary?.crossoverAge ? `Age ${summary.crossoverAge}` : 'Post-Plan'}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium">
                {summary?.crossoverAge ? 'Returns > Expenses' : 'Requires higher capital'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 font-mono truncate">
              {summary?.crossoverAge ? `+${formatCur(summary.crossoverInvestmentGrowth)}/yr return` : 'Ongoing saving'}
            </div>
          </button>

          {/* Card 2: Zero-Contribution Viability (Coast FIRE) */}
          <button
            type="button"
            onClick={() => summary?.coastFireAge && scrollToAge(summary.coastFireAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.coastFireAge !== undefined && summary?.coastFireAge !== null
                ? 'bg-cyan-50/70 hover:bg-cyan-100/80 border-cyan-200/90 text-cyan-950 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 border-slate-200 text-slate-500 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-cyan-800 flex items-center gap-1">
                <Anchor className="w-3 h-3 text-cyan-600" />
                <span>Coast FIRE</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-cyan-600 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900">
                {summary?.coastFireAge !== undefined && summary?.coastFireAge !== null
                  ? (summary.coastFireAge === inputs?.currentAge ? 'Viable Today!' : `Age ${summary.coastFireAge}`)
                  : 'Requires Work'}
              </div>
              <div className="text-[10px] text-cyan-700 font-medium">
                {summary?.coastFireAge !== undefined && summary?.coastFireAge !== null ? '$0 Future Savings' : 'Keep contributing'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 font-mono truncate">
              {summary?.coastFireAge !== undefined && summary?.coastFireAge !== null ? `${formatCur(summary.coastFireNetWorth)} invested` : 'N/A'}
            </div>
          </button>

          {/* Card 3: $1M Millionaire Milestone */}
          <button
            type="button"
            onClick={() => summary?.millionaireAge && scrollToAge(summary.millionaireAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.millionaireAge
                ? 'bg-blue-50/70 hover:bg-blue-100/80 border-blue-200/90 text-blue-950 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 border-slate-200 text-slate-500 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-blue-800 flex items-center gap-1">
                <Gem className="w-3 h-3 text-blue-600" />
                <span>$1M Net Worth</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-blue-600 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900">
                {summary?.millionaireAge ? `Age ${summary.millionaireAge}` : 'N/A'}
              </div>
              <div className="text-[10px] text-blue-700 font-medium">
                {summary?.millionaireAge ? '7-Figure Portfolio' : 'Below $1M'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 font-mono truncate">
              {summary?.millionaireAge ? '$1,000,000+ Net Worth' : 'Target'}
            </div>
          </button>

          {/* Card 4: Mortgage Freedom */}
          <button
            type="button"
            onClick={() => summary?.mortgagePayoffAge && scrollToAge(summary.mortgagePayoffAge)}
            className={`text-left p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
              summary?.mortgagePayoffAge
                ? 'bg-teal-50/70 hover:bg-teal-100/80 border-teal-200/90 text-teal-950 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 border-slate-200 text-slate-500 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-teal-800 flex items-center gap-1">
                <Home className="w-3 h-3 text-teal-600" />
                <span>Mortgage Free</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-teal-600 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900">
                {summary?.mortgagePayoffAge ? `Age ${summary.mortgagePayoffAge}` : (inputs?.realEstate?.ownsHome ? 'Paid Off' : 'No Mortgage')}
              </div>
              <div className="text-[10px] text-teal-700 font-medium">
                {summary?.mortgagePayoffAge ? 'Debt Eliminated' : 'No loan active'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 font-mono truncate">
              $0 Loan Balance
            </div>
          </button>

          {/* Card 5: Target Retirement Day */}
          <button
            type="button"
            onClick={() => scrollToAge(retirementAge)}
            className="text-left p-2.5 rounded-xl border border-rose-200/90 bg-rose-50/70 hover:bg-rose-100/80 text-rose-950 transition shadow-2xs hover:shadow-xs group relative flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-rose-800 flex items-center gap-1">
                <Target className="w-3 h-3 text-rose-600" />
                <span>Retire Target</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-rose-600 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900">
                Age {retirementAge}
              </div>
              <div className="text-[10px] text-rose-700 font-medium">
                Decumulation Starts
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 font-mono truncate">
              {summary?.netWorthAtRetirement ? `${formatCur(summary.netWorthAtRetirement)} nest egg` : 'Starting wealth'}
            </div>
          </button>

          {/* Card 6: Peak Lifetime Wealth Apex */}
          <button
            type="button"
            onClick={() => summary?.peakNetWorthAge && scrollToAge(summary.peakNetWorthAge)}
            className="text-left p-2.5 rounded-xl border border-indigo-200/90 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-950 transition shadow-2xs hover:shadow-xs group relative flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-indigo-800 flex items-center gap-1">
                <Mountain className="w-3 h-3 text-indigo-600" />
                <span>Peak Wealth</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-indigo-600 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900">
                {summary?.peakNetWorthAge ? `Age ${summary.peakNetWorthAge}` : 'Apex'}
              </div>
              <div className="text-[10px] text-indigo-700 font-medium">
                Lifetime Maximum
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 font-mono truncate">
              {summary?.peakNetWorth ? formatCur(summary.peakNetWorth) : 'Peak Assets'}
            </div>
          </button>

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
              <option value="RRSP / RRIF">RRSP / RRIF</option>
              <option value="TFSA">TFSA</option>
              <option value="FHSA">FHSA</option>
              <option value="Home Equity">Home Equity</option>
              <option value="Withdrawals">Withdrawals</option>
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
                      <div key={sIdx} className="flex items-start gap-2 bg-slate-850/60 p-2 rounded-lg border border-slate-800">
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
                        className="text-left text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 transition"
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

      {/* 4. Table Data Container */}
      <div ref={tableContainerRef} className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3 min-w-[190px]">Age / Milestone Phase</th>
              <th className="py-2.5 px-3 text-right">RRSP / RRIF</th>
              <th className="py-2.5 px-3 text-right">TFSA</th>
              <th className="py-2.5 px-3 text-right">FHSA</th>
              <th className="py-2.5 px-3 text-right">Non-Reg</th>
              <th className="py-2.5 px-3 text-right text-orange-800">Home Equity</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-100/50">Total Net Worth</th>
              <th className="py-2.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/50">Inv. Returns</th>
              <th className="py-2.5 px-3 text-right">CPP</th>
              <th className="py-2.5 px-3 text-right">OAS (Net)</th>
              <th className="py-2.5 px-3 text-right">Withdrawals</th>
              <th className="py-2.5 px-3 text-right">Tax Paid</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-900">Spendable Cash</th>
              <th className="py-2.5 px-3 text-right text-slate-500">Living Target</th>
              <th className="py-2.5 px-3 min-w-[260px]">Milestone Schedule Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-400 font-sans text-xs">
                  No simulation years match the current search or filter criteria.
                </td>
              </tr>
            ) : null}

            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={15} />
              </tr>
            )}

            {virtualRows.map((virtualRow) => {
              const row = filteredData[virtualRow.index];
              if (!row) return null;
              const isRetirementMilestone = row.age === retirementAge;
              const isRrifMandatory = row.age === 71 || row.age === 72;
              const hasNotes = row.notes.length > 0;
              const isHighlighted = highlightedAge === row.age;

              return (
                <tr
                  id={`row-age-${row.age}`}
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`hover:bg-slate-50/80 transition-all ${
                    isHighlighted
                      ? 'bg-indigo-100/90 ring-2 ring-indigo-500 z-10'
                      : row.isCrossoverMilestone
                      ? 'bg-emerald-50/60 font-semibold'
                      : row.isCoastFireMilestone
                      ? 'bg-cyan-50/60 font-semibold'
                      : isRetirementMilestone
                      ? 'bg-rose-50/70 font-semibold'
                      : isRrifMandatory
                      ? 'bg-amber-50/50'
                      : row.isRetired
                      ? 'bg-slate-50/30'
                      : 'bg-white'
                  }`}
                >
                  {/* Age & Milestone Phase Badges */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        Age {row.age}
                        {row.isCouple && row.spouseAge !== undefined && (
                          <span className="text-[10px] text-slate-500 font-normal"> (Sp {row.spouseAge})</span>
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
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                          Work
                        </span>
                      )}
                      {row.isRetired && !isRetirementMilestone && (
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Retire
                        </span>
                      )}

                      {/* Milestone Badge 1: Crossover Point (Returns > Expenses) */}
                      {row.isCrossoverMilestone && (
                        <span 
                          title={`Crossover Milestone: Returns ($${Math.round(row.totalInvestmentGrowth).toLocaleString()}/yr) outgrow living expenses ($${Math.round(row.targetSpendingNominal).toLocaleString()}/yr)`}
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs animate-pulse"
                        >
                          <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-500" />
                          <span>Crossover</span>
                        </span>
                      )}

                      {/* Milestone Badge 2: Coast FIRE (Zero-Contribution Viability) */}
                      {row.isCoastFireMilestone && (
                        <span 
                          title="Coast FIRE: Zero further contributions needed to 100% fund retirement living expenses"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 flex items-center gap-1 shadow-2xs"
                        >
                          <Anchor className="w-2.5 h-2.5 text-cyan-600" />
                          <span>Coast FIRE</span>
                        </span>
                      )}

                      {/* Milestone Badge 3: Millionaire */}
                      {row.isMillionaireMilestone && (
                        <span 
                          title="Millionaire Milestone: Total Net Worth surpasses $1,000,000"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1"
                        >
                          <Gem className="w-2.5 h-2.5 text-blue-600" />
                          <span>$1M NW</span>
                        </span>
                      )}

                      {/* Milestone Badge 4: Mortgage Free */}
                      {row.isMortgageFreeMilestone && (
                        <span 
                          title="Mortgage Free: Home loan amortized to $0 balance"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1"
                        >
                          <Home className="w-2.5 h-2.5 text-teal-600" />
                          <span>Debt Free</span>
                        </span>
                      )}

                      {/* Milestone Badge 5: Peak Wealth */}
                      {row.isPeakWealthMilestone && (
                        <span 
                          title="Peak Lifetime Wealth Apex"
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1"
                        >
                          <Mountain className="w-2.5 h-2.5 text-purple-600" />
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
                        className="opacity-40 hover:opacity-100 p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition ml-auto"
                        title={`Ask AI to explain Age ${row.age} calculations`}
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* RRSP/RRIF */}
                  <td 
                    onClick={() => handleCellClick('RRSP / RRIF', row.rrspBalance, row.age)}
                    title={`Click to ask AI how RRSP/RRIF balance (${formatCur(row.rrspBalance)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-blue-700 cursor-pointer hover:bg-blue-50/80 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.rrspBalance)}
                  </td>

                  {/* TFSA */}
                  <td 
                    onClick={() => handleCellClick('TFSA', row.tfsaBalance, row.age)}
                    title={`Click to ask AI how TFSA balance (${formatCur(row.tfsaBalance)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-emerald-700 cursor-pointer hover:bg-emerald-50/80 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.tfsaBalance)}
                  </td>

                  {/* FHSA */}
                  <td 
                    onClick={() => handleCellClick('FHSA', row.fhsaBalance, row.age)}
                    title={`Click to ask AI how FHSA balance (${formatCur(row.fhsaBalance)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-amber-700 cursor-pointer hover:bg-amber-50/80 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.fhsaBalance)}
                  </td>

                  {/* Non-Reg */}
                  <td 
                    onClick={() => handleCellClick('Non-Reg', row.nonRegBalance, row.age)}
                    title={`Click to ask AI how Non-Registered balance (${formatCur(row.nonRegBalance)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-purple-700 cursor-pointer hover:bg-purple-50/80 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.nonRegBalance)}
                  </td>

                  {/* Real Estate Share */}
                  <td 
                    onClick={() => {
                      if (row.realEstateShare > 0) {
                        handleCellClick('Home Equity', row.realEstateShare, row.age);
                      }
                    }}
                    title={row.realEstateShare > 0 ? `Click to ask AI how Home Equity (${formatCur(row.realEstateShare)}) was calculated at Age ${row.age}` : undefined}
                    className={`py-2.5 px-3 text-right text-orange-700 font-medium select-none ${row.realEstateShare > 0 ? 'cursor-pointer hover:bg-orange-50/80 hover:underline transition-colors' : ''}`}
                  >
                    {row.realEstateShare > 0 ? formatCur(row.realEstateShare) : row.homeSoldThisYear ? 'Sold' : '-'}
                  </td>

                  {/* Total Net Worth */}
                  <td 
                    onClick={() => handleCellClick('Total Net Worth', row.totalNetWorth, row.age)}
                    title={`Click to ask AI how Total Net Worth (${formatCur(row.totalNetWorth)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-100/30 cursor-pointer hover:bg-indigo-50/80 hover:text-indigo-700 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.totalNetWorth)}
                  </td>

                  {/* NEW: Investment Returns / Compounding Growth */}
                  <td 
                    onClick={() => handleCellClick('Investment Returns', row.totalInvestmentGrowth, row.age)}
                    title={`Click to ask AI how Investment Returns (${formatCur(row.totalInvestmentGrowth)}) were generated at Age ${row.age}`}
                    className={`py-2.5 px-3 text-right font-bold cursor-pointer transition-colors select-none ${
                      row.totalInvestmentGrowth >= row.targetSpendingNominal && row.targetSpendingNominal > 0
                        ? 'text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/90 underline decoration-emerald-400'
                        : 'text-emerald-600/90 hover:bg-emerald-50/60 hover:underline'
                    }`}
                  >
                    +{formatCur(row.totalInvestmentGrowth)}
                  </td>

                  {/* CPP */}
                  <td 
                    onClick={() => handleCellClick('CPP', row.cppIncome, row.age)}
                    title={`Click to ask AI how CPP pension (${formatCur(row.cppIncome)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-slate-600 cursor-pointer hover:bg-slate-100 hover:text-slate-900 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.cppIncome)}
                  </td>

                  {/* OAS */}
                  <td 
                    onClick={() => handleCellClick('OAS (Net)', row.oasNetIncome, row.age)}
                    title={`Click to ask AI how Net OAS pension (${formatCur(row.oasNetIncome)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-slate-600 cursor-pointer hover:bg-slate-100 hover:text-slate-900 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.oasNetIncome)}
                  </td>

                  {/* Withdrawals */}
                  <td 
                    onClick={() => handleCellClick('Withdrawals', row.totalWithdrawals, row.age)}
                    title={`Click to ask AI how withdrawals (${formatCur(row.totalWithdrawals)}) were calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-slate-700 cursor-pointer hover:bg-slate-100 hover:text-slate-900 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.totalWithdrawals)}
                  </td>

                  {/* Taxes Paid */}
                  <td 
                    onClick={() => handleCellClick('Tax Paid', row.totalTaxPaid, row.age)}
                    title={`Click to ask AI how Canadian tax paid (${formatCur(row.totalTaxPaid)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right text-rose-600 font-medium cursor-pointer hover:bg-rose-50/80 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.totalTaxPaid)}
                  </td>

                  {/* Spendable Cashflow */}
                  <td 
                    onClick={() => handleCellClick('Spendable Cash', row.netSpendableCashflow, row.age)}
                    title={`Click to ask AI how Net Spendable Cashflow (${formatCur(row.netSpendableCashflow)}) was calculated at Age ${row.age}`}
                    className="py-2.5 px-3 text-right font-bold text-slate-900 cursor-pointer hover:bg-indigo-50/80 hover:text-indigo-700 hover:underline transition-colors select-none"
                  >
                    {formatCur(row.netSpendableCashflow)}
                  </td>

                  {/* Living Target (Expenses) */}
                  <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                    {formatCur(row.targetSpendingNominal)}
                  </td>

                  {/* Milestone Notes & Strategy Highlights */}
                  <td className="py-2.5 px-3 font-sans text-[11px] leading-snug">
                    {hasNotes ? (
                      <div className="flex flex-col gap-1">
                        {row.notes.map((note, nIdx) => {
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
                                isCrossover
                                  ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                                  : isCoast
                                  ? 'bg-cyan-50 text-cyan-900 font-semibold border border-cyan-200'
                                  : isMillionaire
                                  ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                                  : isMortgage
                                  ? 'bg-teal-50 text-teal-900 font-semibold border border-teal-200'
                                  : isRetire
                                  ? 'bg-rose-50 text-rose-900 font-semibold border border-rose-200'
                                  : isPeak
                                  ? 'bg-purple-50 text-purple-900 font-semibold border border-purple-200'
                                  : 'text-slate-700 font-medium'
                              }`}
                            >
                              {note}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={15} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
