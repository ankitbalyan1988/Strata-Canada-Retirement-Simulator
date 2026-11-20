import React, { useMemo } from 'react';
import { Users, Landmark, FileText, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { CppCalculationMethod } from '../../types/retirement';
import { calculateAdjustedServiceCanadaCpp, getCppTimingFactor } from '../../utils/cppCalculator';
import { calculateEmployerRrspMatch } from '../../utils/employerMatch';
import { CurrencyInput } from '../CurrencyInput';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  InputTabProps,
  getCppAdjustmentText,
  getOasAdjustmentText,
  useInputTabDispatch
} from './inputTabHelpers';

export const SpouseProfileTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const { updateSpouseField, updateSpouseEmployerMatch } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      maritalStatus: state.inputs.maritalStatus,
      spouse: state.inputs.spouse
    }))
  );

  const isMarried = (externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus) === 'married';
  const spouse = externalInputs ? externalInputs.spouse : storeSlice.spouse;

  const spouseCppMethod: CppCalculationMethod = spouse?.cppCalculationMethod || 'percentage';
  const spouseServiceCanadaEstimate = spouse?.cppServiceCanadaEstimateAt65 ?? 917;

  const spouseCppAdjResult = useMemo(() => {
    if (!spouse) return null;
    return calculateAdjustedServiceCanadaCpp({
      serviceCanadaMonthlyAt65: spouseServiceCanadaEstimate,
      currentAge: spouse.currentAge,
      retirementAge: spouse.retirementAge,
      cppStartAge: spouse.cppStartAge,
      currentAnnualIncome: spouse.annualIncome,
      careerDisruption: spouse.careerDisruption
    });
  }, [
    spouse,
    spouseServiceCanadaEstimate,
    spouse?.currentAge,
    spouse?.retirementAge,
    spouse?.cppStartAge,
    spouse?.annualIncome,
    spouse?.careerDisruption
  ]);

  if (!isMarried || !spouse) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-500/20 pb-3">
        <div>
          <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Spouse Profile & Separate Registered Accounts
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            In Canada, each spouse maintains their own individual RRSP room, TFSA limit, CPP pension, and OAS clawback threshold.
          </p>
        </div>

        {/* Pension Income Splitting Toggle */}
        <label className="flex items-center gap-2 cursor-pointer bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-900 dark:text-rose-200">
          <input
            type="checkbox"
            checked={spouse.pensionIncomeSplitting}
            onChange={(e) => updateSpouseField('pensionIncomeSplitting', e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <span>CRA Pension Income Splitting (Age 65+)</span>
        </label>
      </div>

      {/* Spouse Career & Ages */}
      <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/20 dark:bg-rose-500/10 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Spouse Name / Label</label>
          <input
            type="text"
            value={spouse.name}
            onChange={(e) => updateSpouseField('name', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current Age</label>
          <input
            type="number"
            min={18}
            max={spouse.retirementAge - 1}
            value={spouse.currentAge}
            onChange={(e) => updateSpouseField('currentAge', Number(e.target.value))}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-medium"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Retirement Age</label>
          <input
            type="number"
            min={Math.max(45, spouse.currentAge + 1)}
            max={75}
            value={spouse.retirementAge}
            onChange={(e) => updateSpouseField('retirementAge', Number(e.target.value))}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-medium"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Annual Employment Income</label>
          <CurrencyInput
            value={spouse.annualIncome}
            onChange={(val) => updateSpouseField('annualIncome', val)}
            min={0}
            step={5000}
            aria-label="Spouse Annual Employment Income"
          />
          <div className="flex items-center justify-between gap-1 mt-1 text-[10.5px]">
            <span className="text-slate-500 dark:text-slate-400">Wage Trend:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={-5.0}
                max={8.0}
                step={0.1}
                value={spouse.incomeGrowthRate}
                onChange={(e) => updateSpouseField('incomeGrowthRate', Number(e.target.value))}
                className="w-14 px-1.5 py-0.5 text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded text-right font-medium"
              />
              <span className="text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spouse Accounts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Spouse RRSP */}
        <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse RRSP</span>
            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded">Deductible</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Current Balance</label>
              <CurrencyInput
                value={spouse.rrspBalance}
                onChange={(val) => updateSpouseField('rrspBalance', val)}
                min={0}
                step={1000}
                aria-label="Spouse RRSP Current Balance"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Annual Contrib</label>
              <CurrencyInput
                value={spouse.rrspAnnualContribution}
                onChange={(val) => updateSpouseField('rrspAnnualContribution', val)}
                min={0}
                step={500}
                aria-label="Spouse RRSP Annual Contribution"
              />
            </div>
          </div>

          {/* Spouse Employer Match Section */}
          <div className="pt-2 mt-0.5 border-t border-blue-100 dark:border-blue-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!spouse.employerMatch?.enabled}
                  onChange={(e) => updateSpouseEmployerMatch({ enabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                  <span>🏢 Employer Match</span>
                  {spouse.employerMatch?.enabled && (
                    <span className="text-[9.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-500/20 px-1.5 py-0.2 rounded">
                      +${calculateEmployerRrspMatch(spouse.annualIncome, spouse.rrspAnnualContribution, spouse.employerMatch).toLocaleString()}/yr
                    </span>
                  )}
                </span>
              </label>
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500">Group RRSP</span>
            </div>

            {spouse.employerMatch?.enabled && (
              <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/25 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Formula:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateSpouseEmployerMatch({ matchType: 'percent_of_salary' })}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                        (!spouse.employerMatch.matchType || spouse.employerMatch.matchType === 'percent_of_salary')
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      % Salary Cap
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSpouseEmployerMatch({ matchType: 'percent_of_contribution' })}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                        spouse.employerMatch.matchType === 'percent_of_contribution'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      % Contrib
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSpouseEmployerMatch({ matchType: 'fixed_dollar' })}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                        spouse.employerMatch.matchType === 'fixed_dollar'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Fixed ($)
                    </button>
                  </div>
                </div>

                {(!spouse.employerMatch.matchType || spouse.employerMatch.matchType === 'percent_of_salary') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Match Rate</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={200}
                          step={5}
                          value={spouse.employerMatch.matchRatePercent ?? 100}
                          onChange={(e) => updateSpouseEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                          className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Salary Cap</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0.5}
                          max={18}
                          step={0.5}
                          value={spouse.employerMatch.matchPercentOfSalary ?? 4}
                          onChange={(e) => updateSpouseEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                          className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                )}

                {spouse.employerMatch.matchType === 'percent_of_contribution' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Match %</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={200}
                          step={5}
                          value={spouse.employerMatch.matchRatePercent ?? 50}
                          onChange={(e) => updateSpouseEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                          className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Salary Cap %</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={18}
                          step={0.5}
                          value={spouse.employerMatch.matchPercentOfSalary ?? 6}
                          onChange={(e) => updateSpouseEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                          className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                )}

                {spouse.employerMatch.matchType === 'fixed_dollar' && (
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Fixed Annual Match ($/yr)</label>
                    <CurrencyInput
                      value={spouse.employerMatch.fixedAnnualAmount ?? 3000}
                      onChange={(val) => updateSpouseEmployerMatch({ fixedAnnualAmount: val })}
                      min={0}
                      step={250}
                      aria-label="Spouse Fixed Annual Match"
                    />
                  </div>
                )}

                {(() => {
                  const sMatch = calculateEmployerRrspMatch(spouse.annualIncome, spouse.rrspAnnualContribution, spouse.employerMatch);
                  const sTotal = spouse.rrspAnnualContribution + sMatch;
                  return (
                    <div className="pt-1.5 border-t border-blue-200/50 dark:border-blue-500/20 text-[10.5px] flex items-center justify-between font-semibold">
                      <span className="text-blue-800 dark:text-blue-300">Total Spouse RRSP Additions:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        ${sTotal.toLocaleString()}/yr (+${sMatch.toLocaleString()} match)
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Spouse TFSA */}
        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-500/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse TFSA</span>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">100% Tax-Free</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Current Balance</label>
              <CurrencyInput
                value={spouse.tfsaBalance}
                onChange={(val) => updateSpouseField('tfsaBalance', val)}
                min={0}
                step={1000}
                aria-label="Spouse TFSA Current Balance"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Annual Contrib</label>
              <CurrencyInput
                value={spouse.tfsaAnnualContribution}
                onChange={(val) => updateSpouseField('tfsaAnnualContribution', val)}
                min={0}
                max={15000}
                step={500}
                aria-label="Spouse TFSA Annual Contribution"
              />
            </div>
          </div>
        </div>

        {/* Spouse FHSA */}
        <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-500/10 flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse FHSA</span>
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded shrink-0">Home / RRSP Roll</span>
          </div>
          {(() => {
            const sRemainingRoom = spouse.fhsaRemainingContributionRoom !== undefined
              ? Math.min(40000, Math.max(0, spouse.fhsaRemainingContributionRoom))
              : Math.max(0, 40000 - Math.min(40000, spouse.fhsaBalance || 0));

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">Current Balance</label>
                  <CurrencyInput
                    value={spouse.fhsaBalance}
                    onChange={(val) => updateSpouseField('fhsaBalance', val)}
                    min={0}
                    step={1000}
                    className="h-[34px]"
                    aria-label="Spouse FHSA Current Balance"
                  />
                </div>
                <div className="flex flex-col justify-between h-full min-w-0 gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Remaining Room</label>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold shrink-0">Max $40k</span>
                  </div>
                  <CurrencyInput
                    value={sRemainingRoom}
                    onChange={(val) => {
                      const clamped = Math.min(40000, Math.max(0, val));
                      updateSpouseField('fhsaRemainingContributionRoom', clamped);
                    }}
                    min={0}
                    max={40000}
                    step={1000}
                    className="h-[34px]"
                    aria-label="Spouse FHSA Remaining Contribution Room"
                  />
                </div>
                <div className="flex flex-col justify-between h-full min-w-0 gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Annual Contrib Target</label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">Max $8k/yr</span>
                  </div>
                  <CurrencyInput
                    value={spouse.fhsaAnnualContribution}
                    onChange={(val) => updateSpouseField('fhsaAnnualContribution', val)}
                    min={0}
                    max={8000}
                    step={500}
                    className="h-[34px]"
                    aria-label="Spouse FHSA Annual Contribution"
                  />
                </div>
              </div>
            );
          })()}

          {/* Spouse Year FHSA Opened & 15-yr Rollover */}
          <div className="pt-2 border-t border-amber-200/60 dark:border-amber-500/30 flex flex-col gap-2 bg-white/90 dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-500/30 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Year Opened:</span>
              <div className="flex items-center gap-1">
                {[2023, 2024, 2025, 2026].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => updateSpouseField('fhsaOpenYear', yr)}
                    className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded border transition cursor-pointer ${
                      (spouse.fhsaOpenYear || 2023) === yr
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const spOpenYr = spouse.fhsaOpenYear || 2023;
              const spExpiryYr = spOpenYr + 15;
              const spRolloverAge = Math.min(71, (spouse.currentAge || 40) + (spExpiryYr - 2026));
              const spTarget = spRolloverAge >= 71 ? 'RRIF' : (spRolloverAge >= (spouse.retirementAge || 65) ? 'RRIF / RRSP' : 'RRSP');
              return (
                <span className="text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
                  CRA 15-yr limit in <strong>{spExpiryYr}</strong> → rolls over into spouse's <strong>{spTarget}</strong> at <span className="font-bold underline decoration-amber-500">Age {spRolloverAge}</span>.
                </span>
              );
            })()}
          </div>
        </div>

        {/* Spouse Non-Reg */}
        <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 bg-purple-50/20 dark:bg-purple-500/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse Non-Reg (SA)</span>
            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-2 py-0.5 rounded">Taxable</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Current Balance</label>
              <CurrencyInput
                value={spouse.nonRegBalance}
                onChange={(val) => updateSpouseField('nonRegBalance', val)}
                min={0}
                step={2000}
                aria-label="Spouse Non-Registered Current Balance"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Annual Contrib</label>
              <CurrencyInput
                value={spouse.nonRegAnnualContribution}
                onChange={(val) => updateSpouseField('nonRegAnnualContribution', val)}
                min={0}
                step={1000}
                aria-label="Spouse Non-Registered Annual Contribution"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Spouse CPP & OAS parameters */}
      <div className="flex flex-col gap-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
          <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Spouse Government Pensions (CPP & OAS)
          </h5>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Model spouse's Canada Pension Plan and Old Age Security entitlements independently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Spouse CPP Card */}
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Spouse CPP
              </h5>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                Age {spouse.cppStartAge} • ${spouseCppMethod === 'service_canada' && spouseCppAdjResult ? Math.round(spouseCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString() : Math.round((1433.50 * ((spouse.cppEstimatedPercentOfMax ?? 64) / 100)) * getCppTimingFactor(spouse.cppStartAge).factor).toLocaleString()}/mo
              </span>
            </div>

            {/* Spouse Method Toggle */}
            <div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Estimation Method:</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  {spouseCppMethod === 'service_canada' ? 'Service Canada SOC' : 'Percentage of Maximum'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateSpouseField('cppCalculationMethod', 'percentage')}
                  className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all ${
                    spouseCppMethod === 'percentage'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  % of Maximum
                </button>
                <button
                  type="button"
                  onClick={() => updateSpouseField('cppCalculationMethod', 'service_canada')}
                  className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                    spouseCppMethod === 'service_canada'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Service Canada Statement
                </button>
              </div>
            </div>

            {/* Spouse CPP Start Age Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Spouse CPP Start Age (60 - 70):</span>
                <span className="text-blue-700 dark:text-blue-400 font-bold">{spouse.cppStartAge} yrs</span>
              </div>
              <input
                type="range" inputMode="none"
                min={60}
                max={70}
                step={1}
                value={spouse.cppStartAge}
                onChange={(e) => updateSpouseField('cppStartAge', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
              />
              <div className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>Adjustment: {getCppAdjustmentText(spouse.cppStartAge)}</span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  {spouse.cppStartAge < 65 ? '-0.6%/mo' : spouse.cppStartAge > 65 ? '+0.7%/mo' : 'Standard'}
                </span>
              </div>
            </div>

            {/* Spouse % of Max */}
            {spouseCppMethod === 'percentage' && (
              <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Career Entitlement (% of Max):</span>
                    <span className="text-blue-700 dark:text-blue-400 font-mono font-bold">
                      {spouse.cppEstimatedPercentOfMax ?? 64}% of Maximum
                    </span>
                  </div>
                  <input
                    type="range" inputMode="none"
                    min={30}
                    max={100}
                    step={5}
                    value={spouse.cppEstimatedPercentOfMax ?? 64}
                    onChange={(e) => updateSpouseField('cppEstimatedPercentOfMax', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '64% CRA Avg (~$917)', val: 64 },
                    { label: '85% Strong Career', val: 85 },
                    { label: '100% Max YMPE', val: 100 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => updateSpouseField('cppEstimatedPercentOfMax', preset.val)}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                        (spouse.cppEstimatedPercentOfMax ?? 64) === preset.val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-blue-100/40 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Anticipated CPP:</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      ${Math.round((1433.50 * ((spouse.cppEstimatedPercentOfMax ?? 64) / 100)) * getCppTimingFactor(spouse.cppStartAge || 65).factor).toLocaleString()} / mo
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1.5">
                      (${Math.round((1433.50 * ((spouse.cppEstimatedPercentOfMax ?? 64) / 100)) * getCppTimingFactor(spouse.cppStartAge || 65).factor * 12).toLocaleString()} / yr)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Spouse Service Canada Statement */}
            {spouseCppMethod === 'service_canada' && spouseCppAdjResult && (
              <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Spouse Statement Monthly @ Age 65:</span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">From MSCA Statement</span>
                  </div>
                  <CurrencyInput
                    value={spouse.cppServiceCanadaEstimateAt65 ?? 917}
                    onChange={(val) => updateSpouseField('cppServiceCanadaEstimateAt65', val)}
                    min={0}
                    step={50}
                    aria-label="Spouse Service Canada Statement Monthly CPP at Age 65"
                  />
                </div>

                {/* Quick Chips */}
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
                      onClick={() => updateSpouseField('cppServiceCanadaEstimateAt65', chip.val)}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                        (spouse.cppServiceCanadaEstimateAt65 ?? 917) === chip.val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Spouse Actuarial Recalibration Box */}
                <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-700/60 flex flex-col gap-2.5 text-xs shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/70 pb-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Spouse Recalibration Engine
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      Dynamic Adjustment
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Adjusted for spouse retiring at age <strong>{spouse.retirementAge}</strong>
                    {spouse.careerDisruption?.enabled ? ' and spouse career downturns' : ''}.
                  </p>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">1. Statement Base @ 65:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ${spouseCppAdjResult.serviceCanadaMonthlyAt65.toFixed(2)}/mo
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">
                        2. Early Retirement Dilution (Age {spouse.retirementAge}):
                      </span>
                      <span className={`font-semibold ${
                        spouseCppAdjResult.earlyRetirementImpactPercent < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {spouseCppAdjResult.earlyRetirementImpactPercent < 0
                          ? `${spouseCppAdjResult.earlyRetirementImpactPercent.toFixed(1)}% (${spouseCppAdjResult.earlyRetirementYearsLost} yrs early)`
                          : '0.0% (Working to 65+)'}
                      </span>
                    </div>

                    {spouseCppAdjResult.careerDownturnImpactPercent < 0 && (
                      <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                        <span className="text-slate-600 dark:text-slate-400">3. Career Downturn:</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {spouseCppAdjResult.careerDownturnImpactPercent.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">Adjusted Base @ 65:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ${spouseCppAdjResult.adjustedMonthlyAt65.toFixed(2)}/mo (${Math.round(spouseCppAdjResult.adjustedAnnualAt65).toLocaleString()}/yr)
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">Timing Adjustment (@ Age {spouse.cppStartAge}):</span>
                      <span className={`font-semibold ${
                        spouseCppAdjResult.timingAdjustmentPercent < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : spouseCppAdjResult.timingAdjustmentPercent > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {spouseCppAdjResult.timingAdjustmentPercent >= 0 ? '+' : ''}{spouseCppAdjResult.timingAdjustmentPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Spouse Final Banner */}
                  <div className="mt-1 p-2 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                        Anticipated Spouse CPP
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Effective {spouseCppAdjResult.effectivePercentOfMaxAtStartAge.toFixed(1)}% of 2026 Max
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">
                        ${Math.round(spouseCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString()} <span className="text-xs font-normal">/ mo</span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        ${Math.round(spouseCppAdjResult.anticipatedAnnualAtStartAge).toLocaleString()} / yr (today's $)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spouse OAS Card */}
          <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50/20 dark:bg-sky-500/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Spouse Old Age Security (OAS)
              </h5>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300">
                Age {spouse.oasStartAge}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Spouse OAS Start Age (65 - 70):</span>
                <span className="text-sky-700 dark:text-sky-400 font-bold">{spouse.oasStartAge} yrs</span>
              </div>
              <input
                type="range" inputMode="none"
                min={65}
                max={70}
                step={1}
                value={spouse.oasStartAge}
                onChange={(e) => updateSpouseField('oasStartAge', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
              />
              <div className="mt-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                Adjustment: {getOasAdjustmentText(spouse.oasStartAge)}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Years Lived in Canada:</span>
                <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">
                  {spouse.oasEligibleYearsInCanada ?? 40} / 40 yrs
                </span>
              </div>
              <input
                type="range" inputMode="none"
                min={10}
                max={40}
                step={1}
                value={spouse.oasEligibleYearsInCanada ?? 40}
                onChange={(e) => updateSpouseField('oasEligibleYearsInCanada', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

SpouseProfileTab.displayName = 'SpouseProfileTab';
