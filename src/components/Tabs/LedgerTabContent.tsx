import React from 'react';
import { MilestoneTable } from '../MilestoneTable';
import { RrspBreakEvenModule } from '../RrspBreakEvenModule';
import { Calendar, FileSpreadsheet, Scale, Info } from 'lucide-react';

export const LedgerTabContent: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Annual Ledger Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Annual Simulation Ledger & Milestone Schedule
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Year-by-Year Accounting
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  CRA Tax Breakdown
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Comprehensive calendar-by-calendar schedule of earned income, account balances (RRSP, TFSA, FHSA, Non-Reg), government pensions (CPP, OAS), tax liabilities, and decumulation drawdowns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Annual Simulation Ledger Table */}
      <MilestoneTable />

      {/* 2. RRSP/RRIF Break-Even Withdrawal Analysis Module (Placed directly below main ledger) */}
      <RrspBreakEvenModule />
    </div>
  );
};
