import React, { useState, useMemo, useRef, useEffect } from 'react';
import { YearSimulationResult, RetirementInputs } from '../types/retirement';
import { 
  Table, 
  Search, 
  FileSpreadsheet, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  Check, 
  Filter, 
  ArrowRightLeft, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  PiggyBank, 
  Wallet,
  ShieldAlert,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { exportCashFlowLedgerToExcel } from '../utils/excelExport';

export interface CashFlowLedgerTableProps {
  yearlyResults: YearSimulationResult[];
  inputs: RetirementInputs;
}

type FilterMode = 'all' | 'working' | 'retirement' | 'milestones';

export const CashFlowLedgerTable: React.FC<CashFlowLedgerTableProps> = ({
  yearlyResults,
  inputs
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedAge, setHighlightedAge] = useState<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const retirementAge = inputs.retirementAge;

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Format currency
  const formatCur = (val: number | undefined, allowZeroDash = true) => {
    if (val === undefined || isNaN(val)) return '-';
    const rounded = Math.round(val);
    if (rounded === 0 && allowZeroDash) return '-';
    return `$${rounded.toLocaleString()}`;
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return yearlyResults.filter((yr) => {
      // Search query filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchAge = String(yr.age).includes(query);
        const matchYear = String(yr.year).includes(query);
        const matchNotes = yr.notes?.some((n) => n.toLowerCase().includes(query));
        const matchBadges = yr.milestoneBadges?.some(
          (b) => b.label.toLowerCase().includes(query) || b.shortLabel.toLowerCase().includes(query)
        );
        if (!matchAge && !matchYear && !matchNotes && !matchBadges) {
          return false;
        }
      }

      if (filterMode === 'working') {
        return !yr.isRetired;
      }
      if (filterMode === 'retirement') {
        return yr.isRetired;
      }
      if (filterMode === 'milestones') {
        const isStart = yr.age === yearlyResults[0]?.age;
        const isRetire = yr.age === retirementAge;
        const isEnd = yr.age === yearlyResults[yearlyResults.length - 1]?.age;
        const hasBadges = Boolean(yr.milestoneBadges && yr.milestoneBadges.length > 0);
        const hasSignificantNotes = Boolean(yr.notes && yr.notes.length > 0);
        const isCrossover = Boolean(yr.isCrossoverMilestone);
        const isDebtFree = Boolean(yr.isDebtFreeMilestone || yr.isMortgageFreeMilestone);
        const isGovPensionAge = yr.age === 65 || yr.age === 71;

        return isStart || isRetire || isEnd || hasBadges || hasSignificantNotes || isCrossover || isDebtFree || isGovPensionAge;
      }

      return true;
    });
  }, [yearlyResults, filterMode, searchTerm, retirementAge]);

  // Totals calculations for filtered view
  const summaryTotals = useMemo(() => {
    let totalSalary = 0;
    let totalPensions = 0;
    let totalWithdrawals = 0;
    let totalInflows = 0;
    let totalLivingExpenses = 0;
    let totalRentMortgage = 0;
    let totalDebt = 0;
    let totalOutflows = 0;
    let totalTax = 0;
    let totalSavings = 0;
    let totalNetSurplus = 0;
    let totalTaxableIncome = 0;

    filteredData.forEach((yr) => {
      const sal = yr.employmentIncome || 0;
      const pen = (yr.cppIncome || 0) + (yr.oasNetIncome || 0);
      const wth = yr.totalWithdrawals || 0;
      const inflow = sal + pen + wth;
      const rentMort = yr.rentOrMortgagePayment ?? 0;
      const living = yr.livingExpensesNominal ?? Math.max(0, (yr.targetSpendingNominal || 0) - rentMort);
      const dbt = yr.debtPayment || 0;
      const outflow = living + rentMort + dbt;
      const tax = yr.totalTaxPaid || 0;
      const sav = (yr.rrspContribution || 0) + (yr.tfsaContribution || 0) + (yr.fhsaContribution || 0) + (yr.nonRegContribution || 0);
      const surplus = inflow - outflow - tax;

      totalSalary += sal;
      totalPensions += pen;
      totalWithdrawals += wth;
      totalInflows += inflow;
      totalLivingExpenses += living;
      totalRentMortgage += rentMort;
      totalDebt += dbt;
      totalOutflows += outflow;
      totalTax += tax;
      totalSavings += sav;
      totalNetSurplus += surplus;
      totalTaxableIncome += (yr.taxableIncome || 0);
    });

    const avgEffTax = totalTaxableIncome > 0 ? (totalTax / totalTaxableIncome) * 100 : 0;

    return {
      totalSalary,
      totalPensions,
      totalWithdrawals,
      totalInflows,
      totalLivingExpenses,
      totalRentMortgage,
      totalDebt,
      totalOutflows,
      totalTax,
      totalSavings,
      totalNetSurplus,
      avgEffTax
    };
  }, [filteredData]);

  // Handle Export to Excel
  const handleExportExcel = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      await exportCashFlowLedgerToExcel({
        data: yearlyResults,
        filterMode,
        retirementAge,
        province: inputs.province,
        inputs
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export cash flow ledger to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      ref={tableContainerRef}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none overflow-y-auto p-6 bg-slate-50 dark:bg-[#0B0F17]'
          : 'p-5 sm:p-6'
      }`}
    >
      {/* Table Top Controls & Metadata Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100/60 dark:border-indigo-800/60 shadow-xs">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Annual Cash Flow & Tax Liability Ledger
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {filteredData.length} {filteredData.length === 1 ? 'Year' : 'Years'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive accounting schedule of employment income, government pensions, living outflows, CRA tax liabilities, and net spendable cash surplus.
              </p>
            </div>
          </div>
        </div>

        {/* Right side controls: Fullscreen & Excel Export */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/80 rounded-xl transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all cursor-pointer ${
              exportSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 dark:ring-emerald-700'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Excel...</span>
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Cash Flow (Excel)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 pb-4">
        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/80 text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Years ({yearlyResults.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('working')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'working'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Working Phase ({yearlyResults.filter((y) => !y.isRetired).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('retirement')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'retirement'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Retirement ({yearlyResults.filter((y) => y.isRetired).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('milestones')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'milestones'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Key Milestones
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search age, year, note..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="relative overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[640px] shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          {/* Header Row */}
          <thead className="bg-slate-900 dark:bg-slate-950 text-white sticky top-0 z-20 shadow-xs text-[11px] font-semibold tracking-wider uppercase select-none">
            {/* Top Grouping Header */}
            <tr className="border-b border-slate-800 text-[10px]">
              <th colSpan={3} className="py-2 px-3 text-center bg-slate-950/80 border-r border-slate-800 text-slate-300 font-bold">
                Timeline
              </th>
              <th colSpan={4} className="py-2 px-3 text-center bg-indigo-950/70 border-r border-slate-800 text-indigo-200 font-bold">
                Cash Inflows (Income & Withdrawals)
              </th>
              <th colSpan={4} className="py-2 px-3 text-center bg-rose-950/70 border-r border-slate-800 text-rose-200 font-bold">
                Cash Outflows (Living, Housing & Debt)
              </th>
              <th colSpan={3} className="py-2 px-3 text-center bg-purple-950/70 border-r border-slate-800 text-purple-200 font-bold">
                CRA Taxes & Rates
              </th>
              <th colSpan={1} className="py-2 px-3 text-center bg-teal-950/70 border-r border-slate-800 text-teal-200 font-bold">
                Savings
              </th>
              <th colSpan={1} className="py-2 px-3 text-center bg-emerald-950/80 border-r border-slate-800 text-emerald-200 font-bold">
                Net Position
              </th>
              <th colSpan={1} className="py-2 px-3 text-center bg-slate-950/80 text-slate-300 font-bold">
                Milestones & Events
              </th>
            </tr>
            {/* Column specific header */}
            <tr>
              <th className="py-2.5 px-3 text-center font-bold">Age</th>
              <th className="py-2.5 px-3 text-center font-bold">Year</th>
              <th className="py-2.5 px-3 text-center font-bold border-r border-slate-800">Phase</th>

              {/* Inflow breakdown */}
              <th className="py-2.5 px-3 text-right font-medium text-indigo-100">Salary / Earned</th>
              <th className="py-2.5 px-3 text-right font-medium text-indigo-100">CPP & OAS</th>
              <th className="py-2.5 px-3 text-right font-medium text-indigo-100">Portfolio Draw</th>
              <th className="py-2.5 px-3 text-right font-bold text-emerald-300 bg-slate-800/60 border-r border-slate-800">
                Total Inflow
              </th>

              {/* Outflow breakdown */}
              <th className="py-2.5 px-3 text-right font-medium text-rose-100">Living Exp.</th>
              <th className="py-2.5 px-3 text-right font-medium text-blue-200">Rent / Mort.</th>
              <th className="py-2.5 px-3 text-right font-medium text-orange-200">Debts</th>
              <th className="py-2.5 px-3 text-right font-bold text-rose-300 bg-slate-800/60 border-r border-slate-800">
                Total Outflow
              </th>

              {/* Taxes */}
              <th className="py-2.5 px-3 text-right font-bold text-purple-200">CRA Tax Paid</th>
              <th className="py-2.5 px-2.5 text-center font-medium text-purple-300">Effective %</th>
              <th className="py-2.5 px-2.5 text-center font-medium text-purple-300 border-r border-slate-800">Marginal %</th>

              {/* Savings */}
              <th className="py-2.5 px-3 text-right font-medium text-teal-200 border-r border-slate-800" title="Planned contributions plus post-outflow surplus swept into RRSP, FHSA, TFSA & Non-Reg">
                Total Savings
              </th>

              {/* Net Surplus */}
              <th className="py-2.5 px-3 text-right font-bold text-emerald-300 bg-emerald-950/40 border-r border-slate-800" title="Inflow - Total Outflow - CRA Tax Paid (surplus automatically allocated into savings)">
                Post-Tax Surplus
              </th>

              {/* Notes */}
              <th className="py-2.5 px-4 text-left font-medium min-w-[200px]">Strategic Notes</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No cash flow records match your filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterMode('all');
                        setSearchTerm('');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer underline"
                    >
                      Reset filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((yr, idx) => {
                const isRetirementRow = yr.age === retirementAge;
                const isHighlighted = highlightedAge === yr.age;
                const earnedIncome = yr.employmentIncome || 0;
                const pensions = (yr.cppIncome || 0) + (yr.oasNetIncome || 0);
                const withdrawals = yr.totalWithdrawals || 0;
                const totalInflow = earnedIncome + pensions + withdrawals;
                const rentMortgage = yr.rentOrMortgagePayment ?? 0;
                const livingExpenses = yr.livingExpensesNominal ?? Math.max(0, (yr.targetSpendingNominal || 0) - rentMortgage);
                const debt = yr.debtPayment || 0;
                const totalOutflow = livingExpenses + rentMortgage + debt;
                const taxes = yr.totalTaxPaid || 0;
                const savings = (yr.rrspContribution || 0) + (yr.tfsaContribution || 0) + (yr.fhsaContribution || 0) + (yr.nonRegContribution || 0);
                const netSurplus = yr.netSpendableCashflow !== undefined ? yr.netSpendableCashflow : (totalInflow - totalOutflow - taxes);
                const discrScaled = !yr.isRetired && yr.discretionaryScaleFactor !== undefined && yr.discretionaryScaleFactor < 0.99;
                const discrCutPct = discrScaled ? Math.round((1 - yr.discretionaryScaleFactor!) * 100) : 0;

                return (
                  <tr
                    key={yr.age}
                    onMouseEnter={() => setHighlightedAge(yr.age)}
                    onMouseLeave={() => setHighlightedAge(null)}
                    className={`transition-colors ${
                      isRetirementRow
                        ? 'bg-amber-50/70 dark:bg-amber-950/35 border-y-2 border-amber-300/80 dark:border-amber-600/60 font-medium'
                        : isHighlighted
                        ? 'bg-slate-50/90 dark:bg-slate-800/80'
                        : idx % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-slate-50/40 dark:bg-slate-900/60'
                    }`}
                  >
                    {/* Age */}
                    <td className="py-2 px-3 text-center font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center justify-center gap-1">
                        <span>{yr.age}</span>
                        {isRetirementRow && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-white shadow-2xs">
                            RETIRE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Year */}
                    <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {yr.year}
                    </td>

                    {/* Phase */}
                    <td className="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                          yr.isRetired
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                        }`}
                      >
                        {yr.isRetired ? 'Retirement' : 'Working'}
                      </span>
                    </td>

                    {/* Salary */}
                    <td className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {formatCur(earnedIncome)}
                    </td>

                    {/* CPP & OAS */}
                    <td className="py-2 px-3 text-right font-medium text-indigo-700 dark:text-indigo-400">
                      {formatCur(pensions)}
                    </td>

                    {/* Withdrawals */}
                    <td className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {formatCur(withdrawals)}
                    </td>

                    {/* Total Inflow */}
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/25 border-r border-slate-100 dark:border-slate-800">
                      {formatCur(totalInflow, false)}
                    </td>

                    {/* Living Expenses */}
                    <td
                      className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200"
                      title={
                        discrScaled
                          ? `Discretionary living costs scaled down ${discrCutPct}% with lower income (utilities & ownership fees fixed at 100%)`
                          : 'Utilities, discretionary spending, property tax & condo fees'
                      }
                    >
                      <span>{formatCur(livingExpenses)}</span>
                      {discrScaled && discrCutPct > 0 && (
                        <span className="ml-1 text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          -{discrCutPct}%
                        </span>
                      )}
                    </td>

                    {/* Rent / Mortgage */}
                    <td
                      className="py-2 px-3 text-right font-medium text-blue-700 dark:text-blue-400"
                      title={
                        yr.housingCostType === 'mortgage'
                          ? 'Annual fixed mortgage principal & interest payments'
                          : yr.housingCostType === 'rent'
                          ? 'Annual residential rent (inflation-adjusted)'
                          : 'Mortgage-free / $0 housing payment'
                      }
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        {rentMortgage > 0 && yr.housingCostType && yr.housingCostType !== 'none' && (
                          <span
                            className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${
                              yr.housingCostType === 'mortgage'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700'
                            }`}
                          >
                            {yr.housingCostType === 'mortgage' ? 'Mort' : 'Rent'}
                          </span>
                        )}
                        <span>{formatCur(rentMortgage)}</span>
                      </div>
                    </td>

                    {/* Debts */}
                    <td className="py-2 px-3 text-right font-medium text-orange-700 dark:text-orange-400">
                      {formatCur(debt)}
                    </td>

                    {/* Total Outflow */}
                    <td className="py-2 px-3 text-right font-bold text-rose-700 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/25 border-r border-slate-100 dark:border-slate-800">
                      {formatCur(totalOutflow, false)}
                    </td>

                    {/* CRA Tax Paid */}
                    <td className="py-2 px-3 text-right font-bold text-purple-700 dark:text-purple-400">
                      {formatCur(taxes)}
                    </td>

                    {/* Effective Tax % */}
                    <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {yr.effectiveTaxRate ? `${(yr.effectiveTaxRate * 100).toFixed(1)}%` : '0.0%'}
                    </td>

                    {/* Marginal Tax % */}
                    <td className="py-2 px-2.5 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px] border-r border-slate-100 dark:border-slate-800">
                      {yr.marginalTaxRate ? `${(yr.marginalTaxRate * 100).toFixed(1)}%` : '0.0%'}
                    </td>

                    {/* Savings */}
                    <td
                      className="py-2 px-3 text-right font-medium text-teal-700 dark:text-teal-400 border-r border-slate-100 dark:border-slate-800"
                      title={
                        yr.surplusSaved && yr.surplusSaved > 0
                          ? `RRSP: ${formatCur(yr.rrspContribution, false)} | TFSA: ${formatCur(yr.tfsaContribution, false)} | FHSA: ${formatCur(yr.fhsaContribution, false)} | Non-Reg: ${formatCur(yr.nonRegContribution, false)} (includes ${formatCur(yr.surplusSaved, false)} surplus swept to savings)`
                          : `RRSP: ${formatCur(yr.rrspContribution, false)} | TFSA: ${formatCur(yr.tfsaContribution, false)} | FHSA: ${formatCur(yr.fhsaContribution, false)} | Non-Reg: ${formatCur(yr.nonRegContribution, false)}`
                      }
                    >
                      {formatCur(savings)}
                    </td>

                    {/* Net Spendable Surplus */}
                    <td className={`py-2 px-3 text-right font-bold border-r border-slate-100 dark:border-slate-800 ${
                      netSurplus >= 0
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/30'
                    }`}>
                      {formatCur(netSurplus, false)}
                    </td>

                    {/* Strategic Notes & Badges */}
                    <td className="py-2 px-4 text-left">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {yr.milestoneBadges?.map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/60 shadow-2xs"
                          >
                            {b.shortLabel || b.label}
                          </span>
                        ))}
                        {yr.notes && yr.notes.length > 0 && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate max-w-[280px]" title={yr.notes.join(' • ')}>
                            {yr.notes[0]}
                          </span>
                        )}
                        {(!yr.milestoneBadges || yr.milestoneBadges.length === 0) && (!yr.notes || yr.notes.length === 0) && (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer Totals */}
          {filteredData.length > 0 && (
            <tfoot className="bg-slate-100 dark:bg-slate-800/95 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white sticky bottom-0 z-10 shadow-md">
              <tr className="border-b-2 border-slate-900 dark:border-slate-600">
                <td colSpan={3} className="py-3 px-3 text-left font-black tracking-wider text-slate-900 dark:text-white border-r border-slate-300 dark:border-slate-700 uppercase text-[10px]">
                  CUMULATIVE TOTALS
                </td>

                {/* Salary */}
                <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                  {formatCur(summaryTotals.totalSalary, false)}
                </td>

                {/* Pensions */}
                <td className="py-3 px-3 text-right text-indigo-800 dark:text-indigo-300">
                  {formatCur(summaryTotals.totalPensions, false)}
                </td>

                {/* Withdrawals */}
                <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                  {formatCur(summaryTotals.totalWithdrawals, false)}
                </td>

                {/* Total Inflow */}
                <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/50 border-r border-slate-300 dark:border-slate-700">
                  {formatCur(summaryTotals.totalInflows, false)}
                </td>

                {/* Living */}
                <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                  {formatCur(summaryTotals.totalLivingExpenses, false)}
                </td>

                {/* Rent / Mortgage */}
                <td className="py-3 px-3 text-right text-blue-800 dark:text-blue-300">
                  {formatCur(summaryTotals.totalRentMortgage, false)}
                </td>

                {/* Debts */}
                <td className="py-3 px-3 text-right text-orange-800 dark:text-orange-300">
                  {formatCur(summaryTotals.totalDebt, false)}
                </td>

                {/* Total Outflow */}
                <td className="py-3 px-3 text-right text-rose-800 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/50 border-r border-slate-300 dark:border-slate-700">
                  {formatCur(summaryTotals.totalOutflows, false)}
                </td>

                {/* CRA Taxes */}
                <td className="py-3 px-3 text-right text-purple-800 dark:text-purple-300">
                  {formatCur(summaryTotals.totalTax, false)}
                </td>

                {/* Avg Effective Tax */}
                <td className="py-3 px-2.5 text-center text-purple-900 dark:text-purple-300 font-mono text-[11px]">
                  {summaryTotals.avgEffTax.toFixed(1)}%
                </td>

                {/* Marginal - blank in totals */}
                <td className="py-3 px-2.5 text-center text-slate-400 dark:text-slate-500 border-r border-slate-300 dark:border-slate-700 font-normal">
                  -
                </td>

                {/* Savings */}
                <td className="py-3 px-3 text-right text-teal-800 dark:text-teal-300 border-r border-slate-300 dark:border-slate-700">
                  {formatCur(summaryTotals.totalSavings, false)}
                </td>

                {/* Net Spendable Surplus */}
                <td className={`py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-700 ${
                  summaryTotals.totalNetSurplus >= 0
                    ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60'
                    : 'text-rose-800 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/60'
                }`}>
                  {formatCur(summaryTotals.totalNetSurplus, false)}
                </td>

                {/* Notes footer */}
                <td className="py-3 px-4 text-left text-xs font-normal text-slate-500 dark:text-slate-400 italic">
                  Lifetime model across {filteredData.length} simulation {filteredData.length === 1 ? 'year' : 'years'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Audit & Compliance Footer Notice */}
      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span>Excel export preserves native SUM, difference, and IF logic formulas with audit-grade double borders.</span>
        </div>
        <div className="text-slate-400 dark:text-slate-500">
          Province: <span className="font-semibold text-slate-600 dark:text-slate-300">{inputs.province}</span> • Target Retirement: <span className="font-semibold text-slate-600 dark:text-slate-300">Age {retirementAge}</span>
        </div>
      </div>
    </div>
  );
};
