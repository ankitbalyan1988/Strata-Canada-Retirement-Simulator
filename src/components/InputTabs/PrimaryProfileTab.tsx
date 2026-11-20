import React, { useMemo } from 'react';
import {
  User,
  Briefcase,
  Sparkles,
  CreditCard,
  Check,
  ArrowRight,
  Calendar,
  Home,
  Globe,
  Minus,
  Plus,
  Receipt
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { RetirementInputs } from '../../types/retirement';
import { EXPAT_DESTINATIONS } from '../../utils/expatCountries';
import { getDebtQualifierFlags, getEffectiveDebts } from '../../utils/debtCalculator';
import { CurrencyInput } from '../CurrencyInput';
import { createDefaultAdditionalProperty } from '../AdditionalPropertiesManager';
import { TaxRuleTooltip } from '../TaxRuleTooltip';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const PrimaryProfileTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const setActiveTab = useSimulationStore((state) => state.setActiveInputTab);
  const {
    dispatchInputsChange,
    updateField,
    updateRealEstate,
    updateRealEstateField,
    updateExpatField
  } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => {
      const inp = state.inputs;
      const dFlags = getDebtQualifierFlags(inp);
      const hStatus: 'own' | 'rent' = inp.housingStatus ?? (
        inp.realEstate?.ownsHome && inp.realEstate?.purchaseType !== 'future'
          ? 'own'
          : (inp.realEstate?.purchaseType === 'future' ? 'rent' : (inp.realEstate?.ownsHome === false ? 'rent' : 'own'))
      );
      const planFutureHome: boolean = inp.planFutureHomePurchase ?? Boolean(
        inp.realEstate?.ownsHome && inp.realEstate?.purchaseType === 'future'
      );
      const planExpat: boolean = inp.planExpatExit ?? Boolean(inp.expat?.planToEmigrate);

      return {
        maritalStatus: inp.maritalStatus,
        userName: inp.userName,
        currentAge: inp.currentAge,
        retirementAge: inp.retirementAge,
        lifeExpectancy: inp.lifeExpectancy,
        currentAnnualIncome: inp.currentAnnualIncome,
        incomeGrowthRate: inp.incomeGrowthRate,
        careerDisruption: inp.careerDisruption,
        hasOngoingDebts: dFlags.hasOngoingDebts,
        planFutureDebts: dFlags.planFutureDebts,
        debts: inp.debts,
        housingStatus: hStatus,
        planFutureHomePurchase: planFutureHome,
        planExpatExit: planExpat,
        realEstateCostOfHome: inp.realEstate?.costOfHome,
        realEstateFuturePurchaseAge: inp.realEstate?.futurePurchaseAge,
        realEstateIsPaidOff: inp.realEstate?.isPaidOff,
        realEstateOwnsMultipleProperties: inp.realEstate?.ownsMultipleProperties,
        realEstatePlanFutureAdditionalProperties: inp.realEstate?.planFutureAdditionalProperties,
        realEstateAdditionalProperties: inp.realEstate?.additionalProperties,
        expatDestinationCountryId: inp.expat?.destinationCountryId,
        expatEmigrationAge: inp.expat?.emigrationAge
      };
    })
  );

  const propDebtFlags = useMemo(
    () => (externalInputs ? getDebtQualifierFlags(externalInputs) : null),
    [externalInputs]
  );

  const isMarried = (externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus) === 'married';
  const userName = externalInputs ? externalInputs.userName : storeSlice.userName;
  const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
  const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
  const lifeExpectancy = externalInputs ? externalInputs.lifeExpectancy : storeSlice.lifeExpectancy;
  const currentAnnualIncome = externalInputs ? externalInputs.currentAnnualIncome : storeSlice.currentAnnualIncome;
  const incomeGrowthRate = externalInputs ? externalInputs.incomeGrowthRate : storeSlice.incomeGrowthRate;
  const careerDisruption = externalInputs ? externalInputs.careerDisruption : storeSlice.careerDisruption;

  const hasOngoingDebts = propDebtFlags ? propDebtFlags.hasOngoingDebts : storeSlice.hasOngoingDebts;
  const planFutureDebts = propDebtFlags ? propDebtFlags.planFutureDebts : storeSlice.planFutureDebts;

  const effectiveDebts = useMemo(() => {
    const source = externalInputs ?? useSimulationStore.getState().inputs;
    return getEffectiveDebts(source);
  }, [externalInputs, storeSlice.debts, hasOngoingDebts, planFutureDebts]);

  const housingStatus: 'own' | 'rent' = externalInputs
    ? (externalInputs.housingStatus ?? (
        externalInputs.realEstate?.ownsHome && externalInputs.realEstate?.purchaseType !== 'future'
          ? 'own'
          : (externalInputs.realEstate?.purchaseType === 'future' ? 'rent' : (externalInputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
      ))
    : storeSlice.housingStatus;

  const planFutureHomePurchase: boolean = externalInputs
    ? (externalInputs.planFutureHomePurchase ?? Boolean(externalInputs.realEstate?.ownsHome && externalInputs.realEstate?.purchaseType === 'future'))
    : storeSlice.planFutureHomePurchase;

  const planExpatExit: boolean = externalInputs
    ? (externalInputs.planExpatExit ?? Boolean(externalInputs.expat?.planToEmigrate))
    : storeSlice.planExpatExit;

  const realEstateCostOfHome = externalInputs ? externalInputs.realEstate?.costOfHome : storeSlice.realEstateCostOfHome;
  const realEstateFuturePurchaseAge = externalInputs ? externalInputs.realEstate?.futurePurchaseAge : storeSlice.realEstateFuturePurchaseAge;
  const isPrimaryPaidOff = Boolean(externalInputs ? externalInputs.realEstate?.isPaidOff : storeSlice.realEstateIsPaidOff);
  const ownsMultiple = Boolean(externalInputs ? externalInputs.realEstate?.ownsMultipleProperties : storeSlice.realEstateOwnsMultipleProperties);
  const plansFutureExtra = Boolean(externalInputs ? externalInputs.realEstate?.planFutureAdditionalProperties : storeSlice.realEstatePlanFutureAdditionalProperties);
  const existingAdditional = (externalInputs ? externalInputs.realEstate?.additionalProperties : storeSlice.realEstateAdditionalProperties) || [];
  const expatDestinationCountryId = externalInputs ? externalInputs.expat?.destinationCountryId : storeSlice.expatDestinationCountryId;
  const expatEmigrationAge = externalInputs ? externalInputs.expat?.emigrationAge : storeSlice.expatEmigrationAge;

  const getFullInputsSnapshot = (): RetirementInputs =>
    externalInputs ?? useSimulationStore.getState().inputs;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Primary Profile & Career Baseline</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMarried
              ? 'Your personal timeline, employment earnings trajectory, and career disruption scenarios'
              : 'Personal timeline, employment earnings trajectory, and career disruption scenarios'}
          </p>
        </div>
      </div>

      {/* Required Client / Account Holder Name */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 via-slate-50 to-slate-50/60 dark:from-emerald-500/10 dark:via-slate-800/60 dark:to-slate-800/40 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label htmlFor="primary-client-name" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Primary Client / Account Holder Name</span>
          </label>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-2 py-0.5 rounded-md">
            * Required
          </span>
        </div>
        <div className="relative">
          <input
            id="primary-client-name"
            type="text"
            required
            value={userName ?? ''}
            onChange={(e) => updateField('userName', e.target.value)}
            placeholder="e.g. Jordan Miller"
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition outline-none bg-white dark:bg-slate-900 ${
              !userName?.trim()
                ? 'border-rose-300 dark:border-rose-500/50 focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white'
                : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white'
            }`}
            aria-invalid={!userName?.trim()}
          />
        </div>
        {!userName?.trim() ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <span>⚠️</span>
            <span>Please enter your name. Your name is required to personalize your wealth dossier PDF and exported Excel schedule.</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Printed on your customized Canadian Retirement Wealth Dossier (PDF) and audit-grade annual ledger (Excel).
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="flex flex-col gap-4 bg-slate-50/60 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Timeline Assumptions</h5>

          <div>
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Current Age:
                <TaxRuleTooltip ruleId="current_age" size="xs" />
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{currentAge} years old</span>
            </div>
            <input
              type="range" inputMode="none"
              min={20}
              max={retirementAge - 1}
              value={currentAge}
              onChange={(e) => updateField('currentAge', Number(e.target.value))}
              aria-label="Current Age"
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Life Expectancy:
                <TaxRuleTooltip ruleId="life_expectancy" size="xs" />
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{lifeExpectancy} years old</span>
            </div>
            <input
              type="range" inputMode="none"
              min={Math.max(75, retirementAge + 5)}
              max={100}
              value={lifeExpectancy}
              onChange={(e) => updateField('lifeExpectancy', Number(e.target.value))}
              aria-label="Life Expectancy"
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-500"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Longevity horizon (Stats Canada average is 82-87; planning for 90-95 protects against outliving assets).
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-slate-50/60 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isMarried ? 'Your Earnings & Career Trajectory' : 'Earnings & Career Trajectory'}
          </h5>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Annual Employment Income
              </label>
              <TaxRuleTooltip ruleId="employment_income" size="xs" />
            </div>
            <CurrencyInput
              value={currentAnnualIncome}
              onChange={(val) => updateField('currentAnnualIncome', val)}
              min={10000}
              step={5000}
              aria-label="Your Annual Employment Income"
            />

            {/* Wage Trend Slider (supports negative wage decrease / deflation as well as positive growth) */}
            <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Annual Wage Trajectory:
                  <TaxRuleTooltip ruleId="wage_trajectory" size="xs" />
                </span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  incomeGrowthRate > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : incomeGrowthRate < 0
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {incomeGrowthRate > 0 ? `+${incomeGrowthRate}% / yr Growth` : incomeGrowthRate < 0 ? `${incomeGrowthRate}% / yr Decline` : '0.0% / yr Flat'}
                </span>
              </div>

              <input
                type="range" inputMode="none"
                min={-5.0}
                max={8.0}
                step={0.1}
                value={incomeGrowthRate}
                onChange={(e) => updateField('incomeGrowthRate', Number(e.target.value))}
                aria-label="Annual Wage Trend"
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-500"
              />

              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span>-5% (Wage Erosion)</span>
                <span>0% (Stagnant)</span>
                <span>+8% (Strong Growth)</span>
              </div>
            </div>

            {/* Career Disruption / Layoff Simulator Box */}
            <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Career Disruption / Layoff Simulator</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(careerDisruption?.enabled)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField('careerDisruption', {
                          enabled: true,
                          shockAge: Math.min(retirementAge - 2, Math.max(currentAge + 1, 50)),
                          reductionPercent: 25,
                          isTemporary: false,
                          recoveryYears: 2
                        });
                      } else {
                        updateField('careerDisruption', {
                          enabled: false,
                          shockAge: 50,
                          reductionPercent: 25,
                          isTemporary: false,
                          recoveryYears: 2
                        });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Test if your retirement plan survives industry disruption, unexpected layoffs, or forced step-downs before retirement.
              </p>

              {careerDisruption?.enabled && (
                <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 bg-rose-50/30 dark:bg-rose-500/10 p-2.5 rounded-lg border border-rose-100 dark:border-rose-500/20">
                  {/* Shock Age */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Disruption Occurs At:</span>
                      <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">Age {careerDisruption.shockAge}</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={currentAge + 1}
                      max={Math.max(currentAge + 2, retirementAge - 1)}
                      step={1}
                      value={careerDisruption.shockAge}
                      onChange={(e) => updateField('careerDisruption', {
                        ...careerDisruption,
                        shockAge: Number(e.target.value)
                      })}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                    />
                  </div>

                  {/* Severity Quick Buttons & Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Wage Reduction Severity:</span>
                      <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">-{careerDisruption.reductionPercent}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                      {[15, 30, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateField('careerDisruption', {
                            ...careerDisruption,
                            reductionPercent: pct
                          })}
                          className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                            careerDisruption?.reductionPercent === pct
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          -{pct}% {pct === 15 ? 'Pay Cut' : pct === 30 ? 'Layoff' : 'Step-down'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={10}
                      max={70}
                      step={5}
                      value={careerDisruption.reductionPercent}
                      onChange={(e) => updateField('careerDisruption', {
                        ...careerDisruption,
                        reductionPercent: Number(e.target.value)
                      })}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                    />
                  </div>

                  {/* Disruption Duration */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-100 dark:border-rose-500/20">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Trajectory Impact:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField('careerDisruption', {
                          ...careerDisruption,
                          isTemporary: false
                        })}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition cursor-pointer ${
                          !careerDisruption.isTemporary
                            ? 'bg-rose-700 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Permanent Step-Down
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('careerDisruption', {
                          ...careerDisruption,
                          isTemporary: true,
                          recoveryYears: 2
                        })}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition cursor-pointer ${
                          careerDisruption.isTemporary
                            ? 'bg-rose-700 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Temporary (2-Yr Rebound)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Household Scope & Life Circumstances Qualifying Questions */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Planning Scope & Life Circumstances</span>
          </h5>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Answer these qualifying questions so Strata configures the relevant debt, real estate, and relocation modules for your situation.
          </p>
        </div>

        {/* CARD 1: DEBTS & LOANS QUESTION (Ongoing -> Future Debt Follow-Up) */}
        <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/30 dark:bg-rose-500/10 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                  Do you have any ongoing debts (other than a home mortgage)?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Includes current student loans, auto loans, personal loans, lines of credit (LOC), or credit cards.
                </p>
              </div>
            </div>

            {/* Yes / No Segmented Choice for Ongoing Debts */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-rose-200 dark:border-rose-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  dispatchInputsChange((prev) => ({
                    ...(typeof prev === 'object' && prev !== null ? prev : getFullInputsSnapshot()),
                    hasOngoingDebts: true,
                    hasOngoingOrFutureDebts: true
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  hasOngoingDebts
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {hasOngoingDebts && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatchInputsChange((prev) => ({
                    ...(typeof prev === 'object' && prev !== null ? prev : getFullInputsSnapshot()),
                    hasOngoingDebts: false,
                    hasOngoingOrFutureDebts: Boolean(planFutureDebts)
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  !hasOngoingDebts
                    ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {!hasOngoingDebts && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>No</span>
              </button>
            </div>
          </div>

          {/* If user selected "Yes" for Ongoing Debts */}
          {hasOngoingDebts && (
            <div className="pt-2.5 border-t border-rose-200/70 dark:border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200 text-xs">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="font-semibold">
                  Debts & Loans module is enabled in your planning tabs.
                  {effectiveDebts.length > 0 && ` (${effectiveDebts.length} debt${effectiveDebts.length > 1 ? 's' : ''} loaded)`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('debts')}
                className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Configure Debts & Loans</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* If user selected "No" for Ongoing Debts: Follow-up Future Debt question appears */}
          {!hasOngoingDebts && (
            <div className="pt-3 border-t border-rose-200/70 dark:border-rose-500/30 flex flex-col gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200/60 dark:border-rose-500/20 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <span className="p-1 rounded-md bg-rose-600 text-white shrink-0 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                      Do you plan to take on a debt or loan in the future?
                    </h6>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Model a future auto loan, education loan, personal loan, or line of credit starting at a chosen age.
                    </p>
                  </div>
                </div>

                {/* Yes / No for Future Debts */}
                <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-rose-200 dark:border-rose-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      dispatchInputsChange((prev) => ({
                        ...(typeof prev === 'object' && prev !== null ? prev : getFullInputsSnapshot()),
                        hasOngoingDebts: false,
                        planFutureDebts: true,
                        hasOngoingOrFutureDebts: true
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      planFutureDebts
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {planFutureDebts && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatchInputsChange((prev) => ({
                        ...(typeof prev === 'object' && prev !== null ? prev : getFullInputsSnapshot()),
                        hasOngoingDebts: false,
                        planFutureDebts: false,
                        hasOngoingOrFutureDebts: false
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      !planFutureDebts
                        ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {!planFutureDebts && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>No</span>
                  </button>
                </div>
              </div>

              {planFutureDebts ? (
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="font-semibold">
                      Future Debts & Loans tab enabled: Configure planned future loans and their start ages.
                      {effectiveDebts.length > 0 && ` (${effectiveDebts.length} future loan${effectiveDebts.length > 1 ? 's' : ''} modeled)`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('debts')}
                    className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Open Future Debts & Loans</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>
                    Debt-free outlook: Debts & Loans section is hidden. No consumer debts or future loans modeled.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 2: REAL ESTATE & HOUSING QUESTION */}
        <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/10 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-600 text-white shrink-0 mt-0.5">
                <Home className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                  Do you currently own or rent a home?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tell us whether you have an existing primary residence or are currently renting.
                </p>
              </div>
            </div>

            {/* Own vs Rent Segmented Buttons */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-200 dark:border-amber-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  const needsHomeDefaults = (realEstateCostOfHome ?? 0) <= 0;
                  updateField('housingStatus', 'own');
                  updateField('planFutureHomePurchase', false);
                  updateRealEstate({
                    ownsHome: true,
                    purchaseType: 'current',
                    ...(needsHomeDefaults ? {
                      costOfHome: 650000,
                      currentMarketValue: 650000,
                      downPayment: 130000,
                      mortgageInterestRate: 4.79,
                      mortgageTermYears: 25,
                      mortgageStartYear: 2021,
                      annualAppreciationRate: 3.2,
                      ownershipSharePercent: isMarried ? 50 : 100
                    } : {})
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  housingStatus === 'own'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {housingStatus === 'own' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Own</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('housingStatus', 'rent');
                  if (planFutureHomePurchase) {
                    const needsHomeDefaults = (realEstateCostOfHome ?? 0) <= 0;
                    const defaultPurchaseAge = Math.max(
                      currentAge + 1,
                      Math.min(retirementAge, currentAge + 3)
                    );
                    const existingAge = realEstateFuturePurchaseAge;
                    const resolvedPurchaseAge = existingAge && existingAge > currentAge
                      ? existingAge
                      : defaultPurchaseAge;
                    updateRealEstate({
                      ownsHome: true,
                      purchaseType: 'future',
                      futurePurchaseAge: resolvedPurchaseAge,
                      ...(needsHomeDefaults ? {
                        costOfHome: 650000,
                        currentMarketValue: 650000,
                        downPayment: 130000,
                        mortgageInterestRate: 4.79,
                        mortgageTermYears: 25,
                        annualAppreciationRate: 3.2,
                        ownershipSharePercent: isMarried ? 50 : 100,
                        fundWithFhsa: true,
                        fundWithHbp: true,
                        fundWithTfsa: true,
                        fundWithNonReg: true
                      } : {})
                    });
                  } else {
                    updateRealEstate({
                      ownsHome: false
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  housingStatus === 'rent'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {housingStatus === 'rent' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Rent</span>
              </button>
            </div>
          </div>

          {/* If user selected "Own": Primary mortgage status + multi-property onboarding */}
          {housingStatus === 'own' && (
            <div className="pt-3 border-t border-amber-200/70 dark:border-amber-500/20 flex flex-col gap-3 animate-in fade-in duration-200 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-semibold">
                    Owns home today: Real Estate section is active with your property & accumulated equity.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('realestate')}
                  className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer shrink-0"
                >
                  <span>Configure Real Estate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Primary Mortgage Status & Multi-Property Follow-ups */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                {/* Primary Home: Mortgage vs Paid Off */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-500/25 flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Is your primary home paid off?
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateRealEstateField('isPaidOff', false)}
                      className={`py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        !isPrimaryPaidOff
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Has Mortgage
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRealEstate({
                        isPaidOff: true
                      })}
                      className={`py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        isPrimaryPaidOff
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Paid Off ($0)
                    </button>
                  </div>
                </div>

                {/* Currently owns >1 property? */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-500/25 flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Do you currently own &gt;1 property?
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateRealEstateField('ownsMultipleProperties', false)}
                      className={`py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        !ownsMultiple
                          ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      No (1 Home)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const hasCurrentAddl = existingAdditional.some((p) => p.timing === 'current');
                        updateRealEstate({
                          ownsMultipleProperties: true,
                          additionalProperties: hasCurrentAddl
                            ? existingAdditional
                            : [...existingAdditional, createDefaultAdditionalProperty('current', getFullInputsSnapshot(), existingAdditional.length)]
                        });
                      }}
                      className={`py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        ownsMultiple
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Yes (2+ Props)
                    </button>
                  </div>
                </div>

                {/* Plans to buy additional properties in future? */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-500/25 flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Buy an additional property later?
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateRealEstateField('planFutureAdditionalProperties', false)}
                      className={`py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        !plansFutureExtra
                          ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const hasFutureAddl = existingAdditional.some((p) => p.timing === 'future');
                        updateRealEstate({
                          planFutureAdditionalProperties: true,
                          additionalProperties: hasFutureAddl
                            ? existingAdditional
                            : [...existingAdditional, createDefaultAdditionalProperty('future', getFullInputsSnapshot(), existingAdditional.length)]
                        });
                      }}
                      className={`py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        plansFutureExtra
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Yes (Future)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* If user selected "Rent": Follow-up question appears */}
          {housingStatus === 'rent' && (
            <div className="pt-3 border-t border-blue-200 dark:border-blue-500/30 flex flex-col gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200/60 dark:border-blue-500/20 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <span className="p-1 rounded-md bg-blue-600 text-white shrink-0 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                      Do you plan to purchase a home in the future?
                    </h6>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Simulate future home buying with FHSA / RRSP Home Buyers' Plan (HBP) down payment funding.
                    </p>
                  </div>
                </div>

                {/* Yes / No for Future Purchase */}
                <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-blue-200 dark:border-blue-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      const needsHomeDefaults = (realEstateCostOfHome ?? 0) <= 0;
                      const defaultPurchaseAge = Math.max(
                        currentAge + 1,
                        Math.min(retirementAge, currentAge + 3)
                      );
                      const existingAge = realEstateFuturePurchaseAge;
                      const resolvedPurchaseAge = existingAge && existingAge > currentAge
                        ? existingAge
                        : defaultPurchaseAge;
                      updateField('planFutureHomePurchase', true);
                      updateRealEstate({
                        ownsHome: true,
                        purchaseType: 'future',
                        futurePurchaseAge: resolvedPurchaseAge,
                        ...(needsHomeDefaults ? {
                          costOfHome: 650000,
                          currentMarketValue: 650000,
                          downPayment: 130000,
                          mortgageInterestRate: 4.79,
                          mortgageTermYears: 25,
                          annualAppreciationRate: 3.2,
                          ownershipSharePercent: isMarried ? 50 : 100,
                          fundWithFhsa: true,
                          fundWithHbp: true,
                          fundWithTfsa: true,
                          fundWithNonReg: true
                        } : {})
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      planFutureHomePurchase
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {planFutureHomePurchase && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateField('planFutureHomePurchase', false);
                      updateRealEstate({
                        ownsHome: false,
                        planFutureAdditionalProperties: false
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      !planFutureHomePurchase
                        ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {!planFutureHomePurchase && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>No</span>
                  </button>
                </div>
              </div>

              {/* Feedback & Additional Future Property Question based on choice */}
              {planFutureHomePurchase ? (
                <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-500/20 flex flex-col gap-2.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-500/25">
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 block">
                        Do you also plan to buy an additional property in the future?
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        Model buying a second home, cottage, or rental property after your first home purchase.
                      </span>
                    </div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => updateRealEstateField('planFutureAdditionalProperties', false)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          !plansFutureExtra
                            ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        No (1 Home)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const hasFutureAddl = existingAdditional.some((p) => p.timing === 'future');
                          updateRealEstate({
                            planFutureAdditionalProperties: true,
                            additionalProperties: hasFutureAddl
                              ? existingAdditional
                              : [...existingAdditional, createDefaultAdditionalProperty('future', getFullInputsSnapshot(), existingAdditional.length)]
                          });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          plansFutureExtra
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Yes (2+ Props)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="font-semibold">
                        Future Home Purchase Simulator enabled{plansFutureExtra ? ' (including additional future properties)' : ''}.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('realestate')}
                      className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Open Real Estate Simulator</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>
                    Renting throughout retirement: Real Estate & Home section is hidden. Monthly rent is modeled under Living Expenses.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 3: EXPAT EMIGRATION PLANNING QUESTION */}
        <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-500/10 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-cyan-600 text-white shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                  Do you plan to exit Canada and settle in a different country?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Model CRA non-resident Part XIII withholding taxes, deemed disposition departure tax (S. 128.1), and local purchasing power (PPP).
                </p>
              </div>
            </div>

            {/* Yes / No Segmented Choice */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-cyan-200 dark:border-cyan-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  updateField('planExpatExit', true);
                  updateExpatField('planToEmigrate', true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  planExpatExit
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {planExpatExit && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('planExpatExit', false);
                  updateExpatField('planToEmigrate', false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  !planExpatExit
                    ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {!planExpatExit && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>No</span>
              </button>
            </div>
          </div>

          {planExpatExit && (
            <div className="pt-3 border-t border-cyan-200/80 dark:border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Destination:</span>
                  <select
                    value={expatDestinationCountryId || 'mexico'}
                    onChange={(e) => updateExpatField('destinationCountryId', e.target.value)}
                    className="text-xs font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 shadow-2xs focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                  >
                    {EXPAT_DESTINATIONS.map(d => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {d.flag} {d.name} ({d.purchasingPowerMultiplier.toFixed(1)}x PPP • {d.currencyCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="expat-planned-exit-age" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Planned Exit Age:
                  </label>
                  <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs overflow-hidden focus-within:ring-1 focus-within:ring-cyan-500">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = expatEmigrationAge || retirementAge;
                        const next = Math.max(currentAge, cur - 1);
                        updateExpatField('emigrationAge', next);
                      }}
                      disabled={(expatEmigrationAge || retirementAge) <= currentAge}
                      className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Decrease planned exit age"
                      aria-label="Decrease planned exit age"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="flex items-center px-1">
                      <span className="text-[11px] font-medium text-slate-400 select-none mr-1">Age</span>
                      <input
                        id="expat-planned-exit-age"
                        type="number"
                        min={currentAge}
                        max={Math.max(currentAge + 1, lifeExpectancy - 1)}
                        value={expatEmigrationAge || retirementAge}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateExpatField(
                              'emigrationAge',
                              Math.max(currentAge, Math.min(lifeExpectancy - 1, val))
                            );
                          }
                        }}
                        aria-label="Planned Exit Age"
                        className="w-10 text-xs font-mono font-bold text-cyan-900 dark:text-cyan-200 bg-transparent text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = expatEmigrationAge || retirementAge;
                        const next = Math.min(lifeExpectancy - 1, cur + 1);
                        updateExpatField('emigrationAge', next);
                      }}
                      disabled={(expatEmigrationAge || retirementAge) >= lifeExpectancy - 1}
                      className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Increase planned exit age"
                      aria-label="Increase planned exit age"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('expat')}
                className="text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Configure Full Expat Parameters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Next Step Guidance to Living Expenses */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-50">Next Step: Estimate Living Expenses</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Enter your monthly household expenses in today's dollars (rent/mortgage, utilities, credit cards) and adjust post-retirement lifestyle needs.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 self-stretch sm:self-auto justify-center cursor-pointer"
        >
          <span>Continue to Living Expenses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

PrimaryProfileTab.displayName = 'PrimaryProfileTab';
