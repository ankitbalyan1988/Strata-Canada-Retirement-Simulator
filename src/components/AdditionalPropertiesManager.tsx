import React, { useMemo, useCallback } from 'react';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Home,
  Info,
  Key,
  Palmtree,
  Plus,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import {
  AdditionalPropertyItem,
  AdditionalPropertyRole,
  AdditionalPropertyTiming,
  RealEstateInputs,
  RetirementInputs
} from '../types/retirement';
import {
  calculateAdditionalPropertySummary,
  getActiveAdditionalProperties
} from '../utils/mortgage';
import { CurrencyInput } from './CurrencyInput';

export interface AdditionalPropertiesManagerProps {
  inputs: RetirementInputs;
  onUpdateRealEstate: (updates: Partial<RealEstateInputs>) => void;
  mode?: 'all' | 'future_only';
}

const ROLE_OPTIONS: { value: AdditionalPropertyRole; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'investment_rental', label: 'Investment / Rental', icon: Building2 },
  { value: 'secondary_home', label: 'Secondary Home', icon: Home },
  { value: 'vacation_cottage', label: 'Vacation / Cottage', icon: Palmtree }
];

export function createDefaultAdditionalProperty(
  timing: AdditionalPropertyTiming,
  inputs: RetirementInputs,
  existingCount: number = 0
): AdditionalPropertyItem {
  const currentAge = inputs.currentAge ?? 35;
  const lifeExpectancy = inputs.lifeExpectancy ?? 90;
  const isMarried = inputs.maritalStatus === 'married';
  const primaryPurchaseAge = inputs.realEstate?.futurePurchaseAge ?? currentAge + 3;
  const defaultFutureAge = Math.min(
    Math.max(currentAge + 2, lifeExpectancy - 2),
    Math.max(currentAge + 2, timing === 'future' && inputs.housingStatus === 'rent' ? primaryPurchaseAge + 5 : currentAge + 5)
  );
  const indexLabel = existingCount + 1;

  if (timing === 'current') {
    return {
      id: `add_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: indexLabel === 1 ? 'Paid-Off Second Property' : `Existing Property #${indexLabel + 1}`,
      timing: 'current',
      role: 'investment_rental',
      isPaidOff: true,
      costOfHome: 450000,
      currentMarketValue: 550000,
      downPayment: 450000,
      downPaymentPercentPreset: 100,
      mortgageInterestRate: 4.79,
      mortgageTermYears: 25,
      mortgageStartYear: 2018,
      ownershipSharePercent: isMarried ? 50 : 100,
      annualAppreciationRate: 3.2,
      propertyType: 'freehold',
      annualPropertyTaxRatePercent: 0.522,
      monthlyCondoFee: 0,
      monthlyRentalIncome: 0,
      planToSellHome: false,
      sellHomeAge: Math.min(lifeExpectancy - 5, 72),
      sellingCostPercent: 4.5
    };
  }

  return {
    id: `add_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: indexLabel === 1 ? 'Future Additional Property' : `Future Property #${indexLabel + 1}`,
    timing: 'future',
    role: 'investment_rental',
    isPaidOff: false,
    purchaseAge: Math.min(Math.max(currentAge + 1, defaultFutureAge), Math.min(75, lifeExpectancy - 1)),
    costOfHome: 550000,
    currentMarketValue: 550000,
    downPayment: 110000,
    downPaymentPercentPreset: 20,
    mortgageInterestRate: 4.79,
    mortgageTermYears: 25,
    mortgageStartYear: 2026 + Math.max(1, defaultFutureAge - currentAge),
    ownershipSharePercent: isMarried ? 50 : 100,
    annualAppreciationRate: 3.2,
    propertyType: 'freehold',
    annualPropertyTaxRatePercent: 0.522,
    monthlyCondoFee: 0,
    monthlyRentalIncome: 0,
    planToSellHome: false,
    sellHomeAge: Math.min(lifeExpectancy - 5, 75),
    sellingCostPercent: 4.5,
    fundWithTfsa: true,
    fundWithNonReg: true
  };
}

export const AdditionalPropertiesManager: React.FC<AdditionalPropertiesManagerProps> = React.memo(({
  inputs,
  onUpdateRealEstate,
  mode = 'all'
}) => {
  const re = inputs.realEstate;
  const currentAge = inputs.currentAge ?? 35;
  const lifeExpectancy = inputs.lifeExpectancy ?? 90;
  const currentCalendarYear = 2026;
  const allRawProperties = re?.additionalProperties ?? [];

  const visibleProperties = useMemo(() => {
    const active = getActiveAdditionalProperties(inputs);
    if (mode === 'future_only') {
      return active.filter((p) => p.timing === 'future');
    }
    return active;
  }, [inputs, mode]);

  const handleAddProperty = useCallback((timing: AdditionalPropertyTiming) => {
    const newProp = createDefaultAdditionalProperty(timing, inputs, allRawProperties.length);
    const updatedList = [...allRawProperties, newProp];
    onUpdateRealEstate({
      additionalProperties: updatedList,
      ...(timing === 'current' ? { ownsMultipleProperties: true } : { planFutureAdditionalProperties: true })
    });
  }, [allRawProperties, inputs, onUpdateRealEstate]);

  const handleUpdateProperty = useCallback((id: string, patch: Partial<AdditionalPropertyItem>) => {
    const updatedList = allRawProperties.map((p) => (p.id === id ? { ...p, ...patch } : p));
    onUpdateRealEstate({ additionalProperties: updatedList });
  }, [allRawProperties, onUpdateRealEstate]);

  const handleRemoveProperty = useCallback((id: string) => {
    const remaining = allRawProperties.filter((p) => p.id !== id);
    const hasCurrentRemaining = remaining.some((p) => p.timing === 'current');
    const hasFutureRemaining = remaining.some((p) => p.timing === 'future');
    onUpdateRealEstate({
      additionalProperties: remaining,
      ownsMultipleProperties: hasCurrentRemaining,
      planFutureAdditionalProperties: hasFutureRemaining
    });
  }, [allRawProperties, onUpdateRealEstate]);

  const portfolioTotals = useMemo(() => {
    return visibleProperties.reduce(
      (acc, p) => {
        const stats = calculateAdditionalPropertySummary(p, currentAge, currentCalendarYear);
        if (p.timing === 'current') {
          acc.currentCount += 1;
          acc.currentValue += stats.currentMarketValue;
          acc.currentMortgage += stats.remainingMortgageToday;
          acc.userEquity += stats.userEquityToday;
          if (stats.isPaidOff) acc.paidOffCount += 1;
        } else {
          acc.futureCount += 1;
          if (stats.isPaidOff) acc.paidOffCount += 1;
        }
        return acc;
      },
      { currentCount: 0, futureCount: 0, paidOffCount: 0, currentValue: 0, currentMortgage: 0, userEquity: 0 }
    );
  }, [visibleProperties, currentAge]);

  const canAddCurrent = mode !== 'future_only' && inputs.housingStatus !== 'rent';

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/20 dark:bg-slate-900/60 p-4 sm:p-5 flex flex-col gap-4">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-slate-800 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-2xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {mode === 'future_only'
                  ? 'Additional Future Properties'
                  : 'Additional Properties (Paid-Off, Mortgaged & Future Acquisitions)'}
              </h5>
              {visibleProperties.length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {visibleProperties.length} {visibleProperties.length === 1 ? 'Property' : 'Properties'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === 'future_only'
                ? 'Model extra future homes, cottages, or rental acquisitions alongside your first home purchase.'
                : 'Add additional properties you currently own (including 100% paid-off properties) or plan to buy later.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canAddCurrent && (
            <button
              type="button"
              onClick={() => handleAddProperty('current')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Current Property</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleAddProperty('future')}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Future Property</span>
          </button>
        </div>
      </div>

      {/* Portfolio Summary Strip if any additional properties exist */}
      {visibleProperties.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-2xs text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Additional Owned</span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {portfolioTotals.currentCount} {portfolioTotals.currentCount === 1 ? 'Property' : 'Properties'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
              {portfolioTotals.paidOffCount} Paid Off / All-Cash
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Current Add&apos;l Value</span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              ${Math.round(portfolioTotals.currentValue).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              Your equity: ${Math.round(portfolioTotals.userEquity).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Add&apos;l Mortgage Debt</span>
            <span className={`font-extrabold font-mono ${portfolioTotals.currentMortgage > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ${Math.round(portfolioTotals.currentMortgage).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              {portfolioTotals.currentMortgage === 0 ? 'Debt-Free Assets' : 'Active amortization'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Future Acquisitions</span>
            <span className="font-extrabold text-blue-700 dark:text-blue-400 font-mono">
              {portfolioTotals.futureCount} Planned
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              Modeled in Cash Flow
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {visibleProperties.length === 0 && (
        <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center gap-2">
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            {mode === 'future_only'
              ? 'No additional future properties added yet. Click "Add Future Property" above to model buying a second home, cottage, or investment property later.'
              : 'No additional properties modeled yet. You can add a paid-off rental/cottage you already own today or a future property purchase.'}
          </p>
        </div>
      )}

      {/* Individual Property Cards */}
      <div className="flex flex-col gap-4">
        {visibleProperties.map((prop, idx) => {
          const stats = calculateAdditionalPropertySummary(prop, currentAge, currentCalendarYear);
          const isCurrent = prop.timing === 'current';
          const isPaidOff = Boolean(prop.isPaidOff);
          const downPct = prop.costOfHome > 0 ? Math.round((prop.downPayment / prop.costOfHome) * 100) : 20;
          const downPreset = prop.downPaymentPercentPreset ?? (isPaidOff ? 100 : 'custom');
          const pAge = Math.max(currentAge + 1, prop.purchaseAge ?? currentAge + 5);
          const purchaseYear = currentCalendarYear + Math.max(1, pAge - currentAge);
          const isCondo = prop.propertyType === 'condo';

          return (
            <div
              key={prop.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col gap-4"
            >
              {/* Card Top Row: Name, Timing Toggle, Paid-Off Toggle, Delete */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    isCurrent
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300'
                  }`}>
                    #{idx + 2} · {isCurrent ? 'Current' : 'Future'}
                  </span>
                  <input
                    type="text"
                    value={prop.name}
                    onChange={(e) => handleUpdateProperty(prop.id, { name: e.target.value })}
                    placeholder="Property Name (e.g., Rental Condo, Cottage)"
                    aria-label="Additional Property Name"
                    className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Timing Segmented Control (when owner can choose current vs future) */}
                  {canAddCurrent && (
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleUpdateProperty(prop.id, { timing: 'current' })}
                        className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Currently Owned
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateProperty(prop.id, { timing: 'future', purchaseAge: pAge })}
                        className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                          !isCurrent
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Future Buy
                      </button>
                    </div>
                  )}

                  {/* Paid Off vs Mortgaged Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateProperty(prop.id, {
                        isPaidOff: true,
                        downPayment: prop.costOfHome,
                        downPaymentPercentPreset: 100
                      })}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                        isPaidOff
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {isPaidOff && <Check className="w-3 h-3 stroke-[2.5]" />}
                      <span>{isCurrent ? 'Fully Paid Off ($0)' : '100% Cash / Paid Off'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateProperty(prop.id, {
                        isPaidOff: false,
                        downPayment: prop.downPayment >= prop.costOfHome ? Math.round(prop.costOfHome * 0.2) : prop.downPayment,
                        downPaymentPercentPreset: prop.downPayment >= prop.costOfHome ? 20 : prop.downPaymentPercentPreset
                      })}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                        !isPaidOff
                          ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {!isPaidOff && <Check className="w-3 h-3 stroke-[2.5]" />}
                      <span>With Mortgage</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveProperty(prop.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Remove this property"
                    aria-label="Remove additional property"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Property Role & Type Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">Property Role:</span>
                  {ROLE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = (prop.role ?? 'investment_rental') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleUpdateProperty(prop.id, { role: opt.value })}
                        className={`px-2.5 py-1 rounded-lg font-semibold border transition flex items-center gap-1 cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Structure:</span>
                  {(['freehold', 'condo'] as const).map((pType) => (
                    <button
                      key={pType}
                      type="button"
                      onClick={() => handleUpdateProperty(prop.id, {
                        propertyType: pType,
                        monthlyCondoFee: pType === 'condo' ? (prop.monthlyCondoFee || 420) : 0
                      })}
                      className={`px-2.5 py-1 rounded-lg font-semibold border capitalize transition cursor-pointer ${
                        (prop.propertyType ?? 'freehold') === pType
                          ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {pType}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main 2-Column Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Valuation / Timing / Rental Income */}
                <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 flex flex-col gap-3">
                  {isCurrent ? (
                    <>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Original Purchase Price
                        </label>
                        <CurrencyInput
                          value={prop.costOfHome}
                          onChange={(val) => handleUpdateProperty(prop.id, {
                            costOfHome: val,
                            ...(isPaidOff ? { downPayment: val } : {})
                          })}
                          min={25000}
                          step={10000}
                          aria-label="Additional property purchase price"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Current Market Value Today
                        </label>
                        <CurrencyInput
                          value={prop.currentMarketValue}
                          onChange={(val) => handleUpdateProperty(prop.id, { currentMarketValue: val })}
                          min={25000}
                          step={10000}
                          aria-label="Additional property current market value"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Planned Purchase Age:
                          </span>
                          <span className="text-blue-700 dark:text-blue-400 font-mono font-bold">
                            Age {pAge} ({purchaseYear})
                          </span>
                        </div>
                        <input
                          type="range"
                          min={currentAge + 1}
                          max={Math.min(75, lifeExpectancy - 1)}
                          step={1}
                          value={pAge}
                          onChange={(e) => handleUpdateProperty(prop.id, { purchaseAge: Number(e.target.value) })}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Target Purchase Price (Today&apos;s Dollars)
                        </label>
                        <CurrencyInput
                          value={prop.costOfHome}
                          onChange={(val) => handleUpdateProperty(prop.id, {
                            costOfHome: val,
                            currentMarketValue: val,
                            ...(isPaidOff
                              ? { downPayment: val, downPaymentPercentPreset: 100 }
                              : typeof downPreset === 'number'
                              ? { downPayment: Math.round(val * (downPreset / 100)) }
                              : {})
                          })}
                          min={50000}
                          step={10000}
                          aria-label="Additional future property target price"
                        />
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5 block font-medium">
                          Projected at Age {pAge}: ~${stats.projectedPurchasePrice.toLocaleString()}
                        </span>
                      </div>

                      {!isPaidOff && (
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span className="text-slate-700 dark:text-slate-300">Target Down Payment:</span>
                            <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">
                              ${prop.downPayment.toLocaleString()} ({downPct}%)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {[5, 10, 15, 20].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => handleUpdateProperty(prop.id, {
                                  downPayment: Math.round(prop.costOfHome * (pct / 100)),
                                  downPaymentPercentPreset: pct as 5 | 10 | 15 | 20
                                })}
                                className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border transition cursor-pointer ${
                                  downPreset === pct
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                          <CurrencyInput
                            value={prop.downPayment}
                            onChange={(val) => handleUpdateProperty(prop.id, {
                              downPayment: val,
                              downPaymentPercentPreset: val >= prop.costOfHome ? 100 : 'custom',
                              isPaidOff: val >= prop.costOfHome
                            })}
                            min={0}
                            max={prop.costOfHome}
                            step={5000}
                            aria-label="Additional future property down payment"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Ownership Share & Appreciation */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[10.5px] font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Your Share</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{prop.ownershipSharePercent}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={prop.ownershipSharePercent}
                        onChange={(e) => handleUpdateProperty(prop.id, { ownershipSharePercent: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10.5px] font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Appreciation</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{prop.annualAppreciationRate}%/yr</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={7.0}
                        step={0.1}
                        value={prop.annualAppreciationRate}
                        onChange={(e) => handleUpdateProperty(prop.id, { annualAppreciationRate: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Property Tax, Condo Fee & Rental Income */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                    <div>
                      <label className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Est. Monthly Rental Income (Optional)
                      </label>
                      <CurrencyInput
                        value={prop.monthlyRentalIncome ?? 0}
                        onChange={(val) => handleUpdateProperty(prop.id, { monthlyRentalIncome: val })}
                        min={0}
                        step={100}
                        aria-label="Monthly rental income"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        {isCondo ? 'Monthly Condo / Strata Fee' : 'Annual Property Tax Rate (%)'}
                      </label>
                      {isCondo ? (
                        <CurrencyInput
                          value={prop.monthlyCondoFee ?? 420}
                          onChange={(val) => handleUpdateProperty(prop.id, { monthlyCondoFee: val })}
                          min={0}
                          step={25}
                          aria-label="Monthly condo fee"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0.2}
                            max={2.0}
                            step={0.05}
                            value={prop.annualPropertyTaxRatePercent ?? 0.522}
                            onChange={(e) => handleUpdateProperty(prop.id, { annualPropertyTaxRatePercent: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600 mt-2"
                          />
                          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0 mt-1.5">
                            {(prop.annualPropertyTaxRatePercent ?? 0.522).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Mortgage vs Paid-Off Details & Future Disposition */}
                <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 flex flex-col justify-between gap-3">
                  {isPaidOff ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>
                          {isCurrent
                            ? '100% Paid Off — $0 Mortgage Liability'
                            : '100% All-Cash Purchase — No Future Mortgage'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                        {isCurrent
                          ? `Full property equity (${formatSafeCur(stats.userEquityToday)} your share) contributes directly to Net Worth with $0 monthly mortgage outflow (only property taxes${isCondo ? ' & condo fees' : ''} apply).`
                          : `Full purchase price (~${formatSafeCur(stats.projectedPurchasePrice)} at Age ${pAge}) plus Land Transfer Tax will be funded in cash without taking on mortgage debt.`}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          Mortgage Terms
                        </span>
                        <span className="text-[10.5px] font-mono font-bold text-rose-700 dark:text-rose-400">
                          {isCurrent
                            ? `Remaining: $${stats.remainingMortgageToday.toLocaleString()}`
                            : `Est. Loan: $${stats.futureInitialLoan.toLocaleString()}`}
                        </span>
                      </div>

                      {isCurrent && (
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span className="text-slate-700 dark:text-slate-300">Down Payment Paid at Purchase:</span>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                              ${prop.downPayment.toLocaleString()} ({downPct}%)
                            </span>
                          </div>
                          <CurrencyInput
                            value={prop.downPayment}
                            onChange={(val) => handleUpdateProperty(prop.id, {
                              downPayment: val,
                              isPaidOff: val >= prop.costOfHome
                            })}
                            min={0}
                            max={prop.costOfHome}
                            step={5000}
                            aria-label="Additional property down payment paid"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Interest Rate:</span>
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{prop.mortgageInterestRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={2.0}
                          max={9.0}
                          step={0.05}
                          value={prop.mortgageInterestRate}
                          onChange={(e) => handleUpdateProperty(prop.id, { mortgageInterestRate: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {[15, 20, 25, 30].map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => handleUpdateProperty(prop.id, { mortgageTermYears: term })}
                            className={`py-1 text-[10.5px] font-bold rounded-lg border transition cursor-pointer ${
                              prop.mortgageTermYears === term
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {term} yrs
                          </button>
                        ))}
                      </div>

                      {isCurrent && (
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span className="text-slate-700 dark:text-slate-300">Year Mortgage Originated:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{prop.mortgageStartYear}</span>
                          </div>
                          <input
                            type="range"
                            min={2005}
                            max={2026}
                            step={1}
                            value={prop.mortgageStartYear}
                            onChange={(e) => handleUpdateProperty(prop.id, { mortgageStartYear: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-700 dark:accent-slate-400"
                          />
                        </div>
                      )}

                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {isCurrent ? 'Monthly Payment' : 'Projected Monthly Payment'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ${(isCurrent ? stats.monthlyPayment : stats.futureMonthlyPayment).toLocaleString()}/mo
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Mortgage-Free By</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            Age {stats.mortgageFreeAge}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Funding Sources Note & Checkboxes for Future Purchases */}
                  {!isCurrent && (
                    <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-200">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Funding Accounts ({isPaidOff ? '100% Cash + LTT' : 'Down Payment + LTT'})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px]">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold">
                          <input
                            type="checkbox"
                            checked={prop.fundWithTfsa !== false}
                            onChange={(e) => handleUpdateProperty(prop.id, { fundWithTfsa: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>TFSA</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold">
                          <input
                            type="checkbox"
                            checked={prop.fundWithNonReg !== false}
                            onChange={(e) => handleUpdateProperty(prop.id, { fundWithNonReg: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>Non-Registered</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-blue-800/80 dark:text-blue-300/80 flex items-start gap-1">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>CRA FHSA, RRSP HBP, and FTHB rebates apply only to qualifying first-home purchases.</span>
                      </p>
                    </div>
                  )}

                  {/* Optional Future Disposition */}
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-2">
                    <label className="flex items-center justify-between gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Plan to sell this property later
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(prop.planToSellHome)}
                        onChange={(e) => handleUpdateProperty(prop.id, { planToSellHome: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                    {prop.planToSellHome && (
                      <div>
                        <div className="flex justify-between text-[10.5px] font-semibold mb-1">
                          <span className="text-slate-600 dark:text-slate-400">Planned Sale Age:</span>
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            Age {Math.max(isCurrent ? currentAge + 1 : pAge + 1, prop.sellHomeAge ?? 72)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={isCurrent ? currentAge + 1 : pAge + 1}
                          max={Math.max(isCurrent ? currentAge + 2 : pAge + 2, lifeExpectancy - 1)}
                          step={1}
                          value={Math.max(isCurrent ? currentAge + 1 : pAge + 1, prop.sellHomeAge ?? 72)}
                          onChange={(e) => handleUpdateProperty(prop.id, { sellHomeAge: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Secondary property sales apply estimated 50% Canadian capital gains inclusion tax on gains.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

AdditionalPropertiesManager.displayName = 'AdditionalPropertiesManager';

function formatSafeCur(val: number): string {
  return `$${Math.round(val || 0).toLocaleString()}`;
}
