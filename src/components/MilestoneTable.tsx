import React, { useState } from 'react';
import { YearSimulationResult, RetirementInputs, CanadianProvince } from '../types/retirement';
import { Table, Filter, Search, ChevronDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportMilestoneTableToExcel } from '../utils/excelExport';

interface MilestoneTableProps {
  yearlyResults: YearSimulationResult[];
  retirementAge: number;
  province?: CanadianProvince;
  inputs?: RetirementInputs;
}

export const MilestoneTable: React.FC<MilestoneTableProps> = ({
  yearlyResults,
  retirementAge,
  province,
  inputs
}) => {
  const [filterMode, setFilterMode] = useState<'milestones' | 'retirement' | 'all'>('milestones');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const formatCur = (val: number) => {
    if (val === 0) return '-';
    return `$${Math.round(val).toLocaleString()}`;
  };

  const filteredData = yearlyResults.filter((yr) => {
    // Search filter
    if (searchTerm) {
      const matchAge = String(yr.age).includes(searchTerm);
      const matchNotes = yr.notes.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchAge && !matchNotes) return false;
    }

    if (filterMode === 'retirement') {
      return yr.isRetired;
    }

    if (filterMode === 'milestones') {
      return (
        yr.age === yearlyResults[0].age ||
        yr.age === retirementAge ||
        yr.age === 60 ||
        yr.age === 65 ||
        yr.age === 70 ||
        yr.age === 71 ||
        yr.age === 72 ||
        yr.age === 75 ||
        yr.age === 80 ||
        yr.age === 85 ||
        yr.age === 90 ||
        yr.age === yearlyResults[yearlyResults.length - 1].age ||
        yr.homeSoldThisYear ||
        yr.notes.length > 0
      );
    }

    return true; // 'all'
  });

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
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
    if (filterMode === 'milestones') return 'Milestones (5-Yr)';
    if (filterMode === 'retirement') return 'Retirement Only';
    return 'All Years';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      
      {/* Table Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Table className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              Annual Simulation Ledger & Milestone Schedule
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Year-by-year Canadian balances, contributions, withdrawals, taxes, and government pensions
          </p>
        </div>

        {/* Filter Controls & Export Button */}
        <div className="flex items-center flex-wrap gap-2.5">
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search age, notes..."
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
              Milestones (5-Yr)
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
              Retirement Only
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
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
                <span className="hidden sm:inline text-[10px] bg-emerald-200/70 text-emerald-900 px-1 py-0.2 rounded font-mono">
                  {getModeLabel()}
                </span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto max-h-[460px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Age / Phase</th>
              <th className="py-2.5 px-3 text-right">RRSP / RRIF</th>
              <th className="py-2.5 px-3 text-right">TFSA</th>
              <th className="py-2.5 px-3 text-right">FHSA</th>
              <th className="py-2.5 px-3 text-right">Non-Reg</th>
              <th className="py-2.5 px-3 text-right text-orange-800">Home Equity</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Net Worth</th>
              <th className="py-2.5 px-3 text-right">CPP</th>
              <th className="py-2.5 px-3 text-right">OAS (Net)</th>
              <th className="py-2.5 px-3 text-right">Withdrawals</th>
              <th className="py-2.5 px-3 text-right">Tax Paid</th>
              <th className="py-2.5 px-3 text-right">Spendable Cash</th>
              <th className="py-2.5 px-3">Milestone Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredData.map((row) => {
              const isRetirementMilestone = row.age === retirementAge;
              const isRrifMandatory = row.age === 71 || row.age === 72;
              const hasNotes = row.notes.length > 0;

              return (
                <tr
                  key={row.age}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isRetirementMilestone
                      ? 'bg-rose-50/60 font-semibold'
                      : isRrifMandatory
                      ? 'bg-amber-50/50'
                      : row.isRetired
                      ? 'bg-slate-50/30'
                      : 'bg-white'
                  }`}
                >
                  {/* Age & Phase */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 font-mono">
                        Age {row.age}
                        {row.isCouple && row.spouseAge !== undefined && (
                          <span className="text-[10px] text-slate-500 font-normal"> (Sp {row.spouseAge})</span>
                        )}
                      </span>
                      {isRetirementMilestone && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold">
                          Retire Target
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
                    </div>
                  </td>

                  {/* RRSP/RRIF */}
                  <td className="py-2.5 px-3 text-right text-blue-700">
                    {formatCur(row.rrspBalance)}
                  </td>

                  {/* TFSA */}
                  <td className="py-2.5 px-3 text-right text-emerald-700">
                    {formatCur(row.tfsaBalance)}
                  </td>

                  {/* FHSA */}
                  <td className="py-2.5 px-3 text-right text-amber-700">
                    {formatCur(row.fhsaBalance)}
                  </td>

                  {/* Non-Reg */}
                  <td className="py-2.5 px-3 text-right text-purple-700">
                    {formatCur(row.nonRegBalance)}
                  </td>

                  {/* Real Estate Share */}
                  <td className="py-2.5 px-3 text-right text-orange-700 font-medium">
                    {row.realEstateShare > 0 ? formatCur(row.realEstateShare) : row.homeSoldThisYear ? 'Sold' : '-'}
                  </td>

                  {/* Total Net Worth */}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatCur(row.totalNetWorth)}
                  </td>

                  {/* CPP */}
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {formatCur(row.cppIncome)}
                  </td>

                  {/* OAS */}
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {formatCur(row.oasNetIncome)}
                  </td>

                  {/* Withdrawals */}
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    {formatCur(row.totalWithdrawals)}
                  </td>

                  {/* Taxes Paid */}
                  <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                    {formatCur(row.totalTaxPaid)}
                  </td>

                  {/* Spendable Cashflow */}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatCur(row.netSpendableCashflow)}
                  </td>

                  {/* Notes */}
                  <td className="py-2.5 px-3 font-sans text-[10.5px]">
                    {hasNotes ? (
                      <span className="text-amber-800 font-medium">
                        {row.notes.join(' • ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
