import React, { useState, useMemo, useEffect, startTransition } from 'react';
import {
  Sliders,
  Zap,
  Anchor,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Flame,
  Home,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Send,
  Loader2,
  Bot,
  AlertOctagon,
  Lightbulb,
  HelpCircle,
  X
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  calculateWhatIfSimulation,
  generateSensitivityMatrix,
  WHAT_IF_PRESETS
} from '../../utils/whatIfCalculator';
import { fetchWhatIfNarrative, WhatIfNarrativeData } from '../../utils/whatIfNarrativeClient';

interface WhatIfSensitivityPanelProps {
  whatIfResult: ReturnType<typeof calculateWhatIfSimulation>;
  onApplyPreset: (settings: { returnDelta: number; appreciationDelta: number; inflationDelta: number }) => void;
  onUpdateDelta: (field: 'returnDelta' | 'appreciationDelta' | 'inflationDelta', value: number) => void;
  onReset: () => void;
}

export const WhatIfSensitivityPanel: React.FC<WhatIfSensitivityPanelProps> = ({
  whatIfResult,
  onApplyPreset,
  onUpdateDelta,
  onReset
}) => {
  const inputs = useSimulationStore((state) => state.inputs);
  const summary = useSimulationStore((state) => state.summary);
  const yearlyResults = useSimulationStore((state) => state.yearlyResults);
  const whatIfSettings = useSimulationStore((state) => state.whatIfSettings);

  const handleUpdateDelta = (field: 'returnDelta' | 'appreciationDelta' | 'inflationDelta', value: number) => {
    startTransition(() => {
      onUpdateDelta(field, value);
    });
  };

  const handleApplyPreset = (settings: { returnDelta: number; appreciationDelta: number; inflationDelta: number }) => {
    startTransition(() => {
      onApplyPreset(settings);
    });
  };

  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [matrixDimension, setMatrixDimension] = useState<'inflation' | 'appreciation'>('inflation');

  // AI Narrative Insights State
  const [narrativeData, setNarrativeData] = useState<WhatIfNarrativeData | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(true);
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [isAskingCustom, setIsAskingCustom] = useState(false);
  const [analyzedSettingsKey, setAnalyzedSettingsKey] = useState<string>('');

  const currentSettingsKey = `${whatIfSettings.returnDelta}_${whatIfSettings.appreciationDelta}_${whatIfSettings.inflationDelta}`;
  const isNarrativeStale = Boolean(analyzedSettingsKey && analyzedSettingsKey !== currentSettingsKey);

  const currentPreset = WHAT_IF_PRESETS.find(
    (p) =>
      p.settings.returnDelta === whatIfSettings.returnDelta &&
      p.settings.appreciationDelta === whatIfSettings.appreciationDelta &&
      p.settings.inflationDelta === whatIfSettings.inflationDelta
  );

  const scenarioName = currentPreset
    ? currentPreset.name
    : `Custom Scenario (${whatIfSettings.returnDelta >= 0 ? '+' : ''}${whatIfSettings.returnDelta}% Return, ${whatIfSettings.appreciationDelta >= 0 ? '+' : ''}${whatIfSettings.appreciationDelta}% Home, ${whatIfSettings.inflationDelta >= 0 ? '+' : ''}${whatIfSettings.inflationDelta}% Inflation)`;

  const handleGenerateNarrative = async (customQ?: string) => {
    if (customQ) {
      setIsAskingCustom(true);
    } else {
      setIsLoadingNarrative(true);
    }
    setNarrativeError(null);

    try {
      const data = await fetchWhatIfNarrative({
        scenarioName,
        settings: whatIfSettings,
        whatIfResult,
        inputs,
        summary,
        customQuestion: customQ
      });
      setNarrativeData(data);
      setAnalyzedSettingsKey(currentSettingsKey);
      if (customQ && data.customAnswer) {
        setCustomAnswer(data.customAnswer);
      }
    } catch (err: any) {
      console.error('Error generating AI narrative:', err);
      setNarrativeError(err.message || 'Unable to generate narrative insights.');
    } finally {
      setIsLoadingNarrative(false);
      setIsAskingCustom(false);
    }
  };

  // Automatically generate narrative on mount if not yet generated
  useEffect(() => {
    if (!narrativeData && !isLoadingNarrative) {
      handleGenerateNarrative();
    }
  }, []);

  const {
    crossoverImpact,
    coastFireImpact,
    retirementCashflow,
    retirementNetWorth,
    effectiveRates
  } = whatIfResult;

  // Memoize sensitivity matrix computation
  const sensitivityMatrix = useMemo(() => {
    if (!isMatrixOpen) return null;
    return generateSensitivityMatrix(inputs, matrixDimension, summary, yearlyResults);
  }, [inputs, matrixDimension, isMatrixOpen, summary, yearlyResults]);

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${Math.round(val).toLocaleString()}`;
  };

  const hasModifications =
    whatIfSettings.returnDelta !== 0 ||
    whatIfSettings.appreciationDelta !== 0 ||
    whatIfSettings.inflationDelta !== 0;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-purple-500/30 shadow-md flex flex-col gap-4 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sliders className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-sm sm:text-base">
                What-If Sensitivity Analysis
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                Live Dynamic Modeling
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate variations in returns (±2%), home appreciation (±2%), and inflation on Canadian milestone velocity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasModifications && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Reset all deltas to baseline"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Base</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMatrixOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition border ${
              isMatrixOpen
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 text-purple-300" />
            <span>Sensitivity Matrix</span>
            {isMatrixOpen ? (
              <ChevronUp className="w-3 h-3 ml-0.5 text-purple-200" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Preset Scenario Quick-Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1 mr-1">
          <Info className="w-3 h-3 text-purple-400" />
          Presets:
        </span>
        {WHAT_IF_PRESETS.map((preset) => {
          const isSelected =
            whatIfSettings.returnDelta === preset.settings.returnDelta &&
            whatIfSettings.appreciationDelta === preset.settings.appreciationDelta &&
            whatIfSettings.inflationDelta === preset.settings.inflationDelta;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.settings)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={preset.description}
            >
              <span>{preset.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Range Sliders Grid (Returns ±2%, Appreciation ±2%, Inflation ±2%) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
        
        {/* 1. Annual Investment Return Delta */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Investment Return:
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {whatIfSettings.returnDelta >= 0 ? `+${whatIfSettings.returnDelta.toFixed(1)}%` : `${whatIfSettings.returnDelta.toFixed(1)}%`}
              <span className="text-[10.5px] font-normal text-slate-400 ml-1">
                ({effectiveRates.whatIfReturn.toFixed(1)}% eff)
              </span>
            </span>
          </div>

          <input
            type="range"
            min="-2.0"
            max="2.0"
            step="0.25"
            value={whatIfSettings.returnDelta}
            onChange={(e) => handleUpdateDelta('returnDelta', parseFloat(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            {[-2.0, -1.0, 0.0, 1.0, 2.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleUpdateDelta('returnDelta', val)}
                className={`px-1 py-0.5 rounded transition ${
                  whatIfSettings.returnDelta === val
                    ? 'font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40'
                    : 'hover:text-white'
                }`}
              >
                {val === 0 ? 'Base' : `${val > 0 ? '+' : ''}${val}%`}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Home Appreciation Delta */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-orange-400" />
              Home Appreciation:
            </span>
            <span className="font-mono font-bold text-orange-400">
              {whatIfSettings.appreciationDelta >= 0 ? `+${whatIfSettings.appreciationDelta.toFixed(1)}%` : `${whatIfSettings.appreciationDelta.toFixed(1)}%`}
              <span className="text-[10.5px] font-normal text-slate-400 ml-1">
                ({effectiveRates.whatIfAppreciation.toFixed(1)}% eff)
              </span>
            </span>
          </div>

          <input
            type="range"
            min="-2.0"
            max="2.0"
            step="0.25"
            value={whatIfSettings.appreciationDelta}
            onChange={(e) => handleUpdateDelta('appreciationDelta', parseFloat(e.target.value))}
            className="w-full accent-orange-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            {[-2.0, -1.0, 0.0, 1.0, 2.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleUpdateDelta('appreciationDelta', val)}
                className={`px-1 py-0.5 rounded transition ${
                  whatIfSettings.appreciationDelta === val
                    ? 'font-bold text-orange-300 bg-orange-950/80 border border-orange-500/40'
                    : 'hover:text-white'
                }`}
              >
                {val === 0 ? 'Base' : `${val > 0 ? '+' : ''}${val}%`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Inflation Rate Delta */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Inflation Rate:
            </span>
            <span className="font-mono font-bold text-rose-400">
              {whatIfSettings.inflationDelta >= 0 ? `+${whatIfSettings.inflationDelta.toFixed(1)}%` : `${whatIfSettings.inflationDelta.toFixed(1)}%`}
              <span className="text-[10.5px] font-normal text-slate-400 ml-1">
                ({effectiveRates.whatIfInflation.toFixed(1)}% eff)
              </span>
            </span>
          </div>

          <input
            type="range"
            min="-2.0"
            max="2.0"
            step="0.25"
            value={whatIfSettings.inflationDelta}
            onChange={(e) => handleUpdateDelta('inflationDelta', parseFloat(e.target.value))}
            className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            {[-2.0, -1.0, 0.0, 1.0, 2.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleUpdateDelta('inflationDelta', val)}
                className={`px-1 py-0.5 rounded transition ${
                  whatIfSettings.inflationDelta === val
                    ? 'font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40'
                    : 'hover:text-white'
                }`}
              >
                {val === 0 ? 'Base' : `${val > 0 ? '+' : ''}${val}%`}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Primary Sensitivity Impact Scorecard (Crossover, Coast FIRE, Retirement Cashflow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Card 1: Crossover Milestone Impact */}
        <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Zap className="w-4 h-4 text-emerald-400" />
              Retirement Crossover Date
            </span>
            {crossoverImpact.ageDelta !== null && (
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                  crossoverImpact.ageDelta < 0
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : crossoverImpact.ageDelta > 0
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {crossoverImpact.ageDelta < 0
                  ? `🚀 ${Math.abs(crossoverImpact.ageDelta)} yrs earlier`
                  : crossoverImpact.ageDelta > 0
                  ? `⏳ ${crossoverImpact.ageDelta} yrs delayed`
                  : 'Unchanged'}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">
              {crossoverImpact.whatIfAge !== null ? `Age ${crossoverImpact.whatIfAge}` : 'Not Reached'}
            </span>
            <span className="text-xs text-slate-400">
              {crossoverImpact.whatIfYear ? `(${crossoverImpact.whatIfYear})` : ''}
            </span>
            {crossoverImpact.baselineAge !== null && (
              <span className="text-[11px] text-slate-500 ml-auto font-mono">
                Base: Age {crossoverImpact.baselineAge}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            {crossoverImpact.whatIfAge !== null
              ? `Annual returns of ${formatCur(crossoverImpact.metricValue)}/yr exceed required living costs at Age ${crossoverImpact.whatIfAge}.`
              : 'Under this scenario, investment returns do not outpace living expenses prior to life expectancy.'}
          </p>
        </div>

        {/* Card 2: Coast FIRE Milestone Impact */}
        <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <Anchor className="w-4 h-4 text-cyan-400" />
              Coast FIRE Milestone
            </span>
            {coastFireImpact.ageDelta !== null && (
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                  coastFireImpact.ageDelta < 0
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : coastFireImpact.ageDelta > 0
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {coastFireImpact.ageDelta < 0
                  ? `⚓ ${Math.abs(coastFireImpact.ageDelta)} yrs earlier`
                  : coastFireImpact.ageDelta > 0
                  ? `⏳ ${coastFireImpact.ageDelta} yrs delayed`
                  : 'Unchanged'}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">
              {coastFireImpact.whatIfAge !== null ? `Age ${coastFireImpact.whatIfAge}` : 'Not Achievable'}
            </span>
            <span className="text-xs text-slate-400">
              {coastFireImpact.whatIfYear ? `(${coastFireImpact.whatIfYear})` : ''}
            </span>
            {coastFireImpact.baselineAge !== null && (
              <span className="text-[11px] text-slate-500 ml-auto font-mono">
                Base: Age {coastFireImpact.baselineAge}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            {coastFireImpact.whatIfAge !== null
              ? `Zero future contributions required after Age ${coastFireImpact.whatIfAge}; portfolio of ${formatCur(coastFireImpact.metricValue)} compounds to fully fund retirement.`
              : 'Zero-contribution viability not attained under lower compounding return assumptions.'}
          </p>
        </div>

        {/* Card 3: Cashflow at Retirement */}
        <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <Wallet className="w-4 h-4 text-purple-400" />
              Retirement Cashflow (Age {inputs.retirementAge})
            </span>
            <span
              className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                retirementCashflow.deltaNominalMonthly >= 0
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border-rose-700'
              }`}
            >
              {retirementCashflow.deltaNominalMonthly >= 0 ? '+' : ''}
              {formatCur(retirementCashflow.deltaNominalMonthly)}/mo
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">
              {formatCur(retirementCashflow.whatIfNominalMonthly)}/mo
            </span>
            <span className="text-xs text-slate-400">
              ({formatCur(retirementCashflow.whatIfNominalAnnual)}/yr)
            </span>
            <span className="text-[11px] text-slate-500 ml-auto font-mono">
              Base: {formatCur(retirementCashflow.baselineNominalMonthly)}/mo
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Real Purchasing Power: <strong className="text-slate-200">{formatCur(retirementCashflow.whatIfRealMonthly)}/mo</strong>
            </span>
            <span className="font-semibold text-purple-300">
              {retirementCashflow.percentDeltaMonthly >= 0 ? '+' : ''}
              {retirementCashflow.percentDeltaMonthly.toFixed(1)}% vs Base
            </span>
          </div>
        </div>

      </div>

      {/* AI GENERATED SCENARIO NARRATIVE & ASSET RISK ASSESSMENT */}
      <div className="bg-slate-950/90 rounded-2xl border border-purple-500/40 p-4 sm:p-5 flex flex-col gap-4 shadow-lg relative overflow-hidden transition-all duration-200">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Narrative Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5">
                  <span>AI Scenario Narrative & Risk Assessment</span>
                </h4>
                {narrativeData && (
                  <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider ${
                    narrativeData.riskRating === 'critical'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : narrativeData.riskRating === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : narrativeData.riskRating === 'low'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  }`}>
                    {narrativeData.riskRating === 'critical' && <AlertOctagon className="w-3 h-3 text-rose-400" />}
                    {narrativeData.riskRating === 'high' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                    {narrativeData.riskRating === 'low' && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                    {narrativeData.riskRating === 'moderate' && <Info className="w-3 h-3 text-sky-400" />}
                    <span>{narrativeData.riskRating} risk</span>
                  </span>
                )}
                {isNarrativeStale && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    ⚡ Inputs Changed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {narrativeData?.riskLabel || 'Bespoke actuarial narrative analyzing asset safety, sequence risk, and Canadian remediation strategies'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => handleGenerateNarrative()}
              disabled={isLoadingNarrative}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs border cursor-pointer ${
                isNarrativeStale
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400 ring-2 ring-purple-400/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Generate fresh AI insights for current scenario settings"
            >
              {isLoadingNarrative ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isNarrativeStale ? 'Update AI Insights' : 'Refresh Insights'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsNarrativeExpanded(p => !p)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title={isNarrativeExpanded ? 'Collapse Narrative Section' : 'Expand Narrative Section'}
            >
              {isNarrativeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Narrative Card Body */}
        {isNarrativeExpanded && (
          <div className="flex flex-col gap-4 relative z-10 animate-in fade-in duration-200">
            
            {isLoadingNarrative && !narrativeData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span>Synthesizing Canadian actuarial narrative with Gemini AI...</span>
              </div>
            ) : narrativeData ? (
              <>
                {/* 1. Executive Summary */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Executive Scenario Assessment: {narrativeData.scenarioTitle}</span>
                    </span>
                    {narrativeData.source && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Engine: {narrativeData.source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-sans font-medium">
                    {narrativeData.summary}
                  </p>
                </div>

                {/* 2. Asset Safety Matrix & Milestone Velocity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* Left: Asset Vulnerability & Resilience */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3 justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Asset Resilience & Vulnerability</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {narrativeData.assetSafetyAnalysis?.sequenceRiskLevel || 'Sequence Risk Analysis'}
                        </span>
                      </div>

                      {/* Safe / Resilient Assets */}
                      <div className="flex flex-col gap-1.5 mb-2.5">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <span>🛡️ Resilient & Shielded Wealth:</span>
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-300 pl-2">
                          {narrativeData.assetSafetyAnalysis?.safeAssets?.map((asset, i) => (
                            <li key={i} className="flex items-start gap-1.5 leading-snug">
                              <span className="text-emerald-400 font-bold shrink-0">•</span>
                              <span>{asset}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Strained / Vulnerable Assets */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                          <span>⚠️ Strained / Exposed Assets:</span>
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-300 pl-2">
                          {narrativeData.assetSafetyAnalysis?.vulnerableAssets?.map((asset, i) => (
                            <li key={i} className="flex items-start gap-1.5 leading-snug">
                              <span className="text-rose-400 font-bold shrink-0">•</span>
                              <span>{asset}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right: Milestone Velocity & Remediation Tactics */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span>Milestone Velocity & Canadian Remediation</span>
                      </span>

                      {/* Milestone Shift Summary */}
                      <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/25 text-xs text-purple-200 mb-2.5 leading-relaxed">
                        <strong className="text-white block text-[11px] mb-0.5">Velocity Impact:</strong>
                        {narrativeData.milestoneImpactSummary}
                      </div>

                      {/* Remediation Tactics */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Actionable Strategic Defenses:</span>
                        </span>
                        <ol className="space-y-1.5 text-[11px] text-slate-300 pl-2">
                          {narrativeData.remediationTactics?.map((tactic, i) => (
                            <li key={i} className="flex items-start gap-1.5 leading-snug">
                              <span className="font-bold text-purple-400 shrink-0">{i + 1}.</span>
                              <span>{tactic}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. Projection Limits Note */}
                {narrativeData.projectionLimits && (
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-300">Model Bounds & Projection Limits: </strong>
                      <span>{narrativeData.projectionLimits}</span>
                    </div>
                  </div>
                )}

                {/* 4. Interactive Scenario Deep Dive / Ask AI */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-purple-500/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                      <span>Test Scenario Queries & AI Guidance</span>
                    </span>
                    <span className="text-[10.5px] text-slate-500">
                      Explore specific angles on this scenario
                    </span>
                  </div>

                  {/* Quick-Prompt Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'How safe is my TFSA buffer in this scenario?',
                      'Should I delay CPP & OAS to Age 70 to offset inflation?',
                      'How does my primary residence equity protect this plan?',
                      'What annual spending cut would restore 100% funding?'
                    ].map((promptQ, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => {
                          setCustomQuestion(promptQ);
                          handleGenerateNarrative(promptQ);
                        }}
                        className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-slate-300 hover:text-purple-200 border border-slate-700/80 hover:border-purple-500/40 transition text-left cursor-pointer"
                      >
                        {promptQ}
                      </button>
                    ))}
                  </div>

                  {/* Custom Question Input */}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Ask any question about this scenario (e.g. 'What if I downsize at 72 under high inflation?')"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isAskingCustom && customQuestion.trim() && handleGenerateNarrative(customQuestion)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={() => customQuestion.trim() && handleGenerateNarrative(customQuestion)}
                      disabled={isAskingCustom || !customQuestion.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isAskingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Ask AI</span>
                    </button>
                  </div>

                  {/* Custom Answer Display Box */}
                  {customAnswer && (
                    <div className="mt-1 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-slate-200 leading-relaxed font-sans flex items-start gap-2 animate-in fade-in duration-200">
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-purple-200 block text-[11px] mb-0.5">Actuarial Assessment:</strong>
                        <span>{customAnswer}</span>
                      </div>
                    </div>
                  )}

                </div>
              </>
            ) : null}

            {narrativeError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
                <span>{narrativeError}</span>
                <button
                  type="button"
                  onClick={() => handleGenerateNarrative()}
                  className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-[10px] font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Expandable 2D Sensitivity Matrix Grid */}
      {isMatrixOpen && sensitivityMatrix && (
        <div className="mt-1 bg-slate-950 p-4 rounded-xl border border-purple-500/40 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <span>Multi-Scenario Sensitivity Matrix</span>
                <span className="text-[10.5px] font-normal text-slate-400">
                  (Click any cell to load those exact parameters)
                </span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displays Crossover Age, Coast FIRE Age, and Retirement Monthly Cashflow across variation permutations
              </p>
            </div>

            {/* Matrix Dimension Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMatrixDimension('inflation')}
                className={`px-2.5 py-1 rounded-md transition ${
                  matrixDimension === 'inflation'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Returns vs. Inflation
              </button>
              <button
                type="button"
                onClick={() => setMatrixDimension('appreciation')}
                className={`px-2.5 py-1 rounded-md transition ${
                  matrixDimension === 'appreciation'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Returns vs. Home Value
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[580px]">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2 px-2 text-center bg-slate-900/80 rounded-tl-lg">
                    Return \ {matrixDimension === 'inflation' ? 'Inflation' : 'Home Appr.'}
                  </th>
                  {sensitivityMatrix.otherDeltas.map((oDelta) => (
                    <th key={oDelta} className="py-2 px-2 text-center">
                      {oDelta === 0 ? '0% (Base)' : `${oDelta > 0 ? '+' : ''}${oDelta}%`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {sensitivityMatrix.grid.map((row, rIdx) => {
                  const rDelta = sensitivityMatrix.returnDeltas[rIdx];
                  return (
                    <tr key={rDelta} className="hover:bg-slate-900/60 transition">
                      <td className="py-2.5 px-2 text-center font-bold bg-slate-900/60 text-slate-300">
                        {rDelta === 0 ? '0% (Base)' : `${rDelta > 0 ? '+' : ''}${rDelta}%`}
                      </td>
                      {row.map((cell, cIdx) => {
                        const isCurrentActive =
                          whatIfSettings.returnDelta === cell.returnDelta &&
                          (matrixDimension === 'inflation'
                            ? whatIfSettings.inflationDelta === cell.otherDelta
                            : whatIfSettings.appreciationDelta === cell.otherDelta);

                        const isBaseCell = cell.returnDelta === 0 && cell.otherDelta === 0;

                        return (
                          <td
                            key={cIdx}
                            onClick={() => {
                              handleApplyPreset({
                                returnDelta: cell.returnDelta,
                                appreciationDelta: matrixDimension === 'appreciation' ? cell.otherDelta : whatIfSettings.appreciationDelta,
                                inflationDelta: matrixDimension === 'inflation' ? cell.otherDelta : whatIfSettings.inflationDelta
                              });
                            }}
                            className={`py-2 px-2 text-center cursor-pointer transition border border-transparent hover:border-purple-400/80 rounded-lg ${
                              isCurrentActive
                                ? 'bg-purple-950/90 border-purple-500 shadow-xs'
                                : isBaseCell
                                ? 'bg-slate-800/60'
                                : cell.retireMonthlyCashflow >= retirementCashflow.baselineNominalMonthly
                                ? 'hover:bg-emerald-950/40'
                                : 'hover:bg-rose-950/40'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-white text-[11px]">
                                {formatCur(cell.retireMonthlyCashflow)}/mo
                              </span>
                              <div className="flex items-center justify-center gap-1 text-[9.5px] text-slate-400">
                                <span title="Crossover Age">🚀 {cell.crossoverAge ? `A${cell.crossoverAge}` : '—'}</span>
                                <span>•</span>
                                <span title="Coast FIRE Age">⚓ {cell.coastFireAge ? `A${cell.coastFireAge}` : '—'}</span>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>
              💡 <strong>Legend:</strong> 🚀 Crossover Age • ⚓ Coast FIRE Age • Bold: Monthly Cashflow at Retire Age {inputs.retirementAge}
            </span>
            <span className="text-purple-300 font-semibold">
              Selected: Return {whatIfSettings.returnDelta >= 0 ? `+${whatIfSettings.returnDelta}%` : `${whatIfSettings.returnDelta}%`} • Inflation {whatIfSettings.inflationDelta >= 0 ? `+${whatIfSettings.inflationDelta}%` : `${whatIfSettings.inflationDelta}%`}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
