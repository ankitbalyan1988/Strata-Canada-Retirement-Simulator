import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Table, 
  Search, 
  FileSpreadsheet, 
  Loader2, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  DollarSign, 
  Gift, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Landmark, 
  Scale, 
  ChevronUp, 
  ChevronDown,
  Info
} from 'lucide-react';
import { RetirementInputs, YearSimulationResult } from '../types/retirement';
import { 
  EstatePlanningInputs, 
  EstateMilestoneRow, 
  EstateFilterMode 
} from '../types/estate';
import { generateEstateMilestoneLedger } from '../utils/estatePlanning';
import { exportEstateLedgerToExcel } from '../utils/excelExport';

export interface EstateMilestoneLedgerProps {
  estateInputs: EstatePlanningInputs;
  retirementInputs: RetirementInputs;
  yearlyResults: YearSimulationResult[];
  onPassingAgeChange: (newAge: number) => void;
  className?: string;
}

export const EstateMilestoneLedger: React.FC<EstateMilestoneLedgerProps> = ({
  estateInputs,
  retirementInputs,
  yearlyResults,
  onPassingAgeChange,
  className = ''
}) => {
  const [filterMode, setFilterMode] = useState<EstateFilterMode>('milestones');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRowAge, setSelectedRowAge] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Generate full annual ledger of estate settlements
  const fullLedgerData: EstateMilestoneRow[] = useMemo(() => {
    return generateEstateMilestoneLedger(estateInputs, retirementInputs, yearlyResults);
  }, [estateInputs, retirementInputs, yearlyResults]);

  // Filter and search
  const filteredData = useMemo(() => {
    return fullLedgerData.filter((row) => {
      // Search term filtering
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchAge = String(row.age).includes(term);
        const matchYear = String(row.year).includes(term);
        const matchNotes = row.notes.toLowerCase().includes(term);
        const matchRecipient = row.primaryRecipient.toLowerCase().includes(term);
        const matchStatus = row.taxStatus.toLowerCase().includes(term);
        if (!matchAge && !matchYear && !matchNotes && !matchRecipient && !matchStatus) {
          return false;
        }
      }

      // Filter modes
      if (filterMode === 'retirement') {
        return row.isRetired;
      }
      if (filterMode === 'milestones') {
        return row.isMilestoneAge;
      }
      return true; // 'all'
    });
  }, [fullLedgerData, searchTerm, filterMode]);

  const formatCur = (val: number) => {
    if (val === 0) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportEstateLedgerToExcel({
        data: filteredData,
        filterMode,
        passingAge: estateInputs.passingAge,
        retirementAge: retirementInputs.retirementAge || 65,
        province: retirementInputs.province || 'ON',
        inputs: retirementInputs,
        estateInputs
      });
    } catch (err) {
      console.error('Failed to export Estate Milestone Ledger to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getFilterLabel = () => {
    if (filterMode === 'milestones') return 'Milestones (Key Events)';
    if (filterMode === 'retirement') return 'Retirement Phase';
    return 'All Years';
  };

  // Locate active row for quick summary badge
  const activePassingRow = useMemo(() => {
    return fullLedgerData.find(r => r.age === estateInputs.passingAge) || fullLedgerData[fullLedgerData.length - 1];
  }, [fullLedgerData, estateInputs.passingAge]);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col p-3 sm:p-5 shadow-2xl overflow-hidden transition-all duration-200"
          : `bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col transition duration-200 ${className}`
      }
    >
      {/* 1. Toolbar Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Table className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm sm:text-base flex items-center gap-2 flex-wrap">
              <span>Estate Milestone Ledger & Succession Timeline</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                Annual Terminal Tax & Liquidation
              </span>
              {isFullscreen && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Full Screen View
                </span>
              )}
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Simulate gross wealth, CRA deemed disposition (S. 70(5)), probate fees, and net bequests at each life stage</span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Click any row to set active simulated passing age</span>
            </span>
          </p>
        </div>

        {/* Filter Controls, Search, Fullscreen, and Excel Export */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search age, status, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 w-32 sm:w-44"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Mode Selector */}
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
              Milestones ({fullLedgerData.filter(r => r.isMilestoneAge).length})
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
              All Years ({fullLedgerData.length})
            </button>
          </div>

          {/* Full Screen / Maximize Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? 'Exit Full Screen View (Press Esc)' : 'Maximize Estate Milestone Ledger to Full Screen'}
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

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            title={`Export ${getFilterLabel()} Estate Ledger to audit-grade Excel spreadsheet`}
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
                <span>Export Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Bar for Active Simulated Age */}
      {activePassingRow && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Active Passing Model:</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-mono">
                Age {activePassingRow.age} (Yr {activePassingRow.year})
              </span>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Gross Estate: <strong className="font-mono text-slate-900 dark:text-slate-100">{formatCur(activePassingRow.totalGrossEstate)}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              CRA Terminal Tax: <strong className="font-mono text-rose-600 dark:text-rose-400">{formatCur(activePassingRow.terminalIncomeTax)}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Net to Heirs: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCur(activePassingRow.netEstateRemaining)}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Preserved: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{activePassingRow.preservationRate.toFixed(1)}%</strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Click any table row to simulate that passing age</span>
          </div>
        </div>
      )}

      {/* 3. Table Container */}
      <div 
        ref={tableRef}
        className="flex-1 overflow-auto max-h-[600px] border-b border-slate-200 dark:border-slate-800"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs">
            <tr>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Age</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Year</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Phase</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-blue-700 dark:text-blue-400">RRSP / RRIF</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-emerald-700 dark:text-emerald-400">TFSA</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-amber-700 dark:text-amber-400">FHSA</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-purple-700 dark:text-purple-400">Non-Reg</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-orange-700 dark:text-orange-400">Home Equity</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-700/50">
                Gross Estate
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-rose-700 dark:text-rose-400">
                CRA Terminal Tax
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-amber-800 dark:text-amber-400">
                Probate Fee
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                Funeral & Admin
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap text-rose-800 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20">
                Total Deductions
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20">
                Net to Heirs
              </th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-bold">
                Preserved %
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Primary Recipient</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Estate Notes & Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
            {filteredData.map((row) => {
              const isPassing = row.isPassingAge;
              const isRetire = row.isRetirementAge;
              const isSelected = selectedRowAge === row.age;

              return (
                <tr
                  key={row.age}
                  id={`estate-row-age-${row.age}`}
                  onClick={() => {
                    setSelectedRowAge(row.age);
                    onPassingAgeChange(row.age);
                  }}
                  className={`cursor-pointer transition-colors ${
                    isPassing
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-400 dark:ring-emerald-500/50 font-semibold'
                      : isRetire
                      ? 'bg-rose-50/50 dark:bg-rose-950/20'
                      : isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 even:bg-slate-50/40 dark:even:bg-slate-800/20'
                  }`}
                  title={`Click to set passing age to Age ${row.age}`}
                >
                  {/* Age */}
                  <td className="py-2 px-3 text-center font-bold">
                    <span className="flex items-center justify-center gap-1">
                      {isPassing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />}
                      <span className={isPassing ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}>
                        {row.age}
                      </span>
                    </span>
                  </td>

                  {/* Year */}
                  <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400">
                    {row.year}
                  </td>

                  {/* Life Phase */}
                  <td className="py-2 px-3 text-center font-sans">
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                      row.isRetired
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {row.phase}
                    </span>
                  </td>

                  {/* RRSP / RRIF */}
                  <td className="py-2 px-3 text-right text-blue-700 dark:text-blue-400">
                    {formatCur(row.rrspBalance)}
                  </td>

                  {/* TFSA */}
                  <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">
                    {formatCur(row.tfsaBalance)}
                  </td>

                  {/* FHSA */}
                  <td className="py-2 px-3 text-right text-amber-700 dark:text-amber-400">
                    {formatCur(row.fhsaBalance)}
                  </td>

                  {/* Non-Reg */}
                  <td className="py-2 px-3 text-right text-purple-700 dark:text-purple-400">
                    {formatCur(row.nonRegBalance)}
                  </td>

                  {/* Home Equity */}
                  <td className="py-2 px-3 text-right text-orange-700 dark:text-orange-400">
                    {formatCur(row.homeEquity)}
                  </td>

                  {/* Gross Estate */}
                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-50 bg-slate-100/50 dark:bg-slate-800/40">
                    {formatCur(row.totalGrossEstate)}
                  </td>

                  {/* CRA Terminal Tax */}
                  <td className={`py-2 px-3 text-right font-medium ${
                    row.terminalIncomeTax === 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {row.terminalIncomeTax === 0 ? '$0' : formatCur(row.terminalIncomeTax)}
                  </td>

                  {/* Probate Fee */}
                  <td className="py-2 px-3 text-right text-amber-800 dark:text-amber-400 font-medium">
                    {formatCur(row.probateFee)}
                  </td>

                  {/* Funeral & Admin */}
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                    {formatCur(row.funeralAndAdminCosts)}
                  </td>

                  {/* Total Deductions */}
                  <td className="py-2 px-3 text-right font-bold text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/10">
                    {formatCur(row.totalDeductions)}
                  </td>

                  {/* Net to Heirs */}
                  <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {formatCur(row.netEstateRemaining)}
                  </td>

                  {/* Preservation % */}
                  <td className="py-2 px-3 text-center">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      {row.preservationRate.toFixed(1)}%
                    </span>
                  </td>

                  {/* Primary Recipient */}
                  <td className="py-2 px-3 font-sans text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={row.primaryRecipient}>
                    {row.primaryRecipient}
                  </td>

                  {/* Notes & Status */}
                  <td className="py-2 px-3 font-sans text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      {isPassing && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold text-[9.5px]">
                          ACTIVE
                        </span>
                      )}
                      <span>{row.notes}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No estate milestone rows match your search filter "{searchTerm}".
          </div>
        )}
      </div>

      {/* 4. Footer Summary Strip */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span>Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredData.length}</strong> of {fullLedgerData.length} projection milestones</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span>CRA deemed disposition applied under Canadian ITA S. 70(5)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Formatted Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
