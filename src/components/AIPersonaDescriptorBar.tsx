import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Loader2, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Users, 
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { RetirementInputs } from '../types/retirement';
import { useSimulation } from '../context/SimulationContext';
import { triggerConfetti } from '../utils/confettiHelper';

export interface AIPersonaDescriptorBarProps {
  onApplyPersona?: (inputs: RetirementInputs) => void;
  activeProvince?: string;
}

export const AIPersonaDescriptorBar: React.FC<AIPersonaDescriptorBarProps> = (props) => {
  const sim = useSimulation();
  const onApplyPersona = props.onApplyPersona ?? sim.applyAIPersona;
  const activeProvince = props.activeProvince ?? sim.inputs.province;
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synthesizedPersona, setSynthesizedPersona] = useState<RetirementInputs | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const samplePrompts = [
    'A 32-year-old nurse in Calgary earning $85,000 with $45,000 in TFSA, wanting to retire at 57.',
    'A married couple in Vancouver (ages 39 & 37) making $240,000 combined with $220k in RRSPs aiming for 60.',
    'A 46-year-old tech manager in Toronto earning $150,000 planning for potential industry disruptions at age 50.',
    'A 29-year-old solo consultant in Montreal earning $95,000 aggressive on TFSA and FHSA.'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setSynthesizedPersona(null);

    try {
      const response = await fetch('/api/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to synthesize persona.');
      }

      const data = await response.json();
      if (data.persona) {
        setSynthesizedPersona(data.persona);
      } else {
        throw new Error('Invalid persona response received from AI engine.');
      }
    } catch (err: any) {
      console.error('AI Persona Generation error:', err);
      setError(err.message || 'Error communicating with AI service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (synthesizedPersona) {
      onApplyPersona(synthesizedPersona);
      triggerConfetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
      setSynthesizedPersona(null);
      setPrompt('');
    }
  };

  const formatCur = (val?: number) => val !== undefined ? `$${Math.round(val).toLocaleString()}` : '$0';

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-900/60 shadow-lg overflow-hidden transition-all duration-200">
      
      {/* Header bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-indigo-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/50">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                AI Persona Descriptor
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Natural Language Simulator
              </span>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block">
              Prompt any Canadian career, family, income, and account details in plain language to model instantly
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition border border-slate-700/60"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand Descriptor'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Descriptor Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-slate-900/40">
          
          {/* Natural language descriptor input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ai-descriptor-input" className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Prompt Your Target Persona:</span>
                <span className="text-[11px] font-normal text-slate-400">Describe age, salary, province, accounts, retirement age, or couple</span>
              </label>
              <span className="text-[11px] text-amber-300 font-medium">
                CRA Tax & Limits Grounded
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  id="ai-descriptor-input"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading && prompt.trim()) {
                      handleGenerate();
                    }
                  }}
                  placeholder="e.g. 35yo teacher in BC making $92k with $45k TFSA, planning to retire at 58 with a spouse..."
                  className="w-full px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 bg-slate-800/90 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-400 font-medium transition"
                />
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                    title="Clear prompt"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-rose-950/40 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Persona</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick example prompt chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Sample Prompts:
            </span>
            {samplePrompts.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(sample)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition truncate max-w-[280px]"
              >
                "{sample.substring(0, 36)}..."
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Synthesized Persona Preview Card */}
          {synthesizedPersona && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-300">
                    <Check className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white">
                      Synthesized Canadian Financial Profile
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-medium">
                      Calculated as {synthesizedPersona.maritalStatus === 'married' ? 'Couple' : 'Individual'} plan in {synthesizedPersona.province}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApply}
                  className="py-1.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Apply into Simulator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Career & Age</span>
                  <span className="font-bold text-white">
                    Age {synthesizedPersona.currentAge} → Retire {synthesizedPersona.retirementAge}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {formatCur(synthesizedPersona.currentAnnualIncome)}/yr ({synthesizedPersona.province})
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">RRSP & TFSA</span>
                  <span className="font-bold text-blue-300 font-mono">
                    RRSP: {formatCur(synthesizedPersona.rrspBalance)}
                  </span>
                  <span className="text-[10px] text-teal-300 block font-mono">
                    TFSA: {formatCur(synthesizedPersona.tfsaBalance)}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Pensions (CPP / OAS)</span>
                  <span className="font-bold text-white">
                    CPP: {synthesizedPersona.cppEstimatedPercentOfMax}% @ {synthesizedPersona.cppStartAge}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    OAS @ {synthesizedPersona.oasStartAge} ({synthesizedPersona.oasEligibleYearsInCanada} yrs)
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Target Spending</span>
                  <span className="font-bold text-emerald-300 font-mono">
                    {formatCur(synthesizedPersona.targetRetirementSpendingToday)}/yr
                  </span>
                  <span className="text-[10px] text-slate-400 block capitalize">
                    {synthesizedPersona.drawdownStrategy.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {synthesizedPersona.maritalStatus === 'married' && synthesizedPersona.spouse && (
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>
                    <strong>Spouse:</strong> {synthesizedPersona.spouse.name} (Age {synthesizedPersona.spouse.currentAge} → Retire {synthesizedPersona.spouse.retirementAge})
                  </span>
                  <span className="font-mono text-emerald-300">
                    Salary: {formatCur(synthesizedPersona.spouse.annualIncome)}/yr • RRSP: {formatCur(synthesizedPersona.spouse.rrspBalance)}
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
