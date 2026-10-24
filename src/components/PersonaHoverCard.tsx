import React, { useState } from 'react';
import { 
  Sparkles, 
  Info 
} from 'lucide-react';
import { ScenarioPreset } from '../types/retirement';
import { PRESETS } from '../utils/presets';

interface PersonaHoverCardProps {
  currentPresetId: string;
  onSelectPreset: (preset: ScenarioPreset) => void;
  onOpenAIPersonaModal: () => void;
}

export const PersonaHoverCard: React.FC<PersonaHoverCardProps> = ({
  currentPresetId,
  onSelectPreset,
  onOpenAIPersonaModal
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewPresetId, setPreviewPresetId] = useState<string>(currentPresetId);

  // Sync preview with current preset when opened
  const handleMouseEnter = () => {
    setIsHovered(true);
    setPreviewPresetId(currentPresetId);
  };

  const activePreset = PRESETS.find(p => p.id === (previewPresetId || currentPresetId)) || PRESETS[0];
  const inp = activePreset.inputs;

  const formatCur = (val?: number) => {
    if (val === undefined || isNaN(val)) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Persona Select Field / Button Trigger */}
      <div className="flex items-center bg-slate-800/90 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-750 rounded-lg border border-slate-700/90 px-2.5 py-1 text-xs transition cursor-pointer group">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0 animate-pulse" />
        <span className="text-slate-400 mr-1.5 hidden sm:inline">Persona:</span>
        
        <select
          aria-label="Preset Scenario Persona"
          value={currentPresetId}
          onChange={(e) => {
            const p = PRESETS.find(preset => preset.id === e.target.value);
            if (p) onSelectPreset(p);
          }}
          className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-[170px] truncate"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-white">
              {p.name}
            </option>
          ))}
        </select>

        {/* Hover info indicator */}
        <span 
          className="ml-1.5 p-0.5 text-slate-400 group-hover:text-amber-300 transition"
          title="Hover to view what this persona assumes"
        >
          <Info className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Floating Hover Card with Rich Assumption Breakdown */}
      {isHovered && (
        <div 
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-50">
                  {activePreset.name}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  {inp.maritalStatus === 'married' ? 'Couple' : 'Single / Divorced'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {activePreset.tagline}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectPreset(activePreset);
                setIsHovered(false);
              }}
              className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition cursor-pointer"
            >
              {currentPresetId === activePreset.id ? 'Active' : 'Apply'}
            </button>
          </div>

          {/* Persona Explanation Summary */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              What This Persona Assumes:
            </span>
            <p className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {activePreset.description}
            </p>
          </div>

          {/* Quick Assumptions Spec Sheet */}
          <div className="space-y-2 text-xs">
            
            {/* Timeline & Income */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Age & Longevity</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  Age {inp.currentAge} → Retire at {inp.retirementAge}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Horizon to age {inp.lifeExpectancy}</span>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Annual Income</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCur(inp.currentAnnualIncome)}/yr
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {inp.incomeGrowthRate > 0 ? `+${inp.incomeGrowthRate}% / yr trend` : inp.incomeGrowthRate < 0 ? `${inp.incomeGrowthRate}% / yr decline` : 'Flat income'}
                </span>
              </div>
            </div>

            {/* Balances & Contributions */}
            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-750">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium mb-1">Registered Account Balances</span>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 block font-sans font-semibold">RRSP</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatCur(inp.rrspBalance)}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-sans">+{formatCur(inp.rrspAnnualContribution)}/y</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-teal-600 dark:text-teal-400 block font-sans font-semibold">TFSA</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatCur(inp.tfsaBalance)}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-sans">+{formatCur(inp.tfsaAnnualContribution)}/y</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-purple-600 dark:text-purple-400 block font-sans font-semibold">Non-Reg</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatCur(inp.nonRegBalance)}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-sans">+{formatCur(inp.nonRegAnnualContribution)}/y</span>
                </div>
              </div>
            </div>

            {/* Real Estate & Returns */}
            <div className="bg-amber-50/60 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200/70 dark:border-amber-500/20 text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold text-amber-950 dark:text-amber-200">
                <span>🏡</span>
                {inp.realEstate?.ownsHome
                  ? (inp.realEstate.purchaseType === 'future'
                      ? `Renting (Planning Home Purchase @ Age ${inp.realEstate.futurePurchaseAge || 'Future'})`
                      : `Owns Home (${formatCur(inp.realEstate.currentMarketValue || 750000)} | ${inp.realEstate.ownershipSharePercent ?? 100}% share)`)
                  : 'Renting (No Real Estate Asset)'}
              </span>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono font-bold">
                {`RRSP ${inp.accountReturns?.rrspReturn ?? 6.5}% · TFSA ${inp.accountReturns?.tfsaReturn ?? 7.0}%`}
              </span>
            </div>

            {/* Public Pensions & Drawdown Strategy */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Pensions (CPP / OAS)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                  CPP: {inp.cppEstimatedPercentOfMax}% max @ {inp.cppStartAge}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  OAS: {inp.oasEligibleYearsInCanada} yrs @ {inp.oasStartAge}
                </span>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Decumulation Strategy</span>
                <span className="font-semibold text-rose-700 dark:text-rose-400 capitalize block truncate">
                  {inp.drawdownStrategy.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Spend: {formatCur(inp.targetRetirementSpendingToday)}/yr
                </span>
              </div>
            </div>

            {/* Couple Specifics (if married) */}
            {inp.maritalStatus === 'married' && inp.spouse && (
              <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 text-[11px] text-rose-950 dark:text-rose-200 flex items-center justify-between">
                <span>
                  <strong>Spouse:</strong> {inp.spouse.name} (Age {inp.spouse.currentAge} → {inp.spouse.retirementAge})
                </span>
                <span className="font-mono font-bold text-rose-800 dark:text-rose-300">
                  Salary: {formatCur(inp.spouse.annualIncome)}
                </span>
              </div>
            )}

          </div>

          {/* Presets Switcher Carousel Inside Popover */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Hover To Preview Assumptions:
            </span>
            <div className="grid grid-cols-3 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setPreviewPresetId(p.id)}
                  onClick={() => {
                    onSelectPreset(p);
                    setIsHovered(false);
                  }}
                  className={`text-[10px] text-left px-2 py-1.5 rounded-lg border truncate transition cursor-pointer ${
                    activePreset.id === p.id
                      ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title={p.description}
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* AI Persona Prompt Trigger */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsHovered(false);
                onOpenAIPersonaModal();
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Prompt Custom Persona with AI ✨</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
