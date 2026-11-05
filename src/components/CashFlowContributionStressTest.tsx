import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  ArrowRight, 
  ArrowDown, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  PiggyBank, 
  Coins, 
  ShieldCheck, 
  HelpCircle, 
  Sliders, 
  RotateCcw, 
  Lock, 
  Unlock, 
  ChevronUp, 
  ChevronDown,
  Info,
  Layers,
  ArrowUp,
  RefreshCw
} from 'lucide-react';
import { 
  RetirementInputs, 
  ContributionPriorityAccount, 
  ContributionAllocationConfig 
} from '../types/retirement';
import { 
  runCashFlowStressTest, 
  CashFlowStressTestResult, 
  DEFAULT_PRIORITY_ORDER 
} from '../utils/cashFlowStressTest';
import { CurrencyInput } from './CurrencyInput';

interface CashFlowContributionStressTestProps {
  inputs: RetirementInputs;
  onUpdateInputs: (updated: Partial<RetirementInputs>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const CashFlowContributionStressTest: React.FC<CashFlowContributionStressTestProps> = ({
  inputs,
  onUpdateInputs,
  onNavigateToTab
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [editingCapAccount, setEditingCapAccount] = useState<ContributionPriorityAccount | null>(null);

  // Run live stress test calculations
  const result: CashFlowStressTestResult = useMemo(() => {
    return runCashFlowStressTest(inputs);
  }, [inputs]);

  const allocationConfig: ContributionAllocationConfig = useMemo(() => {
    return inputs.contributionAllocation || {
      mode: 'dynamic_waterfall',
      priorityOrder: DEFAULT_PRIORITY_ORDER,
      customCaps: {},
      autoApplyToInputs: true
    };
  }, [inputs.contributionAllocation]);

  const isDynamicMode = allocationConfig.mode === 'dynamic_waterfall';
  const priorityOrder = allocationConfig.priorityOrder;

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Switch between Manual and Dynamic Waterfall mode
  const handleToggleMode = (newMode: 'manual' | 'dynamic_waterfall') => {
    const updatedConfig: ContributionAllocationConfig = {
      ...allocationConfig,
      mode: newMode
    };

    if (newMode === 'dynamic_waterfall') {
      // Apply the waterfall allocations to the 4 primary accounts
      const alloc = result.waterfallAllocations;
      onUpdateInputs({
        contributionAllocation: updatedConfig,
        rrspAnnualContribution: alloc.rrsp.allocatedAmount,
        tfsaAnnualContribution: alloc.tfsa.allocatedAmount,
        fhsaAnnualContribution: alloc.fhsa.allocatedAmount,
        nonRegAnnualContribution: alloc.nonReg.allocatedAmount
      });
    } else {
      onUpdateInputs({
        contributionAllocation: updatedConfig
      });
    }
  };

  // Reorder priority (move account up or down in rank)
  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...priorityOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const updatedConfig: ContributionAllocationConfig = {
      ...allocationConfig,
      priorityOrder: newOrder
    };

    // Re-run test with new order and apply if in dynamic mode
    const updatedInputs: RetirementInputs = {
      ...inputs,
      contributionAllocation: updatedConfig
    };
    const newResult = runCashFlowStressTest(updatedInputs);

    if (isDynamicMode) {
      onUpdateInputs({
        contributionAllocation: updatedConfig,
        rrspAnnualContribution: newResult.waterfallAllocations.rrsp.allocatedAmount,
        tfsaAnnualContribution: newResult.waterfallAllocations.tfsa.allocatedAmount,
        fhsaAnnualContribution: newResult.waterfallAllocations.fhsa.allocatedAmount,
        nonRegAnnualContribution: newResult.waterfallAllocations.nonReg.allocatedAmount
      });
    } else {
      onUpdateInputs({
        contributionAllocation: updatedConfig
      });
    }
  };

  // Select a preset priority order
  const handleApplyPreset = (order: ContributionPriorityAccount[]) => {
    const updatedConfig: ContributionAllocationConfig = {
      ...allocationConfig,
      priorityOrder: order
    };
    const updatedInputs: RetirementInputs = {
      ...inputs,
      contributionAllocation: updatedConfig
    };
    const newResult = runCashFlowStressTest(updatedInputs);

    if (isDynamicMode) {
      onUpdateInputs({
        contributionAllocation: updatedConfig,
        rrspAnnualContribution: newResult.waterfallAllocations.rrsp.allocatedAmount,
        tfsaAnnualContribution: newResult.waterfallAllocations.tfsa.allocatedAmount,
        fhsaAnnualContribution: newResult.waterfallAllocations.fhsa.allocatedAmount,
        nonRegAnnualContribution: newResult.waterfallAllocations.nonReg.allocatedAmount
      });
    } else {
      onUpdateInputs({
        contributionAllocation: updatedConfig
      });
    }
  };

  // Update custom cap for an account
  const handleSetCustomCap = (account: ContributionPriorityAccount, enabled: boolean, maxAmount: number) => {
    const updatedCaps = {
      ...(allocationConfig.customCaps || {}),
      [account]: { enabled, maxAmount: Math.max(0, maxAmount) }
    };

    const updatedConfig: ContributionAllocationConfig = {
      ...allocationConfig,
      customCaps: updatedCaps
    };

    const updatedInputs: RetirementInputs = {
      ...inputs,
      contributionAllocation: updatedConfig
    };
    const newResult = runCashFlowStressTest(updatedInputs);

    if (isDynamicMode) {
      onUpdateInputs({
        contributionAllocation: updatedConfig,
        rrspAnnualContribution: newResult.waterfallAllocations.rrsp.allocatedAmount,
        tfsaAnnualContribution: newResult.waterfallAllocations.tfsa.allocatedAmount,
        fhsaAnnualContribution: newResult.waterfallAllocations.fhsa.allocatedAmount,
        nonRegAnnualContribution: newResult.waterfallAllocations.nonReg.allocatedAmount
      });
    } else {
      onUpdateInputs({
        contributionAllocation: updatedConfig
      });
    }
  };

  // One-click apply calculated dynamic waterfall to account inputs
  const handleApplyWaterfallToInputs = () => {
    const alloc = result.waterfallAllocations;
    onUpdateInputs({
      contributionAllocation: {
        ...allocationConfig,
        mode: 'dynamic_waterfall'
      },
      rrspAnnualContribution: alloc.rrsp.allocatedAmount,
      tfsaAnnualContribution: alloc.tfsa.allocatedAmount,
      fhsaAnnualContribution: alloc.fhsa.allocatedAmount,
      nonRegAnnualContribution: alloc.nonReg.allocatedAmount
    });
  };

  const accountBadgeColors: Record<ContributionPriorityAccount, { bg: string; text: string; dot: string; border: string }> = {
    rrsp: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-600',
      border: 'border-blue-200/80 dark:border-blue-500/30'
    },
    tfsa: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      border: 'border-emerald-200/80 dark:border-emerald-500/30'
    },
    fhsa: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
      border: 'border-amber-200/80 dark:border-amber-500/30'
    },
    nonReg: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      text: 'text-purple-700 dark:text-purple-300',
      dot: 'bg-purple-600',
      border: 'border-purple-200/80 dark:border-purple-500/30'
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 shadow-xs overflow-hidden transition">
      
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Cash Flow Stress Test & Dynamic Waterfall Allocation
              </h4>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                result.status === 'deficit'
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              }`}>
                {result.status === 'deficit'
                  ? `🚨 Cash Flow Deficit (-${formatCur(result.deficitAmountMonthly)}/mo)`
                  : `✅ Cash Flow Funded (+${formatCur(result.surplusBufferMonthly)}/mo buffer)`
                }
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Validates your contributions against actual in-hand take-home pay and living costs, dynamically allocating surplus by priority
            </p>
          </div>
        </div>

        {/* Mode Toggle & Expand Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleToggleMode('dynamic_waterfall')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                isDynamicMode
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Dynamic Waterfall</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('manual')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                !isDynamicMode
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>Manual Targets</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            aria-expanded={isExpanded}
            title={isExpanded ? 'Collapse stress test panel' : 'Expand stress test panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 flex flex-col gap-5">
          
          {/* Section 1: The Cash Flow Stress Test Equation Strip */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-500" />
                Live Household Cash Flow Stress Test
              </span>
              <span>Based on 2025/2026 CRA Statutory Tax Schedule & Living Expenses</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 text-center">
              
              {/* Step 1: Gross Income */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400">1. Gross Salary</span>
                <div className="my-1">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 font-mono">
                    {formatCur(result.householdGrossAnnual)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {formatCur(result.householdGrossMonthly)}/mo
                  </span>
                </div>
                <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium">Pre-tax employment</span>
              </div>

              {/* Step 2: Taxes & Deductions */}
              <div className="p-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-500/5 border border-rose-200/60 dark:border-rose-500/20 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">2. Tax & Deductions</span>
                <div className="my-1">
                  <span className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                    -{formatCur(result.primaryIncome.totalStatutoryDeductions + (result.spouseIncome?.totalStatutoryDeductions || 0))}
                  </span>
                  <span className="text-[10px] text-rose-500/80 block font-mono">
                    {result.primaryIncome.effectiveDeductionRate}% effective
                  </span>
                </div>
                <span className="text-[9.5px] text-rose-700/70 dark:text-rose-400 font-medium">Fed/Prov Tax + CPP/EI</span>
              </div>

              {/* Step 3: In-Hand Take-Home Pay */}
              <div className="p-2.5 rounded-xl bg-blue-50/40 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/20 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-300">3. In-Hand Pay</span>
                <div className="my-1">
                  <span className="text-sm sm:text-base font-extrabold text-blue-700 dark:text-blue-300 font-mono">
                    {formatCur(result.householdNetInHandAnnual)}
                  </span>
                  <span className="text-[10px] text-blue-600/80 block font-mono">
                    {formatCur(result.householdNetInHandMonthly)}/mo
                  </span>
                </div>
                <span className="text-[9.5px] text-blue-600/80 dark:text-blue-400 font-medium">Take-home in bank</span>
              </div>

              {/* Step 4: Monthly Living Expenses */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">4. Living Costs</span>
                </div>
                <div className="my-1">
                  <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                    -{formatCur(result.totalAnnualExpenses)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {formatCur(result.totalMonthlyExpenses)}/mo
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToTab?.('expenses')}
                  className="text-[9.5px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                >
                  Edit in Living Expenses ↗
                </button>
              </div>

              {/* Step 5: Net Surplus Available */}
              <div className={`p-2.5 rounded-xl border col-span-2 sm:col-span-1 flex flex-col justify-between ${
                result.netCashFlowSurplusAnnual >= 0
                  ? 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50/60 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30'
              }`}>
                <span className={`text-[10px] uppercase font-bold ${
                  result.netCashFlowSurplusAnnual >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  5. Available Surplus
                </span>
                <div className="my-1">
                  <span className={`text-base sm:text-lg font-black font-mono ${
                    result.netCashFlowSurplusAnnual >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {result.netCashFlowSurplusAnnual >= 0 ? '+' : ''}{formatCur(result.netCashFlowSurplusAnnual)}
                  </span>
                  <span className={`text-[10px] block font-mono ${
                    result.netCashFlowSurplusAnnual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {formatCur(result.netCashFlowSurplusMonthly)}/mo
                  </span>
                </div>
                <span className={`text-[9.5px] font-semibold ${
                  result.netCashFlowSurplusAnnual >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {result.netCashFlowSurplusAnnual >= 0 ? 'Real surplus for savings' : 'Take-home deficit'}
                </span>
              </div>

            </div>

            {/* Stress Test Comparison Callout */}
            <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              result.status === 'deficit'
                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                : 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="flex items-start gap-2">
                {result.status === 'deficit' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">
                    {result.status === 'deficit'
                      ? 'Cash Flow Stress Test Warning: Planned Contributions Exceed Real Net Income'
                      : 'Cash Flow Stress Test Passed: Planned Contributions Fully Funded by Real Net Surplus'
                    }
                  </span>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {result.status === 'deficit' ? (
                      <>
                        Your stated annual contribution target of <strong className="font-mono">{formatCur(result.currentPlannedContributionsAnnual)}/yr</strong> ({formatCur(result.currentPlannedContributionsMonthly)}/mo) exceeds your net available in-hand cash flow of <strong className="font-mono">{formatCur(Math.max(0, result.netCashFlowSurplusAnnual))}/yr</strong> by <strong className="font-mono font-bold text-rose-700 dark:text-rose-300">{formatCur(result.deficitAmountAnnual)}/yr ({formatCur(result.deficitAmountMonthly)}/mo)</strong>.
                      </>
                    ) : (
                      <>
                        Your take-home pay comfortably covers all monthly living expenses and funds your <strong className="font-mono">{formatCur(result.currentPlannedContributionsAnnual)}/yr</strong> ({formatCur(result.currentPlannedContributionsMonthly)}/mo) contribution target, with a buffer of <strong className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{formatCur(result.surplusBufferAnnual)}/yr ({formatCur(result.surplusBufferMonthly)}/mo)</strong> in unallocated surplus.
                      </>
                    )}
                  </p>
                  {result.totalEmployerMatchAnnual > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                      <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <span>🏢 Employer RRSP Match:</span>
                        <span className="font-mono">+{formatCur(result.totalEmployerMatchAnnual)}/yr</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({formatCur(result.totalEmployerMatchMonthly)}/mo)</span>
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300">
                        Total retirement addition: <strong className="font-mono font-bold">{formatCur(result.totalPlannedWithMatchAnnual)}/yr</strong> (match is employer-funded & does not reduce net pay)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {result.status === 'deficit' && isDynamicMode && (
                <button
                  type="button"
                  onClick={handleApplyWaterfallToInputs}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 transition shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Right-size to Surplus ({formatCur(Math.max(0, result.netCashFlowSurplusAnnual))}/yr)</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Priority Waterfall Configuration & Dynamic Allocation */}
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Contribution Priority Order & Waterfall Filling
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Surplus cash flow is automatically poured into your chosen priority sequence up to statutory limits or custom caps
                </p>
              </div>

              {/* Priority Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(['rrsp', 'tfsa', 'fhsa', 'nonReg'])}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Tax Deductions First: RRSP -> TFSA -> FHSA -> Non-Reg"
                >
                  💼 RRSP First
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(['tfsa', 'rrsp', 'fhsa', 'nonReg'])}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Tax-Free Compounding First: TFSA -> RRSP -> FHSA -> Non-Reg"
                >
                  🚀 TFSA First
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(['fhsa', 'rrsp', 'tfsa', 'nonReg'])}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="First-Time Homebuyer: FHSA -> RRSP -> TFSA -> Non-Reg"
                >
                  🏡 FHSA First
                </button>
              </div>
            </div>

            {/* 4 Waterfall Priority Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {priorityOrder.map((accountKey, index) => {
                const item = result.waterfallAllocations[accountKey];
                const theme = accountBadgeColors[accountKey];
                const customCapInfo = allocationConfig.customCaps?.[accountKey];
                const isCustomCapped = Boolean(customCapInfo?.enabled);
                const isEditingThisCap = editingCapAccount === accountKey;

                return (
                  <div 
                    key={accountKey}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      item.allocatedAmount > 0
                        ? `${theme.bg} ${theme.border}`
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-80'
                    }`}
                  >
                    {/* Header: Rank + Account + Move Buttons */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-mono font-bold">
                            {index + 1}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-50">
                            {item.name}
                          </span>
                        </div>

                        {/* Rank Shifters */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMovePriority(index, 'up')}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Move priority up"
                            aria-label={`Move ${item.name} up in priority`}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === priorityOrder.length - 1}
                            onClick={() => handleMovePriority(index, 'down')}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Move priority down"
                            aria-label={`Move ${item.name} down in priority`}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Allocated Amount */}
                      <div className="my-2">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                          Waterfall Allocation:
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">
                            {formatCur(item.allocatedAmount)}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">/yr</span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono block">
                          ({formatCur(item.monthlyAmount)}/mo)
                        </span>
                      </div>

                      {/* Fill Progress Bar */}
                      {item.effectiveCap < Infinity && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden my-2">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.isCapped ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.round((item.allocatedAmount / item.effectiveCap) * 100))}%` 
                            }}
                          />
                        </div>
                      )}

                      {/* Cap status */}
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                        <span>Max Cap:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.effectiveCap === Infinity ? 'Unlimited' : `${formatCur(item.effectiveCap)}/yr`}
                        </span>
                      </div>

                      {accountKey === 'rrsp' && result.primaryEmployerMatch > 0 && (
                        <div className="mt-1.5 px-2 py-0.5 rounded bg-blue-100/70 dark:bg-blue-500/20 text-[10px] font-semibold text-blue-800 dark:text-blue-200 flex items-center justify-between">
                          <span>🏢 Employer Match:</span>
                          <span className="font-mono font-bold">+{formatCur(result.primaryEmployerMatch)}/yr</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Custom Overwrite Control */}
                    <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          {isCustomCapped ? 'Custom Overwrite' : 'Statutory CRA Limit'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingCapAccount(isEditingThisCap ? null : accountKey)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                        >
                          {isEditingThisCap ? 'Done' : (isCustomCapped ? 'Edit Cap' : 'Overwrite')}
                        </button>
                      </div>

                      {isEditingThisCap && (
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 flex flex-col gap-1.5 mt-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                              Custom Cap ($/yr):
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                handleSetCustomCap(accountKey, false, item.statutoryLimit);
                                setEditingCapAccount(null);
                              }}
                              className="text-[9.5px] text-rose-500 hover:underline cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                          <CurrencyInput
                            value={customCapInfo?.maxAmount ?? (item.statutoryLimit === Infinity ? 25000 : item.statutoryLimit)}
                            onChange={(val) => handleSetCustomCap(accountKey, true, val)}
                            min={0}
                            step={500}
                            className="text-xs font-mono font-bold"
                            aria-label={`Custom cap for ${item.name}`}
                          />
                        </div>
                      )}

                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                        {item.note}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Bottom Actions & Dynamic Sync Controls */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 text-[11.5px]">
                  {isDynamicMode ? (
                    <>
                      <strong>Dynamic Mode Active:</strong> Account contributions automatically track your cash flow surplus.
                      {result.unallocatedSurplusAnnual > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400 ml-1">
                          ({formatCur(result.unallocatedSurplusAnnual)}/yr left unallocated)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>Manual Mode Active:</strong> Custom values are retained in account fields below. Click to sync with dynamic waterfall.
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyWaterfallToInputs}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Dynamic Allocation to Accounts</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
