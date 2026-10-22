import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  Loader2, 
  Wand2, 
  Check, 
  AlertCircle, 
  User, 
  Users, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  HelpCircle 
} from 'lucide-react';
import { RetirementInputs } from '../types/retirement';
import { PROVINCIAL_BRACKETS } from '../utils/canadianTax';
import { useSimulationStore } from '../store/useSimulationStore';

export interface AIPersonaModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onApplyPersona?: (inputs: RetirementInputs) => void;
}

export const AIPersonaModal: React.FC<AIPersonaModalProps> = (props) => {
  const storeIsOpen = useSimulationStore((state) => state.isAIPersonaModalOpen);
  const storeSetIsOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const storeApplyAIPersona = useSimulationStore((state) => state.applyAIPersona);

  const isOpen = props.isOpen ?? storeIsOpen;
  const onClose = props.onClose ?? (() => storeSetIsOpen(false));
  const onApplyPersona = props.onApplyPersona ?? storeApplyAIPersona;
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPersona, setGeneratedPersona] = useState<RetirementInputs | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const handleApply = () => {
    if (generatedPersona) {
      onApplyPersona(generatedPersona);
      onClose();
    }
  };

  const formatCur = (val?: number) => val !== undefined ? `$${Math.round(val).toLocaleString()}` : '$0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col transition-colors">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  AI Persona Generator
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Powered by Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Prompt any Canadian career, income, lifestyle, or family scenario into reality
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          
          {/* Prompt Descriptor Input Box */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Describe Your Target Persona:</span>
              <span className="text-[11px] font-normal text-slate-400">Natural English / Canadian details</span>
            </label>

            <div className="relative">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A 32-year-old software architect in Vancouver earning $135,000 with $60,000 in TFSA and $40,000 in RRSP, wanting to retire at age 54 with a comfortable lifestyle..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none font-medium text-slate-800 leading-relaxed placeholder:text-slate-400"
              />
            </div>

            {/* Quick Example Prompt Chips */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                Or Try an Example Scenario:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {examplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80:bg-slate-750 text-slate-700 border border-slate-200/80 transition cursor-pointer"
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
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Persona Preview Card */}
          {generatedPersona && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">
                    AI Synthesized Canadian Profile
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  {generatedPersona.maritalStatus === 'married' ? 'Couple Plan' : 'Individual Plan'}
                </span>
              </div>

              {/* Grid of Key Synthesized Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Age & Target</span>
                  <span className="font-bold text-slate-800">
                    Age {generatedPersona.currentAge} → {generatedPersona.retirementAge}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Salary & Province</span>
                  <span className="font-bold text-slate-800">
                    {formatCur(generatedPersona.currentAnnualIncome)} ({generatedPersona.province})
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">RRSP / TFSA</span>
                  <span className="font-bold text-blue-700">
                    {formatCur(generatedPersona.rrspBalance)} / {formatCur(generatedPersona.tfsaBalance)}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Target Spending</span>
                  <span className="font-bold text-emerald-700">
                    {formatCur(generatedPersona.targetRetirementSpendingToday)}/yr
                  </span>
                </div>
              </div>

              {generatedPersona.maritalStatus === 'married' && generatedPersona.spouse && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>
                    Spouse: {generatedPersona.spouse.name} (Age {generatedPersona.spouse.currentAge}, Retire @ {generatedPersona.spouse.retirementAge})
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    Salary: {formatCur(generatedPersona.spouse.annualIncome)}
                  </span>
                </div>
              )}

              {/* Apply Action */}
              <button
                type="button"
                onClick={handleApply}
                className="w-full mt-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Load This Persona into Simulator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
