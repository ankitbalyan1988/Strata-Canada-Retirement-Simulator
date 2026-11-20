import React, { useMemo } from 'react';
import {
  Calendar,
  Home,
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Key,
  ShieldCheck
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { RetirementInputs } from '../../types/retirement';
import { BLANK_CANVAS_INPUTS, DEFAULT_REAL_ESTATE_INPUTS } from '../../utils/presets';
import { getActiveAdditionalProperties, calculateAdditionalPropertySummary } from '../../utils/mortgage';
import { CurrencyInput } from '../CurrencyInput';
import { AdditionalPropertiesManager } from '../AdditionalPropertiesManager';
import { RealtorHomeCostCard } from '../RealtorHomeCostCard';
import { TaxRuleTooltip } from '../TaxRuleTooltip';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const RealEstateTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const setActiveTab = useSimulationStore((state) => state.setActiveInputTab);
  const { updateField, updateRealEstate, updateRealEstateField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => {
      const inp = state.inputs;
      const hStatus: 'own' | 'rent' = inp.housingStatus ?? (
        inp.realEstate?.ownsHome && inp.realEstate?.purchaseType !== 'future'
          ? 'own'
          : (inp.realEstate?.purchaseType === 'future' ? 'rent' : (inp.realEstate?.ownsHome === false ? 'rent' : 'own'))
      );
      return {
        maritalStatus: inp.maritalStatus,
        province: inp.province,
        currentAge: inp.currentAge,
        retirementAge: inp.retirementAge,
        lifeExpectancy: inp.lifeExpectancy,
        housingStatus: hStatus,
        planFutureHomePurchase: inp.planFutureHomePurchase,
        fhsaIntent: inp.fhsaIntent,
        livingExpensesRent: inp.monthlyExpenses?.rentOrMortgage,
        realEstate: inp.realEstate
      };
    })
  );

  const maritalStatus = externalInputs ? externalInputs.maritalStatus : storeSlice.maritalStatus;
  const isMarried = maritalStatus === 'married';
  const province = externalInputs ? externalInputs.province : storeSlice.province;
  const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
  const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
  const lifeExpectancy = externalInputs ? externalInputs.lifeExpectancy : storeSlice.lifeExpectancy;
  const fhsaIntent = externalInputs ? externalInputs.fhsaIntent : storeSlice.fhsaIntent;
  const livingExpensesRent = externalInputs ? externalInputs.monthlyExpenses?.rentOrMortgage : storeSlice.livingExpensesRent;
  const re = (externalInputs ? externalInputs.realEstate : storeSlice.realEstate) || DEFAULT_REAL_ESTATE_INPUTS;

  const housingStatus: 'own' | 'rent' = externalInputs
    ? (externalInputs.housingStatus ?? (
        externalInputs.realEstate?.ownsHome && externalInputs.realEstate?.purchaseType !== 'future'
          ? 'own'
          : (externalInputs.realEstate?.purchaseType === 'future' ? 'rent' : (externalInputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
      ))
    : storeSlice.housingStatus;

  const planFutureHomePurchase = externalInputs
    ? externalInputs.planFutureHomePurchase
    : storeSlice.planFutureHomePurchase;

  // Lightweight scoped RetirementInputs view for mortgage & AdditionalPropertiesManager helpers
  const scopedInputs: RetirementInputs = useMemo(() => {
    if (externalInputs) return externalInputs;
    return {
      ...BLANK_CANVAS_INPUTS,
      maritalStatus,
      province,
      currentAge,
      retirementAge,
      lifeExpectancy,
      housingStatus,
      planFutureHomePurchase,
      realEstate: re
    };
  }, [
    externalInputs,
    maritalStatus,
    province,
    currentAge,
    retirementAge,
    lifeExpectancy,
    housingStatus,
    planFutureHomePurchase,
    re
  ]);

  const costOfHome = re.costOfHome || 650000;
  const currentMarketValue = re.currentMarketValue || costOfHome;
  const downPayment = re.downPayment ?? 130000;
  const downPaymentPct = costOfHome > 0 ? Math.round((downPayment / costOfHome) * 100) : 20;
  const mortgageInterestRate = re.mortgageInterestRate ?? 4.79;
  const mortgageTermYears = re.mortgageTermYears ?? 25;
  const mortgageStartYear = re.mortgageStartYear ?? 2021;
  const ownershipSharePercent = re.ownershipSharePercent ?? (isMarried ? 50 : 100);
  const annualAppreciationRate = re.annualAppreciationRate ?? 3.2;
  const planToSellHome = Boolean(re.planToSellHome);
  const sellHomeAge = re.sellHomeAge ?? 72;
  const sellingCostPercent = re.sellingCostPercent ?? 4.5;
  const isFuturePurchase = Boolean(re.ownsHome && re.purchaseType === 'future');
  const futurePurchaseAge = re.futurePurchaseAge ?? Math.min(retirementAge, currentAge + 3);

  // Living expenses rent auto-population & override detection
  const isRentOverridden = Boolean(re.rentOverridden);
  const currentRent = (isRentOverridden && re.currentRent !== undefined)
    ? re.currentRent
    : (livingExpensesRent ?? re.currentRent ?? 2200);

  // Down payment percentage presets (5%, 10%, 15%, 20%, or custom)
  const downPaymentPreset = re.downPaymentPercentPreset ?? (costOfHome > 0 && Math.abs((downPayment / costOfHome) - 0.20) < 0.01 ? 20 : 'custom');

  // Accounts to fund the down payment
  const fundWithFhsa = re.fundWithFhsa !== false;
  const fundWithHbp = re.fundWithHbp !== false && re.useHbp !== false;
  const fundWithTfsa = re.fundWithTfsa !== false;
  const fundWithNonReg = re.fundWithNonReg !== false;

  const isPrimaryPaidOff = Boolean(re.isPaidOff);
  const effectiveDownPayment = isPrimaryPaidOff ? costOfHome : downPayment;

  const currentCalendarYear = 2026;
  const yearsToPurchase = Math.max(1, futurePurchaseAge - currentAge);
  const futurePurchaseYear = currentCalendarYear + yearsToPurchase;

  // Amortization math
  const semiAnnualRate = (mortgageInterestRate / 100) / 2;
  const monthlyRate = mortgageInterestRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
  const totalMonths = mortgageTermYears * 12;

  // Current Homeowner calculations
  const initialLoan = isPrimaryPaidOff ? 0 : Math.max(0, costOfHome - effectiveDownPayment);
  const monthlyPayment = (!isPrimaryPaidOff && initialLoan > 0 && totalMonths > 0)
    ? (monthlyRate > 0
        ? (initialLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
        : initialLoan / totalMonths)
    : 0;

  const elapsedMonthsToday = Math.max(0, (currentCalendarYear - mortgageStartYear) * 12);
  const remainingMortgageToday = (isPrimaryPaidOff || initialLoan <= 0 || elapsedMonthsToday >= totalMonths)
    ? 0
    : Math.max(0, initialLoan * Math.pow(1 + monthlyRate, elapsedMonthsToday) - monthlyPayment * ((Math.pow(1 + monthlyRate, elapsedMonthsToday) - 1) / (monthlyRate || 1)));

  const totalEquityToday = Math.max(0, currentMarketValue - remainingMortgageToday);
  const userEquityToday = totalEquityToday * (ownershipSharePercent / 100);
  const primaryCurrentMortgageFreeAge = isPrimaryPaidOff || remainingMortgageToday <= 0
    ? currentAge
    : currentAge + Math.max(0, mortgageStartYear + mortgageTermYears - currentCalendarYear);

  // Future Purchase calculations
  const projectedPurchasePrice = Math.round(costOfHome * Math.pow(1 + annualAppreciationRate / 100, yearsToPurchase));
  const projectedDownPayment = isPrimaryPaidOff
    ? projectedPurchasePrice
    : Math.round(projectedPurchasePrice * (downPaymentPct / 100));
  const futureInitialLoan = isPrimaryPaidOff ? 0 : Math.max(0, projectedPurchasePrice - projectedDownPayment);
  const futureMonthlyPayment = (!isPrimaryPaidOff && futureInitialLoan > 0 && totalMonths > 0)
    ? (monthlyRate > 0
        ? (futureInitialLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
        : futureInitialLoan / totalMonths)
    : 0;
  const mortgageFreeAge = isPrimaryPaidOff ? futurePurchaseAge : futurePurchaseAge + mortgageTermYears;

  // Combined Multi-Property Portfolio totals
  const activeAdditionalProps = getActiveAdditionalProperties(scopedInputs);
  const additionalSummaries = activeAdditionalProps.map((p) => ({
    prop: p,
    stats: calculateAdditionalPropertySummary(p, currentAge, currentCalendarYear)
  }));
  const additionalCurrentProps = additionalSummaries.filter((x) => x.prop.timing === 'current');
  const additionalFutureProps = additionalSummaries.filter((x) => x.prop.timing === 'future');
  const combinedCurrentValueToday = (isFuturePurchase ? 0 : currentMarketValue) +
    additionalCurrentProps.reduce((s, x) => s + x.stats.currentMarketValue, 0);
  const combinedCurrentMortgageToday = (isFuturePurchase ? 0 : remainingMortgageToday) +
    additionalCurrentProps.reduce((s, x) => s + x.stats.remainingMortgageToday, 0);
  const combinedUserEquityToday = (isFuturePurchase ? 0 : userEquityToday) +
    additionalCurrentProps.reduce((s, x) => s + x.stats.userEquityToday, 0);
  const totalActivePropertiesCount = (re.ownsHome ? 1 : 0) + activeAdditionalProps.length;

  // Projected sale calculation
  const effectiveBasePrice = isFuturePurchase ? projectedPurchasePrice : currentMarketValue;
  const baseAge = isFuturePurchase ? futurePurchaseAge : currentAge;
  const yearsToSale = Math.max(0, sellHomeAge - baseAge);
  const projectedValueAtSale = effectiveBasePrice * Math.pow(1 + annualAppreciationRate / 100, yearsToSale);
  const elapsedMonthsAtSale = isFuturePurchase
    ? Math.max(0, (sellHomeAge - futurePurchaseAge) * 12)
    : Math.max(0, (currentCalendarYear + yearsToSale - mortgageStartYear) * 12);
  const saleLoan = isFuturePurchase ? futureInitialLoan : initialLoan;
  const saleMonthlyPmt = isFuturePurchase ? futureMonthlyPayment : monthlyPayment;
  const remainingMortgageAtSale = (isPrimaryPaidOff || elapsedMonthsAtSale >= totalMonths)
    ? 0
    : Math.max(0, saleLoan * Math.pow(1 + monthlyRate, elapsedMonthsAtSale) - saleMonthlyPmt * ((Math.pow(1 + monthlyRate, elapsedMonthsAtSale) - 1) / (monthlyRate || 1)));
  const netProceedsAtSale = Math.max(0, (projectedValueAtSale * (1 - sellingCostPercent / 100)) - remainingMortgageAtSale) * (ownershipSharePercent / 100);

  return (
    <div className="flex flex-col gap-6">

      {/* Contextual Header based on Housing Selection from Primary Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            {housingStatus === 'rent' ? (
              <>
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Canadian Real Estate: Future Home Purchase Simulator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-extrabold uppercase">Simulator</span>
              </>
            ) : (
              <>
                <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Canadian Real Estate: Home Ownership & Mortgage Equity</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold uppercase">Owns Home</span>
              </>
            )}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {housingStatus === 'rent'
              ? `Currently renting; model future purchase timing at age ${futurePurchaseAge}, FHSA/HBP down payments, and financial impact.`
              : 'Model existing home value, mortgage principal amortization, accumulated equity, and downsizing strategy.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition self-start sm:self-auto cursor-pointer"
        >
          <span>Change Housing Plan in Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* VIEW 1: RENT LONG-TERM (NO REAL ESTATE) */}
      {!re.ownsHome && (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-slate-50 text-sm">Long-Term Renting Mode Active</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mt-1">
              You indicated in your Primary Profile that you currently rent and do not plan to purchase a home in the future. Monthly rent is modeled under Living Expenses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer mt-1"
          >
            <span>Change Housing Plan in Primary Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* VIEW 2: FUTURE HOME PURCHASE (CURRENTLY RENTING) */}
      {re.ownsHome && isFuturePurchase && (
        <div className="flex flex-col gap-6">

          {/* Future Buyer Stepper Journey Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-emerald-950/30 border border-blue-200/90 dark:border-blue-500/30 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-blue-200/60 dark:border-blue-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="text-xs font-bold text-blue-950 dark:text-blue-100 uppercase tracking-wide">
                  Future Home Purchase Journey (Assumption: Currently Renting)
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 font-mono">
                {yearsToPurchase} {yearsToPurchase === 1 ? 'Year' : 'Years'} Until Purchase
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-blue-200/70 dark:border-blue-500/30">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">1. Today (Age {currentAge})</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">🏢 Currently Renting</span>
                <span className="text-[11px] text-blue-700 dark:text-blue-400 font-mono font-semibold">${Math.round(currentRent).toLocaleString()} / month</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-500/30">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block">2. Age {futurePurchaseAge} ({futurePurchaseYear})</span>
                <span className="font-extrabold text-indigo-950 dark:text-indigo-100 block mt-0.5">🏡 Buy Primary Home</span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono font-semibold">${Math.round(projectedPurchasePrice).toLocaleString()} est. price</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-500/30">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block">3. Down Payment</span>
                <span className="font-extrabold text-indigo-950 dark:text-indigo-100 block mt-0.5">💰 ${Math.round(projectedDownPayment).toLocaleString()} ({downPaymentPct}%)</span>
                <span className="text-[10.5px] text-slate-600 dark:text-slate-400 block truncate">
                  {[fundWithFhsa && 'FHSA', fundWithHbp && 'HBP', fundWithTfsa && 'TFSA', fundWithNonReg && 'Non-Reg'].filter(Boolean).join(' + ') || 'Mortgage Only'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">4. Age {mortgageFreeAge}</span>
                <span className="font-extrabold text-emerald-950 dark:text-emerald-100 block mt-0.5">🎉 100% Mortgage-Free</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">$0 Housing Debt</span>
              </div>
            </div>
          </div>

          {/* Future Purchase Top Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-blue-100/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-900/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-500/30">
            <div>
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">Target Purchase Age</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 font-mono">Age {futurePurchaseAge}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Year {futurePurchaseYear} ({yearsToPurchase} yrs away)</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">Projected Home Price</span>
              <span className="text-lg font-extrabold text-indigo-950 dark:text-indigo-100 font-mono">${Math.round(projectedPurchasePrice).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">(${costOfHome.toLocaleString()} in today's $)</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Target Down Payment</span>
              <span className="text-lg font-extrabold text-amber-900 dark:text-amber-200 font-mono">${Math.round(projectedDownPayment).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{downPaymentPct}% of purchase price</span>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-200 dark:border-blue-500/30 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">Future Mortgage</span>
              <span className="text-lg font-black text-blue-950 dark:text-blue-100 font-mono">${Math.round(futureMonthlyPayment).toLocaleString()}/mo</span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">Free by Age {mortgageFreeAge}</span>
            </div>
          </div>

          {/* Realtor.ca Monthly Cost Projection & Land Transfer Tax Card */}
          <RealtorHomeCostCard
            realEstate={re}
            province={province}
            isFuturePurchase={true}
            futurePurchaseAge={futurePurchaseAge}
            futurePurchaseYear={futurePurchaseYear}
            currentRentMonthly={currentRent}
            onUpdate={updateRealEstate}
          />

          {/* 2-Column Inputs Grid for Future Home Purchase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Column 1: Future Purchase Timing & Price */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Purchase Timing & Current Rent
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                  Renting → Buying
                </span>
              </div>

              {/* Target Purchase Age */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Planned Age of Home Purchase:</span>
                  <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">Age {futurePurchaseAge} (in {yearsToPurchase} yrs)</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={currentAge + 1}
                  max={Math.min(75, retirementAge + 5)}
                  step={1}
                  value={futurePurchaseAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateRealEstateField('futurePurchaseAge', val);
                    if (fhsaIntent === 'home_purchase') {
                      updateField('fhsaHomePurchaseAge', val);
                    }
                  }}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <span>Earliest: Age {currentAge + 1}</span>
                  <span>Retirement: Age {retirementAge}</span>
                </div>
              </div>

              {/* Current Monthly Rent */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                  <label className="text-slate-700 dark:text-slate-300">
                    Current Monthly Rent Paid Today (Prior to Purchase)
                  </label>
                  {livingExpensesRent && isRentOverridden && (
                    <button
                      type="button"
                      onClick={() => {
                        updateRealEstate({
                          rentOverridden: false,
                          currentRent: livingExpensesRent
                        });
                      }}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-semibold cursor-pointer"
                    >
                      Sync with Living Expenses (${livingExpensesRent.toLocaleString()}/mo)
                    </button>
                  )}
                </div>
                <CurrencyInput
                  value={currentRent}
                  onChange={(val) => {
                    updateRealEstate({
                      currentRent: val,
                      rentOverridden: true
                    });
                  }}
                  min={0}
                  step={50}
                  aria-label="Current Monthly Rent"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {isRentOverridden
                    ? 'Custom rent override active for pre-purchase rental phase.'
                    : livingExpensesRent
                    ? `Auto-populated from Living Expenses tab ($${livingExpensesRent.toLocaleString()}/month). Edit value to override.`
                    : 'Your housing cost during the rental period before buying the home.'}
                </span>
              </div>

              {/* Target Home Price in Today's Dollars */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Home Cost in Today's Dollars
                </label>
                <CurrencyInput
                  value={costOfHome}
                  onChange={(val) => {
                    updateRealEstate({
                      costOfHome: val,
                      ...(typeof downPaymentPreset === 'number' ? { downPayment: Math.round(val * (downPaymentPreset / 100)) } : {})
                    });
                  }}
                  min={100000}
                  step={10000}
                  aria-label="Target Home Cost in Today's Dollars"
                />
                <span className="text-[10.5px] text-blue-700 dark:text-blue-400 font-medium mt-0.5 block">
                  At {annualAppreciationRate}% annual growth, this home will cost ~${Math.round(projectedPurchasePrice).toLocaleString()} at Age {futurePurchaseAge}.
                </span>
              </div>

              {/* Target Down Payment with Percentage Presets */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Target Down Payment:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">${downPayment.toLocaleString()} ({downPaymentPct}%)</span>
                </div>

                {/* Percentage Preset Pill Buttons: 5%, 10%, 15%, 20%, 100% Cash, Custom */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {[5, 10, 15, 20].map((pct) => {
                    const isSelected = !isPrimaryPaidOff && downPaymentPreset === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const autoAmount = Math.round(costOfHome * (pct / 100));
                          updateRealEstate({
                            isPaidOff: false,
                            downPayment: autoAmount,
                            downPaymentPercentPreset: pct as 5 | 10 | 15 | 20
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      updateRealEstate({
                        isPaidOff: true,
                        downPayment: costOfHome,
                        downPaymentPercentPreset: 100
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      isPrimaryPaidOff || downPaymentPreset === 100
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    100% Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRealEstate({
                        isPaidOff: false,
                        downPaymentPercentPreset: 'custom'
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      !isPrimaryPaidOff && downPaymentPreset === 'custom'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                <CurrencyInput
                  value={isPrimaryPaidOff ? costOfHome : downPayment}
                  onChange={(val) => {
                    const matchedPreset = [5, 10, 15, 20].find(p => Math.abs(Math.round(costOfHome * (p / 100)) - val) < 100);
                    const isFullCash = val >= costOfHome;
                    updateRealEstate({
                      isPaidOff: isFullCash,
                      downPayment: val,
                      downPaymentPercentPreset: isFullCash ? 100 : (matchedPreset ? (matchedPreset as 5 | 10 | 15 | 20) : 'custom')
                    });
                  }}
                  min={0}
                  max={costOfHome}
                  step={5000}
                  aria-label="Target Down Payment"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {isPrimaryPaidOff
                    ? `All-cash purchase (~$${Math.round(projectedDownPayment).toLocaleString()}): $0 mortgage debt taken.`
                    : `Projected down payment at purchase: ~$${Math.round(projectedDownPayment).toLocaleString()}.`}
                </span>
              </div>

              {/* Selectable Accounts to Fund Down Payment */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/30 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Select Accounts to Fund Down Payment
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Choose all accounts that apply
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  {/* 1. FHSA */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                    fundWithFhsa
                      ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={fundWithFhsa}
                      onChange={(e) => updateRealEstateField('fundWithFhsa', e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11.5px] flex items-center gap-1">
                          FHSA (First Home Savings Account)
                          <TaxRuleTooltip ruleId="fhsa_balance" size="xs" />
                        </span>
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          fundWithFhsa ? 'bg-blue-200/80 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {fundWithFhsa ? '100% Tax-Free' : 'Preserved'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {fundWithFhsa
                          ? `Qualifying tax-free withdrawal of accumulated FHSA balance at Age ${futurePurchaseAge}.`
                          : 'FHSA will NOT be used for down payment; balance remains invested for rollover into RRSP.'}
                      </p>
                    </div>
                  </label>

                  {/* 2. RRSP Home Buyers' Plan */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                    fundWithHbp
                      ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={fundWithHbp}
                      onChange={(e) => {
                        updateRealEstate({
                          fundWithHbp: e.target.checked,
                          useHbp: e.target.checked
                        });
                      }}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11.5px] flex items-center gap-1">
                          RRSP Home Buyers' Plan (HBP)
                          <TaxRuleTooltip ruleId="hbp_downpayment" size="xs" />
                        </span>
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          fundWithHbp ? 'bg-blue-200/80 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {fundWithHbp ? (isMarried ? 'Up to $120,000' : 'Up to $60,000') : 'Preserved'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {fundWithHbp
                          ? 'Withdraw up to $60,000 tax-free per person from RRSP (CRA 15-year repayment schedule).'
                          : 'RRSP retirement investments will remain untouched.'}
                      </p>
                    </div>
                  </label>

                  {/* 3. TFSA */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                    fundWithTfsa
                      ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={fundWithTfsa}
                      onChange={(e) => updateRealEstateField('fundWithTfsa', e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="font-bold text-[11.5px]">TFSA (Tax-Free Savings Account)</strong>
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          fundWithTfsa ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {fundWithTfsa ? 'Tax-Free Withdrawal' : 'Preserved'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {fundWithTfsa
                          ? 'Withdraw liquid TFSA savings to fund any remaining down payment portion.'
                          : 'TFSA investments will be protected and left to compound tax-free.'}
                      </p>
                    </div>
                  </label>

                  {/* 4. Non-Registered */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                    fundWithNonReg
                      ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={fundWithNonReg}
                      onChange={(e) => updateRealEstateField('fundWithNonReg', e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="font-bold text-[11.5px]">Non-Registered / Taxable Accounts</strong>
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          fundWithNonReg ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {fundWithNonReg ? 'Liquid Savings' : 'Preserved'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {fundWithNonReg
                          ? 'Deploy taxable high-interest savings, investments, or cash toward down payment.'
                          : 'Non-registered investments will remain untouched.'}
                      </p>
                    </div>
                  </label>

                  {!fundWithFhsa && !fundWithHbp && !fundWithTfsa && !fundWithNonReg && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-[10.5px] text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>No funding accounts selected. 100% of the purchase price will be financed as mortgage debt.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Column 2: Mortgage Terms & Future Amortization */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  Future Mortgage Terms
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                  Est. Loan: ${Math.round(futureInitialLoan).toLocaleString()}
                </span>
              </div>

              {/* Mortgage Interest Rate */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Mortgage Interest Rate (Semi-Annual Compounding):</span>
                  <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">{mortgageInterestRate}%</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={2.0}
                  max={9.0}
                  step={0.05}
                  value={mortgageInterestRate}
                  onChange={(e) => updateRealEstateField('mortgageInterestRate', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                />
              </div>

              {/* Mortgage Amortization Term */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Amortization Term:</span>
                  <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">{mortgageTermYears} Years</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                  {[15, 20, 25, 30].map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => updateRealEstateField('mortgageTermYears', term)}
                      className={`py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        mortgageTermYears === term
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {term} yrs
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Annual Appreciation */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Annual Real Estate Appreciation Rate:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{annualAppreciationRate}% / yr</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={1.0}
                  max={7.0}
                  step={0.1}
                  value={annualAppreciationRate}
                  onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Ownership Share */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Your Ownership Share of the Home:</span>
                  <span className="text-blue-800 dark:text-blue-300 font-bold font-mono">{ownershipSharePercent}%</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={10}
                  max={100}
                  step={5}
                  value={ownershipSharePercent}
                  onChange={(e) => updateRealEstateField('ownershipSharePercent', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <span>50% (Equal Co-owner)</span>
                  <span>100% (Sole Owner)</span>
                </div>
              </div>

              {/* Future Payment Summary Box */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Projected Monthly Payment</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">${Math.round(futureMonthlyPayment).toLocaleString()} / mo</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">vs Rent: ${Math.round(currentRent).toLocaleString()}/mo</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mortgage-Free By</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    Age {mortgageFreeAge} (Year {futurePurchaseYear + mortgageTermYears})
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                    {mortgageFreeAge <= retirementAge ? 'Paid before retirement!' : `${mortgageFreeAge - retirementAge} yrs into retirement`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Disposition / Downsizing / Sale Section */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-500/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  Future Home Downsizing / Sale (Backup Asset Liquidation)
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-900 dark:text-indigo-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={planToSellHome}
                  onChange={(e) => updateRealEstateField('planToSellHome', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Plan to sell / downsize home later</span>
              </label>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Optionally model selling the home at an older age. Capital gains are 100% tax-free under Canada’s <strong>Principal Residence Exemption (PRE)</strong>. Net equity proceeds are deposited into your <strong>Taxable Non-Registered Account</strong>.
            </p>

            {planToSellHome && (
              <div className="pt-3 border-t border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Planned Age at Sale:</span>
                      <span className="text-indigo-700 dark:text-indigo-400 font-bold font-mono">Age {sellHomeAge}</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={futurePurchaseAge + 1}
                      max={lifeExpectancy - 1}
                      step={1}
                      value={Math.max(futurePurchaseAge + 1, sellHomeAge)}
                      onChange={(e) => updateRealEstateField('sellHomeAge', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {sellHomeAge - futurePurchaseAge} years after purchasing
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Selling & Legal Closing Friction:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{sellingCostPercent}%</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={2.0}
                      max={7.0}
                      step={0.5}
                      value={sellingCostPercent}
                      onChange={(e) => updateRealEstateField('sellingCostPercent', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-700 dark:accent-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Realtor commissions & closing costs</span>
                  </div>
                </div>

                {/* Projected Proceeds Card */}
                <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                      🎉 Projected Net Equity Inflow at Age {sellHomeAge}:
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Estimated property value of ${Math.round(projectedValueAtSale).toLocaleString()} with ${Math.round(remainingMortgageAtSale).toLocaleString()} mortgage remaining.
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                      +${Math.round(netProceedsAtSale).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      Deposited to Taxable Account
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Future Properties Section (Renting -> Buying First + Additional) */}
          <AdditionalPropertiesManager
            inputs={scopedInputs}
            mode="future_only"
            onUpdateRealEstate={updateRealEstate}
          />

        </div>
      )}

      {/* VIEW 3: CURRENT HOMEOWNER (PURCHASED IN PAST) */}
      {re.ownsHome && !isFuturePurchase && (
        <div className="flex flex-col gap-6">

          {/* Combined Portfolio Strip (shown when owning/planning multiple properties) */}
          {activeAdditionalProps.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-bold text-indigo-950 dark:text-indigo-100">
                  Household Real Estate Portfolio ({totalActivePropertiesCount} Properties)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 font-mono">
                <span>
                  <strong className="text-slate-600 dark:text-slate-400 font-sans text-[10px] uppercase mr-1">Value Today:</strong>
                  <strong className="text-slate-900 dark:text-white">${Math.round(combinedCurrentValueToday).toLocaleString()}</strong>
                </span>
                <span>
                  <strong className="text-slate-600 dark:text-slate-400 font-sans text-[10px] uppercase mr-1">Combined Debt:</strong>
                  <strong className={combinedCurrentMortgageToday > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
                    ${Math.round(combinedCurrentMortgageToday).toLocaleString()}
                  </strong>
                </span>
                <span>
                  <strong className="text-slate-600 dark:text-slate-400 font-sans text-[10px] uppercase mr-1">Your Total Equity:</strong>
                  <strong className="text-emerald-700 dark:text-emerald-400">${Math.round(combinedUserEquityToday).toLocaleString()}</strong>
                </span>
                {additionalFutureProps.length > 0 && (
                  <span className="font-sans text-[11px] font-bold text-blue-700 dark:text-blue-400">
                    +{additionalFutureProps.length} Future {additionalFutureProps.length === 1 ? 'Buy' : 'Buys'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Top Live Real Estate Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-100/30 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-500/30">
            <div>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Primary Home Value</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 font-mono">${Math.round(currentMarketValue).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Cost: ${costOfHome.toLocaleString()}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">Primary Mortgage</span>
              <span className={`text-lg font-extrabold font-mono ${isPrimaryPaidOff || remainingMortgageToday <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {isPrimaryPaidOff || remainingMortgageToday <= 0 ? '$0 (Paid Off)' : `$${Math.round(remainingMortgageToday).toLocaleString()}`}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                {isPrimaryPaidOff || remainingMortgageToday <= 0 ? 'Mortgage-Free' : `Pmt: $${Math.round(monthlyPayment).toLocaleString()}/mo`}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Primary Home Equity</span>
              <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">${Math.round(totalEquityToday).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{Math.round((totalEquityToday / (currentMarketValue || 1)) * 100)}% equity built</span>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-amber-200 dark:border-amber-500/30 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">Your Net Share ({ownershipSharePercent}%)</span>
              <span className="text-lg font-black text-amber-950 dark:text-amber-100 font-mono">${Math.round(userEquityToday).toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 block">Added to Net Worth</span>
            </div>
          </div>

          {/* Realtor.ca Monthly Cost Breakdown & Ongoing Ownership Card */}
          <RealtorHomeCostCard
            realEstate={re}
            province={province}
            isFuturePurchase={false}
            futurePurchaseAge={currentAge}
            futurePurchaseYear={currentCalendarYear}
            currentRentMonthly={0}
            onUpdate={updateRealEstate}
          />

          {/* 2-Column Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Property Purchase & Valuation */}
            <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-500/10 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Property Cost & Valuation
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Primary Residence
                </span>
              </div>

              {/* Cost of Home */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Original Cost of Home (Purchase Price)
                </label>
                <CurrencyInput
                  value={costOfHome}
                  onChange={(val) => updateRealEstateField('costOfHome', val)}
                  min={50000}
                  step={10000}
                  aria-label="Original Cost of Home"
                />
              </div>

              {/* Current Market Value */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Estimated Market Value Today
                </label>
                <CurrencyInput
                  value={currentMarketValue}
                  onChange={(val) => updateRealEstateField('currentMarketValue', val)}
                  min={50000}
                  step={10000}
                  aria-label="Current Estimated Market Value Today"
                />
              </div>

              {/* Down Payment */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Down Payment Paid:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">${downPayment.toLocaleString()} ({downPaymentPct}%)</span>
                </div>
                <CurrencyInput
                  value={downPayment}
                  onChange={(val) => updateRealEstateField('downPayment', val)}
                  min={0}
                  max={costOfHome}
                  step={5000}
                  aria-label="Down Payment Paid"
                />
              </div>

              {/* Ownership Share */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Your Ownership Share of the Home:</span>
                  <span className="text-amber-800 dark:text-amber-300 font-bold font-mono">{ownershipSharePercent}%</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={10}
                  max={100}
                  step={5}
                  value={ownershipSharePercent}
                  onChange={(e) => updateRealEstateField('ownershipSharePercent', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <span>50% (Equal Co-owner)</span>
                  <span>100% (Sole Owner)</span>
                </div>
              </div>

              {/* Expected Annual Appreciation */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Annual Real Estate Appreciation Rate:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{annualAppreciationRate}% / yr</span>
                </div>
                <input
                  type="range" inputMode="none"
                  min={1.0}
                  max={7.0}
                  step={0.1}
                  value={annualAppreciationRate}
                  onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                />
              </div>
            </div>

            {/* Mortgage Terms & Amortization */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  Mortgage Status & Amortization
                </span>
                <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => updateRealEstateField('isPaidOff', false)}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      !isPrimaryPaidOff
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Active Mortgage
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRealEstateField('isPaidOff', true)}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      isPrimaryPaidOff
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Fully Paid Off ($0)
                  </button>
                </div>
              </div>

              {isPrimaryPaidOff ? (
                <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex flex-col gap-2 my-auto">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Primary Residence is 100% Paid Off ($0 Mortgage)</span>
                  </div>
                  <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Your primary home carries <strong>$0 mortgage debt</strong> and <strong>$0 monthly P&amp;I outflow</strong>. Only ongoing ownership costs (property taxes and condo/strata fees if applicable) are modeled in your cash flow ledger, and 100% of your ownership share (${Math.round(userEquityToday).toLocaleString()}) counts toward net worth.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mortgage Interest Rate */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Mortgage Interest Rate (Semi-Annual Compounding):</span>
                      <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">{mortgageInterestRate}%</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={2.0}
                      max={9.0}
                      step={0.05}
                      value={mortgageInterestRate}
                      onChange={(e) => updateRealEstateField('mortgageInterestRate', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                    />
                  </div>

                  {/* Mortgage Amortization Term */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Amortization Term:</span>
                      <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">{mortgageTermYears} Years</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                      {[15, 20, 25, 30].map(term => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => updateRealEstateField('mortgageTermYears', term)}
                          className={`py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                            mortgageTermYears === term
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {term} yrs
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Year Mortgage Started */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Year Mortgage Started:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-bold font-mono">{mortgageStartYear} ({currentCalendarYear - mortgageStartYear} yrs elapsed)</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={2005}
                      max={2026}
                      step={1}
                      value={mortgageStartYear}
                      onChange={(e) => updateRealEstateField('mortgageStartYear', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-800 dark:accent-slate-400"
                    />
                  </div>

                  {/* Monthly Payment Summary Box */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Estimated Monthly Payment</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">${Math.round(monthlyPayment).toLocaleString()} / mo</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mortgage-Free By</span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        Year {mortgageStartYear + mortgageTermYears} (Age {primaryCurrentMortgageFreeAge})
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Disposition / Downsizing / Sale Section */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-500/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  Home Disposition & Downsizing Strategy (Backup Asset Liquidation)
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-900 dark:text-indigo-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={planToSellHome}
                  onChange={(e) => updateRealEstateField('planToSellHome', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Plan to sell / downsize home</span>
              </label>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Choose whether you plan to sell your home at a target retirement age. Under the Canada Revenue Agency’s <strong>Principal Residence Exemption (PRE)</strong>, 100% of your capital gain is completely tax-free. When sold, your share of net proceeds is automatically deposited into your <strong>Taxable Non-Registered Account</strong> to compound and fund living expenses.
            </p>

            {planToSellHome && (
              <div className="pt-3 border-t border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Planned Age at Sale:</span>
                      <span className="text-indigo-700 dark:text-indigo-400 font-bold font-mono">Age {sellHomeAge}</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={currentAge + 1}
                      max={lifeExpectancy - 1}
                      step={1}
                      value={sellHomeAge}
                      onChange={(e) => updateRealEstateField('sellHomeAge', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Occurs {sellHomeAge >= retirementAge ? `${sellHomeAge - retirementAge} yrs into retirement` : `${retirementAge - sellHomeAge} yrs before retirement`}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Selling & Legal Closing Friction:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{sellingCostPercent}%</span>
                    </div>
                    <input
                      type="range" inputMode="none"
                      min={2.0}
                      max={7.0}
                      step={0.5}
                      value={sellingCostPercent}
                      onChange={(e) => updateRealEstateField('sellingCostPercent', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-700 dark:accent-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Realtor commissions, legal fees, and title transfers</span>
                  </div>
                </div>

                {/* Projected Proceeds Card */}
                <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                      🎉 Projected Net Equity Inflow at Age {sellHomeAge}:
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Estimated property value of ${Math.round(projectedValueAtSale).toLocaleString()} with ${Math.round(remainingMortgageAtSale).toLocaleString()} mortgage remaining.
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                      +${Math.round(netProceedsAtSale).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      Deposited to Taxable Account
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Real Estate Properties (Current Paid-Off / Mortgaged & Future Acquisitions) */}
          <AdditionalPropertiesManager
            inputs={scopedInputs}
            mode="all"
            onUpdateRealEstate={updateRealEstate}
          />

        </div>
      )}

    </div>
  );
});

RealEstateTab.displayName = 'RealEstateTab';
