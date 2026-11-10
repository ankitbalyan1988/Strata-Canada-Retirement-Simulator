import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Building2, 
  Percent, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  FileText, 
  Info,
  Edit3,
  HelpCircle,
  Coins,
  CheckCircle2
} from 'lucide-react';
import { RealEstateInputs, PropertyType, CanadianProvince } from '../types/retirement';
import { 
  calculateRealtorMonthlyProjection, 
  CANADIAN_MUNICIPALITIES 
} from '../utils/canadianRealEstate';
import { CurrencyInput } from './CurrencyInput';

interface RealtorHomeCostCardProps {
  realEstate?: RealEstateInputs;
  province?: CanadianProvince;
  isFuturePurchase?: boolean;
  futurePurchaseAge?: number;
  futurePurchaseYear?: number;
  currentRentMonthly?: number;
  onUpdate: (updates: Partial<RealEstateInputs>) => void;
}

export const RealtorHomeCostCard: React.FC<RealtorHomeCostCardProps> = ({
  realEstate,
  province = 'ON',
  isFuturePurchase = false,
  futurePurchaseAge = 35,
  futurePurchaseYear = 2029,
  currentRentMonthly = 2200,
  onUpdate
}) => {
  const [isEditingMonthly, setIsEditingMonthly] = useState(false);
  const [isEditingCashNeeded, setIsEditingCashNeeded] = useState(false);

  // Compute projection using the real estate inputs
  const projection = useMemo(() => {
    return calculateRealtorMonthlyProjection(realEstate, province, isFuturePurchase);
  }, [realEstate, province, isFuturePurchase]);

  const cashNeeded = projection.estimatedCashNeeded;

  // Standard typical living cost items from the Realtor.ca breakdown:
  // Heating ($60), Utilities ($130), Insurance ($55), Maintenance ($50) = $295/mo
  const typicalHeating = 60;
  const typicalUtilities = 130;
  const typicalInsurance = 55;
  const typicalMaintenance = 50;
  const typicalOtherLiving = typicalHeating + typicalUtilities + typicalInsurance + typicalMaintenance; // $295

  // Full monthly cost including typical utilities/heating/insurance/maintenance (matching Realtor.ca exact total: $4,668 on $750k)
  const fullMonthlyRealtorTotal = projection.totalMonthlyHousingPayment + typicalOtherLiving;
  const fullOtherOwnershipTotal = projection.otherOwnershipCostsMonthly + typicalOtherLiving;

  // Segment widths for the signature stacked color bar
  const totalBarBase = fullMonthlyRealtorTotal > 0 ? fullMonthlyRealtorTotal : 1;
  const mortgagePct = (projection.mortgageMonthly / totalBarBase) * 100;
  const propertyTaxPct = (projection.propertyTaxMonthly / totalBarBase) * 100;
  const heatingPct = (typicalHeating / totalBarBase) * 100;
  const utilitiesPct = (typicalUtilities / totalBarBase) * 100;
  const insurancePct = (typicalInsurance / totalBarBase) * 100;
  const maintenancePct = (typicalMaintenance / totalBarBase) * 100;
  const condoFeePct = (projection.condoFeeMonthly / totalBarBase) * 100;

  // LTT calculation for the active price
  const lttBreakdown = projection.landTransferBreakdown;

  const currentPropertyType: PropertyType = realEstate?.propertyType ?? 'condo';
  const isCondo = currentPropertyType === 'condo';
  const sqft = realEstate?.condoSquareFootage ?? 700;
  const feeRate = realEstate?.condoFeePerSqFt ?? 0.55;
  const isFthb = realEstate?.isFirstTimeHomeBuyer ?? isFuturePurchase;
  const selectedMunicipality = realEstate?.cityOrMunicipality ?? (province === 'ON' ? 'other_ontario' : 'other');

  return (
    <div className="flex flex-col gap-6">

      {/* SECTION 1: WHAT THIS HOME COULD COST MONTHLY (REALTOR.CA PANEL 1) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all">
        {/* Top Header Section */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <span>What this home could cost monthly</span>
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Standard Canadian Real Estate Board (CREA / Realtor.ca) Projection Model
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingMonthly(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-blue-200/60 dark:border-blue-500/30 transition cursor-pointer self-start sm:self-auto"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingMonthly ? 'Close Monthly Editor' : 'Adjust Rates & Fees'}</span>
              {isEditingMonthly ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Big Headline Number */}
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                ${fullMonthlyRealtorTotal.toLocaleString()}
              </span>
              <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400">
                /month
              </span>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                ${projection.mortgageMonthly.toLocaleString()} mortgage
              </span>
              <span className="text-slate-400 dark:text-slate-500">+</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                ${fullOtherOwnershipTotal.toLocaleString()} other ownership costs
              </span>
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
                (Property Tax: ${projection.propertyTaxMonthly}/mo{projection.condoFeeMonthly > 0 ? `, Condo: $${projection.condoFeeMonthly}/mo` : ''})
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Mortgage estimate based on: <strong className="text-slate-700 dark:text-slate-300 font-mono">${projection.homePrice.toLocaleString()}</strong> home price · <strong className="text-slate-700 dark:text-slate-300 font-mono">${projection.downPayment.toLocaleString()}</strong> ({projection.downPaymentPercent}%) down payment · <strong className="text-slate-700 dark:text-slate-300 font-mono">{projection.interestRate}%</strong> interest · <strong className="text-slate-700 dark:text-slate-300 font-mono">{projection.amortizationYears}-year</strong> amortization · monthly payments
            </p>
          </div>

          {/* Segmented Color Bar (Exact replica of Realtor.ca visual) */}
          <div className="mt-4">
            <div className="w-full h-4 sm:h-5 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
              {/* 1. Mortgage (Dark Slate / Navy) */}
              <div 
                style={{ width: `${mortgagePct}%` }} 
                className="h-full bg-slate-900 dark:bg-slate-800 rounded-l-full transition-all duration-300 hover:brightness-110"
                title={`Mortgage: $${projection.mortgageMonthly.toLocaleString()}/mo (${mortgagePct.toFixed(1)}%)`}
              />

              {/* 2. Property Tax (Silver / Gray) */}
              <div 
                style={{ width: `${propertyTaxPct}%` }} 
                className="h-full bg-slate-300 dark:bg-slate-500 transition-all duration-300 hover:brightness-110"
                title={`Property Tax: $${projection.propertyTaxMonthly.toLocaleString()}/mo (${propertyTaxPct.toFixed(1)}%)`}
              />

              {/* 3. Heating (Light Blue) */}
              <div 
                style={{ width: `${heatingPct}%` }} 
                className="h-full bg-sky-400 dark:bg-sky-500 transition-all duration-300 hover:brightness-110"
                title={`Heating: $${typicalHeating}/mo`}
              />

              {/* 4. Utilities (Orange) */}
              <div 
                style={{ width: `${utilitiesPct}%` }} 
                className="h-full bg-amber-500 dark:bg-amber-600 transition-all duration-300 hover:brightness-110"
                title={`Utilities: $${typicalUtilities}/mo`}
              />

              {/* 5. Insurance (Purple) */}
              <div 
                style={{ width: `${insurancePct}%` }} 
                className="h-full bg-purple-500 dark:bg-purple-600 transition-all duration-300 hover:brightness-110"
                title={`Insurance: $${typicalInsurance}/mo`}
              />

              {/* 6. Maintenance (Green) */}
              <div 
                style={{ width: `${maintenancePct}%` }} 
                className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-300 hover:brightness-110"
                title={`Maintenance: $${typicalMaintenance}/mo`}
              />

              {/* 7. Condo / Strata Fees (Teal / Cyan) */}
              {projection.condoFeeMonthly > 0 && (
                <div 
                  style={{ width: `${condoFeePct}%` }} 
                  className="h-full bg-teal-500 dark:bg-teal-400 rounded-r-full transition-all duration-300 hover:brightness-110"
                  title={`Condo/Strata Fees: $${projection.condoFeeMonthly.toLocaleString()}/mo (${condoFeePct.toFixed(1)}%)`}
                />
              )}
            </div>

            {/* Color Legend with exact Realtor.ca badges */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-300"></span>
                <span className="text-slate-600 dark:text-slate-400">Mortgage</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${projection.mortgageMonthly.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Property tax</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${projection.propertyTaxMonthly.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                <span className="text-slate-600 dark:text-slate-400">Heating</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${typicalHeating}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Utilities</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${typicalUtilities}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Insurance</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${typicalInsurance}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Maintenance</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${typicalMaintenance}</span>
              </div>

              {projection.condoFeeMonthly > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                  <span className="text-slate-600 dark:text-slate-400">Condo/Strata fees</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">${projection.condoFeeMonthly.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ADJUST RATES & FEES ACCORDION (EDITING MODE) */}
        {isEditingMonthly && (
          <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Property Type & Ongoing Ownership Cost Parameters</span>
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Synced dynamically with the simulation engine
              </span>
            </div>

            {/* Property Type Toggle (Freehold vs Condo) */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                Property Category
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => onUpdate({ propertyType: 'freehold', monthlyCondoFee: 0 })}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    !isCondo
                      ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 dark:border-blue-400 text-blue-950 dark:text-blue-100 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Home className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">Freehold Home</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">$0 Condo/Strata Fees</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdate({ propertyType: 'condo' })}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    isCondo
                      ? 'bg-teal-50 dark:bg-teal-500/15 border-teal-500 dark:border-teal-400 text-teal-950 dark:text-teal-100 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">Condo / Strata</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Sq Ft × Fee Rate</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Conditional Condo Settings */}
            {isCondo && (
              <div className="p-4 rounded-xl bg-teal-50/40 dark:bg-teal-500/10 border border-teal-200/80 dark:border-teal-500/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-100 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Condo / Strata Fee Calculator
                  </span>
                  <span className="text-xs font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                    ${projection.condoFeeMonthly} / month (${(projection.condoFeeMonthly * 12).toLocaleString()} / yr)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Interior Living Area:</span>
                      <span className="text-teal-700 dark:text-teal-400 font-bold font-mono">{sqft} sq ft</span>
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={2000}
                      step={25}
                      value={sqft}
                      onChange={(e) => onUpdate({ condoSquareFootage: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-teal-600"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {[500, 700, 900, 1200].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onUpdate({ condoSquareFootage: s })}
                          className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                            sqft === s
                              ? 'bg-teal-600 text-white border-teal-600 font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {s} sq ft
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Fee Rate per Square Foot:</span>
                      <span className="text-teal-700 dark:text-teal-400 font-bold font-mono">${feeRate.toFixed(2)} / sq ft</span>
                    </div>
                    <input
                      type="range"
                      min={0.30}
                      max={1.20}
                      step={0.02}
                      value={feeRate}
                      onChange={(e) => onUpdate({ condoFeePerSqFt: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-teal-600"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Toronto / Vancouver avg: $0.50 - $0.75 / sq ft
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Direct Monthly Fee Override
                    </label>
                    <CurrencyInput
                      value={realEstate?.monthlyCondoFee ?? projection.condoFeeMonthly}
                      onChange={(val) => onUpdate({ monthlyCondoFee: val })}
                      min={0}
                      step={25}
                      placeholder="Auto-calculated"
                      aria-label="Direct Monthly Fee Override"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Property Tax Settings */}
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  Annual Municipal Property Tax
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  ${projection.propertyTaxMonthly} / month (${(projection.propertyTaxMonthly * 12).toLocaleString()} / yr)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Annual Effective Mill Rate:</span>
                    <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">
                      {((realEstate?.annualPropertyTaxRatePercent ?? 0.522)).toFixed(3)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.20}
                    max={1.50}
                    step={0.01}
                    value={realEstate?.annualPropertyTaxRatePercent ?? 0.522}
                    onChange={(e) => onUpdate({ annualPropertyTaxRatePercent: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Realtor.ca default: 0.522% (~$326/mo on $750,000 property)
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Direct Monthly Property Tax Override
                  </label>
                  <CurrencyInput
                    value={realEstate?.monthlyPropertyTaxOverride ?? projection.propertyTaxMonthly}
                    onChange={(val) => onUpdate({ monthlyPropertyTaxOverride: val })}
                    min={0}
                    step={25}
                    placeholder="Auto-calculated"
                    aria-label="Direct Monthly Property Tax Override"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: ESTIMATED CASH NEEDED TO BUY (REALTOR.CA PANEL 2 - EXACT REPLICA) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all">
        <div className="p-5 sm:p-6 pb-5">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start justify-between">
            
            {/* Left Block: Total Headline */}
            <div className="lg:w-1/3 flex flex-col justify-between pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-5 lg:pb-0">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                    Estimated cash needed to buy
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingCashNeeded(prev => !prev)}
                    className="lg:hidden flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400"
                  >
                    {isEditingCashNeeded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-1">
                  ${cashNeeded.totalCashNeededToBuy.toLocaleString()}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                  Includes your down payment and estimated closing costs. Some costs may be paid before closing. Actual amounts and timing vary.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 hidden lg:block">
                <button
                  type="button"
                  onClick={() => setIsEditingCashNeeded(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingCashNeeded ? 'Close Closing Cost Editor' : 'Edit Closing Cost Assumptions'}</span>
                  {isEditingCashNeeded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Right Block: 3-Column Itemized Cost Grid */}
            <div className="lg:w-2/3 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-5 text-sm">
                
                {/* Column 1: Down Payment & Inspection */}
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Amount available for down payment</span>
                      <span 
                        title="The initial cash sum paid upfront toward purchase price. Minimum 5% in Canada (20% to avoid mortgage default insurance)."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      ${cashNeeded.downPayment.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Home inspection</span>
                      <span 
                        title="Independent certified property inspection covering foundation, roof, plumbing, HVAC, and electrical."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      ${cashNeeded.homeInspectionCost.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Potential rebates / credits</span>
                      <span 
                        title="Statutory First-Time Home Buyer tax rebates (e.g. up to $4,000 Ontario PLTT rebate + $4,475 Toronto MLTT rebate)."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {cashNeeded.potentialRebates > 0 ? `Up to $${cashNeeded.potentialRebates.toLocaleString()}` : '$0'}
                    </div>
                  </div>
                </div>

                {/* Column 2: Land Transfer Tax & Other Closing Costs */}
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Land transfer tax</span>
                      <span 
                        title="Provincial and municipal taxes charged upon property registration, net of eligible first-time home buyer rebates."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      ${cashNeeded.landTransferTax.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Other closing costs</span>
                      <span 
                        title="Title insurance, property appraisal, property tax & utility adjustments, and escrow fees."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      ${cashNeeded.otherClosingCosts.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Column 3: Legal Fees & Tax on Insurance */}
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Legal & closing fees</span>
                      <span 
                        title="Real estate attorney fees, title search, registry filings, and closing disbursements."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      ${cashNeeded.legalAndClosingFees.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Tax on mortgage insurance</span>
                      <span 
                        title="Provincial sales tax (8% in ON, 9% in QC, 6% in SK) on CMHC mortgage default insurance for down payments under 20% (cannot be rolled into mortgage)."
                        className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      ${cashNeeded.taxOnMortgageInsurance.toLocaleString()}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ACCORDION: EDIT CLOSING COST ASSUMPTIONS */}
        {isEditingCashNeeded && (
          <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Customize First-Time Buyer Closing Cash Requirements
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Deducted from FHSA / HBP / TFSA / Non-Reg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Legal & Closing Fees */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Legal & Lawyer Closing Fees
                </label>
                <CurrencyInput
                  value={realEstate?.legalAndClosingFees ?? 2100}
                  onChange={(val) => onUpdate({ legalAndClosingFees: val })}
                  min={500}
                  step={100}
                  aria-label="Legal & Closing Fees"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Realtor.ca typical: $2,100
                </span>
              </div>

              {/* Home Inspection */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Home Inspection Cost:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdate({ homeInspectionCost: 0 })}
                      className={`text-[9.5px] px-1.5 py-0.2 rounded border ${
                        (realEstate?.homeInspectionCost ?? 0) === 0
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      $0 (Waived)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ homeInspectionCost: 450 })}
                      className={`text-[9.5px] px-1.5 py-0.2 rounded border ${
                        (realEstate?.homeInspectionCost ?? 0) === 450
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      $450
                    </button>
                  </div>
                </div>
                <CurrencyInput
                  value={realEstate?.homeInspectionCost ?? 0}
                  onChange={(val) => onUpdate({ homeInspectionCost: val })}
                  min={0}
                  step={50}
                  aria-label="Home Inspection Cost"
                />
              </div>

              {/* Other Closing Costs */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Other Closing Costs (Title, Appraisal, Moving)
                </label>
                <CurrencyInput
                  value={realEstate?.otherClosingCosts ?? 1500}
                  onChange={(val) => onUpdate({ otherClosingCosts: val })}
                  min={0}
                  step={100}
                  aria-label="Other Closing Costs"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Realtor.ca typical: $1,500
                </span>
              </div>
            </div>

            {/* Municipality & FTHB Rebate Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Municipality (Determines Land Transfer Tax)
                </label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => onUpdate({ cityOrMunicipality: e.target.value })}
                  className="w-full text-xs font-semibold py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {CANADIAN_MUNICIPALITIES.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.province})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                  isFthb
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${isFthb ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold block">First-Time Home Buyer (FTHB)</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Qualify for statutory rebates</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFthb}
                    onChange={(e) => onUpdate({ isFirstTimeHomeBuyer: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT DEDUCTION SUMMARY BANNER */}
        <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-emerald-50/70 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-emerald-950/30 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
              <strong>Account Deduction at Closing:</strong> The full estimated cash needed of <strong className="font-mono text-slate-900 dark:text-slate-100">${cashNeeded.totalCashNeededToBuy.toLocaleString()}</strong> (${cashNeeded.downPayment.toLocaleString()} down payment + ${cashNeeded.totalClosingCosts.toLocaleString()} closing costs) will be drawn from your selected funding accounts at Age {futurePurchaseAge} and recorded in the Annual Simulation Ledger.
            </span>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Total Cash Outlay</span>
            <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
              ${cashNeeded.totalCashNeededToBuy.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
