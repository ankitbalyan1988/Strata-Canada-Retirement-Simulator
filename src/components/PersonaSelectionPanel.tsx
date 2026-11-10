import React, { useState } from 'react';
import { 
  Users, 
  Wand2, 
  RotateCcw, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  MapPin,
  HelpCircle,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PRESETS } from '../utils/presets';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { ScenarioPreset } from '../types/retirement';

export const PersonaSelectionPanel: React.FC = () => {
  const activePresetId = useSimulationStore((state) => state.activePresetId);
  const selectPreset = useSimulationStore((state) => state.selectPreset);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const currentInputs = useSimulationStore(useShallow((state) => state.inputs));

  const isPersonaCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.personaSelection));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    activePresetId && activePresetId !== 'blank' && activePresetId !== 'custom' 
      ? activePresetId 
      : 'canadian_average'
  );

  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  const selectedPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
  const inp = selectedPreset.inputs;

  const isBlankCanvas = (
    currentInputs.currentAnnualIncome === 0 &&
    currentInputs.rrspBalance === 0 &&
    currentInputs.tfsaBalance === 0 &&
    currentInputs.nonRegBalance === 0
  );

  const handleApplyPreset = (preset: ScenarioPreset) => {
    setSelectedPresetId(preset.id);
    selectPreset(preset);
  };

  const handleClearData = () => {
    resetToBlankCanvas();
    setIsConfirmingClear(false);
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  const totalCurrentAssets = (currentInputs.rrspBalance || 0) + 
    (currentInputs.tfsaBalance || 0) + 
    (currentInputs.fhsaBalance || 0) + 
    (currentInputs.nonRegBalance || 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col gap-4 sm:gap-5 transition-all">
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!isPersonaCollapsed ? 'pb-4 border-b border-slate-100 dark:border-slate-800' : ''}`}>
        <div 
          onClick={() => toggleSectionCollapse('personaSelection')}
          className="cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Persona & Starting Scenarios
                </h3>
                {isBlankCanvas ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Blank Canvas Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                    {activePresetId === 'custom_ai' ? 'AI Persona Loaded' : selectedPreset.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Optionally load a prefilled Canadian demographic baseline, describe a persona to the AI, or wipe all numbers to a blank slate.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Clear Data + Expand/Collapse Individual Section Toggle */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          {!isConfirmingClear ? (
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer"
              title="Clean out all entered data and reset to a blank canvas ($0 balances)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clean Out Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/70 p-1 rounded-xl border border-rose-300 dark:border-rose-800">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 px-2">
                Wipe all numbers to $0?
              </span>
              <button
                type="button"
                onClick={handleClearData}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Section Expand / Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => toggleSectionCollapse('personaSelection')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={isPersonaCollapsed ? 'Expand Persona & Starting Scenarios section' : 'Collapse Persona & Starting Scenarios section'}
            aria-expanded={!isPersonaCollapsed}
          >
            <span>{isPersonaCollapsed ? 'Expand' : 'Collapse'}</span>
            {isPersonaCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Summary Bar */}
      {isPersonaCollapsed ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Active Setup:
            </span>
            {isBlankCanvas ? (
              <span className="text-slate-600 dark:text-slate-400">
                Blank Canvas ($0 balances, $0 income) • Clean slate for custom numbers
              </span>
            ) : (
              <span className="text-slate-700 dark:text-slate-300">
                <strong>{activePresetId === 'custom_ai' ? 'Custom AI Persona' : selectedPreset.name}</strong>
                {' '}(Age {currentInputs.currentAge} • ${currentInputs.currentAnnualIncome.toLocaleString()}/yr • Total Assets: {formatCurrency(totalCurrentAssets)})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleSectionCollapse('personaSelection')}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Show Persona Options</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* 2-Column Action Grid: Prefilled Persona Selector & AI Persona Trigger */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Prefilled Personas Dropdown & Details (Spans 2 cols) */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Choose a Prefilled Canadian Persona
            </span>
            <span className="text-[11px] text-slate-400">
              {PRESETS.length} Canadian Presets Available
            </span>
          </div>

          {/* Persona Dropdown Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.tagline}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleApplyPreset(selectedPreset)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Load This Persona</span>
            </button>
          </div>

          {/* Active Preset Quick Details Card */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPreset.name}</span>
              <span>{inp.maritalStatus === 'married' ? 'Married Couple' : 'Single'} • {inp.province}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              "{selectedPreset.description}"
            </p>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Age Timeline</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Age {inp.currentAge} → {inp.retirementAge}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Annual Income</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(inp.currentAnnualIncome)}/yr
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">RRSP Balance</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(inp.rrspBalance)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TFSA Balance</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(inp.tfsaBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Describe to AI (Spans 1 col) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200/70 dark:border-indigo-800/50 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Wand2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Describe a Persona to AI
              </span>
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Describe your specific household in natural language (e.g. <em>"Single software developer in Vancouver with $65k in TFSA and aiming to retire at 58"</em>).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAIPersonaModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Prompt AI Scenario</span>
          </button>
        </div>

      </div>
      )}
    </div>
  );
};
