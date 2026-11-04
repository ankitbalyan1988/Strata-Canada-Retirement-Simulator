import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { YearSimulationResult, RetirementInputs, SimulationSummary } from '../types/retirement';
import { ExpatInputs, ExpatSimulationSummary, ExpatYearResult } from '../types/expat';
import { 
  Table, 
  Search, 
  FileSpreadsheet, 
  Plane, 
  Zap, 
  Anchor, 
  Mountain, 
  Target, 
  Landmark, 
  Coins, 
  ArrowUpRight, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Globe,
  Home,
  Maximize2,
  Minimize2,
  Loader2,
  X
} from 'lucide-react';

export interface ExpatMilestoneLedgerProps {
  expatResult: ExpatSimulationSummary;
  retirementInputs: RetirementInputs;
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  expatInputs: ExpatInputs;
}

export const ExpatMilestoneLedger: React.FC<ExpatMilestoneLedgerProps> = ({
  expatResult,
  retirementInputs,
  yearlyResults,
  summary,
  expatInputs
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'milestones' | 'expat' | 'retirement'>('milestones');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedAge, setHighlightedAge] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  const {
    departureAge,
    departureYear,
    destinationCountry,
    qualifiesForLifetimeWorldwideOAS,
    departureTaxEstimateCAD,
    yearlyExpatResults
  } = expatResult;

  const currentAge = retirementInputs.currentAge;
  const retirementAge = retirementInputs.retirementAge;
  const exchangeRate = expatInputs.customExchangeRate || destinationCountry.exchangeRateToCAD;
  const colIndex = expatInputs.customCostOfLivingFactor || destinationCountry.costOfLivingIndex;
  const currencySymbol = destinationCountry.currencySymbol;
  const currencyCode = destinationCountry.currencyCode;

  // Format currency helpers
  const formatCad = (val: number) => {
    if (val === 0) return '-';
    return `C$${Math.round(val).toLocaleString()}`;
  };

  const formatLocal = (val: number) => {
    if (val === 0) return '-';
    return `${currencySymbol}${Math.round(val).toLocaleString()}`;
  };

  // Combine Canadian yearlyResults with Expat simulation results
  interface MergedExpatLedgerRow {
    age: number;
    year: number;
    isNonResident: boolean;
    isRetired: boolean;
    // Canadian Portfolios (CAD)
    rrspBalance: number;
    tfsaBalance: number;
    fhsaBalance: number;
    nonRegBalance: number;
    homeEquity: number;
    totalNetWorth: number;
    investmentGrowth: number;
    // Income & Cashflows
    cppIncomeCAD: number;
    oasNetIncomeCAD: number;
    totalWithdrawalsCAD: number;
    totalTaxPaidCAD: number;
    craPartXIIICAD: number;
    destinationLocalTaxCAD: number;
    departureTaxCAD: number;
    // Spendable Cash & Living Target
    spendableCashCAD: number;
    spendableCashLocal: number;
    livingTargetCAD: number;
    livingTargetLocal: number;
    // Milestones & Notes
    notes: string[];
    isCrossover: boolean;
    isCoastFire: boolean;
    isRetirement: boolean;
    isDeparture: boolean;
    isOasAge: boolean;
    isRrifAge: boolean;
  }

  const mergedRows = useMemo<MergedExpatLedgerRow[]>(() => {
    return yearlyResults.map((yr, idx) => {
      const expatYr: ExpatYearResult | undefined = yearlyExpatResults?.[idx];
      const isNonResident = yr.age >= departureAge;
      const isRetired = yr.age >= retirementAge;
      const isDeparture = yr.age === departureAge;
      const isRetirement = yr.age === retirementAge;
      const isOasAge = yr.age === 65;
      const isRrifAge = yr.age === 71;

      // Spendable Cash
      const spendableCashCAD = isNonResident && expatYr
        ? expatYr.expatNetIncomeCAD
        : yr.netSpendableCashflow;

      const spendableCashLocal = isNonResident && expatYr
        ? expatYr.expatNetIncomeLocalCurrency
        : spendableCashCAD * exchangeRate;

      // Living Target
      const livingTargetCAD = yr.targetSpendingNominal;
      // In destination country, living target is converted at local cost of living
      const livingTargetLocal = isNonResident
        ? (livingTargetCAD * colIndex * exchangeRate)
        : (livingTargetCAD * exchangeRate);

      // Taxes
      const craPartXIIICAD = isNonResident && expatYr
        ? expatYr.craPartXIIIWithholdingCAD
        : 0;

      const destinationLocalTaxCAD = isNonResident && expatYr
        ? expatYr.destinationLocalTaxCAD
        : 0;

      const departureTaxCAD = isDeparture && expatYr
        ? expatYr.departureTaxCAD
        : 0;

      const totalTaxPaidCAD = isNonResident
        ? craPartXIIICAD + destinationLocalTaxCAD + departureTaxCAD
        : yr.totalTaxPaid;

      // CPP & OAS
      const cppIncomeCAD = isNonResident && expatYr
        ? expatYr.cppReceivedCAD
        : yr.cppIncome;

      const oasNetIncomeCAD = isNonResident && expatYr
        ? expatYr.oasReceivedCAD
        : yr.oasNetIncome;

      // Build rich notes
      const rowNotes: string[] = [];

      if (isDeparture) {
        rowNotes.push(
          `✈️ Emigrated to ${destinationCountry.name} (Age ${departureAge}). Ceased Canadian tax residency. Spendable cash converted to ${currencyCode} (${currencySymbol}). CRA Part XIII withholding applied at ${destinationCountry.treatyRates.rrspPeriodicWithholding}% on RRSP/RRIF and ${destinationCountry.treatyRates.cppWithholding}% on CPP.`
        );
        if (departureTaxCAD > 0) {
          rowNotes.push(
            `⚠️ CRA Section 128.1 Departure Tax: C$${departureTaxCAD.toLocaleString()} assessed on non-registered taxable capital gains at exit.`
          );
        }
      }

      if (isRetirement && !isDeparture) {
        rowNotes.push(
          `🎯 Retirement Day: Transitioned into decumulation. Starting nest egg: C$${Math.round(yr.totalNetWorth).toLocaleString()}.`
        );
      }

      if (isOasAge) {
        if (qualifiesForLifetimeWorldwideOAS) {
          rowNotes.push(
            `🇨🇦 OAS 20-Year Rule Passed: Indefinite worldwide monthly pension confirmed with Service Canada (${expatInputs.yearsLivedInCanadaAfter18} adult Canadian years).`
          );
        } else {
          rowNotes.push(
            `⚠️ OAS 20-Year Rule Warning: OAS pension payments terminate 6 months after departure (< 20 years adult Canadian residence).`
          );
        }
      }

      if (isRrifAge) {
        rowNotes.push(
          `👴 Age 71 RRIF Mandatory Conversion: RRSP balances convert to RRIF with CRA non-resident treaty withholding (${destinationCountry.treatyRates.rrspPeriodicWithholding}%).`
        );
      }

      if (yr.homeSoldThisYear) {
        rowNotes.push(
          `🏡 Canadian Real Estate Disposed: C$${Math.round(yr.homeSaleProceeds).toLocaleString()} deposited into taxable investments (100% PRE Tax-Free).`
        );
      }

      // Add baseline notes if any
      yr.notes.forEach((n) => {
        if (!rowNotes.some((rn) => rn.includes(n.slice(0, 20)))) {
          rowNotes.push(n);
        }
      });

      return {
        age: yr.age,
        year: yr.year,
        isNonResident,
        isRetired,
        rrspBalance: yr.rrspBalance,
        tfsaBalance: yr.tfsaBalance,
        fhsaBalance: yr.fhsaBalance,
        nonRegBalance: yr.nonRegBalance,
        homeEquity: yr.realEstateShare || yr.homeEquity,
        totalNetWorth: yr.totalNetWorth,
        investmentGrowth: yr.totalInvestmentGrowth,
        cppIncomeCAD,
        oasNetIncomeCAD,
        totalWithdrawalsCAD: yr.totalWithdrawals,
        totalTaxPaidCAD,
        craPartXIIICAD,
        destinationLocalTaxCAD,
        departureTaxCAD,
        spendableCashCAD,
        spendableCashLocal,
        livingTargetCAD,
        livingTargetLocal,
        notes: rowNotes,
        isCrossover: Boolean(yr.isCrossoverMilestone),
        isCoastFire: Boolean(yr.isCoastFireMilestone),
        isRetirement,
        isDeparture,
        isOasAge,
        isRrifAge
      };
    });
  }, [
    yearlyResults,
    yearlyExpatResults,
    departureAge,
    retirementAge,
    exchangeRate,
    colIndex,
    destinationCountry,
    qualifiesForLifetimeWorldwideOAS,
    expatInputs.yearsLivedInCanadaAfter18,
    currencyCode,
    currencySymbol
  ]);

  // Filtered Data based on user selection and search
  const filteredData = useMemo(() => {
    return mergedRows.filter((row) => {
      // Search query
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchAge = String(row.age).includes(query);
        const matchYear = String(row.year).includes(query);
        const matchNotes = row.notes.some((n) => n.toLowerCase().includes(query));
        if (!matchAge && !matchYear && !matchNotes) return false;
      }

      if (filterMode === 'expat') {
        return row.isNonResident;
      }

      if (filterMode === 'retirement') {
        return row.isRetired;
      }

      if (filterMode === 'milestones') {
        return (
          row.age === currentAge ||
          row.isDeparture ||
          row.isRetirement ||
          row.isCrossover ||
          row.isCoastFire ||
          row.isOasAge ||
          row.isRrifAge ||
          row.age === summary?.millionaireAge ||
          row.age === summary?.peakNetWorthAge ||
          row.age === 60 ||
          row.age === 65 ||
          row.age === 70 ||
          row.age === 75 ||
          row.age === 80 ||
          row.age === 85 ||
          row.age === mergedRows[mergedRows.length - 1]?.age ||
          row.notes.length > 0
        );
      }

      return true; // 'all'
    });
  }, [mergedRows, searchTerm, filterMode, currentAge, summary]);

  // Virtualizer for smooth scrolling performance
  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 8
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
    }
    setTimeout(() => {
      setHighlightedAge(null);
    }, 3500);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const { exportExpatLedgerToExcel } = await import('../utils/excelExport');
      await exportExpatLedgerToExcel({
        data: filteredData,
        filterMode,
        departureAge,
        departureYear,
        destinationCountry,
        exchangeRate,
        colIndex,
        qualifiesForLifetimeWorldwideOAS,
        departureTaxEstimateCAD,
        retirementAge,
        province: retirementInputs.province,
        inputs: retirementInputs,
        expatInputs
      });
    } catch (err) {
      console.error('Failed to export Expat Milestone Ledger to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={
      isFullscreen
        ? "fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col p-3 sm:p-5 shadow-2xl overflow-hidden transition duration-200"
        : "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm overflow-hidden flex flex-col gap-0 transition-colors"
    }>
      
      {/* 1. Header Bar & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 dark:bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-950/50">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Expat Annual Simulation Ledger & Milestone Schedule</span>
                {isFullscreen && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Full Screen View
                  </span>
                )}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {destinationCountry.flag} {destinationCountry.name}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Canadian portfolios remain in CAD (C$) while spendable cash & living targets convert to {destinationCountry.currencyCode} ({destinationCountry.currencySymbol}) from Age {departureAge}
            </p>
          </div>
        </div>

        {/* Filter Buttons, Search, Fullscreen & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex rounded-lg bg-slate-800 p-1 text-xs font-semibold text-slate-300 border border-slate-700">
            <button
              type="button"
              onClick={() => setFilterMode('milestones')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                filterMode === 'milestones'
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              Milestones
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('expat')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                filterMode === 'expat'
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              Expat Years (A{departureAge}+)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('retirement')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                filterMode === 'retirement'
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              Retirement
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              All Years ({mergedRows.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search age, tax, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 w-36 sm:w-44"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'View in Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            )}
          </button>

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Export Expat Milestone Ledger with all formulas and formatting to Excel (.xlsx)"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          {/* Close button if fullscreen */}
          {isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              title="Close Full Screen View (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Clear Currency Protocol Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 px-4 py-2.5 text-xs text-slate-200 border-b border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="p-1 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
            <Globe className="w-3.5 h-3.5" />
          </span>
          <strong className="text-white">Multi-Currency Framework:</strong>
          <span className="text-slate-300">
            🇨🇦 Registered investments, pensions, and Net Worth are held & compounded in <strong>CAD (C$)</strong>.
          </span>
          <span className="text-cyan-300">
            ✈️ Starting at Emigration (Age {departureAge} / {departureYear}), spendable cash and living budgets are disbursed in <strong>{destinationCountry.name} {destinationCountry.currencyCode} ({destinationCountry.currencySymbol})</strong>.
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] text-cyan-200 bg-cyan-900/40 px-2 py-0.5 rounded border border-cyan-800/60">
          <span>1 CAD = {exchangeRate} {currencyCode}</span>
          <span>•</span>
          <span>PPP: {((1 / colIndex)).toFixed(2)}x boost</span>
        </div>
      </div>

      {/* 3. Key Milestone Schedule Showcase Cards (Top Dashboard) */}
      <div className="bg-slate-50/90 dark:bg-slate-800/50 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Expat Strategic Milestone Schedule & Velocity Markers</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Click any milestone card to jump and highlight that year in the expat ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* Card 1: Crossover Point */}
          <button
            type="button"
            onClick={() => summary?.crossoverAge && scrollToAge(summary.crossoverAge)}
            className={`text-left p-2.5 rounded-xl border transition-all duration-200 group relative flex flex-col justify-between cursor-pointer ${
              summary?.crossoverAge && highlightedAge === summary.crossoverAge
                ? 'ring-2 ring-emerald-500 shadow-md scale-[1.02] bg-emerald-100/90 dark:bg-emerald-500/30 border-emerald-400'
                : summary?.crossoverAge
                ? 'bg-emerald-50/70 dark:bg-emerald-500/10 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 border-emerald-200/90 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                <span>Crossover Point</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {summary?.crossoverAge ? `Age ${summary.crossoverAge}` : 'Post-Plan'}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                {summary?.crossoverAge ? 'Returns > Expenses' : 'Ongoing saving'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.crossoverAge ? `+${formatCad(summary.crossoverInvestmentGrowth)}/yr` : '—'}
            </div>
          </button>

          {/* Card 2: Coast FIRE */}
          <button
            type="button"
            onClick={() => summary?.coastFireAge && scrollToAge(summary.coastFireAge)}
            className={`text-left p-2.5 rounded-xl border transition-all duration-200 group relative flex flex-col justify-between cursor-pointer ${
              summary?.coastFireAge !== undefined && summary?.coastFireAge !== null && highlightedAge === summary.coastFireAge
                ? 'ring-2 ring-cyan-500 shadow-md scale-[1.02] bg-cyan-100/90 dark:bg-cyan-500/30 border-cyan-400'
                : summary?.coastFireAge !== undefined && summary?.coastFireAge !== null
                ? 'bg-cyan-50/70 dark:bg-cyan-500/10 hover:bg-cyan-100/80 dark:hover:bg-cyan-500/20 border-cyan-200/90 dark:border-cyan-500/20 text-cyan-950 dark:text-cyan-300 shadow-2xs hover:shadow-xs'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1">
                <Anchor className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span>Coast FIRE</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-cyan-600 dark:text-cyan-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {summary?.coastFireAge ? `Age ${summary.coastFireAge}` : 'Age 65+'}
              </div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                Zero-Contribution
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.coastFireNetWorth ? `${formatCad(summary.coastFireNetWorth)} CAD` : '—'}
            </div>
          </button>

          {/* Card 3: ✈️ Emigration / Relocation Day */}
          <button
            type="button"
            onClick={() => scrollToAge(departureAge)}
            className={`text-left p-2.5 rounded-xl border transition-all duration-200 group relative flex flex-col justify-between cursor-pointer ${
              highlightedAge === departureAge
                ? 'ring-2 ring-cyan-500 shadow-md scale-[1.02] bg-cyan-100 dark:bg-cyan-900/60 border-cyan-400'
                : 'border-cyan-300 dark:border-cyan-500/30 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/30 text-cyan-950 dark:text-cyan-200 hover:bg-cyan-100/90 dark:hover:bg-cyan-900/40 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1">
                <Plane className="w-3 h-3 text-cyan-700 dark:text-cyan-400" />
                <span>Emigration Day</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-cyan-700 dark:text-cyan-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Age {departureAge} ({departureYear})
              </div>
              <div className="text-[10px] text-cyan-800 dark:text-cyan-300 font-medium truncate">
                {destinationCountry.flag} Move to {destinationCountry.name}
              </div>
            </div>
            <div className="text-[9.5px] text-cyan-900 dark:text-cyan-300 font-mono font-bold truncate">
              {departureTaxEstimateCAD === 0 ? '$0 Exit Tax' : `Exit Tax: ${formatCad(departureTaxEstimateCAD)}`}
            </div>
          </button>

          {/* Card 4: OAS 20-Year Rule Status */}
          <button
            type="button"
            onClick={() => scrollToAge(65)}
            className={`text-left p-2.5 rounded-xl border transition-all duration-200 group relative flex flex-col justify-between cursor-pointer ${
              highlightedAge === 65
                ? 'ring-2 ring-emerald-500 shadow-md scale-[1.02] bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400'
                : qualifiesForLifetimeWorldwideOAS
                ? 'bg-emerald-50/70 dark:bg-emerald-500/10 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 border-emerald-200/90 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300'
                : 'bg-rose-50/70 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 border-rose-200/90 dark:border-rose-500/20 text-rose-950 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className={`text-[10.5px] font-bold flex items-center gap-1 ${qualifiesForLifetimeWorldwideOAS ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                <Landmark className="w-3 h-3" />
                <span>OAS Abroad (A65)</span>
              </span>
              <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {qualifiesForLifetimeWorldwideOAS ? 'Lifetime OAS' : 'OAS Lost'}
              </div>
              <div className={`text-[10px] font-medium truncate ${qualifiesForLifetimeWorldwideOAS ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {qualifiesForLifetimeWorldwideOAS ? '>= 20 yrs satisfied' : '< 20 yrs (stops in 6 mo)'}
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {expatInputs.yearsLivedInCanadaAfter18} adult years in Canada
            </div>
          </button>

          {/* Card 5: Target Retirement Day */}
          <button
            type="button"
            onClick={() => scrollToAge(retirementAge)}
            className={`text-left p-2.5 rounded-xl border transition-all duration-200 group relative flex flex-col justify-between cursor-pointer ${
              highlightedAge === retirementAge
                ? 'ring-2 ring-rose-500 shadow-md scale-[1.02] bg-rose-100 dark:bg-rose-950/60 border-rose-400'
                : 'border-rose-200/90 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 text-rose-950 dark:text-rose-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Retire Target</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-rose-600 dark:text-rose-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Age {retirementAge}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                Decumulation Phase
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.netWorthAtRetirement ? `${formatCad(summary.netWorthAtRetirement)} CAD` : 'Starting wealth'}
            </div>
          </button>

          {/* Card 6: Peak Lifetime Wealth Apex */}
          <button
            type="button"
            onClick={() => summary?.peakNetWorthAge && scrollToAge(summary.peakNetWorthAge)}
            className={`text-left p-2.5 rounded-xl border transition-all duration-200 group relative flex flex-col justify-between cursor-pointer ${
              summary?.peakNetWorthAge && highlightedAge === summary.peakNetWorthAge
                ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02] bg-indigo-100 dark:bg-indigo-950/60 border-indigo-400'
                : 'border-indigo-200/90 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-500/10 hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 text-indigo-950 dark:text-indigo-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[10.5px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                <Mountain className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Peak Wealth</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400 opacity-60 group-hover:opacity-100 transition" />
            </div>
            <div className="my-1">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {summary?.peakNetWorthAge ? `Age ${summary.peakNetWorthAge}` : 'Apex'}
              </div>
              <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                Lifetime Maximum
              </div>
            </div>
            <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono truncate">
              {summary?.peakNetWorth ? `${formatCad(summary.peakNetWorth)} CAD` : 'Peak Assets'}
            </div>
          </button>

        </div>
      </div>

      {/* 4. The Virtualized Expat Ledger Table */}
      <div 
        ref={tableContainerRef} 
        className={
          isFullscreen 
            ? "overflow-x-auto overflow-y-auto flex-1 max-h-none min-h-[400px]" 
            : "overflow-x-auto max-h-[540px]"
        }
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-10 border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider backdrop-blur-sm">
            <tr>
              <th className="py-2.5 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                Age / Phase / Residency
              </th>
              
              {/* Canadian Investments Group (Held in CAD) */}
              <th className="py-2.5 px-3 text-right bg-blue-50/70 dark:bg-blue-500/10 text-blue-900 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700" title="RRSP / RRIF balance in Canadian Dollars">
                RRSP/RRIF (CAD)
              </th>
              <th className="py-2.5 px-3 text-right bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700" title="TFSA balance in Canadian Dollars (Tax-Free in Canada)">
                TFSA (CAD)
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700" title="FHSA balance in Canadian Dollars">
                FHSA (CAD)
              </th>
              <th className="py-2.5 px-3 text-right bg-purple-50/70 dark:bg-purple-500/10 text-purple-900 dark:text-purple-300 border-r border-slate-200 dark:border-slate-700" title="Taxable Non-Registered portfolio in Canadian Dollars">
                Non-Reg (CAD)
              </th>
              <th className="py-2.5 px-3 text-right text-orange-900 dark:text-orange-300 border-r border-slate-200 dark:border-slate-700">
                Home Equity (CAD)
              </th>
              <th className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-slate-100 bg-slate-200/80 dark:bg-slate-700/80 border-r border-slate-200 dark:border-slate-700">
                Total Net Worth (CAD)
              </th>
              
              {/* Compounding & Cash Generation (CAD) */}
              <th className="py-2.5 px-3 text-right font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-500/20 border-r border-slate-200 dark:border-slate-700">
                Inv. Return (CAD)
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                CPP (CAD)
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                OAS Net (CAD)
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Withdrawals (CAD)
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 text-rose-900 dark:text-rose-300" title="Taxes: Canadian domestic tax when resident, or CRA Part XIII withholding + destination local tax when non-resident">
                Taxes (CAD)
              </th>

              {/* The Hero Expat Columns: Spendable Cash & Living Target in Local Currency post-exit */}
              <th className="py-2.5 px-3 text-right font-extrabold text-cyan-950 dark:text-cyan-200 bg-cyan-100/80 dark:bg-cyan-500/20 border-r border-slate-200 dark:border-slate-700 min-w-[150px]">
                Spendable Cash ({currencyCode} / CAD)
              </th>
              <th className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-w-[140px]">
                Living Target ({currencyCode} / CAD)
              </th>

              {/* Notes */}
              <th className="py-2.5 px-3 min-w-[280px] text-slate-700 dark:text-slate-300">
                Expat & Canadian Milestone Notes
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
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

              const isHighlighted = highlightedAge === row.age;
              const isDeparture = row.isDeparture;
              const isRetirement = row.isRetirement;
              const isNonResident = row.isNonResident;

              return (
                <tr
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`transition-all hover:bg-slate-50/90 dark:hover:bg-slate-800/60 ${
                    isDeparture
                      ? 'bg-cyan-50/80 dark:bg-cyan-500/10 border-y-2 border-cyan-400 dark:border-cyan-500 font-medium'
                      : isRetirement
                      ? 'bg-rose-50/60 dark:bg-rose-500/10 border-y-2 border-rose-300 dark:border-rose-500'
                      : isHighlighted
                      ? 'bg-amber-100 dark:bg-amber-500/20 ring-2 ring-amber-400 font-bold z-10'
                      : isNonResident
                      ? 'bg-slate-50/40 dark:bg-slate-800/50'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* 1. Age / Phase / Residency */}
                  <td className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-700/80 font-sans">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono text-xs">
                        Age {row.age}
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-mono">
                        ({row.year})
                      </span>

                      {/* Residency Badge */}
                      {isNonResident ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                          <span>{destinationCountry.flag}</span>
                          <span>Non-Res</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          <span>🇨🇦</span>
                          <span>Resident</span>
                        </span>
                      )}

                      {/* Event flags */}
                      {isDeparture && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-700 dark:bg-cyan-600 text-white">
                          ✈️ Departure Day
                        </span>
                      )}
                      {isRetirement && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white">
                          🎯 Retire
                        </span>
                      )}
                      {row.isCrossover && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                          🚀 Crossover
                        </span>
                      )}
                      {row.isCoastFire && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-600 text-white">
                          ⚓ Coast FIRE
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 2. RRSP / RRIF (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-blue-900 dark:text-blue-300">
                    {formatCad(row.rrspBalance)}
                  </td>

                  {/* 3. TFSA (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-emerald-900 dark:text-emerald-300">
                    {formatCad(row.tfsaBalance)}
                  </td>

                  {/* 4. FHSA (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-amber-900 dark:text-amber-300">
                    {formatCad(row.fhsaBalance)}
                  </td>

                  {/* 5. Non-Reg (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-purple-900 dark:text-purple-300">
                    {formatCad(row.nonRegBalance)}
                  </td>

                  {/* 6. Home Equity (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-orange-900 dark:text-orange-300">
                    {formatCad(row.homeEquity)}
                  </td>

                  {/* 7. Total Net Worth (CAD) */}
                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-slate-100 bg-slate-100/70 dark:bg-slate-800/70 border-r border-slate-200/80 dark:border-slate-700/80">
                    {formatCad(row.totalNetWorth)}
                  </td>

                  {/* 8. Inv. Returns (CAD) */}
                  <td className="py-2.5 px-3 text-right text-emerald-800 dark:text-emerald-300 font-semibold border-r border-slate-200/80 dark:border-slate-700/80">
                    {row.investmentGrowth > 0 ? `+${formatCad(row.investmentGrowth)}` : '-'}
                  </td>

                  {/* 9. CPP (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
                    {formatCad(row.cppIncomeCAD)}
                  </td>

                  {/* 10. OAS Net (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
                    {row.age >= 65 && !qualifiesForLifetimeWorldwideOAS && isNonResident ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold" title="OAS ceased under 20-year rule">$0 (Lost)</span>
                    ) : (
                      formatCad(row.oasNetIncomeCAD)
                    )}
                  </td>

                  {/* 11. Withdrawals (CAD) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
                    {formatCad(row.totalWithdrawalsCAD)}
                  </td>

                  {/* 12. Taxes Paid (CAD & Local) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-rose-900 dark:text-rose-300">
                    <div>
                      {formatCad(row.totalTaxPaidCAD)}
                      {isNonResident && (
                        <span className="block text-[9.5px] text-slate-500 dark:text-slate-400 font-sans">
                          Part XIII: {formatCad(row.craPartXIIICAD)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 13. SPENDABLE CASH (HERO COLUMN) */}
                  <td className={`py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 font-bold ${
                    isNonResident ? 'bg-cyan-50/70 dark:bg-cyan-500/10' : 'bg-slate-50/50 dark:bg-slate-800/40'
                  }`}>
                    {isNonResident ? (
                      <div>
                        {/* Primary: In Destination Local Currency */}
                        <div className="text-cyan-900 dark:text-cyan-200 font-extrabold text-xs">
                          {formatLocal(row.spendableCashLocal)}{' '}
                          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-sans font-bold">
                            {currencyCode}
                          </span>
                        </div>
                        {/* Secondary Subtext: Equivalent CAD */}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal font-sans">
                          ≈ {formatCad(row.spendableCashCAD)} CAD
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* Primary: In Canadian Dollars */}
                        <div className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">
                          {formatCad(row.spendableCashCAD)}{' '}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">
                            CAD
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal font-sans">
                          Canadian Resident
                        </div>
                      </div>
                    )}
                  </td>

                  {/* 14. LIVING TARGET (HERO COLUMN) */}
                  <td className="py-2.5 px-3 text-right border-r border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200">
                    {isNonResident ? (
                      <div>
                        {/* Primary: In Destination Local Currency */}
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {formatLocal(row.livingTargetLocal)}{' '}
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-sans">
                            {currencyCode}
                          </span>
                        </div>
                        {/* Subtext: PPP relative saving */}
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-semibold">
                          PPP {(colIndex * 100).toFixed(0)}% cost
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* Primary: In Canadian Dollars */}
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {formatCad(row.livingTargetCAD)}{' '}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">
                            CAD
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal font-sans">
                          Baseline Canada
                        </div>
                      </div>
                    )}
                  </td>

                  {/* 15. Notes */}
                  <td className="py-2.5 px-3 font-sans text-xs text-slate-600 dark:text-slate-400">
                    {row.notes.length > 0 ? (
                      <div className="space-y-1">
                        {row.notes.map((note, nIdx) => (
                          <div
                            key={nIdx}
                            className={`p-1.5 rounded-lg text-[11px] leading-tight ${
                              note.includes('✈️')
                                ? 'bg-cyan-100/90 dark:bg-cyan-500/20 text-cyan-950 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-500/30 font-medium'
                                : note.includes('⚠️')
                                ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-500/30 font-medium'
                                : note.includes('🚀') || note.includes('🇨🇦')
                                ? 'bg-emerald-100/70 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[10.5px]">Standard trajectory</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary & Legend */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 dark:text-slate-300">Currency Legend:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-mono">
            CAD (C$) = Canadian Portfolios & Benefits
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-mono font-bold">
            {currencyCode} ({currencySymbol}) = Post-Emigration Spendable Cash & Living Target
          </span>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-[10.5px]">
          Fulfills CRA Section 128.1 (Departure Tax), CRA Part XIII Non-Resident Withholding, and Bilateral Tax Treaty Protocols.
        </div>
      </div>

    </div>
  );
};
