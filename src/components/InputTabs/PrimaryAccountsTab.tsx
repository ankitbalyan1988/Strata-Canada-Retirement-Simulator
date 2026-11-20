import React, { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RetirementInputs } from '../../types/retirement';
import { DEFAULT_ACCOUNT_RETURNS } from '../../utils/presets';
import { calculateEmployerRrspMatch } from '../../utils/employerMatch';
import { CurrencyInput } from '../CurrencyInput';
import { NonRegAccountsManager } from '../NonRegAccountsManager';
import { CashFlowContributionStressTest } from '../CashFlowContributionStressTest';
import { TaxRuleTooltip } from '../TaxRuleTooltip';
import { useSimulationStore, InputTab } from '../../store/useSimulationStore';
import { InputTabProps, formatCur, useInputTabDispatch } from './inputTabHelpers';

/**
 * Isolated bridge so CashFlowContributionStressTest reads the full inputs slice
 * without forcing the individual account input cards to re-render on unrelated fields.
 */
const AccountsCashFlowStressTestBridge: React.FC<InputTabProps> = React.memo(
  ({ externalInputs, externalOnChange }) => {
    const setActiveTab = useSimulationStore((state) => state.setActiveInputTab);
    const storeInputs = useSimulationStore((state) => (externalInputs ? null : state.inputs));
    const { dispatchInputsChange } = useInputTabDispatch(externalOnChange);

    const resolvedInputs = externalInputs ?? storeInputs!;

    const handleUpdateInputs = useCallback(
      (partial: Partial<RetirementInputs>) => {
        dispatchInputsChange((prev) => {
          const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
          return { ...base, ...partial };
        });
      },
      [dispatchInputsChange]
    );

    const handleNavigateToTab = useCallback(
      (tab: string) => setActiveTab(tab as InputTab),
      [setActiveTab]
    );

    return (
      <CashFlowContributionStressTest
        inputs={resolvedInputs}
        onUpdateInputs={handleUpdateInputs}
        onNavigateToTab={handleNavigateToTab}
      />
    );
  }
);

AccountsCashFlowStressTestBridge.displayName = 'AccountsCashFlowStressTestBridge';

export const PrimaryAccountsTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const {
    dispatchInputsChange,
    updateField,
    updateAccountReturn,
    updateEmployerMatch
  } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      maritalStatus: state.inputs.maritalStatus,
      currentAge: state.inputs.currentAge,
      retirementAge: state.inputs.retirementAge,
      currentAnnualIncome: state.inputs.currentAnnualIncome,
      rrspBalance: state.inputs.rrspBalance,
      rrspAnnualContribution: state.inputs.rrspAnnualContribution,
      employerMatch: state.inputs.employerMatch,
      tfsaBalance: state.inputs.tfsaBalance,
      tfsaAnnualContribution: state.inputs.tfsaAnnualContribution,
      fhsaBalance: state.inputs.fhsaBalance,
      fhsaAnnualContribution: state.inputs.fhsaAnnualContribution,
      fhsaRemainingContributionRoom: state.inputs.fhsaRemainingContributionRoom,
      fhsaOpenYear: state.inputs.fhsaOpenYear,
      fhsaIntent: state.inputs.fhsaIntent,
      fhsaHomePurchaseAge: state.inputs.fhsaHomePurchaseAge,
      nonRegBalance: state.inputs.nonRegBalance,
      nonRegAnnualContribution: state.inputs.nonRegAnnualContribution,
      nonRegCustomAccounts: state.inputs.nonRegCustomAccounts,
      rrspReturn: state.inputs.accountReturns?.rrspReturn,
      tfsaReturn: state.inputs.accountReturns?.tfsaReturn,
      fhsaReturn: state.inputs.accountReturns?.fhsaReturn,
      nonRegReturn: state.inputs.accountReturns?.nonRegReturn
    }))
  );

  const isMarried = (externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus) === 'married';
  const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
  const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
  const currentAnnualIncome = externalInputs ? externalInputs.currentAnnualIncome : storeSlice.currentAnnualIncome;
  const rrspBalance = externalInputs ? externalInputs.rrspBalance : storeSlice.rrspBalance;
  const rrspAnnualContribution = externalInputs ? externalInputs.rrspAnnualContribution : storeSlice.rrspAnnualContribution;
  const employerMatch = externalInputs ? externalInputs.employerMatch : storeSlice.employerMatch;
  const tfsaBalance = externalInputs ? externalInputs.tfsaBalance : storeSlice.tfsaBalance;
  const tfsaAnnualContribution = externalInputs ? externalInputs.tfsaAnnualContribution : storeSlice.tfsaAnnualContribution;
  const fhsaBalance = externalInputs ? externalInputs.fhsaBalance : storeSlice.fhsaBalance;
  const fhsaAnnualContribution = externalInputs ? externalInputs.fhsaAnnualContribution : storeSlice.fhsaAnnualContribution;
  const fhsaRemainingContributionRoom = externalInputs
    ? externalInputs.fhsaRemainingContributionRoom
    : storeSlice.fhsaRemainingContributionRoom;
  const fhsaOpenYear = externalInputs ? externalInputs.fhsaOpenYear : storeSlice.fhsaOpenYear;
  const fhsaIntent = externalInputs ? externalInputs.fhsaIntent : storeSlice.fhsaIntent;
  const fhsaHomePurchaseAge = externalInputs ? externalInputs.fhsaHomePurchaseAge : storeSlice.fhsaHomePurchaseAge;
  const nonRegBalance = externalInputs ? externalInputs.nonRegBalance : storeSlice.nonRegBalance;
  const nonRegAnnualContribution = externalInputs ? externalInputs.nonRegAnnualContribution : storeSlice.nonRegAnnualContribution;
  const nonRegCustomAccounts = externalInputs ? externalInputs.nonRegCustomAccounts : storeSlice.nonRegCustomAccounts;

  const rrspReturn = externalInputs ? externalInputs.accountReturns?.rrspReturn : storeSlice.rrspReturn;
  const tfsaReturn = externalInputs ? externalInputs.accountReturns?.tfsaReturn : storeSlice.tfsaReturn;
  const fhsaReturn = externalInputs ? externalInputs.accountReturns?.fhsaReturn : storeSlice.fhsaReturn;
  const nonRegReturn = externalInputs ? externalInputs.accountReturns?.nonRegReturn : storeSlice.nonRegReturn;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            {isMarried ? 'Your Personal Registered & Taxable Accounts' : 'Canadian Registered & Taxable Accounts'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your current balances and planned annual contributions target</p>
        </div>
      </div>

      {/* Live Cash Flow Stress Test & Dynamic Priority Waterfall Allocation */}
      <AccountsCashFlowStressTestBridge
        externalInputs={externalInputs}
        externalOnChange={externalOnChange}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* RRSP */}
        <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/10 flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">RRSP</span>
              <TaxRuleTooltip ruleId="rrsp_annual" />
            </div>
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-500/20 px-2 py-0.5 rounded shrink-0">
              Tax-Deductible
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">Current Balance</label>
                <TaxRuleTooltip ruleId="rrsp_balance" size="xs" />
              </div>
              <CurrencyInput
                value={rrspBalance}
                onChange={(val) => updateField('rrspBalance', val)}
                min={0}
                step={1000}
                className="h-[34px]"
                aria-label="RRSP Current Balance"
              />
            </div>

            <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">Annual Contributions Target</label>
                <TaxRuleTooltip ruleId="rrsp_annual" size="xs" />
              </div>
              <CurrencyInput
                value={rrspAnnualContribution}
                onChange={(val) => updateField('rrspAnnualContribution', val)}
                min={0}
                step={500}
                className="h-[34px]"
                aria-label="RRSP Annual Contributions Target"
              />
            </div>

            <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
              <label className="text-[11px] font-medium text-blue-800 dark:text-blue-300 leading-tight font-semibold">Expected Return</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.1}
                  value={rrspReturn ?? 6.5}
                  onChange={(e) => updateAccountReturn('rrspReturn', Number(e.target.value))}
                  className="w-full pl-2.5 pr-6 h-[34px] text-xs font-mono font-bold text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-blue-500 dark:text-blue-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Employer RRSP / DPSP Match Section */}
          <div className="pt-3 mt-1 border-t border-blue-100 dark:border-blue-500/20 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!employerMatch?.enabled}
                  onChange={(e) => updateEmployerMatch({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                  <span>🏢 Employer Contribution Match</span>
                  <TaxRuleTooltip ruleId="employer_match" size="xs" />
                  {employerMatch?.enabled && (
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">
                      +${calculateEmployerRrspMatch(currentAnnualIncome, rrspAnnualContribution, employerMatch).toLocaleString()}/yr
                    </span>
                  )}
                </span>
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Group RRSP / DPSP</span>
            </div>

            {employerMatch?.enabled && (
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/25 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Match Formula:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateEmployerMatch({ matchType: 'percent_of_salary' })}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        (!employerMatch.matchType || employerMatch.matchType === 'percent_of_salary')
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      % of Salary Cap
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEmployerMatch({ matchType: 'percent_of_contribution' })}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        employerMatch.matchType === 'percent_of_contribution'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      % of Contribution
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEmployerMatch({ matchType: 'fixed_dollar' })}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        employerMatch.matchType === 'fixed_dollar'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Fixed Dollar ($/yr)
                    </button>
                  </div>
                </div>

                {(!employerMatch.matchType || employerMatch.matchType === 'percent_of_salary') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Match Rate (% of your contrib)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={200}
                          step={5}
                          value={employerMatch.matchRatePercent ?? 100}
                          onChange={(e) => updateEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                          className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">100% = dollar-for-dollar match</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Employer Cap (% of base salary)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0.5}
                          max={18}
                          step={0.5}
                          value={employerMatch.matchPercentOfSalary ?? 4}
                          onChange={(e) => updateEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                          className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        Max match cap: ${Math.round(currentAnnualIncome * ((employerMatch.matchPercentOfSalary ?? 4) / 100)).toLocaleString()}/yr
                      </span>
                    </div>
                  </div>
                )}

                {employerMatch.matchType === 'percent_of_contribution' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Match Rate (% of contribution)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={200}
                          step={5}
                          value={employerMatch.matchRatePercent ?? 50}
                          onChange={(e) => updateEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                          className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">e.g. 50% = 50¢ on each dollar</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Salary Cap (% of base salary)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={18}
                          step={0.5}
                          value={employerMatch.matchPercentOfSalary ?? 6}
                          onChange={(e) => updateEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                          className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Max match cap as % of base salary</span>
                    </div>
                  </div>
                )}

                {employerMatch.matchType === 'fixed_dollar' && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Fixed Annual Employer Match ($/year)
                    </label>
                    <CurrencyInput
                      value={employerMatch.fixedAnnualAmount ?? 3000}
                      onChange={(val) => updateEmployerMatch({ fixedAnnualAmount: val })}
                      min={0}
                      step={250}
                      aria-label="Primary Employer Fixed Annual Match"
                    />
                  </div>
                )}

                {/* Real-time match summary badge */}
                {(() => {
                  const matchVal = calculateEmployerRrspMatch(currentAnnualIncome, rrspAnnualContribution, employerMatch);
                  const totalAddition = rrspAnnualContribution + matchVal;
                  return (
                    <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-500/20 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-blue-800 dark:text-blue-300">Total RRSP Savings Compounding:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-mono">
                          ${totalAddition.toLocaleString()}/yr ({formatCur(totalAddition / 12)}/mo)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                        <span>Your out-of-pocket: <strong className="font-mono text-slate-700 dark:text-slate-300">${rrspAnnualContribution.toLocaleString()}/yr</strong></span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          +${matchVal.toLocaleString()}/yr Free Employer Match
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                        CRA note: An employer's group RRSP / DPSP contribution consumes your overall statutory RRSP deduction limit ($32,490/yr). Your out-of-pocket paycheck contributions (${rrspAnnualContribution.toLocaleString()}/yr) plus employer match (${matchVal.toLocaleString()}/yr) together fill your statutory room without overcontributing.
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* TFSA */}
        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/10 flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">TFSA</span>
              <TaxRuleTooltip ruleId="tfsa_annual" />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/20 px-2 py-0.5 rounded shrink-0">
              100% Tax-Free
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">Current Balance</label>
                <TaxRuleTooltip ruleId="tfsa_balance" size="xs" />
              </div>
              <CurrencyInput
                value={tfsaBalance}
                onChange={(val) => updateField('tfsaBalance', val)}
                min={0}
                step={1000}
                className="h-[34px]"
                aria-label="TFSA Current Balance"
              />
            </div>

            <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">Annual Contributions Target</label>
                <TaxRuleTooltip ruleId="tfsa_annual" size="xs" />
              </div>
              <CurrencyInput
                value={tfsaAnnualContribution}
                onChange={(val) => updateField('tfsaAnnualContribution', val)}
                min={0}
                max={15000}
                step={500}
                className="h-[34px]"
                aria-label="TFSA Annual Contributions Target"
              />
            </div>

            <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
              <label className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 leading-tight font-semibold">Expected Return</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.1}
                  value={tfsaReturn ?? 7.0}
                  onChange={(e) => updateAccountReturn('tfsaReturn', Number(e.target.value))}
                  className="w-full pl-2.5 pr-6 h-[34px] text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* FHSA */}
        <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/10 flex flex-col gap-3.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-snug">FHSA (First Home Savings Account)</span>
              <TaxRuleTooltip ruleId="fhsa_annual" />
            </div>
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20 px-2 py-0.5 rounded shrink-0">
              Deductible + Tax-Free
            </span>
          </div>

          {(() => {
            const remainingRoom = fhsaRemainingContributionRoom !== undefined
              ? Math.min(40000, Math.max(0, fhsaRemainingContributionRoom))
              : Math.max(0, 40000 - Math.min(40000, fhsaBalance));
            const contributedSoFar = Math.max(0, 40000 - remainingRoom);

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Current Balance */}
                  <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 leading-tight">
                      <span>Current Balance</span>
                      <TaxRuleTooltip ruleId="fhsa_balance" size="xs" />
                    </label>
                    <CurrencyInput
                      value={fhsaBalance}
                      onChange={(val) => updateField('fhsaBalance', val)}
                      min={0}
                      step={1000}
                      className="h-[34px]"
                      aria-label="FHSA Current Balance"
                    />
                  </div>

                  {/* Remaining Room */}
                  <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 leading-tight">
                        <span>Remaining Room</span>
                        <TaxRuleTooltip ruleId="fhsa_room" size="xs" />
                      </label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold shrink-0">
                        Max $40k
                      </span>
                    </div>
                    <CurrencyInput
                      value={remainingRoom}
                      onChange={(val) => {
                        const clamped = Math.min(40000, Math.max(0, val));
                        updateField('fhsaRemainingContributionRoom', clamped);
                      }}
                      min={0}
                      max={40000}
                      step={1000}
                      className="h-[34px]"
                      aria-label="FHSA Remaining Contribution Room"
                    />
                  </div>

                  {/* Annual Contributions Target */}
                  <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 leading-tight">
                        <span>Annual Contributions Target</span>
                        <TaxRuleTooltip ruleId="fhsa_annual" size="xs" />
                      </label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                        Max $8k/yr
                      </span>
                    </div>
                    <CurrencyInput
                      value={fhsaAnnualContribution}
                      onChange={(val) => updateField('fhsaAnnualContribution', val)}
                      min={0}
                      max={8000}
                      step={500}
                      className="h-[34px]"
                      aria-label="FHSA Annual Contributions Target"
                    />
                  </div>

                  {/* Expected Return */}
                  <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
                    <label className="text-[11px] font-medium text-amber-800 dark:text-amber-300 leading-tight font-semibold">
                      Expected Return
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={fhsaReturn ?? 6.0}
                        onChange={(e) => updateAccountReturn('fhsaReturn', Number(e.target.value))}
                        className="w-full pl-2.5 pr-6 h-[34px] text-xs font-mono font-bold text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-500/40 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Remaining Contribution Room Status & Quick Presets */}
                <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="font-bold text-amber-950 dark:text-amber-200 text-[11px] flex items-center gap-1">
                      <span>🍁</span> CRA Lifetime Limit ($40k):
                    </span>
                    <span className="font-mono text-amber-900 dark:text-amber-200 text-[11px] sm:text-xs">
                      <strong className="font-bold text-amber-950 dark:text-amber-100">${contributedSoFar.toLocaleString()}</strong> contributed • <strong className="font-bold text-amber-950 dark:text-amber-100">${remainingRoom.toLocaleString()}</strong> room left
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/70 dark:border-amber-500/20">
                    <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium mr-0.5">Quick set room:</span>
                    {[40000, 32000, 24000, 16000, 8000, 0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => updateField('fhsaRemainingContributionRoom', amt)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-md border transition cursor-pointer ${
                          remainingRoom === amt
                            ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700'
                        }`}
                        title={`Set remaining contribution room to $${amt.toLocaleString()}`}
                      >
                        {amt === 40000 ? '$40k' : amt === 0 ? '$0' : `$${amt / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Year FHSA Opened & CRA 15-Year Rollover Rules */}
          <div className="pt-2.5 border-t border-amber-200/70 dark:border-amber-500/30 flex flex-col gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200/90 dark:border-amber-500/30 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-slate-50 block">
                  Year FHSA Account Was Opened
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  CRA rules state an FHSA must close after 15 years (or at age 71).
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
                {[2023, 2024, 2025, 2026].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => updateField('fhsaOpenYear', yr)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
                      (fhsaOpenYear || 2023) === yr
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated 15-Year Expiry & Rollover Age Card */}
            {(() => {
              const openYr = fhsaOpenYear || 2023;
              const expiryYr = openYr + 15;
              const rolloverAge = Math.min(71, currentAge + (expiryYr - 2026));
              const isRollover71 = rolloverAge >= 71;
              const rolloverTarget = isRollover71 ? 'RRIF' : (rolloverAge >= retirementAge ? 'RRIF / RRSP' : 'RRSP');

              return (
                <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                      <span>⏳</span> 15-Year CRA Participation Window:
                    </span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px]">
                      Opened in {openYr} → 15 Yrs Ends in {expiryYr}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-amber-900 dark:text-amber-200 leading-snug">
                    {fhsaIntent === 'home_purchase' ? (
                      <>
                        If not utilized for a home purchase by year <strong>{expiryYr}</strong>, your FHSA balance rolls over at <strong>Age {rolloverAge}</strong> into your <strong>{rolloverTarget}</strong> 100% tax-free!
                      </>
                    ) : (
                      <>
                        After 15 years in <strong>{expiryYr}</strong>, your accumulated FHSA automatically rolls over at <span className="font-extrabold text-amber-950 dark:text-amber-100 underline decoration-amber-500 underline-offset-2">Age {rolloverAge}</span> directly into your <strong>{rolloverTarget}</strong> tax-free without reducing any RRSP contribution room.
                      </>
                    )}
                  </p>
                </div>
              );
            })()}

            {/* FHSA Intent Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Intent:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateField('fhsaIntent', 'rollover_to_rrsp')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    fhsaIntent !== 'home_purchase'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Rollover to RRSP/RRIF
                </button>
                <button
                  type="button"
                  onClick={() => updateField('fhsaIntent', 'home_purchase')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    fhsaIntent === 'home_purchase'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Buy First Home
                </button>
              </div>
            </div>

            {fhsaIntent === 'home_purchase' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-400">Planned Home Purchase Age:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range" inputMode="none"
                    min={currentAge + 1}
                    max={Math.min(71, currentAge + ((fhsaOpenYear || 2023) + 15 - 2026))}
                    value={fhsaHomePurchaseAge || currentAge + 3}
                    onChange={(e) => updateField('fhsaHomePurchaseAge', Number(e.target.value))}
                    className="w-24 sm:w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-amber-600"
                  />
                  <span className="font-mono font-bold text-amber-900 dark:text-amber-300 text-xs">
                    Age {fhsaHomePurchaseAge || currentAge + 3}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Non-Registered (SA / Taxable) - Unified Bucket with Custom Accounts Support */}
        <NonRegAccountsManager
          accounts={nonRegCustomAccounts}
          baseBalance={nonRegBalance}
          baseAnnualContribution={nonRegAnnualContribution}
          baseReturn={nonRegReturn ?? 5.5}
          onUpdate={(newAccounts, totalBal, totalCont, weightedRet) => {
            dispatchInputsChange((prev) => {
              const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
              return {
                ...base,
                nonRegBalance: totalBal,
                nonRegAnnualContribution: totalCont,
                nonRegCustomAccounts: newAccounts,
                accountReturns: {
                  ...(base.accountReturns || DEFAULT_ACCOUNT_RETURNS),
                  nonRegReturn: weightedRet
                }
              };
            });
          }}
          onClearToSimple={(fallbackBal, fallbackCont) => {
            dispatchInputsChange((prev) => {
              const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
              return {
                ...base,
                nonRegBalance: fallbackBal,
                nonRegAnnualContribution: fallbackCont,
                nonRegCustomAccounts: []
              };
            });
          }}
        />

      </div>
    </div>
  );
});

PrimaryAccountsTab.displayName = 'PrimaryAccountsTab';
