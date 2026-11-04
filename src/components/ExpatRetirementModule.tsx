import React, { useState, useMemo, startTransition } from 'react';
import { 
  RetirementInputs, 
  YearSimulationResult, 
  SimulationSummary 
} from '../types/retirement';
import { 
  ExpatInputs, 
  ExpatDestinationCountry, 
  RealEstateExpatStrategy 
} from '../types/expat';
import { EXPAT_DESTINATIONS, DEFAULT_EXPAT_INPUTS } from '../utils/expatCountries';
import { calculateExpatRetirementPlan } from '../utils/expatSimulator';
import { 
  Globe, 
  Plane, 
  DollarSign, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  Home, 
  Landmark, 
  Coins, 
  Scale, 
  FileText, 
  ShieldCheck, 
  Calendar,
  Send,
  Loader2,
  X,
  Bot,
  Sliders,
  TrendingUp,
  HeartPulse,
  Sun,
  Table
} from 'lucide-react';

import { useSimulationStore } from '../store/useSimulationStore';
import { ExpatMilestoneLedger } from './ExpatMilestoneLedger';

export interface ExpatRetirementModuleProps {
  retirementInputs?: RetirementInputs;
  yearlyResults?: YearSimulationResult[];
  summary?: SimulationSummary;
  onUpdateExpatInputs?: (inputs: ExpatInputs) => void;
}

export const ExpatRetirementModule: React.FC<ExpatRetirementModuleProps> = (props) => {
  const storeInputs = useSimulationStore((state) => state.inputs);
  const storeYearlyResults = useSimulationStore((state) => state.yearlyResults);
  const storeSummary = useSimulationStore((state) => state.summary);
  const storeUpdateExpatInputs = useSimulationStore((state) => state.updateExpatInputs);

  const retirementInputs = props.retirementInputs ?? storeInputs;
  const yearlyResults = props.yearlyResults ?? storeYearlyResults;
  const summary = props.summary ?? storeSummary;
  const onUpdateExpatInputs = props.onUpdateExpatInputs ?? storeUpdateExpatInputs;
  const defaultExpat = useMemo<ExpatInputs>(() => ({
    ...DEFAULT_EXPAT_INPUTS,
    emigrationAge: Math.max(retirementInputs.currentAge + 1, retirementInputs.retirementAge - 2),
    yearsLivedInCanadaAfter18: Math.min(40, Math.max(20, retirementInputs.retirementAge - 18))
  }), [retirementInputs.currentAge, retirementInputs.retirementAge]);

  // Use inputs from parent if provided, otherwise local state initialized with defaults
  const [localExpatInputs, setLocalExpatInputs] = useState<ExpatInputs>(() => {
    return retirementInputs.expat || defaultExpat;
  });

  const isExpatCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.expat));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const setSectionCollapse = useSimulationStore((state) => state.setSectionCollapse);

  const isExpanded = !isExpatCollapsed;
  const setIsExpanded = (expanded: boolean | ((prev: boolean) => boolean)) => {
    if (typeof expanded === 'function') {
      toggleSectionCollapse('expat');
    } else {
      setSectionCollapse('expat', !expanded);
    }
  };
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'assets' | 'ppp' | 'checklist'>('overview');
  const [regionFilter, setRegionFilter] = useState<'all' | 'Europe' | 'Americas' | 'Asia-Pacific' | 'Caribbean'>('all');

  // Single source of truth: prioritize parent state if passed, else local state
  const currentExpatInputs = retirementInputs.expat || localExpatInputs;

  // Sync state changes safely outside of React's render/updater phase
  const updateInputs = (updater: (prev: ExpatInputs) => ExpatInputs) => {
    const next = updater(currentExpatInputs);
    setLocalExpatInputs(next);
    if (onUpdateExpatInputs) {
      startTransition(() => {
        onUpdateExpatInputs(next);
      });
    }
  };

  // Run independent expat simulation
  const expatResult = useMemo(() => {
    return calculateExpatRetirementPlan(currentExpatInputs, retirementInputs, yearlyResults, summary);
  }, [currentExpatInputs, retirementInputs, yearlyResults, summary]);

  const {
    departureAge,
    departureYear,
    destinationCountry,
    yearsInCanadaAfter18,
    qualifiesForLifetimeWorldwideOAS,
    oasStatusMessage,
    departureTaxEstimateCAD,
    unrealizedCapitalGainsAtExitCAD,
    averageDomesticNetCAD,
    averageExpatNetCAD,
    averageExpatNetLocalCurrency,
    averagePPPEquivalentCAD,
    purchasingPowerBoostPercent,
    lifetimePartXIIIWithholdingCAD,
    realEstateOutcomeDescription,
    insights,
    checklist
  } = expatResult;

  const formatCur = (val: number, symbol = '$') => {
    if (val === 0) return `${symbol}0`;
    return `${symbol}${Math.round(val).toLocaleString()}`;
  };

  const handleAskExpatAi = async (customQ?: string) => {
    const q = (customQ || aiQuestion).trim();
    if (!q) return;

    setIsLoadingAi(true);
    setAiAnswer(null);

    try {
      const res = await fetch('/api/explain-ledger-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Expat retirement question: ${q}. Destination: ${destinationCountry.name}, Departure Age: ${departureAge}, Years in Canada after 18: ${yearsInCanadaAfter18}, Real Estate Strategy: ${currentExpatInputs.realEstateStrategy}.`,
          selectedAge: departureAge,
          selectedMetric: 'Expat Non-Resident Tax & PPP',
          rowData: {
            age: departureAge,
            netSpendableIncome: averageExpatNetCAD,
            totalTax: lifetimePartXIIIWithholdingCAD
          },
          planContext: {
            province: retirementInputs.province,
            retirementAge: retirementInputs.retirementAge,
            lifeExpectancy: retirementInputs.lifeExpectancy
          }
        })
      });

      if (!res.ok) throw new Error('Failed to fetch AI guidance');
      const data = await res.json();
      if (data.explanation) {
        setAiAnswer(data.explanation.summary + '\n\n' + data.explanation.contextualGuidance);
      } else {
        setAiAnswer(`Canadian Non-Resident Analysis: When emigrating to ${destinationCountry.name} at Age ${departureAge}, CRA Part XIII withholding applies to Canadian pensions at ${destinationCountry.treatyRates.rrspPeriodicWithholding}%, while your income benefits from a ${destinationCountry.purchasingPowerMultiplier}x purchasing power boost locally.`);
      }
    } catch {
      setAiAnswer(`Canadian Expat Advisory: Relocating to ${destinationCountry.name} at Age ${departureAge} (${departureYear}). Under the ${destinationCountry.hasTaxTreaty ? 'Canada-' + destinationCountry.name + ' Tax Treaty' : 'statutory CRA Part XIII rules'}, your pension and registered withdrawals face ${destinationCountry.treatyRates.rrspPeriodicWithholding}% withholding. With a cost of living ${Math.round((1 - destinationCountry.costOfLivingIndex) * 100)}% lower than Canada, your $${averageExpatNetCAD.toLocaleString()} CAD net income buys goods and services equivalent to $${averagePPPEquivalentCAD.toLocaleString()} CAD in Canada.`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div id="expat-retirement-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm overflow-hidden flex flex-col transition duration-200">
      
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-cyan-50/70 via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-cyan-950 dark:to-slate-900 text-slate-900 dark:text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-500/30">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  Canadian Expat & Non-Resident Retirement Planning
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center gap-1">
                  <span>{destinationCountry.flag}</span>
                  <span>{destinationCountry.name} ({destinationCountry.purchasingPowerMultiplier.toFixed(1)}x PPP)</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30">
                  CRA Part XIII & Treaty Model
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Model leaving Canada before or after retirement: CRA departure tax, non-resident withholding on CPP/OAS/RRSP, real estate rules, and currency conversion adjusted for Purchasing Power Parity (PPP).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) setIsExpanded(true);
              setIsAiOpen(prev => !prev);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs border cursor-pointer ${
              isAiOpen
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-transparent ring-2 ring-cyan-400/40'
                : 'bg-white hover:bg-slate-100 active:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-cyan-800 dark:text-slate-200 border-slate-200/90 dark:border-white/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
            <span>Ask Expat AI</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs flex items-center gap-2 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">PPP Value:</span>
            <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">{formatCur(averagePPPEquivalentCAD)}/yr</strong>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse Expat section' : 'Expand Expat section'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 active:bg-slate-200 dark:bg-white/15 dark:hover:bg-white/25 dark:active:bg-white/30 text-slate-700 dark:text-white border border-slate-200 dark:border-white/25 transition cursor-pointer shadow-2xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-200" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-200" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Collapsed Summary Strip (shown only when section is collapsed) */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Departure:</span>
              <strong className="text-slate-900 dark:text-slate-50 font-bold font-mono">Age {departureAge}</strong>
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">(Yr {departureYear})</span>
            </div>
            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{destinationCountry.flag}</span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Destination:</span>
              <strong className="text-slate-900 dark:text-slate-50 font-bold">{destinationCountry.name}</strong>
            </div>
            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Net Expat Income: </span>
              <strong className="text-cyan-900 dark:text-cyan-300 font-bold font-mono">{formatCur(averageExpatNetCAD)} CAD/yr</strong>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                ({formatCur(averageExpatNetLocalCurrency, destinationCountry.currencySymbol)} {destinationCountry.currencyCode})
              </span>
            </div>
            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
              <span className="text-emerald-800 dark:text-emerald-300 font-semibold">PPP Purchasing Power: </span>
              <strong className="text-emerald-950 dark:text-emerald-200 font-extrabold font-mono">{formatCur(averagePPPEquivalentCAD)} CAD Equivalent</strong>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold ml-1">({purchasingPowerBoostPercent >= 0 ? `+${purchasingPowerBoostPercent}%` : `${purchasingPowerBoostPercent}%`})</span>
            </div>
            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-600 dark:text-slate-400 font-medium">OAS Abroad: </span>
              <span className={`font-bold ${qualifiesForLifetimeWorldwideOAS ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {qualifiesForLifetimeWorldwideOAS ? '✓ Retained for Life' : '⚠️ At Risk (<20 yrs)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold text-xs shrink-0 self-end md:self-center">
            <span>Expand Full Expat Planner</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 3. Expanded Content */}
      {isExpanded && (
        <>
          {/* AI Advisor Drawer */}
          {isAiOpen && (
            <div className="bg-cyan-50/90 dark:bg-cyan-950 text-slate-800 dark:text-white p-4 border-b border-cyan-200 dark:border-cyan-900/60 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>AI Canadian Expat & Cross-Border Tax Specialist:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAiOpen(false)}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const q = 'How does the Service Canada 20-year rule work to receive OAS pension for life outside Canada?';
                    setAiQuestion(q);
                    handleAskExpatAi(q);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-cyan-900/50 hover:bg-cyan-50 dark:hover:bg-cyan-800/60 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/50 shadow-2xs cursor-pointer"
                >
                  OAS 20-Year Rule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = 'How does CRA Section 128.1 Departure Tax work on my non-registered investments when I emigrate?';
                    setAiQuestion(q);
                    handleAskExpatAi(q);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-cyan-900/50 hover:bg-cyan-50 dark:hover:bg-cyan-800/60 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/50 shadow-2xs cursor-pointer"
                >
                  CRA Departure Tax (S. 128.1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = `How does the tax treaty between Canada and ${destinationCountry.name} reduce withholding on periodic RRSP/RRIF and CPP?`;
                    setAiQuestion(q);
                    handleAskExpatAi(q);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-cyan-900/50 hover:bg-cyan-50 dark:hover:bg-cyan-800/60 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/50 shadow-2xs cursor-pointer"
                >
                  {destinationCountry.name} Tax Treaty Rates
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = 'If I keep my Canadian home and rent it to tenants, how does Section 216 net rental election save taxes vs 25% gross withholding?';
                    setAiQuestion(q);
                    handleAskExpatAi(q);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-cyan-900/50 hover:bg-cyan-50 dark:hover:bg-cyan-800/60 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/50 shadow-2xs cursor-pointer"
                >
                  Section 216 Net Rental Election
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Ask any cross-border expat question (e.g. 'Can I keep my TFSA when moving to ${destinationCountry.name}?')`}
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoadingAi && handleAskExpatAi()}
                  className="flex-1 bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleAskExpatAi()}
                  disabled={isLoadingAi || !aiQuestion.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {isLoadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Ask</span>
                </button>
              </div>

              {aiAnswer && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-cyan-200 dark:border-cyan-800/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-2xs">
                  {aiAnswer}
                </div>
              )}
            </div>
          )}

          {/* Core Simulator Container */}
          <div className="p-4 sm:p-5 flex flex-col gap-6">

            {/* A. Destination Selector & Relocation Parameters */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Expat Emigration Parameters & Destination
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Destination:</span>
                  <select
                    value={currentExpatInputs.destinationCountryId}
                    onChange={(e) => updateInputs(prev => ({ ...prev, destinationCountryId: e.target.value }))}
                    className="text-xs font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                  >
                    {EXPAT_DESTINATIONS.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.flag} {d.name} ({d.purchasingPowerMultiplier.toFixed(1)}x PPP • {d.currencyCode})
                      </option>
                    ))}
                  </select>
                </div>
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
                      onClick={() => setRegionFilter(reg)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        regionFilter === reg
                          ? 'bg-cyan-700 dark:bg-cyan-600 text-white shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {reg === 'all' ? 'All Destinations' : reg} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Destination Country Quick-Pick Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {EXPAT_DESTINATIONS
                  .filter(dest => regionFilter === 'all' || dest.region === regionFilter)
                  .map(dest => {
                    const isSelected = dest.id === destinationCountry.id;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => updateInputs(prev => ({ ...prev, destinationCountryId: dest.id }))}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-400 dark:border-cyan-500/40 ring-2 ring-cyan-400/40 shadow-xs'
                            : 'bg-white dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl leading-none">{dest.flag}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            dest.costOfLivingIndex <= 0.6 
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                              : dest.costOfLivingIndex <= 0.85
                              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
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

              {/* Sliders: Emigration Age & OAS 20-Year Residence Rule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                
                {/* Emigration Age Slider */}
                <div className="flex flex-col gap-1.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Emigration / Exit Age:</span>
                      <strong className="text-cyan-900 dark:text-cyan-300 font-mono text-sm ml-1">
                        Age {departureAge}
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        (Year {departureYear})
                      </span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      departureAge < retirementInputs.retirementAge
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {departureAge < retirementInputs.retirementAge ? 'Pre-Retirement Exit' : 'Post-Retirement Exit'}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={retirementInputs.currentAge}
                    max={retirementInputs.lifeExpectancy - 2}
                    step={1}
                    value={currentExpatInputs.emigrationAge}
                    onChange={(e) => updateInputs(prev => ({ ...prev, emigrationAge: Number(e.target.value) }))}
                    className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Current (Age {retirementInputs.currentAge})</span>
                    <span>Retire (Age {retirementInputs.retirementAge})</span>
                    <span>Life Exp (Age {retirementInputs.lifeExpectancy})</span>
                  </div>
                </div>

                {/* Years in Canada After 18 (OAS 20-Year Test) */}
                <div className="flex flex-col gap-1.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Adult Canadian Residence:</span>
                      <strong className="text-indigo-900 dark:text-indigo-300 font-mono text-sm ml-1">
                        {yearsInCanadaAfter18} Years
                      </strong>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      qualifiesForLifetimeWorldwideOAS
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 animate-pulse'
                    }`}>
                      {qualifiesForLifetimeWorldwideOAS ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>OAS Lifetime Qualified (≥20 yrs)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>OAS Lost Abroad (Need {20 - yearsInCanadaAfter18} more yrs)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={currentExpatInputs.yearsLivedInCanadaAfter18}
                    onChange={(e) => updateInputs(prev => ({ ...prev, yearsLivedInCanadaAfter18: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>5 yrs (min)</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">20 yrs (OAS Worldwide Threshold)</span>
                    <span>40 yrs (Full OAS)</span>
                  </div>
                </div>

              </div>

              {/* Real Estate Strategy on Emigration */}
              {retirementInputs.realEstate?.ownsHome && (
                <div className="bg-amber-50/60 dark:bg-amber-500/10 p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-amber-950 dark:text-amber-200 font-bold block">
                        Canadian Real Estate Strategy Upon Leaving Canada:
                      </strong>
                      <span className="text-amber-800 dark:text-amber-300 text-[11px]">
                        {realEstateOutcomeDescription}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-amber-300 dark:border-amber-600/40 text-xs shrink-0 font-medium">
                    <button
                      type="button"
                      onClick={() => updateInputs(prev => ({ ...prev, realEstateStrategy: 'sell_before_departure' }))}
                      className={`px-2.5 py-1 rounded transition cursor-pointer ${
                        currentExpatInputs.realEstateStrategy === 'sell_before_departure'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                      }`}
                    >
                      Sell Before Exit (PRE Tax-Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateInputs(prev => ({ ...prev, realEstateStrategy: 'keep_and_rent' }))}
                      className={`px-2.5 py-1 rounded transition cursor-pointer ${
                        currentExpatInputs.realEstateStrategy === 'keep_and_rent'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                      }`}
                    >
                      Keep & Rent (S.216)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateInputs(prev => ({ ...prev, realEstateStrategy: 'sell_after_departure' }))}
                      className={`px-2.5 py-1 rounded transition cursor-pointer ${
                        currentExpatInputs.realEstateStrategy === 'sell_after_departure'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                      }`}
                    >
                      Sell As Non-Resident (S.116)
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* B. The 4-Card Primary Expat Scorecard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Card 1: Non-Resident Net Income in CAD */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Net Expat Income (CAD)
                  </span>
                  <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <div className="my-2.5">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50">
                    {formatCur(averageExpatNetCAD)}
                    <span className="text-xs font-normal text-slate-400 font-sans ml-1">/yr</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>Canadian Domestic Baseline:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatCur(averageDomesticNetCAD)}/yr</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  After CRA Part XIII non-resident withholding & local destination tax
                </div>
              </div>

              {/* Card 2: Converted to Destination Local Currency */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Local Currency Income
                  </span>
                  <span className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-500/20">
                    <Coins className="w-4 h-4" />
                  </span>
                </div>
                <div className="my-2.5">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-950 dark:text-cyan-200 truncate">
                    {formatCur(averageExpatNetLocalCurrency, destinationCountry.currencySymbol)}
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 font-sans ml-1">
                      {destinationCountry.currencyCode}/yr
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>Fx Exchange Rate:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">1 CAD = {destinationCountry.exchangeRateToCAD} {destinationCountry.currencyCode}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Annual funds deposited directly into your foreign bank account
                </div>
              </div>

              {/* Card 3: PPP Purchasing Power Equivalent (THE HERO KPI) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-500/30 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-16 h-16 bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>3. PPP Purchasing Power</span>
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-2xs">
                    {purchasingPowerBoostPercent >= 0 ? `+${purchasingPowerBoostPercent}%` : `${purchasingPowerBoostPercent}%`} Boost
                  </span>
                </div>
                <div className="my-2.5">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-950 dark:text-emerald-100">
                    {formatCur(averagePPPEquivalentCAD)}
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-sans ml-1">CAD Equiv</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 font-semibold flex items-center justify-between">
                    <span>Lifestyle Surplus:</span>
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">
                      +{formatCur(averagePPPEquivalentCAD - averageExpatNetCAD)}/yr
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 pt-2 border-t border-emerald-200/80 dark:border-emerald-500/20 font-medium">
                  What your Canadian dollars actually buy you in {destinationCountry.name} compared to living in Canada
                </div>
              </div>

              {/* Card 4: CRA Part XIII & Departure Tax */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    4. CRA Non-Resident Taxes
                  </span>
                  <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                    <Scale className="w-4 h-4" />
                  </span>
                </div>
                <div className="my-2.5">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50">
                    {formatCur(lifetimePartXIIIWithholdingCAD)}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>Exit Departure Tax:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {departureTaxEstimateCAD === 0 ? '$0 (Exempt)' : formatCur(departureTaxEstimateCAD)}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {destinationCountry.hasTaxTreaty 
                    ? `Treaty capped: ${destinationCountry.treatyRates.rrspPeriodicWithholding}% periodic RRIF, CPP & OAS` 
                    : 'Statutory 25% CRA Part XIII flat withholding'}
                </div>
              </div>

            </div>

            {/* Navigation Tabs for Deep-Dive Sections */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 p-1.5 rounded-xl gap-1 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Executive Insights & Rules</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'ledger'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-700 ring-1 ring-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Expat Simulation Ledger</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                  {destinationCountry.currencyCode}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assets')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'assets'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Asset-by-Asset Non-Resident Treatment</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ppp')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'ppp'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Purchasing Power & Cost of Living</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'checklist'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>CRA Departure Checklist & Visas</span>
              </button>
            </div>

            {/* TAB CONTENT: EXPAT ANNUAL SIMULATION LEDGER & MILESTONE SCHEDULE */}
            {activeTab === 'ledger' && (
              <ExpatMilestoneLedger
                expatResult={expatResult}
                retirementInputs={retirementInputs}
                yearlyResults={yearlyResults}
                summary={summary}
                expatInputs={currentExpatInputs}
              />
            )}

            {/* TAB CONTENT 1: OVERVIEW & INSIGHTS */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-3.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Strategic Cross-Border Takeaways for {destinationCountry.name}</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.map((ins, iIdx) => {
                    const isSuccess = ins.type === 'success';
                    const isWarning = ins.type === 'warning';
                    return (
                      <div
                        key={iIdx}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-2 ${
                          isSuccess
                            ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300'
                            : isWarning
                            ? 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-950 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-bold flex items-center gap-1.5">
                            {isSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : isWarning ? <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" /> : <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                            <span>{ins.title}</span>
                          </h5>
                          <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isSuccess ? 'bg-emerald-200/80 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300' : isWarning ? 'bg-rose-200 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                          }`}>
                            {ins.badge}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-sans">
                          {ins.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Destination Country Lifestyle Profile */}
                <div className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1 border border-cyan-800/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{destinationCountry.flag}</span>
                      <h4 className="font-bold text-white text-sm">
                        {destinationCountry.name} Expat Retirement Snapshot
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                      {destinationCountry.climate} Popular retiree communities include {destinationCountry.popularRetirementTowns.join(', ')}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                      <span className="text-slate-400 block text-[10px]">Visa Program</span>
                      <span className="font-bold text-cyan-300">{destinationCountry.visaProgram.split('(')[0]}</span>
                    </div>
                    <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                      <span className="text-slate-400 block text-[10px]">Cost Index</span>
                      <span className="font-mono font-bold text-emerald-300">{(destinationCountry.costOfLivingIndex * 100).toFixed(0)}% of Canada</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: ASSET-BY-ASSET NON-RESIDENT TREATMENT */}
            {activeTab === 'assets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {/* 1. CPP */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Canada Pension Plan (CPP)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 font-bold">
                        {destinationCountry.treatyRates.cppWithholding}% Withholding
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      CPP benefits earned in Canada continue paying for life worldwide regardless of where you reside. The CRA automatically withholds {destinationCountry.treatyRates.cppWithholding}% under the {destinationCountry.hasTaxTreaty ? 'tax treaty' : 'statutory Part XIII'} and deposits directly into your foreign or Canadian bank account.
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-purple-900 dark:text-purple-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Status: 100% Retained Worldwide
                  </div>
                </div>

                {/* 2. OAS */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-2xs ${
                  qualifiesForLifetimeWorldwideOAS
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80'
                    : 'bg-rose-50/60 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Old Age Security (OAS)</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        qualifiesForLifetimeWorldwideOAS ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                      }`}>
                        {qualifiesForLifetimeWorldwideOAS ? '20-Year Rule Met ✓' : 'At Risk (<20 Yrs)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {oasStatusMessage} Subject to {destinationCountry.treatyRates.oasWithholding}% CRA withholding. Non-residents submit annual Form NR4-OAS to assess Old Age Security Recovery Tax (clawback).
                    </p>
                  </div>
                  <div className={`text-[11px] font-semibold pt-2 border-t ${
                    qualifiesForLifetimeWorldwideOAS ? 'text-emerald-900 dark:text-emerald-300 border-slate-100 dark:border-slate-800' : 'text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-500/20'
                  }`}>
                    {qualifiesForLifetimeWorldwideOAS ? 'Status: Fully Protected Worldwide' : 'Warning: Complete 20 years in Canada before leaving'}
                  </div>
                </div>

                {/* 3. RRSP / RRIF */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>RRSP & RRIF Withdrawals</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">
                        {destinationCountry.treatyRates.rrspPeriodicWithholding}% Periodic
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      RRSPs are exempt from CRA Departure Tax on exit day! When withdrawing in retirement, periodic RRIF / pension payments face a reduced {destinationCountry.treatyRates.rrspPeriodicWithholding}% withholding under treaty (vs 25% for lump sums). You cannot contribute new amounts after leaving.
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Tip: Convert RRSP to RRIF to lock periodic treaty rate
                  </div>
                </div>

                {/* 4. TFSA */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Tax-Free Savings Account (TFSA)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 font-bold">
                        0% CRA Tax
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Withdrawals remain 100% tax-free in Canada with ZERO non-resident withholding. However: (1) no new contribution room accumulates while non-resident (1%/month penalty if contributed), and (2) destination countries (like the US) do not recognize TFSAs as tax-exempt.
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-teal-900 dark:text-teal-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    CRA: 100% Tax-Free • Local Tax: Check Foreign Rules
                  </div>
                </div>

                {/* 5. Non-Registered Investments & Departure Tax */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Non-Reg Investments & Exit Tax</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                        CRA S. 128.1
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Taxable stocks/ETFs are deemed sold at FMV on your departure day (Departure Tax). Estimated tax: {departureTaxEstimateCAD === 0 ? '$0' : formatCur(departureTaxEstimateCAD)}. Once non-resident, Canada does NOT tax non-residents on capital gains from Canadian public securities!
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    After Departure: 0% Canadian Capital Gains Tax
                  </div>
                </div>

                {/* 6. Canadian Real Estate */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Home className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span>Canadian Real Estate</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 font-bold">
                        S.216 / S.116
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Real estate is exempt from Departure Tax upon leaving. If rented, file Form NR6 to elect under Section 216 to pay tax on net rental profit rather than 25% of gross rent. If sold as a non-resident, obtain a Section 116 Certificate to clear withholding.
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-orange-900 dark:text-orange-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {currentExpatInputs.realEstateStrategy === 'sell_before_departure' ? 'Selling Before Departure: 100% Tax-Free PRE' : 'Renting: Section 216 Net Election Recommended'}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT 3: PURCHASING POWER PARITY & BASKET COMPARATOR */}
            {activeTab === 'ppp' && (
              <div className="flex flex-col gap-4">
                <div className="bg-emerald-50/80 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Purchasing Power Parity (PPP) Breakdown: Canada vs {destinationCountry.name}</span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Purchasing power parity measures what standard household goods, healthcare, housing, and dining cost in {destinationCountry.name} compared to Canadian metropolitan averages.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">Relative Cost Index</span>
                    <strong className="text-lg font-mono font-extrabold text-emerald-950 dark:text-emerald-200">
                      {(destinationCountry.costOfLivingIndex * 100).toFixed(0)}% of Canadian Costs
                    </strong>
                  </div>
                </div>

                {/* Basket Comparison Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  
                  {/* Housing */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-2 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Housing / Rent</span>
                    </span>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(destinationCountry.costOfLivingIndex * 100 * 0.9)}%
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans ml-1">of Canada</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      High-end rental or coastal home at major savings
                    </span>
                  </div>

                  {/* Groceries & Food */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-2 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Fresh Groceries</span>
                    </span>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(destinationCountry.costOfLivingIndex * 100 * 0.95)}%
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans ml-1">of Canada</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Fresh produce, seafood & local markets
                    </span>
                  </div>

                  {/* Healthcare */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-2 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Private Healthcare</span>
                    </span>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(destinationCountry.costOfLivingIndex * 100 * 0.75)}%
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans ml-1">of Canada</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {destinationCountry.healthCareNotes.slice(0, 50)}...
                    </span>
                  </div>

                  {/* Dining & Leisure */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-2 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Dining & Leisure</span>
                    </span>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(destinationCountry.costOfLivingIndex * 100 * 0.85)}%
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans ml-1">of Canada</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Frequent restaurant dining, travel & excursions
                    </span>
                  </div>

                  {/* Domestic Services */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-2 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Household Help</span>
                    </span>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(destinationCountry.costOfLivingIndex * 100 * 0.65)}%
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans ml-1">of Canada</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Housekeeping, gardening & personal services
                    </span>
                  </div>

                </div>

                {/* Fine-Tuning Exchange Rate & Cost of Living Sliders */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row gap-4 items-center justify-between text-xs">
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Test Custom Exchange Rate:</span>
                      <strong className="text-cyan-900 dark:text-cyan-300 font-mono">
                        1 CAD = {currentExpatInputs.customExchangeRate || destinationCountry.exchangeRateToCAD} {destinationCountry.currencyCode}
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={Math.round(destinationCountry.exchangeRateToCAD * 0.7 * 10) / 10}
                      max={Math.round(destinationCountry.exchangeRateToCAD * 1.3 * 10) / 10}
                      step={destinationCountry.exchangeRateToCAD > 10 ? 0.5 : 0.02}
                      value={currentExpatInputs.customExchangeRate || destinationCountry.exchangeRateToCAD}
                      onChange={(e) => updateInputs(prev => ({ ...prev, customExchangeRate: Number(e.target.value) }))}
                      className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Test Custom Cost of Living Factor:</span>
                      <strong className="text-emerald-900 dark:text-emerald-300 font-mono">
                        {((currentExpatInputs.customCostOfLivingFactor || destinationCountry.costOfLivingIndex) * 100).toFixed(0)}% of Canada
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0.25}
                      max={1.30}
                      step={0.05}
                      value={currentExpatInputs.customCostOfLivingFactor || destinationCountry.costOfLivingIndex}
                      onChange={(e) => updateInputs(prev => ({ ...prev, customCostOfLivingFactor: Number(e.target.value) }))}
                      className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                  </div>

                  {(currentExpatInputs.customExchangeRate || currentExpatInputs.customCostOfLivingFactor) && (
                    <button
                      type="button"
                      onClick={() => updateInputs(prev => ({ ...prev, customExchangeRate: undefined, customCostOfLivingFactor: undefined }))}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold shrink-0 cursor-pointer"
                    >
                      Reset Defaults
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: CRA DEPARTURE CHECKLIST & VISAS */}
            {activeTab === 'checklist' && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>CRA Non-Resident Departure Action Plan & Statutory Filings</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {checklist.map((item, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {cIdx + 1}
                            </span>
                            <span>{item.title}</span>
                          </h5>
                          {item.formNumber && (
                            <span className="text-[9.5px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {item.formNumber}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Agency: {item.agency}</span>
                        <span className="capitalize font-bold text-cyan-700 dark:text-cyan-400">{item.stage.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
};
