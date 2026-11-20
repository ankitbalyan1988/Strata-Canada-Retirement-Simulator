import React from 'react';
import { TrendingUp, Home } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { getActiveAdditionalProperties } from '../../utils/mortgage';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const ReturnsInflationTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const { updateField, updateAccountReturn, updateRealEstateField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      rrspReturn: state.inputs.accountReturns?.rrspReturn,
      tfsaReturn: state.inputs.accountReturns?.tfsaReturn,
      fhsaReturn: state.inputs.accountReturns?.fhsaReturn,
      nonRegReturn: state.inputs.accountReturns?.nonRegReturn,
      nonRegCustomAccountsCount: state.inputs.nonRegCustomAccounts?.length ?? 0,
      inflationRate: state.inputs.inflationRate,
      nonRegYieldTaxRate: state.inputs.nonRegYieldTaxRate,
      realEstateOwnsHome: Boolean(state.inputs.realEstate?.ownsHome),
      realEstateAnnualAppreciationRate: state.inputs.realEstate?.annualAppreciationRate,
      hasActiveAdditionalProps: getActiveAdditionalProperties(state.inputs).length > 0
    }))
  );

  const rrspReturn = externalInputs ? externalInputs.accountReturns?.rrspReturn : storeSlice.rrspReturn;
  const tfsaReturn = externalInputs ? externalInputs.accountReturns?.tfsaReturn : storeSlice.tfsaReturn;
  const fhsaReturn = externalInputs ? externalInputs.accountReturns?.fhsaReturn : storeSlice.fhsaReturn;
  const nonRegReturn = externalInputs ? externalInputs.accountReturns?.nonRegReturn : storeSlice.nonRegReturn;
  const nonRegCustomAccountsCount = externalInputs
    ? (externalInputs.nonRegCustomAccounts?.length ?? 0)
    : storeSlice.nonRegCustomAccountsCount;
  const inflationRate = externalInputs ? externalInputs.inflationRate : storeSlice.inflationRate;
  const nonRegYieldTaxRate = externalInputs ? externalInputs.nonRegYieldTaxRate : storeSlice.nonRegYieldTaxRate;
  const showPropertyAppreciation = externalInputs
    ? (Boolean(externalInputs.realEstate?.ownsHome) || getActiveAdditionalProperties(externalInputs).length > 0)
    : (storeSlice.realEstateOwnsHome || storeSlice.hasActiveAdditionalProps);
  const annualAppreciationRate = externalInputs
    ? (externalInputs.realEstate?.annualAppreciationRate ?? 3.2)
    : (storeSlice.realEstateAnnualAppreciationRate ?? 3.2);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Economic Parameters & Per-Account Return Rates</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">Configure expected return rates independently for each Canadian account vehicle</p>
      </div>

      {/* Individual Account Returns Grid */}
      <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Individual Account Expected Return Rates
          </span>
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
            Independent compounding rates applied directly to each account
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* RRSP */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-500/30 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">RRSP</span>
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Expected:</span>
              <span className="text-sm font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                {rrspReturn ?? 6.5}%
              </span>
            </div>
            <input
              type="range" inputMode="none"
              min={2.0}
              max={12.0}
              step={0.1}
              value={rrspReturn ?? 6.5}
              onChange={(e) => updateAccountReturn('rrspReturn', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
            />
          </div>

          {/* TFSA */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-500/30 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">TFSA</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Expected:</span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {tfsaReturn ?? 7.0}%
              </span>
            </div>
            <input
              type="range" inputMode="none"
              min={2.0}
              max={12.0}
              step={0.1}
              value={tfsaReturn ?? 7.0}
              onChange={(e) => updateAccountReturn('tfsaReturn', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
            />
          </div>

          {/* FHSA */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-500/30 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">FHSA</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Expected:</span>
              <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 font-mono">
                {fhsaReturn ?? 6.0}%
              </span>
            </div>
            <input
              type="range" inputMode="none"
              min={2.0}
              max={12.0}
              step={0.1}
              value={fhsaReturn ?? 6.0}
              onChange={(e) => updateAccountReturn('fhsaReturn', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600"
            />
          </div>

          {/* Non-Reg */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-500/30 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Non-Reg</span>
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {nonRegCustomAccountsCount > 0 ? 'Blended:' : 'Expected:'}
              </span>
              <span className="text-sm font-extrabold text-purple-700 dark:text-purple-400 font-mono">
                {nonRegReturn ?? 5.5}%
              </span>
            </div>
            {nonRegCustomAccountsCount > 0 ? (
              <div className="text-[9px] text-purple-800 dark:text-purple-300 font-semibold bg-purple-50/80 dark:bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-500/30 text-center">
                Calculated from {nonRegCustomAccountsCount} custom accounts
              </div>
            ) : (
              <input
                type="range" inputMode="none"
                min={2.0}
                max={12.0}
                step={0.1}
                value={nonRegReturn ?? 5.5}
                onChange={(e) => updateAccountReturn('nonRegReturn', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-purple-600"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Macroeconomic & Tax Friction</h5>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Annual CPI Inflation Rate:</span>
              <span className="text-rose-700 dark:text-rose-400 font-mono font-bold">{inflationRate}%</span>
            </div>
            <input
              type="range" inputMode="none"
              min={1.0}
              max={5.0}
              step={0.1}
              value={inflationRate}
              onChange={(e) => updateField('inflationRate', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Bank of Canada benchmark target is 2.0%</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Taxable Account Annual Tax Drag:</span>
              <span className="text-purple-700 dark:text-purple-400 font-mono font-bold">{nonRegYieldTaxRate}%</span>
            </div>
            <input
              type="range" inputMode="none"
              min={0.2}
              max={3.0}
              step={0.1}
              value={nonRegYieldTaxRate}
              onChange={(e) => updateField('nonRegYieldTaxRate', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-purple-600"
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Estimated annual tax friction on dividend yields and realized capital gains</span>
          </div>
        </div>

        {showPropertyAppreciation ? (
          <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Property Appreciation</h5>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Real Estate Annual Appreciation Rate:
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">{annualAppreciationRate}%</span>
              </div>
              <input
                type="range" inputMode="none"
                min={1.0}
                max={7.0}
                step={0.1}
                value={annualAppreciationRate}
                onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Long-term Canadian residential market appreciation (CREA average ~3.2%)</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Per-Account Compounding Active</p>
            <p className="text-[11px] leading-relaxed">
              Each Canadian vehicle (RRSP, TFSA, FHSA, and Non-Reg) compounds year-over-year strictly using its dedicated expected return rate specified above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

ReturnsInflationTab.displayName = 'ReturnsInflationTab';
