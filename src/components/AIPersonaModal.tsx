import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  X, 
  ArrowRight, 
  Loader2, 
  Wand2, 
  Check, 
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  Heart,
  Home,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { RetirementInputs, ScenarioPreset } from '../types/retirement';
import { PRESETS } from '../utils/presets';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';

export interface AIPersonaModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onApplyPersona?: (inputs: RetirementInputs) => void;
  initialTab?: 'standard' | 'ai';
}

export const AIPersonaModal: React.FC<AIPersonaModalProps> = (props) => {
  const storeIsOpen = useSimulationStore((state) => state.isAIPersonaModalOpen);
  const storeSetIsOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const storeApplyAIPersona = useSimulationStore((state) => state.applyAIPersona);
  const activePresetId = useSimulationStore((state) => state.activePresetId);
  const selectPreset = useSimulationStore((state) => state.selectPreset);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);
  const currentInputs = useSimulationStore(useShallow((state) => state.inputs));

  const isOpen = props.isOpen ?? storeIsOpen;
  const onClose = props.onClose ?? (() => storeSetIsOpen(false));
  const onApplyPersona = props.onApplyPersona ?? storeApplyAIPersona;

  // Active Tab: 'standard' (Presets) or 'ai' (Gemini generator)
  const [activeTab, setActiveTab] = useState<'standard' | 'ai'>(props.initialTab || 'standard');

  // Standard Presets State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    activePresetId && activePresetId !== 'blank' && activePresetId !== 'custom' && activePresetId !== 'custom_ai'
      ? activePresetId 
      : 'canadian_average'
  );
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // AI Generator State
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPersona, setGeneratedPersona] = useState<RetirementInputs | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedPresetId if activePresetId changes
  useEffect(() => {
    if (activePresetId && activePresetId !== 'blank' && activePresetId !== 'custom' && activePresetId !== 'custom_ai') {
      setSelectedPresetId(activePresetId);
    }
  }, [activePresetId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-clear feedback notice after 4 seconds
  useEffect(() => {
    if (feedbackNotice) {
      const timer = setTimeout(() => setFeedbackNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackNotice]);

  if (!isOpen) return null;

  const selectedPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];
  const inp = selectedPreset.inputs;

  const isBlankCanvas = (
    currentInputs.currentAnnualIncome === 0 &&
    currentInputs.rrspBalance === 0 &&
    currentInputs.tfsaBalance === 0 &&
    currentInputs.nonRegBalance === 0
  );

  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  const handleApplyPreset = (preset: ScenarioPreset) => {
    setSelectedPresetId(preset.id);
    selectPreset(preset);
    setFeedbackNotice(`Loaded "${preset.name}" into simulation!`);
  };

  const handleClearData = () => {
    resetToBlankCanvas();
    setIsConfirmingClear(false);
    setFeedbackNotice('All simulation accounts wiped to a clean canvas ($0).');
  };

  const examplePrompts = [
    'A 29-year-old nurse in Calgary earning $84,000 with $25,000 in TFSA, wanting to retire early at 57.',
    'A married couple in Vancouver (ages 44 & 41) making $240,000 combined with $200k in RRSPs aiming for 60.',
    'A freelance tech consultant in Montreal earning $95,000 with modest savings facing potential contract volatility at age 48.',
    'A 38-year-old public servant in Ottawa earning $92,000 maximizing both TFSA and FHSA for retirement.'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setGeneratedPersona(null);

    try {
      const response = await fetch('/api/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate persona.');
      }

      const data = await response.json();
      if (data.persona) {
        setGeneratedPersona(data.persona);
      } else {
        throw new Error('Invalid persona response received.');
      }
    } catch (err: any) {
      console.error('AI Persona Generation Error:', err);
      setError(err.message || 'Error communicating with AI service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAIPersona = () => {
    if (generatedPersona) {
      onApplyPersona(generatedPersona);
      setFeedbackNotice('AI-synthesized persona loaded into simulation!');
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-colors"
        role="dialog"
        aria-modal="true"
        aria-labelledby="personas-modal-title"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="personas-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
                  Standard or AI Personas
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
                Load a prefilled Canadian demographic baseline or synthesize custom personas with Gemini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Switcher */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('standard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Standard Canadian Personas</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                6 Presets
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>AI Persona Generator</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                Gemini
              </span>
            </button>
          </div>

          {/* Quick Clean Slate Button */}
          {!isConfirmingClear ? (
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer"
              title="Clean out all entered data and reset to a blank canvas ($0 balances)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clean Out ($0 Canvas)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/70 p-1 rounded-xl border border-rose-300 dark:border-rose-800 text-xs">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 px-2">
                Wipe to $0?
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
        </div>

        {/* Global Feedback Notice Banner */}
        {feedbackNotice && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{feedbackNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {activeTab === 'standard' ? (
            /* TAB 1: STANDARD CANADIAN PERSONAS & STARTING SCENARIOS */
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Official Canadian Demographic Presets
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Select a curated Canadian household profile calibrated to Statistics Canada and CRA actuarial data:
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Click a persona to inspect & load
                </span>
              </div>

              {/* Grid of Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  const isActiveInSim = activePresetId === p.id;
                  const presetInp = p.inputs;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPresetId(p.id)}
                      className={`p-3.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'border-amber-500/80 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {isActiveInSim && (
                        <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Active
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 mb-1 pr-12">
                          <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {p.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {p.tagline}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Age {presetInp.currentAge} → {presetInp.retirementAge}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(presetInp.currentAnnualIncome)}/yr
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detailed Inspector Card for Selected Preset */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {selectedPreset.name}
                      </h4>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {inp.maritalStatus === 'married' ? 'Married Couple' : 'Single Individual'} • {inp.province}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                      "{selectedPreset.description}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset(selectedPreset)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <Check className="w-4 h-4" />
                    <span>Load This Persona</span>
                  </button>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Age Timeline</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Age {inp.currentAge} → {inp.retirementAge}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Life Expectancy: {inp.lifeExpectancy}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Annual Income</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {formatCurrency(inp.currentAnnualIncome)}/yr
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Province: {inp.province}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">RRSP / TFSA</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                      {formatCurrency(inp.rrspBalance)} / {formatCurrency(inp.tfsaBalance)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      FHSA: {formatCurrency(inp.fhsaBalance)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Retirement Spending</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      {formatCurrency(inp.targetRetirementSpendingToday)}/yr
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Non-Reg: {formatCurrency(inp.nonRegBalance)}
                    </span>
                  </div>
                </div>

                {/* Spousal Information if Married */}
                {inp.maritalStatus === 'married' && inp.spouse && (
                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-purple-950 dark:text-purple-200 font-medium">
                        Spouse Included: <strong>{inp.spouse.name}</strong> (Age {inp.spouse.currentAge}, retiring at {inp.spouse.retirementAge})
                      </span>
                    </div>
                    <span className="text-purple-900 dark:text-purple-300 font-mono font-bold text-xs">
                      Spouse Salary: {formatCurrency(inp.spouse.annualIncome)}/yr • RRSP: {formatCurrency(inp.spouse.rrspBalance)}
                    </span>
                  </div>
                )}

                {/* Real Estate Information */}
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-blue-950 dark:text-blue-200">
                      Housing Profile: <strong>{inp.realEstate?.ownsHome ? 'Homeowner' : inp.realEstate?.purchaseType === 'future' ? `Future Homebuyer (Age ${inp.realEstate.futurePurchaseAge})` : 'Renting'}</strong>
                    </span>
                  </div>
                  {inp.realEstate?.ownsHome && (
                    <span className="text-blue-900 dark:text-blue-300 font-mono font-bold text-xs">
                      Home Value: {formatCurrency(inp.realEstate.currentMarketValue || inp.realEstate.costOfHome)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: AI PERSONA GENERATOR (GEMINI) */
            <div className="flex flex-col gap-5">
              {/* Prompt Descriptor Input Box */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Describe Your Custom Canadian Household:</span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">Natural English / Canadian details</span>
                </label>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. A 32-year-old software architect in Vancouver earning $135,000 with $60,000 in TFSA and $40,000 in RRSP, wanting to retire at age 54 with a comfortable lifestyle..."
                    className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none font-medium text-slate-800 dark:text-slate-100 leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>

                {/* Quick Example Prompt Chips */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Or Try an Example Scenario:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {examplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(p)}
                        className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
                      >
                        "{p.substring(0, 48)}..."
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Synthesizing Canadian Persona with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    <span>Synthesize Persona from Description</span>
                  </>
                )}
              </button>

              {/* Error Message if any */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Generated Persona Preview Card */}
              {generatedPersona && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/10 flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        AI Synthesized Canadian Profile
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 uppercase">
                      {generatedPersona.maritalStatus === 'married' ? 'Couple Plan' : 'Individual Plan'}
                    </span>
                  </div>

                  {/* Grid of Key Synthesized Attributes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-sans">Age & Target</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        Age {generatedPersona.currentAge} → {generatedPersona.retirementAge}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-sans">Salary & Province</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {formatCurrency(generatedPersona.currentAnnualIncome)} ({generatedPersona.province})
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-sans">RRSP / TFSA</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrency(generatedPersona.rrspBalance)} / {formatCurrency(generatedPersona.tfsaBalance)}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-sans">Target Spending</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(generatedPersona.targetRetirementSpendingToday)}/yr
                      </span>
                    </div>
                  </div>

                  {generatedPersona.maritalStatus === 'married' && generatedPersona.spouse && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span>
                        Spouse: {generatedPersona.spouse.name} (Age {generatedPersona.spouse.currentAge}, Retire @ {generatedPersona.spouse.retirementAge})
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                        Salary: {formatCurrency(generatedPersona.spouse.annualIncome)}
                      </span>
                    </div>
                  )}

                  {/* Apply Action */}
                  <button
                    type="button"
                    onClick={handleApplyAIPersona}
                    className="w-full mt-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Load This Persona into Simulator</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              All presets and AI outputs are processed locally into memory with real CRA 2025/2026 tax formulas.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer self-stretch sm:self-auto"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Also export as StandardOrAIPersonasModal for semantic clarity
export const StandardOrAIPersonasModal = AIPersonaModal;
