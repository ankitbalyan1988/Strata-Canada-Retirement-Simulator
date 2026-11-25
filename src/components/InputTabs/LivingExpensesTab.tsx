import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RetirementInputs } from '../../types/retirement';
import { MonthlyExpenseEstimator } from '../MonthlyExpenseEstimator';
import { CurrencyInput } from '../CurrencyInput';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const LivingExpensesTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
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
    </div>
  );
});

LivingExpensesTab.displayName = 'LivingExpensesTab';
