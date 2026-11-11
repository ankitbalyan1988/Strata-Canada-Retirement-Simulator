import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScenarioSimulationDetails } from '../utils/stressTestHealthCalculator';
import { RetirementInputs, YearSimulationResult } from '../types/retirement';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Table,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Calculator,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  Zap,
  Sparkles,
  HelpCircle,
  Clock,
  Landmark,
  DollarSign,
  Maximize2,
  Minimize2,
  Percent,
  Sliders,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  X,
  Flame,
  Mountain,
  Gem,
  CreditCard,
  Anchor,
  Home,
  FileText,
  Target
} from 'lucide-react';

export interface StressScenarioLedgerProps {
  scenarioDetails: ScenarioSimulationDetails;
  inputs: RetirementInputs;
  stressTiming?: 'at_retirement' | 'immediate' | 'custom';
  customStressAge?: number;
  onChangeStressTiming?: (timing: 'at_retirement' | 'immediate' | 'custom') => void;
  onChangeCustomStressAge?: (age: number) => void;
}

type ColumnCategory = 'all' | 'executive' | 'cashflow' | 'accounts' | 'tax';
type FilterMode = 'milestones' | 'retirement' | 'shock' | 'all';
type TaxRateMode = 'effective' | 'marginal' | 'both';

const StressScenarioLedgerComponent: React.FC<StressScenarioLedgerProps> = (props) => {
  const { scenarioDetails, inputs } = props;
  const {
    scenarioDef,
    scenarioOutcome,
    yearlyResults,
    summary,
    shockAge,
    shockDropPercent,
    terminalNetWorth,
    terminalNetWorthDelta,
    isSolvent,
    depletionAge,
    yearsFunded,
    totalYearsInRetirement,
    totalPensionsReceived,
    totalLivingExpenses,
    totalInvestmentGrowth,
    totalTaxesPaid,
    mathBreakdown
  } = scenarioDetails;

  // Global store fallbacks
  const storeStressTiming = useSimulationStore((state) => state.stressTiming);
  const storeSetStressTiming = useSimulationStore((state) => state.setStressTiming);
  const storeCustomStressAge = useSimulationStore((state) => state.customStressAge);
  const storeSetCustomStressAge = useSimulationStore((state) => state.setCustomStressAge);
  const baselineResults = useSimulationStore(useShallow((state) => state.yearlyResults));

  const stressTiming = props.stressTiming ?? storeStressTiming;
  const customStressAge = props.customStressAge ?? storeCustomStressAge;
  const setStressTiming = props.onChangeStressTiming ?? storeSetStressTiming;
  const setCustomStressAge = props.onChangeCustomStressAge ?? storeSetCustomStressAge;

  // View & Filter states
  const [columnCategory, setColumnCategory] = useState<ColumnCategory>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('milestones');
  const [taxRateMode, setTaxRateMode] = useState<TaxRateMode>('effective');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedAge, setHighlightedAge] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [selectedYearModal, setSelectedYearModal] = useState<YearSimulationResult | null>(null);
  const [modalTab, setModalTab] = useState<'balance' | 'cashflow' | 'tax' | 'notes'>('balance');

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Close full screen on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedYearModal) {
          setSelectedYearModal(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, selectedYearModal]);

  const formatCur = (val: number) => {
    if (val === 0) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Scroll to age and highlight row
  const scrollToAge = (age: number) => {
    setHighlightedAge(age);
    if (filterMode === 'retirement' && age < inputs.retirementAge) {
      setFilterMode('all');
    }
    setTimeout(() => {
      const el = document.getElementById(`stress-row-age-${age}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    setTimeout(() => {
      setHighlightedAge(null);
    }, 3500);
  };

  // Filtered dataset
  const filteredRows = useMemo(() => {
    return yearlyResults.filter((yr) => {
      // Search
      if (searchTerm) {
        const matchAge = String(yr.age).includes(searchTerm);
        const matchYear = String(yr.year).includes(searchTerm);
        const matchNotes = yr.notes.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchBadges = yr.milestoneBadges?.some((b) =>
          b.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!matchAge && !matchYear && !matchNotes && !matchBadges) return false;
      }

      if (filterMode === 'retirement') {
        return yr.isRetired;
      }

      if (filterMode === 'shock') {
        // Window from shock age minus 2 to shock age plus 6, or through depletion
        const startAge = Math.max(inputs.currentAge, shockAge - 2);
        const endAge = depletionAge ? Math.min(inputs.lifeExpectancy, depletionAge + 2) : shockAge + 6;
        return yr.age >= startAge && yr.age <= endAge;
      }

      if (filterMode === 'milestones') {
        return (
          yr.age === yearlyResults[0]?.age ||
          yr.age === inputs.retirementAge ||
          yr.age === shockAge ||
          (depletionAge !== null && yr.age === depletionAge) ||
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
          yr.age === yearlyResults[yearlyResults.length - 1]?.age ||
          yr.homeSoldThisYear ||
          yr.notes.length > 0 ||
          (yr.milestoneBadges && yr.milestoneBadges.length > 0)
        );
      }

      return true; // 'all'
    });
  }, [yearlyResults, filterMode, searchTerm, shockAge, depletionAge, inputs, summary]);

  // Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const { exportMilestoneTableToExcel } = await import('../utils/excelExport');
      await exportMilestoneTableToExcel({
        data: filteredRows,
        filterMode: filterMode === 'shock' ? 'milestones' : filterMode,
        retirementAge: inputs.retirementAge,
        province: inputs.province,
        inputs
      });
    } catch (err) {
      console.error('Failed to export Excel spreadsheet:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Age',
      'Year',
      'Stage',
      'Shock Event',
      'Total Net Worth',
      'Net Worth Baseline Delta',
      'Annual Investment Growth',
      'RRSP / RRIF Balance',
      'TFSA Balance',
      'FHSA Balance',
      'Non-Reg Balance',
      'Real Estate Equity',
      'Living Spending Target',
      'CPP Pension',
      'OAS Pension (Net)',
      'Total Drawdowns',
      'Total Tax Paid',
      'Effective Tax Rate %',
      'Marginal Tax Bracket %',
      'Solvency Status',
      'Audit Trace Notes'
    ];

    const rows = filteredRows.map((yr) => {
      const isShock = shockDropPercent > 0 && yr.age === shockAge;
      const baselineRow = baselineResults.find((b) => b.age === yr.age);
      const nwDelta = baselineRow ? Math.round(yr.totalNetWorth - baselineRow.totalNetWorth) : 0;

      return [
        yr.age,
        yr.year,
        yr.isRetired ? 'Retirement' : 'Accumulation',
        isShock ? `Shock -${shockDropPercent}%` : 'Normal',
        Math.round(yr.totalNetWorth),
        nwDelta,
        Math.round(yr.totalInvestmentGrowth),
        Math.round(yr.rrspBalance + yr.rrifBalance),
        Math.round(yr.tfsaBalance),
        Math.round(yr.fhsaBalance),
        Math.round(yr.nonRegBalance),
        Math.round(yr.homeEquity),
        Math.round(yr.targetSpendingNominal),
        Math.round(yr.cppIncome),
        Math.round(yr.oasNetIncome),
        Math.round(yr.totalWithdrawals),
        Math.round(yr.totalTaxPaid),
        yr.effectiveTaxRate.toFixed(1) + '%',
        yr.marginalTaxRate.toFixed(1) + '%',
        yr.totalNetWorth > 0 ? 'Solvent' : 'Exhausted',
        `"${yr.notes.join('; ').replace(/"/g, '""')}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stress_test_${scenarioDef.id}_age${shockAge}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={
      isFullscreen
        ? "fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col p-3 sm:p-5 shadow-2xl overflow-hidden transition duration-200"
        : "flex flex-col gap-4 transition duration-200"
    }>
      {/* 1. Cash Flow & Actuarial Reconciliation Top Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{scenarioDef.name} — Simulation Ledger</span>
                  {isFullscreen && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Full Screen View
                    </span>
                  )}
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  isSolvent
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                }`}>
                  {isSolvent ? '100% Solvent' : depletionAge ? `Depleted @ Age ${depletionAge}` : 'Under-Funded'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Shock @ Age {shockAge} ({shockDropPercent > 0 ? `-${shockDropPercent}%` : '+Longevity'})
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full annual audit of compounding balances, registered accounts, decumulation sequencing, CRA taxes, and living expense shortfalls.
              </p>
            </div>
          </div>

          {/* Export & Fullscreen Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 transition cursor-pointer"
              title="Download stress test ledger as Excel (.xlsx) file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Download full scenario calculation ledger as CSV"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isFullscreen
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Maximize Table to Full Screen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                  <span className="text-[9.5px] px-1 py-0.2 rounded bg-black/20 text-white font-mono hidden md:inline">Esc</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Maximize</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mathematical Cash Flow Bridge Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Portfolio @ Retire
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatCur(summary.netWorthAtRetirement)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Age {inputs.retirementAge} starting wealth
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Scenario Shock
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                {shockDropPercent > 0 ? `-${shockDropPercent}%` : '+Years'}
              </span>
            </div>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 truncate">
              {shockDropPercent > 0 ? `Shock @ Age ${shockAge}` : `Longevity to 95+`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Net Growth
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatCur(totalInvestmentGrowth)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Stressed compounding
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              CPP & OAS Received
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                +{formatCur(totalPensionsReceived)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Guaranteed floor
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Living Spend & Tax
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                -{formatCur(totalLivingExpenses + totalTaxesPaid)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {formatCur(totalLivingExpenses)} spend + {formatCur(totalTaxesPaid)} tax
            </span>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            isSolvent
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isSolvent ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              Terminal Net Worth
            </span>
            <div className="my-1">
              <span className={`text-sm sm:text-base font-extrabold tabular-nums ${
                isSolvent ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}>
                {formatCur(terminalNetWorth)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
              {yearsFunded} / {totalYearsInRetirement} Yrs Funded
            </span>
          </div>
        </div>

        {/* Dynamic Milestone Jump Cards Ribbon */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Key Actuarial Milestones & Shock Timeline</span>
            </span>
            <span className="text-[10px] text-slate-400">Click any card to jump to that year</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {/* Milestone 1: Scenario Shock */}
            <button
              type="button"
              onClick={() => scrollToAge(shockAge)}
              className="text-left p-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 text-rose-950 dark:text-rose-300 transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Shock Event</span>
                </span>
                <ArrowUpRight className="w-3 h-3 text-rose-600 dark:text-rose-400 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  Age {shockAge}
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                  {shockDropPercent > 0 ? `-${shockDropPercent}% Shock` : 'Extended Horizon'}
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                {stressTiming === 'at_retirement' ? 'Retirement Onset' : stressTiming === 'immediate' ? 'Immediate Shock' : 'Custom Age Shock'}
              </div>
            </button>

            {/* Milestone 2: Retirement Target */}
            <button
              type="button"
              onClick={() => scrollToAge(inputs.retirementAge)}
              className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Target className="w-3 h-3 text-amber-500" />
                  <span>Retirement Day</span>
                </span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  Age {inputs.retirementAge}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Decumulation Starts
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                {formatCur(summary.netWorthAtRetirement)}
              </div>
            </button>

            {/* Milestone 3: Solvency / Depletion */}
            <button
              type="button"
              onClick={() => depletionAge ? scrollToAge(depletionAge) : scrollToAge(inputs.lifeExpectancy)}
              className={`text-left p-2.5 rounded-xl border transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer ${
                isSolvent
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-950 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold flex items-center gap-1">
                  {isSolvent ? <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                  <span>{isSolvent ? '100% Solvent' : 'Depletion'}</span>
                </span>
                <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  {depletionAge ? `Age ${depletionAge}` : `Age ${inputs.lifeExpectancy}+`}
                </div>
                <div className="text-[10px] font-medium">
                  {isSolvent ? 'Funded to Life Exp' : 'Capital Exhausted'}
                </div>
              </div>
              <div className="text-[9.5px] font-mono truncate">
                {isSolvent ? `${formatCur(terminalNetWorth)} surplus` : `${yearsFunded} yrs funded`}
              </div>
            </button>

            {/* Milestone 4: Crossover Point */}
            {summary?.crossoverAge && (
              <button
                type="button"
                onClick={() => scrollToAge(summary.crossoverAge!)}
                className="text-left p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Crossover</span>
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition" />
                </div>
                <div className="my-1">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                    Age {summary.crossoverAge}
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Growth &gt; Living Spend
                  </div>
                </div>
                <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                  {formatCur(summary.crossoverInvestmentGrowth)}/yr
                </div>
              </button>
            )}

            {/* Milestone 5: Peak Lifetime Wealth */}
            {summary?.peakNetWorthAge && (
              <button
                type="button"
                onClick={() => scrollToAge(summary.peakNetWorthAge!)}
                className="text-left p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 text-indigo-950 dark:text-indigo-300 transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer"
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
                    Age {summary.peakNetWorthAge}
                  </div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                    Lifetime Apex
                  </div>
                </div>
                <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                  {formatCur(summary.peakNetWorth)}
                </div>
              </button>
            )}

            {/* Milestone 6: CPP & OAS Pension Start */}
            <button
              type="button"
              onClick={() => scrollToAge(65)}
              className="text-left p-2.5 rounded-xl border border-sky-200 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100/80 dark:hover:bg-sky-500/20 text-sky-950 dark:text-sky-300 transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold text-sky-800 dark:text-sky-400 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>CPP & OAS</span>
                </span>
                <ArrowUpRight className="w-3 h-3 text-sky-600 dark:text-sky-400 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  Age 65
                </div>
                <div className="text-[10px] text-sky-700 dark:text-sky-400 font-medium">
                  Guaranteed Floor
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                Govt Pensions
              </div>
            </button>

            {/* Milestone 7: Mandatory CRA RRIF Conversion */}
            <button
              type="button"
              onClick={() => scrollToAge(72)}
              className="text-left p-2.5 rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100/80 dark:hover:bg-purple-500/20 text-purple-950 dark:text-purple-300 transition shadow-2xs hover:shadow-xs group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10.5px] font-bold text-purple-800 dark:text-purple-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>RRIF Mandate</span>
                </span>
                <ArrowUpRight className="w-3 h-3 text-purple-600 dark:text-purple-400 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="my-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  Age 72
                </div>
                <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
                  Mandatory Minimums
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
                CRA Form T4RIF
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Ledger Table & Toolbars */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Controls Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Column Category View Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold overflow-x-auto">
            <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 hidden xl:inline">Views:</span>
            <button
              type="button"
              onClick={() => setColumnCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                columnCategory === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Columns
            </button>
            <button
              type="button"
              onClick={() => setColumnCategory('executive')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                columnCategory === 'executive'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Executive
            </button>
            <button
              type="button"
              onClick={() => setColumnCategory('cashflow')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                columnCategory === 'cashflow'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cash Flow
            </button>
            <button
              type="button"
              onClick={() => setColumnCategory('accounts')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                columnCategory === 'accounts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Accounts
            </button>
            <button
              type="button"
              onClick={() => setColumnCategory('tax')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                columnCategory === 'tax'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              CRA Taxes
            </button>
          </div>

          {/* Tax Rate Toggle, Search, and Row Filter Mode */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Tax Rate Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-semibold">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1.5 hidden sm:inline flex items-center gap-1">
                <Percent className="w-3 h-3 text-amber-500" />
                <span>Tax:</span>
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
                title="Show Marginal Tax Bracket %"
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
                title="Show both Effective and Marginal rates side-by-side"
              >
                Both
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search age, note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-200 w-28 sm:w-36"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('milestones')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'milestones'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Milestones ({filteredRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('retirement')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'retirement'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Retirement
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('shock')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'shock'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Shock Window
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Years ({yearlyResults.length})
              </button>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div ref={tableContainerRef} className="overflow-x-auto max-h-[580px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/90 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider select-none shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 min-w-[140px]">Age / Phase</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800/60 min-w-[120px]">
                  Total Net Worth
                </th>
                <th className="py-2.5 px-3 text-right min-w-[105px]">
                  Baseline Delta
                </th>
                <th className="py-2.5 px-3 text-right min-w-[105px]">
                  Inv Growth
                </th>

                {(columnCategory === 'all' || columnCategory === 'accounts') && (
                  <>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">RRSP / RRIF</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">TFSA</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">FHSA</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">Non-Reg</th>
                    <th className="py-2.5 px-3 text-right text-orange-600 dark:text-orange-400 min-w-[100px]">Home Equity</th>
                  </>
                )}

                {(columnCategory === 'all' || columnCategory === 'cashflow' || columnCategory === 'executive') && (
                  <>
                    <th className="py-2.5 px-3 text-right min-w-[105px]">Living Spend</th>
                    <th className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400 min-w-[95px]">CPP & OAS</th>
                    <th className="py-2.5 px-3 text-right min-w-[105px]">Total Drawdown</th>
                  </>
                )}

                {(columnCategory === 'all' || columnCategory === 'tax') && (
                  <>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">Tax Paid</th>
                    {taxRateMode === 'effective' && (
                      <th className="py-2.5 px-3 text-right min-w-[85px]">Eff Tax %</th>
                    )}
                    {taxRateMode === 'marginal' && (
                      <th className="py-2.5 px-3 text-right min-w-[85px]">Marg Tax %</th>
                    )}
                    {taxRateMode === 'both' && (
                      <>
                        <th className="py-2.5 px-3 text-right min-w-[80px]">Eff %</th>
                        <th className="py-2.5 px-3 text-right min-w-[80px]">Marg %</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-right min-w-[90px]">OAS Clawback</th>
                  </>
                )}

                <th className="py-2.5 px-3 text-center min-w-[105px]">Solvency Status</th>
                <th className="py-2.5 px-3 min-w-[220px]">Actuarial Notes & Audit</th>
                <th className="py-2.5 px-3 text-center min-w-[70px]">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400 dark:text-slate-500 font-sans text-xs">
                    No simulation years match the current search or filter criteria.
                  </td>
                </tr>
              ) : null}

              {filteredRows.map((row) => {
                const isShockYear = (shockDropPercent > 0 && row.age === shockAge);
                const isRecoveryYear = (shockDropPercent > 0 && row.age > shockAge && row.age <= shockAge + 4);
                const recoveryStep = row.age - shockAge;
                const isDepletedYear = (depletionAge !== null && row.age === depletionAge);
                const isRetireTarget = (row.age === inputs.retirementAge);
                const isExhausted = row.totalNetWorth <= 0 && row.isRetired;
                const isHighlighted = highlightedAge === row.age;

                // Baseline comparison delta
                const baselineRow = baselineResults.find((b) => b.age === row.age);
                const baselineNW = baselineRow ? baselineRow.totalNetWorth : row.totalNetWorth;
                const nwDelta = row.totalNetWorth - baselineNW;

                // Row background styling
                let rowBg = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';
                if (isHighlighted) {
                  rowBg = 'bg-amber-100/90 dark:bg-amber-950/60 ring-2 ring-amber-400';
                } else if (isShockYear) {
                  rowBg = 'bg-rose-50/90 dark:bg-rose-950/40 border-y-2 border-rose-500/70 hover:bg-rose-100/80 dark:hover:bg-rose-950/60';
                } else if (isDepletedYear || isExhausted) {
                  rowBg = 'bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100/60';
                } else if (isRetireTarget) {
                  rowBg = 'bg-amber-50/50 dark:bg-amber-950/20 border-y border-amber-300 dark:border-amber-700/60';
                } else if (isRecoveryYear) {
                  rowBg = 'bg-orange-50/30 dark:bg-orange-950/15';
                }

                return (
                  <tr
                    key={row.age}
                    id={`stress-row-age-${row.age}`}
                    onClick={() => setSelectedYearModal(row)}
                    className={`cursor-pointer group ${rowBg}`}
                  >
                    {/* Age / Phase */}
                    <td className="py-2 px-3 font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Age {row.age}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({row.year})
                        </span>

                        {isShockYear && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                            💥 Shock -{shockDropPercent}%
                          </span>
                        )}

                        {isRecoveryYear && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                            Recov Yr {recoveryStep}
                          </span>
                        )}

                        {isRetireTarget && !isShockYear && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-amber-500 text-white">
                            Retire Day
                          </span>
                        )}

                        {isDepletedYear && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse">
                            Depleted
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Net Worth */}
                    <td className={`py-2 px-3 text-right font-bold tabular-nums ${
                      isExhausted
                        ? 'text-red-600 dark:text-red-400'
                        : isShockYear
                        ? 'text-rose-700 dark:text-rose-300 font-extrabold'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {formatCur(row.totalNetWorth)}
                    </td>

                    {/* Baseline Delta */}
                    <td className={`py-2 px-3 text-right tabular-nums text-[10.5px] ${
                      nwDelta < -100
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : nwDelta > 100
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {nwDelta === 0 ? '-' : `${nwDelta > 0 ? '+' : ''}${formatCur(nwDelta)}`}
                    </td>

                    {/* Investment Growth */}
                    <td className={`py-2 px-3 text-right tabular-nums ${
                      row.totalInvestmentGrowth < 0
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : row.totalInvestmentGrowth > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400'
                    }`}>
                      {row.totalInvestmentGrowth === 0 ? '-' : `${row.totalInvestmentGrowth > 0 ? '+' : ''}${formatCur(row.totalInvestmentGrowth)}`}
                    </td>

                    {/* Account Balances (if active view) */}
                    {(columnCategory === 'all' || columnCategory === 'accounts') && (
                      <>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatCur(row.rrspBalance + row.rrifBalance)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCur(row.tfsaBalance)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-teal-700 dark:text-teal-400">
                          {formatCur(row.fhsaBalance)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {formatCur(row.nonRegBalance)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-orange-600 dark:text-orange-400">
                          {formatCur(row.homeEquity)}
                        </td>
                      </>
                    )}

                    {/* Cash Flow (if active view) */}
                    {(columnCategory === 'all' || columnCategory === 'cashflow' || columnCategory === 'executive') && (
                      <>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200">
                          {formatCur(row.targetSpendingNominal)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-indigo-700 dark:text-indigo-400">
                          {formatCur(row.cppIncome + row.oasNetIncome)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                          {formatCur(row.totalWithdrawals)}
                        </td>
                      </>
                    )}

                    {/* Taxes (if active view) */}
                    {(columnCategory === 'all' || columnCategory === 'tax') && (
                      <>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {formatCur(row.totalTaxPaid)}
                        </td>
                        {taxRateMode === 'effective' && (
                          <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {row.effectiveTaxRate.toFixed(1)}%
                          </td>
                        )}
                        {taxRateMode === 'marginal' && (
                          <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {row.marginalTaxRate.toFixed(1)}%
                          </td>
                        )}
                        {taxRateMode === 'both' && (
                          <>
                            <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                              {row.effectiveTaxRate.toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                              {row.marginalTaxRate.toFixed(1)}%
                            </td>
                          </>
                        )}
                        <td className={`py-2 px-3 text-right tabular-nums ${row.oasClawback > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                          {row.oasClawback > 0 ? formatCur(row.oasClawback) : '-'}
                        </td>
                      </>
                    )}

                    {/* Solvency Status */}
                    <td className="py-2 px-3 text-center font-sans">
                      {row.totalNetWorth > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Solvent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Shortfall</span>
                        </span>
                      )}
                    </td>

                    {/* Actuarial Notes */}
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-sans text-[11px] truncate max-w-[280px]">
                      {isShockYear ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          💥 {scenarioDef.name} shock executed (-{shockDropPercent}% portfolio drop)
                        </span>
                      ) : row.notes.length > 0 ? (
                        <span>{row.notes[0]}</span>
                      ) : (
                        <span className="text-slate-400">Normal decumulation & compounding</span>
                      )}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedYearModal(row);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                        title={`Inspect Age ${row.age} mathematical formulas and account breakdown`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">Simulation Summary:</span>
            <span>Years Modeled: <strong className="text-slate-900 dark:text-white">{yearlyResults.length}</strong></span>
            <span>•</span>
            <span>Retirement Span: <strong className="text-slate-900 dark:text-white">{totalYearsInRetirement} Yrs</strong></span>
            <span>•</span>
            <span>Shock Onset: <strong className="text-rose-600 dark:text-rose-400">Age {shockAge} ({shockDropPercent > 0 ? `-${shockDropPercent}%` : '+Longevity'})</strong></span>
            <span>•</span>
            <span>Solvency: <strong className={isSolvent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {isSolvent ? '100% Funded' : `${yearsFunded} of ${totalYearsInRetirement} Years`}
            </strong></span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Click any row to open the detailed actuarial accounting inspector</span>
          </div>
        </div>
      </div>

      {/* 3. Year Detail Inspector Modal */}
      {selectedYearModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedYearModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Age {selectedYearModal.age} Audit Breakdown — Year {selectedYearModal.year}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedYearModal.isRetired
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {selectedYearModal.isRetired ? 'Retirement Phase' : 'Accumulation Phase'}
                    </span>
                    {selectedYearModal.age === shockAge && shockDropPercent > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                        💥 Stress Shock Year (-{shockDropPercent}%)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Detailed mathematical calculation trace for account compounding, living withdrawals, and statutory CRA taxes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedYearModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Net Worth</span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatCur(selectedYearModal.totalNetWorth)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Living Spending Target</span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatCur(selectedYearModal.targetSpendingNominal)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Growth / Loss</span>
                <div className={`text-base font-extrabold tabular-nums mt-0.5 ${
                  selectedYearModal.totalInvestmentGrowth < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {selectedYearModal.totalInvestmentGrowth >= 0 ? '+' : ''}{formatCur(selectedYearModal.totalInvestmentGrowth)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Taxes Paid</span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatCur(selectedYearModal.totalTaxPaid)}
                </div>
              </div>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('balance')}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  modalTab === 'balance'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Assets & Balance Sheet
              </button>
              <button
                type="button"
                onClick={() => setModalTab('cashflow')}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  modalTab === 'cashflow'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cash Flow & Drawdowns
              </button>
              <button
                type="button"
                onClick={() => setModalTab('tax')}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  modalTab === 'tax'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                CRA Taxes & Brackets
              </button>
              <button
                type="button"
                onClick={() => setModalTab('notes')}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  modalTab === 'notes'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Audit Trace ({selectedYearModal.notes.length})
              </button>
            </div>

            {/* Tab 1: Balance Sheet */}
            {modalTab === 'balance' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-100">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">RRSP / RRIF Balance:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{formatCur(selectedYearModal.rrspBalance + selectedYearModal.rrifBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">TFSA Balance (Tax-Free):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCur(selectedYearModal.tfsaBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">FHSA Balance:</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">{formatCur(selectedYearModal.fhsaBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Non-Registered Accounts:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{formatCur(selectedYearModal.nonRegBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Real Estate Equity:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400 font-mono">{formatCur(selectedYearModal.homeEquity)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 pt-1 font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Total Stressed Net Worth:</span>
                    <span className="text-slate-900 dark:text-white font-mono">{formatCur(selectedYearModal.totalNetWorth)}</span>
                  </div>
                </div>

                {/* Baseline Comparison Callout */}
                {(() => {
                  const bRow = baselineResults.find((b) => b.age === selectedYearModal.age);
                  const bNw = bRow ? bRow.totalNetWorth : selectedYearModal.totalNetWorth;
                  const delta = selectedYearModal.totalNetWorth - bNw;
                  return (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-amber-950 dark:text-amber-200 block">Baseline vs Stressed Comparison:</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Without stress shock, baseline wealth would be {formatCur(bNw)}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${delta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {delta < 0 ? '-' : '+'}{formatCur(Math.abs(delta))}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab 2: Cash Flow & Drawdowns */}
            {modalTab === 'cashflow' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-100">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Target Living Spending:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{formatCur(selectedYearModal.targetSpendingNominal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">CPP Guaranteed Pension:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">+{formatCur(selectedYearModal.cppIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">OAS Pension (Net of clawback):</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">+{formatCur(selectedYearModal.oasNetIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Non-Reg Drawdowns:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{formatCur(selectedYearModal.nonRegWithdrawal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">RRSP / RRIF Withdrawals:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{formatCur(selectedYearModal.rrspWithdrawal + selectedYearModal.rrifWithdrawal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">TFSA Tax-Free Drawdowns:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCur(selectedYearModal.tfsaWithdrawal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 pt-1 font-bold">
                    <span className="text-slate-900 dark:text-white">Cashflow Gap / Solvency Shortfall:</span>
                    <span className={`font-mono ${selectedYearModal.cashflowGap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {selectedYearModal.cashflowGap > 0 ? `-${formatCur(selectedYearModal.cashflowGap)} Shortfall` : '$0 (Fully Funded)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: CRA Taxes */}
            {modalTab === 'tax' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-100">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Gross Taxable Income:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{formatCur(selectedYearModal.taxableIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Total Statutory Tax Liability:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{formatCur(selectedYearModal.totalTaxPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Effective Tax Rate:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{selectedYearModal.effectiveTaxRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-400">Marginal Tax Bracket:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedYearModal.marginalTaxRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1 pt-1">
                    <span className="text-slate-600 dark:text-slate-400">OAS Clawback (Line 23500):</span>
                    <span className={`font-mono font-bold ${selectedYearModal.oasClawback > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {selectedYearModal.oasClawback > 0 ? formatCur(selectedYearModal.oasClawback) : '$0 (Protected)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Audit Notes */}
            {modalTab === 'notes' && (
              <div className="space-y-2 text-xs animate-in fade-in duration-100 max-h-[300px] overflow-y-auto">
                {selectedYearModal.notes.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    No special tax or withdrawal adjustments recorded for this baseline year.
                  </div>
                ) : (
                  selectedYearModal.notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed"
                    >
                      {note}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const StressScenarioLedger = React.memo(StressScenarioLedgerComponent);
export default StressScenarioLedger;
