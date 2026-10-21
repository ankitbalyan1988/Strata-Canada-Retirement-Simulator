import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Receipt, 
  Home, 
  Zap, 
  CreditCard, 
  HelpCircle, 
  TrendingDown, 
  TrendingUp, 
  Sparkles, 
  Percent, 
  DollarSign, 
  RefreshCw,
  CheckCircle2,
  Minus,
  Plus
} from 'lucide-react';
import { MonthlyExpenseEstimates, RealEstateInputs } from '../types/retirement';
import { CurrencyInput } from './CurrencyInput';
import { calculateMonthlyMortgagePayment } from '../utils/mortgage';

interface MonthlyExpenseEstimatorProps {
  expenses?: MonthlyExpenseEstimates;
  currentAnnualIncome: number;
  spouseAnnualIncome?: number;
  realEstate?: RealEstateInputs;
  targetRetirementSpendingToday: number;
  onUpdateExpenses: (expenses: MonthlyExpenseEstimates, newTargetSpending?: number) => void;
}

export const DEFAULT_MONTHLY_EXPENSES: MonthlyExpenseEstimates = {
  rentOrMortgage: 2200,
  utilities: 450,
  creditCard: 1800,
  otherExpenses: 550,
  postRetirementAdjustmentPercent: -20,
  autoSyncMortgage: true
};

export const MonthlyExpenseEstimator: React.FC<MonthlyExpenseEstimatorProps> = ({
  expenses,
  currentAnnualIncome,
  spouseAnnualIncome = 0,
  realEstate,
  targetRetirementSpendingToday,
  onUpdateExpenses
}) => {
  const currentExpenses = useMemo(() => {
    return expenses || DEFAULT_MONTHLY_EXPENSES;
  }, [expenses]);

  const [localAdjustment, setLocalAdjustment] = useState<number>(() => {
    return currentExpenses.postRetirementAdjustmentPercent ?? -20;
  });

  // Sync local adjustment if external expenses change
  useEffect(() => {
    if (typeof currentExpenses.postRetirementAdjustmentPercent === 'number') {
      setLocalAdjustment(currentExpenses.postRetirementAdjustmentPercent);
    }
  }, [currentExpenses.postRetirementAdjustmentPercent]);

  const mortgagePayment = useMemo(() => {
    return calculateMonthlyMortgagePayment(realEstate);
  }, [realEstate]);

  const hasMortgage = Boolean(realEstate?.ownsHome && mortgagePayment > 0);
  const initialSyncRef = React.useRef(false);

  // Automatically sync mortgage payment once if homeowner with mortgage and autoSyncMortgage is enabled
  useEffect(() => {
    if (hasMortgage && currentExpenses.autoSyncMortgage && !initialSyncRef.current) {
      initialSyncRef.current = true;
      if (currentExpenses.rentOrMortgage !== mortgagePayment) {
        onUpdateExpenses({
          ...currentExpenses,
          rentOrMortgage: mortgagePayment
        });
      }
    }
  }, [hasMortgage, mortgagePayment, currentExpenses.autoSyncMortgage]);

  const totalMonthly =
    (currentExpenses.rentOrMortgage || 0) +
    (currentExpenses.utilities || 0) +
    (currentExpenses.creditCard || 0) +
    (currentExpenses.otherExpenses || 0);

  const totalAnnual = totalMonthly * 12;
  const householdIncome = currentAnnualIncome + spouseAnnualIncome;
  const percentOfSalary = householdIncome > 0 ? ((totalAnnual / householdIncome) * 100).toFixed(1) : '0';

  const adjustment = typeof currentExpenses.postRetirementAdjustmentPercent === 'number'
    ? currentExpenses.postRetirementAdjustmentPercent
    : localAdjustment;

  const projectedPostRetirementAnnual = Math.max(10000, Math.round(totalAnnual * (1 + adjustment / 100)));
  const projectedPostRetirementMonthly = Math.round(projectedPostRetirementAnnual / 12);

  const isSyncedWithTarget = Math.abs(targetRetirementSpendingToday - projectedPostRetirementAnnual) < 50;

  const handleFieldChange = (field: keyof MonthlyExpenseEstimates, value: any) => {
    const updated: MonthlyExpenseEstimates = {
      ...currentExpenses,
      [field]: value
    };
    if (field === 'rentOrMortgage') {
      updated.autoSyncMortgage = false; // User manually customized
    }
    const newAnnual =
      ((field === 'rentOrMortgage' ? value : currentExpenses.rentOrMortgage || 0) +
        (field === 'utilities' ? value : currentExpenses.utilities || 0) +
        (field === 'creditCard' ? value : currentExpenses.creditCard || 0) +
        (field === 'otherExpenses' ? value : currentExpenses.otherExpenses || 0)) *
      12;
    const newPostRetirement = Math.max(
      10000,
      Math.round(newAnnual * (1 + (updated.postRetirementAdjustmentPercent ?? adjustment) / 100))
    );
    onUpdateExpenses(updated, newPostRetirement);
  };

  const handleSliderChange = (newAdjustment: number) => {
    const clamped = Math.max(-50, Math.min(50, Math.round(newAdjustment)));
    setLocalAdjustment(clamped);
    const updated: MonthlyExpenseEstimates = {
      ...currentExpenses,
      postRetirementAdjustmentPercent: clamped
    };
    const newPostRetirement = Math.max(10000, Math.round(totalAnnual * (1 + clamped / 100)));
    onUpdateExpenses(updated, newPostRetirement);
  };

  const handleResetToMortgage = () => {
    if (mortgagePayment > 0) {
      handleFieldChange('rentOrMortgage', mortgagePayment);
      onUpdateExpenses({
        ...currentExpenses,
        rentOrMortgage: mortgagePayment,
        autoSyncMortgage: true
      });
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-4 shadow-2xs transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                Monthly Living Expenses (Today's Dollars)
              </h5>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Budget Estimator
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Estimate your actual household living costs to determine realistic retirement replacement spending
            </p>
          </div>
        </div>

        {/* Live Salary Metric Pill */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-xs shadow-2xs">
          <span className="text-slate-500 text-[11px]">Living Costs / Salary:</span>
          <span className="font-mono font-extrabold text-indigo-700">{percentOfSalary}%</span>
          <span className="text-[10px] text-slate-400">(${totalAnnual.toLocaleString()}/yr)</span>
        </div>
      </div>

      {/* 4 Expense Category Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Bucket 1: Rent / Mortgage */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-amber-600" />
                {realEstate?.purchaseType === 'future' ? 'Current Rent' : (realEstate?.ownsHome ? 'Mortgage' : 'Monthly Rent')}
              </label>
              {realEstate?.purchaseType === 'future' ? (
                <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  Renting (Buys @ {realEstate.futurePurchaseAge || 'Future'})
                </span>
              ) : hasMortgage && (
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {currentExpenses.autoSyncMortgage ? 'Mortgage Synced' : 'Custom'}
                </span>
              )}
            </div>
            <CurrencyInput
              value={currentExpenses.rentOrMortgage}
              onChange={(val) => handleFieldChange('rentOrMortgage', val)}
              min={0}
              step={100}
              aria-label="Monthly Rent or Mortgage"
            />
          </div>
          <div className="mt-1.5 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Primary housing cost</span>
            {hasMortgage && !currentExpenses.autoSyncMortgage && (
              <button
                type="button"
                onClick={handleResetToMortgage}
                className="text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-0.5 text-[9.5px]"
                title={`Reset to mortgage payment of $${mortgagePayment.toLocaleString()}/mo`}
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Reset (${mortgagePayment})
              </button>
            )}
          </div>
        </div>

        {/* Bucket 2: Utilities */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Utilities
            </label>
            <CurrencyInput
              value={currentExpenses.utilities}
              onChange={(val) => handleFieldChange('utilities', val)}
              min={0}
              step={50}
              aria-label="Monthly Utilities"
            />
          </div>
          <span className="mt-1.5 text-[10px] text-slate-500 block">
            Hydro, heating/gas, water, internet & phone
          </span>
        </div>

        {/* Bucket 3: Credit Card Expenses */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
              Credit Card Expenses
            </label>
            <CurrencyInput
              value={currentExpenses.creditCard}
              onChange={(val) => handleFieldChange('creditCard', val)}
              min={0}
              step={100}
              aria-label="Monthly Credit Card Expenses"
            />
          </div>
          <span className="mt-1.5 text-[10px] text-slate-500 block">
            Groceries, dining, transportation, retail & subs
          </span>
        </div>

        {/* Bucket 4: Other Expenses (Catch-all) */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              Other Expenses (Catch-All)
            </label>
            <CurrencyInput
              value={currentExpenses.otherExpenses}
              onChange={(val) => handleFieldChange('otherExpenses', val)}
              min={0}
              step={50}
              aria-label="Other Monthly Expenses"
            />
          </div>
          <span className="mt-1.5 text-[10px] text-slate-500 block">
            Insurance, medical/dental, entertainment, misc
          </span>
        </div>
      </div>

      {/* Calculated Total & Post-Retirement Shift Slider */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-indigo-100 flex flex-col gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Current Monthly Total:</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              ${totalMonthly.toLocaleString()}/mo
            </span>
            <span className="text-xs text-slate-400">(${totalAnnual.toLocaleString()}/yr)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Post-Retirement Shift:</span>

            {/* Quick +/- Steppers */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => handleSliderChange(Math.max(-50, adjustment - 5))}
                disabled={adjustment <= -50}
                className="px-2 py-1 rounded text-slate-700 hover:text-slate-900:text-white hover:bg-white:bg-slate-700 active:scale-95 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 font-semibold text-xs"
                title="Decrease post-retirement expenses by 5%"
                aria-label="Decrease post-retirement shift by 5%"
              >
                <Minus className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">-5%</span>
              </button>
              <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5"></div>
              <button
                type="button"
                onClick={() => handleSliderChange(Math.min(50, adjustment + 5))}
                disabled={adjustment >= 50}
                className="px-2 py-1 rounded text-slate-700 hover:text-slate-900:text-white hover:bg-white:bg-slate-700 active:scale-95 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 font-semibold text-xs"
                title="Increase post-retirement expenses by 5%"
                aria-label="Increase post-retirement shift by 5%"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">+5%</span>
              </button>
            </div>

            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                adjustment < 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : adjustment > 0
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {adjustment > 0 ? `+${adjustment}%` : `${adjustment}%`}
            </span>
          </div>
        </div>

        {/* Slider for Post-Retirement Expense Adjustment */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              {adjustment < 0 ? (
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              ) : adjustment > 0 ? (
                <TrendingUp className="w-4 h-4 text-amber-600" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-600" />
              )}
              Expect expenses to change post-retirement?
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {adjustment < 0
                ? `${Math.abs(adjustment)}% decrease (mortgage cleared, zero commute)`
                : adjustment > 0
                ? `${adjustment}% increase (extended travel & leisure)`
                : 'Identical spending (0% change)'}
            </span>
          </div>

          <div className="relative py-1">
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={adjustment}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              onInput={(e) => handleSliderChange(Number((e.target as HTMLInputElement).value))}
              className="w-full h-3 rounded-lg cursor-pointer accent-indigo-600 bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((adjustment + 50) / 100) * 100}%, #cbd5e1 ${((adjustment + 50) / 100) * 100}%, #cbd5e1 100%)`
              }}
              aria-label="Post-retirement expense adjustment percentage"
            />
          </div>

          {/* Clickable Quick Preset Buttons */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono flex-wrap gap-1 pt-0.5">
            {[
              { val: -50, label: '-50% (Lean / Downsized)' },
              { val: -20, label: '-20% (Typical Canadian)' },
              { val: 0, label: '0% (Equal)' },
              { val: 25, label: '+25% (Active Lifestyle)' },
              { val: 50, label: '+50% (Luxury Travel)' }
            ].map(preset => (
              <button
                key={preset.val}
                type="button"
                onClick={() => handleSliderChange(preset.val)}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  adjustment === preset.val
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs ring-2 ring-indigo-400/40'
                    : 'text-slate-600 hover:text-slate-900:text-white bg-slate-100 hover:bg-slate-200/80:bg-slate-700 border border-slate-200/60'
                }`}
                title={`Set shift to ${preset.val}%`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex flex-wrap items-center justify-between gap-3 mt-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
              Calculated Target Retirement Spending
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-black text-indigo-950 font-mono">
                ${projectedPostRetirementAnnual.toLocaleString()}
              </span>
              <span className="text-xs text-indigo-700 font-semibold font-mono">
                / year (${projectedPostRetirementMonthly.toLocaleString()}/month)
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              In today's purchasing power (compounds with CPI inflation in retirement)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Auto-Synced to Plan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

