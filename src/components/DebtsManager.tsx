import React, { useState, useMemo, startTransition } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  GraduationCap, 
  Car, 
  Banknote, 
  BadgePercent, 
  Calendar, 
  ShieldCheck, 
  Info,
  DollarSign,
  TrendingDown,
  Sparkles,
  Zap,
  Snowflake,
  ArrowRight,
  TrendingUp,
  Clock,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { DebtItem, DebtCategory, DebtRepaymentStrategy } from '../types/retirement';
import { 
  CANADIAN_DEBT_PRESETS, 
  calculateDebtMonthlyPayment, 
  calculateTotalDebtInterest,
  calculateEarlyPayoffComparison,
  DebtPreset 
} from '../utils/debtCalculator';
import { CurrencyInput } from './CurrencyInput';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';

export interface DebtsManagerProps {
  debts?: DebtItem[];
  currentAge: number;
  retirementAge?: number;
  debtStrategy?: DebtRepaymentStrategy;
  isFutureOnlyMode?: boolean;
  onUpdateDebts?: (debts: DebtItem[]) => void;
  onUpdateStrategy?: (strategy: DebtRepaymentStrategy) => void;
  onChange?: (debts: DebtItem[]) => void;
}

const CATEGORY_CONFIG: Record<DebtCategory, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  student_loan: { label: 'Student Loan', icon: GraduationCap, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
  vehicle_loan: { label: 'Vehicle Financing', icon: Car, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  personal_loan: { label: 'Personal Loan', icon: Banknote, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' },
  line_of_credit: { label: 'Line of Credit', icon: CreditCard, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20' },
  credit_card: { label: 'Credit Card', icon: CreditCard, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' },
  other: { label: 'Other Debt', icon: Banknote, color: 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20' }
};

export const DebtsManager: React.FC<DebtsManagerProps> = ({
  debts: propDebts,
  currentAge,
  retirementAge: propRetirementAge,
  debtStrategy: propDebtStrategy,
  isFutureOnlyMode = false,
  onUpdateDebts,
  onUpdateStrategy,
  onChange
}) => {
  const storeDebts = useSimulationStore(useShallow((state) => state.inputs.debts));
  const storeRetirementAge = useSimulationStore((state) => state.inputs.retirementAge);
  const storeDebtStrategy = useSimulationStore(useShallow((state) => state.inputs.debtStrategy));
  const storeUpdateField = useSimulationStore((state) => state.updateField);

  const rawDebts = propDebts ?? storeDebts ?? [];
  const retirementAge = propRetirementAge ?? storeRetirementAge ?? 65;
  const defaultFutureStartAge = Math.max(currentAge + 1, Math.min(retirementAge, currentAge + 3));

  const debts = useMemo(() => {
    if (!isFutureOnlyMode) return rawDebts;
    return rawDebts.map((d) => ({
      ...d,
      startAge: d.startAge !== undefined && d.startAge > currentAge ? d.startAge : defaultFutureStartAge
    }));
  }, [rawDebts, isFutureOnlyMode, currentAge, defaultFutureStartAge]);

  const currentStrategy: DebtRepaymentStrategy = propDebtStrategy ?? storeDebtStrategy ?? {
    acceleratePayoff: false,
    extraMonthlyPayment: 0,
    strategyType: 'avalanche',
    targetPayoffAge: undefined,
    redirectFreedCashflowToSavings: true
  };

  const [expandedCustomDebtId, setExpandedCustomDebtId] = useState<string | null>(null);

  const handleUpdateDebtsList = (newDebts: DebtItem[]) => {
    if (onUpdateDebts) {
      onUpdateDebts(newDebts);
    }
    if (onChange) {
      onChange(newDebts);
    }
    if (!onUpdateDebts && !onChange) {
      storeUpdateField('debts', newDebts);
    }
  };

  const handleUpdateStrategy = (patch: Partial<DebtRepaymentStrategy>) => {
    const updated: DebtRepaymentStrategy = {
      ...currentStrategy,
      ...patch
    };
    startTransition(() => {
      if (onUpdateStrategy) {
        onUpdateStrategy(updated);
      } else {
        storeUpdateField('debtStrategy', updated);
      }
    });
  };

  const handleAddPreset = (preset: DebtPreset) => {
    const newDebt: DebtItem = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: preset.name,
      category: preset.category,
      initialBalance: preset.initialBalance,
      interestRate: preset.interestRate,
      remainingTermMonths: preset.remainingTermMonths,
      startAge: isFutureOnlyMode ? defaultFutureStartAge : currentAge,
      notes: preset.description
    };
    handleUpdateDebtsList([...debts, newDebt]);
  };

  const handleAddCustomDebt = () => {
    const newDebt: DebtItem = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: isFutureOnlyMode ? 'Future Loan' : 'Personal Loan',
      category: 'personal_loan',
      initialBalance: 10000,
      interestRate: 7.5,
      remainingTermMonths: 36,
      startAge: isFutureOnlyMode ? defaultFutureStartAge : currentAge
    };
    handleUpdateDebtsList([...debts, newDebt]);
  };

  const handleUpdateDebt = (id: string, patch: Partial<DebtItem>) => {
    const updated = debts.map((d) => (d.id === id ? { ...d, ...patch } : d));
    handleUpdateDebtsList(updated);
  };

  const handleDeleteDebt = (id: string) => {
    const updated = debts.filter((d) => d.id !== id);
    handleUpdateDebtsList(updated);
  };

  // Aggregate Metrics
  const totalPrincipal = debts.reduce((sum, d) => sum + (Number(d.initialBalance) || 0), 0);
  const totalMonthlyService = debts.reduce((sum, d) => {
    const bal = Number(d.initialBalance) || 0;
    const rate = Number(d.interestRate) || 0;
    const term = Number(d.remainingTermMonths) || 60;
    const pmt = (d.monthlyPayment && d.monthlyPayment > 0)
      ? d.monthlyPayment
      : calculateDebtMonthlyPayment(bal, rate, term);
    return sum + pmt;
  }, 0);
  const totalAnnualService = Math.round(totalMonthlyService * 12);
  const totalLifetimeInterest = debts.reduce((sum, d) => {
    const bal = Number(d.initialBalance) || 0;
    const rate = Number(d.interestRate) || 0;
    const term = Number(d.remainingTermMonths) || 60;
    return sum + calculateTotalDebtInterest(bal, rate, term, d.monthlyPayment);
  }, 0);

  // Early Payoff Comparison
  const comparison = useMemo(() => {
    return calculateEarlyPayoffComparison(
      debts,
      currentAge,
      retirementAge,
      currentStrategy
    );
  }, [debts, currentAge, retirementAge, currentStrategy]);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <CreditCard className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base">
              {isFutureOnlyMode ? 'Future Debts, Loans & Planned Borrowing' : 'Consumer Debts, Loans & Liabilities'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isFutureOnlyMode
              ? 'Model future personal loans, vehicle financing, student loans, or lines of credit starting at a future age and see their outflow and net worth impact across all simulation ledgers.'
              : 'Model personal loans, Canada student loans (0% statutory relief), vehicle financing, or lines of credit (current or future-dated), and test early debt payoff impact on retirement income.'}
          </p>
        </div>

        {/* Quick Add Custom Button */}
        <button
          type="button"
          onClick={handleAddCustomDebt}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isFutureOnlyMode ? 'Add Future Debt' : 'Add Custom Debt'}</span>
        </button>
      </div>

      {/* 2. Aggregate Liability Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            {isFutureOnlyMode ? 'Planned Future Principal' : 'Total Debt Principal'}
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            ${totalPrincipal.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {isFutureOnlyMode ? 'Added to liabilities at Start Age' : 'Deducted from Total Net Worth'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            {isFutureOnlyMode ? 'Future Monthly Service' : 'Monthly Debt Service'}
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            ${Math.round(totalMonthlyService).toLocaleString()}/mo
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {isFutureOnlyMode ? 'Deducted once loan begins' : 'Deducted from spendable cash'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Annual Outflow
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            ${totalAnnualService.toLocaleString()}/yr
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Principal + Interest service
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <BadgePercent className="w-3.5 h-3.5 text-purple-500" />
            Projected Total Interest
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            ${totalLifetimeInterest.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Cumulative interest over term
          </span>
        </div>
      </div>

      {/* 3. Accelerated Early Payoff Strategy & Retirement Impact Card */}
      {debts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 dark:from-rose-950/20 dark:via-slate-900 dark:to-amber-950/20 flex flex-col gap-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/80 dark:border-rose-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Accelerated Debt Freedom & Early Payoff Simulator</span>
                  {currentStrategy.acceleratePayoff && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 animate-pulse">
                      Active
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Model extra monthly prepayments or target payoff ages to see years shaved and compound wealth unlocked at retirement.
                </p>
              </div>
            </div>

            {/* Toggle */}
            <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
              <input
                type="checkbox"
                checked={currentStrategy.acceleratePayoff}
                onChange={(e) => {
                  const active = e.target.checked;
                  handleUpdateStrategy({
                    acceleratePayoff: active,
                    extraMonthlyPayment: active && currentStrategy.extraMonthlyPayment === 0 ? 150 : currentStrategy.extraMonthlyPayment
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentStrategy.acceleratePayoff ? 'Enabled' : 'Model Early Payoff'}
              </span>
            </label>
          </div>

          {currentStrategy.acceleratePayoff && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              
              {/* Controls Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {/* Method / Strategy Type */}
                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Payoff Methodology:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Cascading allocation</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateStrategy({ strategyType: 'avalanche' })}
                      className={`p-1.5 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                        currentStrategy.strategyType === 'avalanche'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title="Prioritizes debts with highest APR first (e.g. credit card & personal loans before 0% student loan). Maximizes interest dollars saved."
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Avalanche</span>
                      </div>
                      <span className="text-[9px] block opacity-80 mt-0.5 font-normal">Highest APR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStrategy({ strategyType: 'snowball' })}
                      className={`p-1.5 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                        currentStrategy.strategyType === 'snowball'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title="Prioritizes smallest debt balances first for quick psychological momentum and quickest elimination of individual minimum payments."
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Snowflake className="w-3 h-3" />
                        <span>Snowball</span>
                      </div>
                      <span className="text-[9px] block opacity-80 mt-0.5 font-normal">Lowest Bal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStrategy({ strategyType: 'pro_rata' })}
                      className={`p-1.5 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                        currentStrategy.strategyType === 'pro_rata'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title="Distributes the extra prepayment proportionally across all balances."
                    >
                      <div className="flex items-center justify-center gap-1">
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Pro-Rata</span>
                      </div>
                      <span className="text-[9px] block opacity-80 mt-0.5 font-normal">Balanced</span>
                    </button>
                  </div>
                </div>

                {/* Extra Monthly Payment */}
                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Extra Monthly Prepayment:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-mono font-extrabold">
                      +${Math.round(currentStrategy.extraMonthlyPayment).toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyInput
                      value={currentStrategy.extraMonthlyPayment}
                      onChange={(val) => handleUpdateStrategy({ extraMonthlyPayment: Math.max(0, val) })}
                      placeholder="$150"
                      className="w-28 text-xs font-mono font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex flex-wrap gap-1 flex-1">
                      {[50, 100, 250, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleUpdateStrategy({ extraMonthlyPayment: amt })}
                          className={`text-[10px] font-mono px-2 py-1 rounded-md border transition cursor-pointer ${
                            currentStrategy.extraMonthlyPayment === amt
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          +${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Payoff Age & Reinvest Toggle */}
                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Target Freedom Age:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {currentStrategy.targetPayoffAge ? `Age ${currentStrategy.targetPayoffAge}` : 'Calculated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={currentAge + 1}
                      max={Math.min(75, Math.max(currentAge + 10, retirementAge + 5))}
                      value={currentStrategy.targetPayoffAge || currentAge + 5}
                      onChange={(e) => handleUpdateStrategy({ targetPayoffAge: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-rose-600"
                    />
                    {currentStrategy.targetPayoffAge && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStrategy({ targetPayoffAge: undefined })}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={currentStrategy.redirectFreedCashflowToSavings}
                      onChange={(e) => handleUpdateStrategy({ redirectFreedCashflowToSavings: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                    />
                    <span>Compound freed payments in investments</span>
                  </label>
                </div>

              </div>

              {/* Live Actuarial Impact Comparison Banner */}
              {comparison && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-500/20 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Projected Financial Impact on Retirement & Wealth
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                      {comparison.yearsSaved > 0 ? `${comparison.yearsSaved.toFixed(1)} Years Shaved Off Debt` : 'On Accelerated Pace'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Metric 1: Timeline */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Debt Freedom Milestone:
                      </span>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Age {comparison.acceleratedPayoffAge}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        vs Baseline Age {comparison.baselinePayoffAge}
                      </span>
                    </div>

                    {/* Metric 2: Interest Saved */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Total Interest Saved:
                      </span>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ${comparison.interestSaved.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Interest avoided completely
                      </span>
                    </div>

                    {/* Metric 3: Monthly Cashflow Freed */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Monthly Cashflow Freed:
                      </span>
                      <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                        +${comparison.freedMonthlyCashflow.toLocaleString()}/mo
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        +${comparison.freedAnnualCashflow.toLocaleString()}/yr permanent boost
                      </span>
                    </div>

                    {/* Metric 4: Compounded Retirement Nest Egg Boost */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                      <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block flex items-center gap-1">
                        <PiggyBank className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Retirement Boost @ Age {retirementAge}:</span>
                      </span>
                      <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        +${comparison.projectedRetirementNestEggBoost.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                        By compounding freed cash @ 6%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans bg-slate-50/80 dark:bg-slate-800/60 p-2 rounded-lg">
                    💡 <strong>How Debt Freedom Multiplies Retirement Wealth:</strong> By extinguishing loans {comparison.yearsSaved.toFixed(1)} years ahead of schedule, you stop paying financing interest to lenders. Reinvesting that freed <strong>${comparison.freedMonthlyCashflow.toLocaleString()}/month</strong> directly into your Canadian registered accounts (TFSA & RRSP) compounds an additional <strong>+${comparison.projectedRetirementNestEggBoost.toLocaleString()}</strong> of liquid wealth by your target retirement age of {retirementAge}!
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* 4. Canadian Preset Quick-Add Row */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>Quick-Add Canadian Debt Presets:</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {CANADIAN_DEBT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleAddPreset(preset)}
              className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-400 dark:hover:border-rose-500/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition truncate">
                  {preset.name}
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 shrink-0 transition" />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>${preset.initialBalance.toLocaleString()}</span>
                <span>•</span>
                <span className={preset.interestRate === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                  {preset.interestRate === 0 ? '0% CSFA' : `${preset.interestRate}% APR`}
                </span>
                <span>•</span>
                <span>{preset.remainingTermMonths}m</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Active Debts List */}
      <div className="flex flex-col gap-3">
        {debts.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center flex flex-col items-center justify-center gap-2">
            <span className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {isFutureOnlyMode ? 'No Future Debts or Loans Scheduled Yet' : 'No Consumer Debts or Loans Modeled'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {isFutureOnlyMode
                ? 'Click a preset above or "Add Future Debt" to schedule a planned loan (auto, student, personal, or line of credit) starting at a target future age. Its payments and balance will automatically flow into all cash flow and net worth ledgers.'
                : 'Your household is debt-free (excluding any mortgage modeled under Real Estate). All income flows directly into living expenses and savings. Click a preset above or "Add Custom Debt" to model the impact of loan amortization and debt repayment.'}
            </p>
          </div>
        ) : (
          debts.map((debt) => {
            const catConfig = CATEGORY_CONFIG[debt.category] || CATEGORY_CONFIG.other;
            const CatIcon = catConfig.icon;
            const balance = Number(debt.initialBalance) || 0;
            const rate = Number(debt.interestRate) || 0;
            const termMonths = Number(debt.remainingTermMonths) || 60;
            const autoPayment = calculateDebtMonthlyPayment(balance, rate, termMonths);
            const activePayment = (debt.monthlyPayment && debt.monthlyPayment > 0) ? debt.monthlyPayment : autoPayment;
            const estInterest = calculateTotalDebtInterest(balance, rate, termMonths, debt.monthlyPayment, debt.extraMonthlyPayment);
            const startAge = debt.startAge !== undefined ? debt.startAge : currentAge;
            const payoffAge = debt.earlyPayoffAge ?? (startAge + Math.ceil(termMonths / 12));
            const isCustomOpen = expandedCustomDebtId === debt.id;

            return (
              <div
                key={debt.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs flex flex-col gap-3 transition"
              >
                {/* Top Row: Title, Category Badge, Delete */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <span className={`p-1.5 rounded-lg border text-xs ${catConfig.color}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={debt.name}
                      onChange={(e) => handleUpdateDebt(debt.id, { name: e.target.value })}
                      placeholder="Debt Name (e.g. Canada Student Loan)"
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-rose-500 dark:focus:border-rose-500 focus:outline-none px-1 py-0.5 transition flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={debt.category}
                      onChange={(e) => handleUpdateDebt(debt.id, { category: e.target.value as DebtCategory })}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="student_loan">Student Loan</option>
                      <option value="vehicle_loan">Vehicle Loan</option>
                      <option value="personal_loan">Personal Loan</option>
                      <option value="line_of_credit">Line of Credit</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="other">Other</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title="Remove Debt"
                      aria-label="Remove Debt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Second Row: Inputs Grid (with Start Age for modeling future loans) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                  {/* Principal Balance */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {startAge > currentAge ? 'Loan Amount ($)' : 'Initial Balance ($)'}
                    </label>
                    <CurrencyInput
                      value={balance}
                      onChange={(val) => handleUpdateDebt(debt.id, { initialBalance: Math.max(0, val) })}
                      placeholder="$0"
                      className="w-full text-xs font-mono font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  {/* Interest Rate */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Interest Rate (%)
                      </label>
                      {rate === 0 && (
                        <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                          0% CSFA
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="35"
                        value={rate}
                        onChange={(e) => handleUpdateDebt(debt.id, { interestRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-xs font-mono font-bold py-1.5 pl-2.5 pr-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Remaining Term Months */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {startAge > currentAge ? 'Loan Term' : 'Remaining Term'}
                      </label>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        {(termMonths / 12).toFixed(1)} yrs
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="360"
                        value={termMonths}
                        onChange={(e) => handleUpdateDebt(debt.id, { remainingTermMonths: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full text-xs font-mono font-bold py-1.5 pl-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-mono pointer-events-none">
                        mos
                      </span>
                    </div>
                  </div>

                  {/* Loan Start Age */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Start Age
                      </label>
                      <span className={`text-[9.5px] font-mono ${startAge > currentAge ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'}`}>
                        {startAge > currentAge ? `In ${startAge - currentAge} yrs` : 'Active now'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={isFutureOnlyMode ? currentAge + 1 : currentAge}
                        max={85}
                        value={startAge}
                        onChange={(e) => {
                          const minAge = isFutureOnlyMode ? currentAge + 1 : currentAge;
                          const parsed = parseInt(e.target.value, 10);
                          if (Number.isNaN(parsed)) return;
                          handleUpdateDebt(debt.id, { startAge: Math.max(minAge, Math.min(85, parsed)) });
                        }}
                        className="w-full text-xs font-mono font-bold py-1.5 pl-2.5 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono pointer-events-none">
                        age
                      </span>
                    </div>
                  </div>

                  {/* Monthly Payment */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Monthly Payment
                      </label>
                      {debt.monthlyPayment && debt.monthlyPayment > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDebt(debt.id, { monthlyPayment: undefined })}
                          className="text-[9.5px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    <CurrencyInput
                      value={activePayment}
                      onChange={(val) => handleUpdateDebt(debt.id, { monthlyPayment: Math.max(0, val) })}
                      placeholder={`$${Math.round(autoPayment)}`}
                      className="w-full text-xs font-mono font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Third Row: Individual Early Payoff Toggle & Options */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <span>Annual Payment:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          ${Math.round(activePayment * 12).toLocaleString()}/yr
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <span>Estimated Interest:</span>
                        <strong className={estInterest === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}>
                          ${estInterest.toLocaleString()}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedCustomDebtId(isCustomOpen ? null : debt.id)}
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{isCustomOpen ? 'Hide Early Payoff Options' : 'Customize Early Payoff'}</span>
                        {isCustomOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {startAge > currentAge && (
                        <div className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20 text-[10.5px]">
                          <Clock className="w-3 h-3" />
                          <span>Starts Age {startAge}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20 text-[10.5px]">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Payoff at Age {payoffAge}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Per-Debt Early Payoff Sub-Panel */}
                  {isCustomOpen && (
                    <div className="mt-1 p-3 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
                      
                      {/* Extra Prepayment on this loan */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                          Extra Monthly Prepayment ($/mo)
                        </label>
                        <CurrencyInput
                          value={debt.extraMonthlyPayment || 0}
                          onChange={(val) => handleUpdateDebt(debt.id, { extraMonthlyPayment: Math.max(0, val) })}
                          placeholder="$0"
                          className="w-full text-xs font-mono font-bold py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        <span className="text-[9.5px] text-slate-400">Added to standard monthly bill</span>
                      </div>

                      {/* Target Early Payoff Age */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                            Target Payoff Age
                          </label>
                          {debt.earlyPayoffAge && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDebt(debt.id, { earlyPayoffAge: undefined })}
                              className="text-[9px] text-rose-500 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={currentAge + 1}
                            max={75}
                            value={debt.earlyPayoffAge || ''}
                            onChange={(e) => handleUpdateDebt(debt.id, { earlyPayoffAge: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder={`Age ${payoffAge}`}
                            className="w-full text-xs font-mono font-bold py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <span className="text-[9.5px] text-slate-400">Forces full payoff at target age</span>
                      </div>

                      {/* Lump-Sum Prepayment */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                          One-Time Lump Sum ($ & Age)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <CurrencyInput
                            value={debt.lumpSumPrepaymentAmount || 0}
                            onChange={(val) => handleUpdateDebt(debt.id, { lumpSumPrepaymentAmount: Math.max(0, val) })}
                            placeholder="$0"
                            className="w-2/3 text-xs font-mono font-bold py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                          <input
                            type="number"
                            min={currentAge}
                            max={75}
                            value={debt.lumpSumPrepaymentAge || currentAge + 1}
                            onChange={(e) => handleUpdateDebt(debt.id, { lumpSumPrepaymentAge: Number(e.target.value) })}
                            placeholder={`Age`}
                            className="w-1/3 text-xs font-mono font-bold py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <span className="text-[9.5px] text-slate-400">Prepayment from savings/bonus</span>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 6. Canadian Financial Guidance Card */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 leading-relaxed text-[11px]">
          <span className="font-bold">Canadian Debt Integration & Early Repayment Guide:</span>
          <p>
            • <strong>Milestone Ledger Column:</strong> All debt payments are explicitly tracked as their own dedicated column (<code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">Debt Payments</code>) on the Milestone Schedule table, showing exact principal amortization, interest expense, and the remaining debt balance.
          </p>
          <p>
            • <strong>Spendable Cash Impact:</strong> Pre-retirement, debt payments subtract directly from after-tax earnings (<code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">Employment - Taxes - Savings - Debt Payments = Spendable Cash</code>). In retirement, lingering debt extends withdrawals required to maintain living standards.
          </p>
          <p>
            • <strong>Canada Student Financial Assistance (CSFA):</strong> Since April 1, 2023, the Government of Canada permanently eliminated interest on Canada Student Loans. Set interest to 0% to model statutory zero-interest payments.
          </p>
          <p>
            • <strong>Canadian Avalanche vs Snowball:</strong> When modeling early payoff, Avalanche directs extra monthly cash flow to the highest APR loan first, saving the most interest dollars. Snowball clears smallest balances first for immediate cash flow relief.
          </p>
        </div>
      </div>

    </div>
  );
};
