import React, { useMemo } from 'react';
import { Landmark, FileText, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { CppCalculationMethod } from '../../types/retirement';
import { calculateAdjustedServiceCanadaCpp, getCppTimingFactor } from '../../utils/cppCalculator';
import { CurrencyInput } from '../CurrencyInput';
import { TaxRuleTooltip } from '../TaxRuleTooltip';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  InputTabProps,
  getCppAdjustmentText,
  getOasAdjustmentText,
  useInputTabDispatch
} from './inputTabHelpers';

export const PensionsTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const { updateField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      maritalStatus: state.inputs.maritalStatus,
      currentAge: state.inputs.currentAge,
      retirementAge: state.inputs.retirementAge,
      currentAnnualIncome: state.inputs.currentAnnualIncome,
      careerDisruption: state.inputs.careerDisruption,
      cppStartAge: state.inputs.cppStartAge,
      cppEstimatedPercentOfMax: state.inputs.cppEstimatedPercentOfMax,
      cppCalculationMethod: state.inputs.cppCalculationMethod,
      cppServiceCanadaEstimateAt65: state.inputs.cppServiceCanadaEstimateAt65,
      oasStartAge: state.inputs.oasStartAge,
      oasEligibleYearsInCanada: state.inputs.oasEligibleYearsInCanada
    }))
  );

  const isMarried = (externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus) === 'married';
  const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
  const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
  const currentAnnualIncome = externalInputs ? externalInputs.currentAnnualIncome : storeSlice.currentAnnualIncome;
  const careerDisruption = externalInputs ? externalInputs.careerDisruption : storeSlice.careerDisruption;
  const cppStartAge = externalInputs ? externalInputs.cppStartAge : storeSlice.cppStartAge;
  const cppEstimatedPercentOfMax = externalInputs ? externalInputs.cppEstimatedPercentOfMax : storeSlice.cppEstimatedPercentOfMax;
  const primaryCppMethod: CppCalculationMethod =
    (externalInputs ? externalInputs.cppCalculationMethod : storeSlice.cppCalculationMethod) || 'percentage';
  const primaryServiceCanadaEstimate =
    (externalInputs ? externalInputs.cppServiceCanadaEstimateAt65 : storeSlice.cppServiceCanadaEstimateAt65) ?? 917;
  const oasStartAge = externalInputs ? externalInputs.oasStartAge : storeSlice.oasStartAge;
  const oasEligibleYearsInCanada = externalInputs ? externalInputs.oasEligibleYearsInCanada : storeSlice.oasEligibleYearsInCanada;

  const primaryCppAdjResult = useMemo(() => {
    return calculateAdjustedServiceCanadaCpp({
      serviceCanadaMonthlyAt65: primaryServiceCanadaEstimate,
      currentAge,
      retirementAge,
      cppStartAge,
      currentAnnualIncome,
      careerDisruption
    });
  }, [
    primaryServiceCanadaEstimate,
    currentAge,
    retirementAge,
    cppStartAge,
    currentAnnualIncome,
    careerDisruption
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
          {isMarried ? 'Your Personal Government Pensions' : 'Government Assistance & Public Pensions'}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Canada Pension Plan (CPP) and Old Age Security (OAS) timing trade-offs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Canada Pension Plan (CPP)
            </h5>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
              Age {cppStartAge} • ${primaryCppMethod === 'service_canada' && primaryCppAdjResult ? Math.round(primaryCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString() : Math.round((1433.50 * (cppEstimatedPercentOfMax / 100)) * getCppTimingFactor(cppStartAge).factor).toLocaleString()}/mo
            </span>
          </div>

          {/* Calculation Mode Toggle */}
          <div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Estimation Method:</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                {primaryCppMethod === 'service_canada' ? 'Service Canada SOC' : 'Percentage of Maximum'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => updateField('cppCalculationMethod', 'percentage')}
                className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all ${
                  primaryCppMethod === 'percentage'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                % of Maximum
              </button>
              <button
                type="button"
                onClick={() => updateField('cppCalculationMethod', 'service_canada')}
                className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  primaryCppMethod === 'service_canada'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Service Canada Statement
              </button>
            </div>
          </div>

          {/* CPP Start Age Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                CPP Start Age (60 - 70):
                <TaxRuleTooltip ruleId="cpp_start_age" size="xs" />
              </span>
              <span className="text-blue-700 dark:text-blue-400 font-bold">{cppStartAge} yrs</span>
            </div>
            <input
              type="range" inputMode="none"
              min={60}
              max={70}
              step={1}
              value={cppStartAge}
              onChange={(e) => updateField('cppStartAge', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
            />
            <div className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span>Adjustment: {getCppAdjustmentText(cppStartAge)}</span>
              <span className="text-slate-400 dark:text-slate-500 font-normal">
                {cppStartAge < 65 ? '-0.6%/mo' : cppStartAge > 65 ? '+0.7%/mo' : 'Standard'}
              </span>
            </div>
          </div>

          {/* Sub-Panel: Percentage of Max */}
          {primaryCppMethod === 'percentage' && (
            <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Career Entitlement (% of Max):</span>
                  <span className="text-blue-700 dark:text-blue-400 font-mono font-bold">{cppEstimatedPercentOfMax}% of Maximum</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={30}
                  max={100}
                  step={5}
                  value={cppEstimatedPercentOfMax}
                  onChange={(e) => updateField('cppEstimatedPercentOfMax', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '64% CRA Avg (~$917)', val: 64 },
                  { label: '85% Strong Career', val: 85 },
                  { label: '100% Max YMPE', val: 100 }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => updateField('cppEstimatedPercentOfMax', preset.val)}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                      cppEstimatedPercentOfMax === preset.val
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Preview Summary */}
              <div className="p-2.5 rounded-lg bg-blue-100/40 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Anticipated CPP:</span>
                <div className="text-right">
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    ${Math.round((1433.50 * (cppEstimatedPercentOfMax / 100)) * getCppTimingFactor(cppStartAge).factor).toLocaleString()} / mo
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1.5">
                    (${Math.round((1433.50 * (cppEstimatedPercentOfMax / 100)) * getCppTimingFactor(cppStartAge).factor * 12).toLocaleString()} / yr)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Panel: Service Canada Statement */}
          {primaryCppMethod === 'service_canada' && (
            <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Statement Monthly Estimate at Age 65:</span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">From My Service Canada (SOC)</span>
                </div>
                <CurrencyInput
                  value={primaryServiceCanadaEstimate}
                  onChange={(val) => updateField('cppServiceCanadaEstimateAt65', val)}
                  min={0}
                  step={50}
                  aria-label="Service Canada Statement Monthly CPP at Age 65"
                />
              </div>

              {/* Quick Statement Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '$600/mo', val: 600 },
                  { label: '$800/mo', val: 800 },
                  { label: '$1,000/mo', val: 1000 },
                  { label: '$1,200/mo', val: 1200 },
                  { label: '$1,433/mo (Max)', val: 1433 }
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => updateField('cppServiceCanadaEstimateAt65', chip.val)}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                      primaryServiceCanadaEstimate === chip.val
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Actuarial Recalibration Breakdown Card */}
              {primaryCppAdjResult && (
                <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-700/60 flex flex-col gap-2.5 text-xs shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/70 pb-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Service Canada Recalibration Engine
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      Dynamic Actuarial Adjustment
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Service Canada assumes you earn at your recent pace until 65. Our engine recalibrates for retiring at age <strong>{retirementAge}</strong>
                    {careerDisruption?.enabled ? ' and modeled career downturns' : ''}.
                  </p>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">1. Statement Base @ 65:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ${primaryCppAdjResult.serviceCanadaMonthlyAt65.toFixed(2)}/mo
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">
                        2. Early Retirement Dilution (Age {retirementAge}):
                      </span>
                      <span className={`font-semibold ${
                        primaryCppAdjResult.earlyRetirementImpactPercent < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {primaryCppAdjResult.earlyRetirementImpactPercent < 0
                          ? `${primaryCppAdjResult.earlyRetirementImpactPercent.toFixed(1)}% (${primaryCppAdjResult.earlyRetirementYearsLost} yrs early)`
                          : '0.0% (Working to 65+)'}
                      </span>
                    </div>

                    {primaryCppAdjResult.careerDownturnImpactPercent < 0 && (
                      <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                        <span className="text-slate-600 dark:text-slate-400">3. Career Downturn Impact:</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {primaryCppAdjResult.careerDownturnImpactPercent.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">Adjusted Age-65 Baseline:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ${primaryCppAdjResult.adjustedMonthlyAt65.toFixed(2)}/mo (${Math.round(primaryCppAdjResult.adjustedAnnualAt65).toLocaleString()}/yr)
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">Collection Timing Factor (@ Age {cppStartAge}):</span>
                      <span className={`font-semibold ${
                        primaryCppAdjResult.timingAdjustmentPercent < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : primaryCppAdjResult.timingAdjustmentPercent > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {primaryCppAdjResult.timingAdjustmentPercent >= 0 ? '+' : ''}{primaryCppAdjResult.timingAdjustmentPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Final Anticipated Benefit Banner */}
                  <div className="mt-1 p-2 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                        Anticipated True CPP
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Effective {primaryCppAdjResult.effectivePercentOfMaxAtStartAge.toFixed(1)}% of 2026 Max
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">
                        ${Math.round(primaryCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString()} <span className="text-xs font-normal">/ mo</span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        ${Math.round(primaryCppAdjResult.anticipatedAnnualAtStartAge).toLocaleString()} / yr (today's $)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50/20 dark:bg-sky-500/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Old Age Security (OAS)
            </h5>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300">
              Age {oasStartAge}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                OAS Start Age (65 - 70):
                <TaxRuleTooltip ruleId="oas_start_age" size="xs" />
              </span>
              <span className="text-sky-700 dark:text-sky-400 font-bold">{oasStartAge} yrs</span>
            </div>
            <input
              type="range" inputMode="none"
              min={65}
              max={70}
              step={1}
              value={oasStartAge}
              onChange={(e) => updateField('oasStartAge', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
            />
            <div className="mt-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              Adjustment: {getOasAdjustmentText(oasStartAge)}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Years Lived in Canada:</span>
              <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">{oasEligibleYearsInCanada} / 40 yrs</span>
            </div>
            <input
              type="range" inputMode="none"
              min={10}
              max={40}
              step={1}
              value={oasEligibleYearsInCanada}
              onChange={(e) => updateField('oasEligibleYearsInCanada', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
            />
          </div>
        </div>

      </div>
    </div>
  );
});

PensionsTab.displayName = 'PensionsTab';
