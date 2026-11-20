import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { RetirementInputs } from '../../types/retirement';
import { MonthlyExpenseEstimator } from '../MonthlyExpenseEstimator';
import { CurrencyInput } from '../CurrencyInput';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const LivingExpensesTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const setActiveTab = useSimulationStore((state) => state.setActiveInputTab);
  const { dispatchInputsChange, updateField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      maritalStatus: state.inputs.maritalStatus,
      monthlyExpenses: state.inputs.monthlyExpenses,
      currentAnnualIncome: state.inputs.currentAnnualIncome,
      spouseAnnualIncome: state.inputs.spouse?.annualIncome || 0,
      realEstate: state.inputs.realEstate,
      targetRetirementSpendingToday: state.inputs.targetRetirementSpendingToday
    }))
  );

  const isMarried = (externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus) === 'married';
  const monthlyExpenses = externalInputs ? externalInputs.monthlyExpenses : storeSlice.monthlyExpenses;
  const currentAnnualIncome = externalInputs ? externalInputs.currentAnnualIncome : storeSlice.currentAnnualIncome;
  const spouseAnnualIncome = externalInputs ? (externalInputs.spouse?.annualIncome || 0) : storeSlice.spouseAnnualIncome;
  const realEstate = externalInputs ? externalInputs.realEstate : storeSlice.realEstate;
  const targetRetirementSpendingToday = externalInputs
    ? externalInputs.targetRetirementSpendingToday
    : storeSlice.targetRetirementSpendingToday;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            {isMarried ? 'Household Living Expenses & Retirement Budget' : 'Living Expenses & Retirement Budget'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMarried
              ? 'Estimate combined household monthly living costs in today\'s dollars to determine realistic retirement replacement spending.'
              : 'Estimate your monthly living costs in today\'s dollars to determine realistic retirement replacement spending.'}
          </p>
        </div>
      </div>

      {/* Monthly Living Expenses Estimator Component */}
      <MonthlyExpenseEstimator
        expenses={monthlyExpenses}
        currentAnnualIncome={currentAnnualIncome}
        spouseAnnualIncome={spouseAnnualIncome}
        realEstate={realEstate}
        targetRetirementSpendingToday={targetRetirementSpendingToday}
        onUpdateExpenses={(newExpenses, newSpending) => {
          dispatchInputsChange((prev: RetirementInputs) => {
            const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
            return {
              ...base,
              monthlyExpenses: newExpenses,
              ...(newSpending !== undefined ? { targetRetirementSpendingToday: newSpending } : {})
            };
          });
        }}
      />

      {/* Target Retirement Spending Summary / Direct Override */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/90 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
        <div>
          <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            {isMarried
              ? 'Combined Household Retirement Annual Target (Today\'s Dollars)'
              : 'Personal Retirement Annual Spending Target (Today\'s Dollars)'}
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Auto-calculated from your monthly living expenses with post-retirement shift applied (or customize manually)
          </span>
        </div>
        <div className="w-full sm:w-48">
          <CurrencyInput
            value={targetRetirementSpendingToday}
            onChange={(val) => updateField('targetRetirementSpendingToday', val)}
            min={10000}
            step={2500}
            aria-label="Target Annual Spending"
          />
        </div>
      </div>

      {/* Navigation Buttons: Previous and Next */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Primary Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>Continue to Primary Accounts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

LivingExpensesTab.displayName = 'LivingExpensesTab';
