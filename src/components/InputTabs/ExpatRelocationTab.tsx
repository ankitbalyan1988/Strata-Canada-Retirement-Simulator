import React, { useState } from 'react';
import {
  Globe,
  Plane,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Home,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { EXPAT_DESTINATIONS } from '../../utils/expatCountries';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const ExpatRelocationTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const [expatRegionFilter, setExpatRegionFilter] = useState<
    'all' | 'Europe' | 'Americas' | 'Asia-Pacific' | 'Caribbean'
  >('all');

  const { updateExpatField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      currentAge: state.inputs.currentAge,
      retirementAge: state.inputs.retirementAge,
      lifeExpectancy: state.inputs.lifeExpectancy,
      expat: state.inputs.expat,
      realEstateOwnsHome: Boolean(state.inputs.realEstate?.ownsHome)
    }))
  );

  const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
  const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
  const lifeExpectancy = externalInputs ? externalInputs.lifeExpectancy : storeSlice.lifeExpectancy;
  const expat = externalInputs ? externalInputs.expat : storeSlice.expat;
  const realEstateOwnsHome = externalInputs
    ? Boolean(externalInputs.realEstate?.ownsHome)
    : storeSlice.realEstateOwnsHome;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Expat Emigration & Non-Resident Retirement Planning</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Plan your departure from Canada, model CRA non-resident Part XIII withholding taxes, departure tax (S. 128.1), and convert your pension to local currency with Purchasing Power Parity (PPP).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enable Expat Plan:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(expat?.planToEmigrate)}
              onChange={(e) => updateExpatField('planToEmigrate', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>

      {/* If Expat Plan is Inactive */}
      {!expat?.planToEmigrate && (
        <div className="p-6 rounded-2xl border border-dashed border-cyan-300 dark:border-cyan-500/30 bg-cyan-50/40 dark:bg-cyan-500/10 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Are you planning to retire or settle outside Canada?
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mt-1">
              Toggle on the Expat Plan to model how moving to Mexico, Portugal, Thailand, Costa Rica, Spain, Panama, or other popular destinations stretches your retirement income.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateExpatField('planToEmigrate', true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plane className="w-4 h-4" />
            <span>Activate Expat Retirement Planning</span>
          </button>
        </div>
      )}

      {/* If Expat Plan is Active */}
      {expat?.planToEmigrate && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">

          {/* Destination Country Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>1. Which country do you plan to settle in?</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                Selected: <strong className="text-cyan-900 dark:text-cyan-300 font-bold">{EXPAT_DESTINATIONS.find(d => d.id === (expat?.destinationCountryId || 'mexico'))?.name}</strong>
              </span>
            </div>

            {/* Region Filter Bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'Europe', 'Americas', 'Asia-Pacific', 'Caribbean'] as const).map(reg => {
                const count = reg === 'all'
                  ? EXPAT_DESTINATIONS.length
                  : EXPAT_DESTINATIONS.filter(d => d.region === reg).length;
                return (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setExpatRegionFilter(reg)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      expatRegionFilter === reg
                        ? 'bg-cyan-700 dark:bg-cyan-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {reg === 'all' ? 'All Destinations' : reg} ({count})
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {EXPAT_DESTINATIONS
                .filter(dest => expatRegionFilter === 'all' || dest.region === expatRegionFilter)
                .map(dest => {
                  const isSelected = dest.id === (expat?.destinationCountryId || 'mexico');
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => updateExpatField('destinationCountryId', dest.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400 dark:border-cyan-400 ring-2 ring-cyan-400/40 shadow-xs'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl leading-none">{dest.flag}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                          {dest.purchasingPowerMultiplier.toFixed(1)}x PPP
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {dest.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{dest.currencyCode}</span>
                        <span>{dest.hasTaxTreaty ? 'Treaty ✓' : '25% Part XIII'}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Exit Age & OAS 20-Year Rule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Exit Age */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Planned Departure Age from Canada:</span>
                </span>
                <strong className="text-cyan-900 dark:text-cyan-300 font-mono text-sm font-bold">
                  Age {expat?.emigrationAge || retirementAge}
                </strong>
              </div>

              <input
                type="range" inputMode="none"
                min={currentAge}
                max={lifeExpectancy - 2}
                step={1}
                value={expat?.emigrationAge || retirementAge}
                onChange={(e) => updateExpatField('emigrationAge', Number(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
              />

              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Current ({currentAge})</span>
                <span>Retire ({retirementAge})</span>
                <span>Max ({lifeExpectancy})</span>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {(expat?.emigrationAge || retirementAge) < retirementAge
                  ? 'Departing before Canadian retirement (early expat phase).'
                  : 'Departing at or after retirement age.'}
              </span>
            </div>

            {/* OAS 20-Year Residence Rule */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Years Lived in Canada After Age 18:</span>
                </span>
                <strong className="text-indigo-900 dark:text-indigo-300 font-mono text-sm font-bold">
                  {expat?.yearsLivedInCanadaAfter18 || 30} Years
                </strong>
              </div>

              <input
                type="range" inputMode="none"
                min={5}
                max={50}
                step={1}
                value={expat?.yearsLivedInCanadaAfter18 || 30}
                onChange={(e) => updateExpatField('yearsLivedInCanadaAfter18', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
              />

              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>5 yrs</span>
                <span className="text-indigo-700 dark:text-indigo-300 font-bold">20 yrs (OAS Worldwide Threshold)</span>
                <span>40 yrs (Full OAS)</span>
              </div>

              <div className="text-[11px] mt-1 flex items-center gap-1.5">
                {(expat?.yearsLivedInCanadaAfter18 || 30) >= 20 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>OAS Qualified: Payments continue for life worldwide.</span>
                  </span>
                ) : (
                  <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Warning: OAS stops after 6 months abroad (under 20 yrs).</span>
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Canadian Real Estate Strategy */}
          {realEstateOwnsHome && (
            <div className="bg-amber-50/70 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <div>
                  <strong className="text-amber-950 dark:text-amber-200 font-bold block">
                    Canadian Home Ownership Strategy:
                  </strong>
                  <span className="text-amber-800 dark:text-amber-300 text-[11px]">
                    Choose how you handle your home upon leaving Canada.
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-amber-300 dark:border-amber-500/30 text-xs shrink-0 font-medium">
                <button
                  type="button"
                  onClick={() => updateExpatField('realEstateStrategy', 'sell_before_departure')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    (expat?.realEstateStrategy || 'keep_and_rent') === 'sell_before_departure'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                  }`}
                >
                  Sell Before Exit (PRE Tax-Free)
                </button>
                <button
                  type="button"
                  onClick={() => updateExpatField('realEstateStrategy', 'keep_and_rent')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    (expat?.realEstateStrategy || 'keep_and_rent') === 'keep_and_rent'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                  }`}
                >
                  Keep & Rent (S.216 Net)
                </button>
                <button
                  type="button"
                  onClick={() => updateExpatField('realEstateStrategy', 'sell_after_departure')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    (expat?.realEstateStrategy || 'keep_and_rent') === 'sell_after_departure'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                  }`}
                >
                  Sell as Non-Resident (S.116)
                </button>
              </div>
            </div>
          )}

          {/* Direct Jump to Expat Simulator Module */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950 to-slate-950 border border-cyan-800/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Dedicated Expat Retirement Section Available</span>
              </h5>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Explore the full interactive visualizer below for local currency conversions, Purchasing Power Parity (PPP) boost analysis, and CRA departure checklists.
              </p>
            </div>

            <a
              href="#expat-retirement-section"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
            >
              <span>View Expat Analysis Section</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      )}
    </div>
  );
});

ExpatRelocationTab.displayName = 'ExpatRelocationTab';
