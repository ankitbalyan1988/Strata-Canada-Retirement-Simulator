import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const DrawdownStrategyTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const { updateField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      maritalStatus: state.inputs.maritalStatus,
      drawdownStrategy: state.inputs.drawdownStrategy
    }))
  );

  const isMarried = (externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus) === 'married';
  const drawdownStrategy = externalInputs ? externalInputs.drawdownStrategy : storeSlice.drawdownStrategy;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Post-Retirement Drawdown Sequencing</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose how {isMarried ? 'household' : 'personal'} assets are liquidated to minimize Canadian taxes
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div
          onClick={() => updateField('drawdownStrategy', 'tax_efficient')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'tax_efficient'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">1. Tax-Efficient Classic</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              Recommended
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-indigo-700 dark:text-indigo-400">Non-Reg first → RRSP/RRIF second → TFSA last.</span>
          </p>
        </div>

        <div
          onClick={() => updateField('drawdownStrategy', 'rrsp_meltdown')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'rrsp_meltdown'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">2. RRSP Meltdown</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
              Bracket Smoothing
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-blue-700 dark:text-blue-400">Early RRSP draws before age 71 to fill lower tax brackets.</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Calculates optimal break-even age to prevent OAS clawbacks & estate taxes.</span>
          </p>
        </div>

        <div
          onClick={() => updateField('drawdownStrategy', 'proportional')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'proportional'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">3. Proportional (Pro-Rata)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Balanced
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Withdraws evenly across accounts based on asset weighting.
          </p>
        </div>

        <div
          onClick={() => updateField('drawdownStrategy', 'tfsa_first')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'tfsa_first'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">4. TFSA First</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
              Zero-Tax Early
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Depletes TFSA first to achieve zero tax early in retirement.
          </p>
        </div>

        <div
          onClick={() => updateField('drawdownStrategy', 'minimize_overall_tax')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'minimize_overall_tax'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">5. Minimize Overall Tax</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              Lifetime Optimizer
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Equalizes taxable income across all career & retirement brackets.</span>
          </p>
        </div>

        <div
          onClick={() => updateField('drawdownStrategy', 'maximize_govt_pensions')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'maximize_govt_pensions'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">6. Maximize Govt Pensions</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300">
              CPP/OAS Maximizer
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-cyan-700 dark:text-cyan-400">Bridges with portfolio to Age 70 for +42% permanent indexed benefits.</span>
          </p>
        </div>

        <div
          onClick={() => updateField('drawdownStrategy', 'minimize_post_retirement_tax')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
            drawdownStrategy === 'minimize_post_retirement_tax'
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">7. Minimize Post-Retirement Tax</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300">
              Decumulation Focus
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-purple-700 dark:text-purple-400">Keeps withdrawals strictly within BPA & lowest brackets; rest tax-free.</span>
          </p>
        </div>

      </div>
    </div>
  );
});

DrawdownStrategyTab.displayName = 'DrawdownStrategyTab';
