import React, { useState, useMemo } from 'react';
import { ScenarioSimulationDetails } from '../utils/stressTestHealthCalculator';
import { RetirementInputs } from '../types/retirement';
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
  DollarSign
} from 'lucide-react';

interface StressScenarioLedgerProps {
  scenarioDetails: ScenarioSimulationDetails;
  inputs: RetirementInputs;
}

export const StressScenarioLedger: React.FC<StressScenarioLedgerProps> = ({
  scenarioDetails,
  inputs
}) => {
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

  const [filterMode, setFilterMode] = useState<'all' | 'retirement' | 'shock'>('retirement');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAge, setExpandedAge] = useState<number | null>(null);

  const formatCur = (val: number) => {
    if (val === 0) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Filtered dataset
  const filteredRows = useMemo(() => {
    return yearlyResults.filter((yr) => {
      // Search
      if (searchTerm) {
        const matchAge = String(yr.age).includes(searchTerm);
        const matchNotes = yr.notes.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchAge && !matchNotes) return false;
      }

      if (filterMode === 'retirement') {
        return yr.isRetired;
      }

      if (filterMode === 'shock') {
        // Window from shock age minus 1 to shock age plus 8, or up to depletion age
        const endAge = depletionAge ? Math.min(inputs.lifeExpectancy, depletionAge + 2) : shockAge + 8;
        return yr.age >= Math.max(inputs.currentAge, shockAge - 1) && yr.age <= endAge;
      }

      return true; // 'all'
    });
  }, [yearlyResults, filterMode, searchTerm, shockAge, depletionAge, inputs]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Age',
      'Calendar Year',
      'Stage',
      'Total Net Worth',
      'Investment Growth',
      'RRSP/RRIF Balance',
      'TFSA Balance',
      'Non-Reg Balance',
      'Home Equity',
      'Living Expenses (Target)',
      'CPP Pension',
      'OAS Pension (Net)',
      'Total Withdrawals',
      'Total Tax Paid',
      'Solvency Shortfall',
      'Scenario Audit Notes'
    ];

    const rows = filteredRows.map((yr) => [
      yr.age,
      yr.year,
      yr.isRetired ? 'Retired' : 'Working',
      Math.round(yr.totalNetWorth),
      Math.round(yr.totalInvestmentGrowth),
      Math.round(yr.rrspBalance + yr.rrifBalance),
      Math.round(yr.tfsaBalance),
      Math.round(yr.nonRegBalance),
      Math.round(yr.homeEquity),
      Math.round(yr.targetSpendingNominal),
      Math.round(yr.cppIncome),
      Math.round(yr.oasNetIncome),
      Math.round(yr.totalWithdrawals),
      Math.round(yr.totalTaxPaid),
      Math.round(yr.cashflowGap),
      `"${yr.notes.join('; ').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stress_test_${scenarioDef.id}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* 1. Mathematical Reconciliation Header & Bridge */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {scenarioDef.name} — Actuarial Simulation Ledger & Math Audit
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  isSolvent
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                }`}>
                  {isSolvent ? '100% Solvent' : depletionAge ? `Depleted @ Age ${depletionAge}` : 'Under-Funded'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step-by-step verification of compounding, market drawdowns, living withdrawals, and statutory CRA taxes leading to Terminal Wealth.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Download full scenario calculation ledger as CSV for verification in Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export Scenario CSV</span>
            </button>
          </div>
        </div>

        {/* Mathematical Cash Flow Bridge Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Item 1: Nest Egg at Retirement */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Portfolio @ Retire
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {formatCur(summary.netWorthAtRetirement)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Age {inputs.retirementAge} starting wealth
            </span>
          </div>

          {/* Item 2: Shock Drawdown */}
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Scenario Shock
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
                {shockDropPercent > 0 ? `-${shockDropPercent}%` : '+Years'}
              </span>
            </div>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 truncate">
              {shockDropPercent > 0 ? `Shock @ Age ${shockAge}` : `Longevity to 95+`}
            </span>
          </div>

          {/* Item 3: Investment Growth */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Net Growth
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                +{formatCur(totalInvestmentGrowth)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Post-shock return
            </span>
          </div>

          {/* Item 4: Government Pensions */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              CPP & OAS Received
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                +{formatCur(totalPensionsReceived)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Guaranteed floor
            </span>
          </div>

          {/* Item 5: Living Expenses & Taxes */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Living Spend & Tax
            </span>
            <div className="my-1">
              <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400">
                -{formatCur(totalLivingExpenses + totalTaxesPaid)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {formatCur(totalLivingExpenses)} spend + {formatCur(totalTaxesPaid)} tax
            </span>
          </div>

          {/* Item 6: Terminal Wealth */}
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
              <span className={`text-sm sm:text-base font-extrabold ${
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

        {/* Actuarial Math Notes Callout */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-900 dark:text-white">
              Calculation Logic for {scenarioDef.name}:
            </span>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {scenarioDef.description} Every annual row below incorporates statutory Canadian indexing: registered minimums (RRIF at 71/72), tax brackets indexed to inflation, CPP/OAS clawback defense, and account sequencing (drawdowns first from Non-Reg, then RRSP, and finally tax-free TFSA reserves).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Ledger Table & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Table className="w-3.5 h-3.5" />
            </span>
            <h5 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              Annual Simulation Ledger — {filteredRows.length} Projected Years
            </h5>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search age, shock..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-200 w-28 sm:w-36"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('retirement')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'retirement'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Retirement Only
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

        {/* Table Container */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/90 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 min-w-[140px]">Age / Phase</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800/60 min-w-[110px]">
                  Total Net Worth
                </th>
                <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 min-w-[100px]">
                  Inv Growth
                </th>
                <th className="py-2.5 px-3 text-right min-w-[95px]">RRSP / RRIF</th>
                <th className="py-2.5 px-3 text-right min-w-[85px]">TFSA</th>
                <th className="py-2.5 px-3 text-right min-w-[85px]">Non-Reg</th>
                <th className="py-2.5 px-3 text-right text-orange-600 dark:text-orange-400 min-w-[95px]">Home Equity</th>
                <th className="py-2.5 px-3 text-right min-w-[105px]">Living Spend</th>
                <th className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400 min-w-[90px]">CPP & OAS</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">Drawdown</th>
                <th className="py-2.5 px-3 text-right min-w-[95px]">Tax Paid</th>
                <th className="py-2.5 px-3 text-center min-w-[105px]">Solvency Status</th>
                <th className="py-2.5 px-3 min-w-[200px]">Calculation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans text-xs">
                    No simulation years match the current filter criteria.
                  </td>
                </tr>
              ) : null}

              {filteredRows.map((row) => {
                const isShockYear = (shockDropPercent > 0 && row.age === shockAge);
                const isDepletedYear = (depletionAge !== null && row.age === depletionAge);
                const isRetireTarget = (row.age === inputs.retirementAge);
                const isExhausted = row.totalNetWorth <= 0 && row.isRetired;
                const isExpanded = expandedAge === row.age;

                return (
                  <React.Fragment key={row.age}>
                    <tr
                      onClick={() => setExpandedAge(isExpanded ? null : row.age)}
                      className={`hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition cursor-pointer ${
                        isShockYear
                          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-l-4 border-rose-600 font-semibold'
                          : isDepletedYear
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-l-4 border-amber-600 font-semibold'
                          : isRetireTarget
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
                          : isExhausted
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
                          : row.isRetired
                          ? 'bg-slate-50/40 dark:bg-slate-800/30'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* Age & Stage */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                            Age {row.age}
                          </span>

                          {isShockYear && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold flex items-center gap-0.5 shadow-2xs">
                              <Zap className="w-2.5 h-2.5" />
                              <span>-{shockDropPercent}% Shock</span>
                            </span>
                          )}

                          {isDepletedYear && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-600 text-white font-bold flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Depleted</span>
                            </span>
                          )}

                          {isRetireTarget && !isShockYear && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                              Retire Day
                            </span>
                          )}

                          {!row.isRetired && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Work
                            </span>
                          )}
                          {row.isRetired && !isShockYear && !isDepletedYear && !isRetireTarget && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                              Retire
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Net Worth */}
                      <td className="py-2.5 px-3 text-right font-bold bg-slate-100/40 dark:bg-slate-800/40">
                        <span className={
                          row.totalNetWorth > 0
                            ? 'text-slate-900 dark:text-white'
                            : 'text-rose-600 dark:text-rose-400'
                        }>
                          {formatCur(row.totalNetWorth)}
                        </span>
                      </td>

                      {/* Inv Growth */}
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                        {row.totalInvestmentGrowth !== 0 ? (
                          <span>+{formatCur(row.totalInvestmentGrowth)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* RRSP / RRIF */}
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {formatCur(row.rrspBalance + row.rrifBalance)}
                      </td>

                      {/* TFSA */}
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {formatCur(row.tfsaBalance)}
                      </td>

                      {/* Non-Reg */}
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {formatCur(row.nonRegBalance)}
                      </td>

                      {/* Home Equity */}
                      <td className="py-2.5 px-3 text-right text-orange-600 dark:text-orange-400">
                        {formatCur(row.homeEquity)}
                      </td>

                      {/* Living Spend */}
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {row.isRetired ? formatCur(row.targetSpendingNominal) : '-'}
                      </td>

                      {/* CPP & OAS */}
                      <td className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400 font-semibold">
                        {(row.cppIncome + row.oasNetIncome) > 0 ? (
                          formatCur(row.cppIncome + row.oasNetIncome)
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total Withdrawals */}
                      <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">
                        {row.totalWithdrawals > 0 ? formatCur(row.totalWithdrawals) : '-'}
                      </td>

                      {/* Taxes Paid */}
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {row.totalTaxPaid > 0 ? (
                          <span>
                            {formatCur(row.totalTaxPaid)}
                            <span className="text-[9.5px] text-slate-400 block">
                              ({(row.effectiveTaxRate || 0).toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">$0</span>
                        )}
                      </td>

                      {/* Solvency Status */}
                      <td className="py-2.5 px-3 text-center">
                        {row.cashflowGap > 0 ? (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            Shortfall -{formatCur(row.cashflowGap)}
                          </span>
                        ) : row.totalNetWorth > 0 ? (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            Solvent
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Exhausted
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-2.5 px-3 font-sans text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {row.notes.length > 0 ? (
                          <span title={row.notes.join('; ')}>
                            {row.notes[0]}
                            {row.notes.length > 1 && ` (+${row.notes.length - 1} more)`}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">Standard decumulation</span>
                        )}
                      </td>
                    </tr>

                    {/* Detailed Row Inspection Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-100/90 dark:bg-slate-800/80 font-sans text-xs">
                        <td colSpan={13} className="p-4 border-y border-slate-200 dark:border-slate-700">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Calculator className="w-4 h-4 text-rose-500" />
                                <span>Age {row.age} Cash Flow & Balance Verification Math:</span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Click row again to collapse
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Inflows & Pensions
                                </span>
                                <div className="space-y-0.5 mt-1 font-mono text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Employment:</span>
                                    <span>{formatCur(row.employmentIncome)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">CPP Pension:</span>
                                    <span>{formatCur(row.cppIncome)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">OAS Pension:</span>
                                    <span>{formatCur(row.oasNetIncome)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Decumulation Drawdowns
                                </span>
                                <div className="space-y-0.5 mt-1 font-mono text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">RRSP/RRIF Draw:</span>
                                    <span>{formatCur(row.rrspWithdrawal + row.rrifWithdrawal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">TFSA Draw:</span>
                                    <span>{formatCur(row.tfsaWithdrawal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Non-Reg Draw:</span>
                                    <span>{formatCur(row.nonRegWithdrawal)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Tax & Outflows
                                </span>
                                <div className="space-y-0.5 mt-1 font-mono text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Living Target:</span>
                                    <span>{formatCur(row.targetSpendingNominal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Taxable Income:</span>
                                    <span>{formatCur(row.taxableIncome)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Total Tax:</span>
                                    <span className="text-rose-600 font-bold">{formatCur(row.totalTaxPaid)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Ending Balances
                                </span>
                                <div className="space-y-0.5 mt-1 font-mono text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Liquid Portfolio:</span>
                                    <span>{formatCur(row.rrspBalance + row.rrifBalance + row.tfsaBalance + row.nonRegBalance)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Home Equity:</span>
                                    <span>{formatCur(row.homeEquity)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 pt-0.5">
                                    <span className="text-slate-700 dark:text-slate-300">Total Net Worth:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">{formatCur(row.totalNetWorth)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {row.notes.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300">
                                <span className="font-bold block mb-1">Year Audit Log:</span>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {row.notes.map((n, idx) => (
                                    <li key={idx}>{n}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">Simulation Summary:</span>
            <span>Years Modeled: <strong className="text-slate-900 dark:text-white">{yearlyResults.length}</strong></span>
            <span>•</span>
            <span>Retirement Span: <strong className="text-slate-900 dark:text-white">{totalYearsInRetirement} Yrs</strong></span>
            <span>•</span>
            <span>Solvency: <strong className={isSolvent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {isSolvent ? '100% Funded' : `${yearsFunded} of ${totalYearsInRetirement} Years`}
            </strong></span>
          </div>

          <div className="text-[11px] text-slate-400">
            Click any row to inspect line-item mathematical breakdown
          </div>
        </div>
      </div>
    </div>
  );
};
