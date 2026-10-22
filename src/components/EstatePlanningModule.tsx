import React, { useState, useMemo } from 'react';
import { 
  CanadianProvince, 
  RetirementInputs, 
  YearSimulationResult, 
  SimulationSummary 
} from '../types/retirement';
import { 
  EstatePlanningInputs, 
  EstatePlanResult, 
  KinCategory, 
  NoKinStrategy 
} from '../types/estate';
import { calculateEstatePlan, DEFAULT_ESTATE_INPUTS } from '../utils/estatePlanning';
import { 
  Landmark, 
  Heart, 
  UserX, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  DollarSign, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  FileText, 
  Sparkles, 
  Percent, 
  Building2, 
  Gift, 
  Scale, 
  CheckCircle2, 
  Flame, 
  Briefcase, 
  Home, 
  Info,
  Calendar,
  Lock,
  Unlock,
  Sliders,
  Send,
  Loader2,
  X,
  Bot
} from 'lucide-react';

import { useSimulationStore } from '../store/useSimulationStore';

export interface EstatePlanningModuleProps {
  retirementInputs?: RetirementInputs;
  yearlyResults?: YearSimulationResult[];
  summary?: SimulationSummary;
}

export const EstatePlanningModule: React.FC<EstatePlanningModuleProps> = (props) => {
  const storeInputs = useSimulationStore((state) => state.inputs);
  const storeYearlyResults = useSimulationStore((state) => state.yearlyResults);
  const storeSummary = useSimulationStore((state) => state.summary);

  const retirementInputs = props.retirementInputs ?? storeInputs;
  const yearlyResults = props.yearlyResults ?? storeYearlyResults;
  const summary = props.summary ?? storeSummary;
  const [estateInputs, setEstateInputs] = useState<EstatePlanningInputs>({
    ...DEFAULT_ESTATE_INPUTS,
    passingAge: retirementInputs.lifeExpectancy || 85,
    hasNextOfKin: retirementInputs.maritalStatus === 'married' || Boolean(retirementInputs.spouse),
    kinCategory: retirementInputs.maritalStatus === 'married' ? 'spouse' : 'children'
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Calculate Estate Plan
  const estateResult: EstatePlanResult = useMemo(() => {
    return calculateEstatePlan(estateInputs, retirementInputs, yearlyResults);
  }, [estateInputs, retirementInputs, yearlyResults]);

  const { reserves, taxAndFees, distributions, keyStrategies } = estateResult;

  const formatCur = (val: number) => {
    if (val === 0) return '$0';
    return `$${Math.round(val).toLocaleString()}`;
  };

  const handlePassingAgeChange = (newAge: number) => {
    setEstateInputs(prev => ({
      ...prev,
      passingAge: newAge
    }));
  };

  const handleNextOfKinToggle = (hasKin: boolean) => {
    setEstateInputs(prev => ({
      ...prev,
      hasNextOfKin: hasKin,
      kinCategory: hasKin ? (retirementInputs.maritalStatus === 'married' ? 'spouse' : 'children') : prev.kinCategory
    }));
  };

  const handleKinCategoryChange = (cat: KinCategory) => {
    setEstateInputs(prev => ({
      ...prev,
      kinCategory: cat,
      charityShareWithKinPercent: cat === 'family_charity_split' ? 20 : 0
    }));
  };

  const handleNoKinStrategyChange = (strat: NoKinStrategy) => {
    let charityPct = 70;
    let friendsPct = 20;
    let endowmentPct = 10;

    if (strat === 'charitable_legacy') {
      charityPct = 90;
      friendsPct = 10;
      endowmentPct = 0;
    } else if (strat === 'named_friends_heirs') {
      charityPct = 20;
      friendsPct = 80;
      endowmentPct = 0;
    } else if (strat === 'endowment_daf') {
      charityPct = 20;
      friendsPct = 10;
      endowmentPct = 70;
    } else if (strat === 'balanced_legacy') {
      charityPct = 50;
      friendsPct = 30;
      endowmentPct = 20;
    }

    setEstateInputs(prev => ({
      ...prev,
      noKinStrategy: strat,
      charityAllocationPercent: charityPct,
      namedFriendsAllocationPercent: friendsPct,
      endowmentAllocationPercent: endowmentPct
    }));
  };

  const handleAskEstateAi = async (customQ?: string) => {
    const q = (customQ || aiQuestion).trim();
    if (!q) return;

    setIsLoadingAi(true);
    setAiAnswer(null);

    try {
      const res = await fetch('/api/explain-ledger-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Estate planning query: ${q}. Deceased age ${estateInputs.passingAge}, Total Estate $${reserves.totalGrossEstate}, Province ${retirementInputs.province}, Next of Kin: ${estateInputs.hasNextOfKin ? 'Yes' : 'No'}.`,
          selectedAge: estateInputs.passingAge,
          selectedMetric: 'Estate Planning',
          rowData: {
            age: estateInputs.passingAge,
            totalNetWorth: reserves.totalGrossEstate,
            rrspBalance: reserves.rrspBalance,
            tfsaBalance: reserves.tfsaBalance,
            nonRegBalance: reserves.nonRegBalance,
            homeEquity: reserves.homeEquity
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
        setAiAnswer('Canadian Estate Analysis: The estate will be liquidated and distributed according to the selected succession rules and CRA deemed disposition guidelines.');
      }
    } catch (err: any) {
      setAiAnswer(`Canadian Estate Planning Standard: At Age ${estateInputs.passingAge}, the $${Math.round(reserves.totalGrossEstate).toLocaleString()} gross estate is liquidated by settling CRA terminal T1 liabilities ($${Math.round(taxAndFees.netIncomeTaxAfterCredits).toLocaleString()}) and provincial probate ($${Math.round(taxAndFees.probateFee).toLocaleString()}), leaving $${Math.round(taxAndFees.netEstateRemaining).toLocaleString()} for ${estateInputs.hasNextOfKin ? 'family beneficiaries' : 'charitable and designated legacy bequests'}.`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div id="estate-planning-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition duration-200">
      
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Landmark className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-tight">
                  Canadian Estate Planning & Pending Reserves Liquidation
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CRA Deemed Disposition & Succession
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Model how your accumulated wealth and pending reserves at death are taxed, liquidated, and distributed under Canadian law
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs border ${
              isAiOpen
                ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white border-transparent ring-2 ring-indigo-400/40'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Ask Estate AI</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex items-center gap-2">
            <span className="text-slate-400">Estate Net Worth:</span>
            <strong className="font-mono text-emerald-300 font-bold">{formatCur(reserves.totalGrossEstate)}</strong>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse Estate Planning section' : 'Expand Estate Planning section'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/25 transition cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-200" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-slate-200" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Summary Strip (shown only when section is collapsed) */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100/90 border-t border-slate-200 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-600 font-medium">Simulated Passing:</span>
              <strong className="text-slate-900 font-bold font-mono">Age {estateInputs.passingAge}</strong>
              <span className="text-slate-400 text-[11px]">(Yr {reserves.passingYear})</span>
            </div>
            <div className="h-3.5 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-600 font-medium">Gross Estate: </span>
              <strong className="text-indigo-950 font-bold font-mono">{formatCur(reserves.totalGrossEstate)}</strong>
            </div>
            <div className="h-3.5 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-600 font-medium">Est. CRA Terminal Tax: </span>
              <strong className="text-rose-600 font-bold font-mono">{formatCur(taxAndFees.netIncomeTaxAfterCredits)}</strong>
            </div>
            <div className="h-3.5 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-600 font-medium">Net to Beneficiaries: </span>
              <strong className="text-emerald-700 font-bold font-mono">{formatCur(taxAndFees.netEstateRemaining)}</strong>
            </div>
            <div className="h-3.5 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-600 font-medium">Plan: </span>
              <span className="text-indigo-900 font-semibold">
                {estateInputs.hasNextOfKin
                  ? `Next of Kin (${estateInputs.kinCategory === 'spouse' ? 'Spouse' : estateInputs.kinCategory === 'children' ? 'Children' : 'Extended'})`
                  : `No Kin (${estateInputs.noKinStrategy})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold text-xs shrink-0 self-end md:self-center">
            <span>Expand Plan & Controls</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Expanded Content Body */}
      {isExpanded && (
        <>
          {/* 2. AI Estate Explainer Drawer */}
      {isAiOpen && (
        <div className="bg-indigo-950 text-white p-4 border-b border-indigo-900/60 flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>AI Canadian Estate Legal & Tax Analyst:</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                const q = 'How does the CRA deemed disposition tax my RRSP and investments at death?';
                setAiQuestion(q);
                handleAskEstateAi(q);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50"
            >
              CRA Deemed Disposition Rules
            </button>
            <button
              type="button"
              onClick={() => {
                const q = 'How does a spousal rollover (CRA s. 70(6)) eliminate immediate taxes at death?';
                setAiQuestion(q);
                handleAskEstateAi(q);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50"
            >
              Spousal Rollover Savings
            </button>
            <button
              type="button"
              onClick={() => {
                const q = 'If I have no next of kin, how can charitable bequests eliminate my estate taxes?';
                setAiQuestion(q);
                handleAskEstateAi(q);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50"
            >
              No Next-of-Kin Tax Strategy
            </button>
            <button
              type="button"
              onClick={() => {
                const q = 'What is the Escheats Act in Canada if someone dies without a will or relatives?';
                setAiQuestion(q);
                handleAskEstateAi(q);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50"
            >
              Escheat to Crown Warning
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask any estate planning question (e.g. 'How can I avoid probate fees in Ontario?')"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoadingAi && handleAskEstateAi()}
              className="flex-1 bg-slate-900 border border-indigo-800/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => handleAskEstateAi()}
              disabled={isLoadingAi || !aiQuestion.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {isLoadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Ask</span>
            </button>
          </div>

          {aiAnswer && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-800/60 text-xs text-slate-200 leading-relaxed font-sans">
              {aiAnswer}
            </div>
          )}
        </div>
      )}

      {/* 3. Core Simulator Dashboard */}
      <div className="p-4 sm:p-5 flex flex-col gap-6">
        
        {/* Row A: Passing Age Simulator Slider & Reserves Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Simulated Passing Age:</span>
                <strong className="text-indigo-900 font-bold font-mono text-sm ml-1">
                  Age {estateInputs.passingAge}
                </strong>
                <span className="text-[11px] text-slate-500">
                  (Year {reserves.passingYear})
                </span>
              </span>
              <span className="text-[11px] text-slate-500">
                Life Expectancy: Age {retirementInputs.lifeExpectancy}
              </span>
            </div>

            <input
              type="range"
              min={yearlyResults[0].age}
              max={yearlyResults[yearlyResults.length - 1].age}
              step={1}
              value={estateInputs.passingAge}
              onChange={(e) => handlePassingAgeChange(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Start (Age {yearlyResults[0].age})</span>
              <span>Retire (Age {retirementInputs.retirementAge})</span>
              <span>Max (Age {yearlyResults[yearlyResults.length - 1].age})</span>
            </div>
          </div>

          {/* Pending Reserves Snapshot Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-left">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">RRSP/RRIF</span>
              <strong className="text-xs font-mono font-bold text-blue-700">{formatCur(reserves.rrspBalance)}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-left">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">TFSA</span>
              <strong className="text-xs font-mono font-bold text-emerald-700">{formatCur(reserves.tfsaBalance)}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-left">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Non-Reg</span>
              <strong className="text-xs font-mono font-bold text-purple-700">{formatCur(reserves.nonRegBalance)}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-left">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Home Equity</span>
              <strong className="text-xs font-mono font-bold text-orange-700">{formatCur(reserves.homeEquity)}</strong>
            </div>
            <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 shadow-2xs text-left">
              <span className="text-[10px] text-indigo-700 uppercase font-semibold block">Total Reserves</span>
              <strong className="text-xs font-mono font-extrabold text-indigo-950">{formatCur(reserves.totalGrossEstate)}</strong>
            </div>
          </div>
        </div>

        {/* Row B: Next of Kin vs No Next of Kin Strategic Selector */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>Succession & Beneficiary Status</span>
            </span>
            <span className="text-xs text-slate-500">
              Select your family circumstance to view legal liquidation rules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Option 1: Has Next of Kin */}
            <button
              type="button"
              onClick={() => handleNextOfKinToggle(true)}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 relative ${
                estateInputs.hasNextOfKin
                  ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${
                estateInputs.hasNextOfKin ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    I Have Next of Kin
                  </h4>
                  {estateInputs.hasNextOfKin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      Active Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Surviving spouse, children, or direct family heirs. Access CRA Section 70(6) spousal rollovers, TFSA successor annuitant status, and probate-exempt beneficiary designations.
                </p>
              </div>
            </button>

            {/* Option 2: Does NOT Have Next of Kin */}
            <button
              type="button"
              onClick={() => handleNextOfKinToggle(false)}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 relative ${
                !estateInputs.hasNextOfKin
                  ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${
                !estateInputs.hasNextOfKin ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <UserX className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    I Do NOT Have Next of Kin
                  </h4>
                  {!estateInputs.hasNextOfKin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
                      Active Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  No surviving spouse or direct family. Model philanthropic bequests to eliminate the heavy 53% RRSP terminal tax, gift to chosen friends/caregivers, or fund perpetual endowments.
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* Row C: Dynamic Strategy Controls based on Selection */}
        <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200">
          
          {estateInputs.hasNextOfKin ? (
            /* --- NEXT OF KIN CONTROLS --- */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Next of Kin Liquidation & Rollover Parameters</span>
                </span>
                <span className="text-xs text-slate-500">
                  Province: <strong className="text-slate-800">{retirementInputs.province}</strong>
                </span>
              </div>

              {/* Kin Category Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleKinCategoryChange('spouse')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.kinCategory === 'spouse'
                      ? 'bg-white border-indigo-400 shadow-2xs font-bold text-indigo-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>💍</span>
                    <span>Surviving Spouse</span>
                  </div>
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                    100% spousal rollover of RRSP/RRIF & TFSA
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleKinCategoryChange('children')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.kinCategory === 'children'
                      ? 'bg-white border-indigo-400 shadow-2xs font-bold text-indigo-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>👨‍👩‍👧‍👦</span>
                    <span>Children / Direct Heirs</span>
                  </div>
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Terminal tax paid by estate; net cash to heirs
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleKinCategoryChange('family_charity_split')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.kinCategory === 'family_charity_split'
                      ? 'bg-white border-indigo-400 shadow-2xs font-bold text-indigo-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Family + Charity Split</span>
                  </div>
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Bequest to charity to shield family from tax
                  </p>
                </button>
              </div>

              {/* Toggles & Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                
                {/* Spousal Rollover Toggle (if spouse) */}
                {estateInputs.kinCategory === 'spouse' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>CRA Section 70(6) Spousal Rollover</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Transfers RRSP/RRIF directly to spouse with 0% immediate tax hit
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={estateInputs.spousalRolloverEnabled}
                        onChange={(e) => setEstateInputs(prev => ({ ...prev, spousalRolloverEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                )}

                {/* Direct Beneficiary Designation (Probate Bypass) */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Name Direct Beneficiaries on Accounts</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bypasses provincial probate fees ({retirementInputs.province}) on RRSP & TFSA
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={estateInputs.directBeneficiariesDesignated}
                      onChange={(e) => setEstateInputs(prev => ({ ...prev, directBeneficiariesDesignated: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Real Estate Liquidation on Death */}
                {reserves.homeEquity > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Home className="w-4 h-4 text-orange-600" />
                        <span>Liquidate & Sell Home on Settlement</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Sell property to distribute cash ({estateInputs.realtorAndClosingPercent}% fees) vs in-kind transfer
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={estateInputs.liquidateRealEstateOnDeath}
                        onChange={(e) => setEstateInputs(prev => ({ ...prev, liquidateRealEstateOnDeath: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                )}

                {/* Charity Split Slider (if split) */}
                {estateInputs.kinCategory === 'family_charity_split' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col gap-1.5 md:col-span-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Charitable Bequest Share:</span>
                      </span>
                      <strong className="font-mono text-indigo-600 text-sm font-bold">
                        {estateInputs.charityShareWithKinPercent}% ({formatCur((reserves.totalGrossEstate * estateInputs.charityShareWithKinPercent) / 100)})
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={5}
                      value={estateInputs.charityShareWithKinPercent}
                      onChange={(e) => setEstateInputs(prev => ({ ...prev, charityShareWithKinPercent: Number(e.target.value) }))}
                      className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-500">
                      Family receives {100 - estateInputs.charityShareWithKinPercent}%. Generates a dollar-for-dollar tax credit reducing terminal CRA taxes.
                    </span>
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* --- NO NEXT OF KIN CONTROLS --- */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-600" />
                  <span>No Next-of-Kin Liquidation & Legacy Strategies</span>
                </span>
                <span className="text-xs text-slate-500">
                  Without spouse or heirs, strategic planning avoids heavy 53% terminal tax
                </span>
              </div>

              {/* No-Kin Strategy Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleNoKinStrategyChange('charitable_legacy')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.noKinStrategy === 'charitable_legacy'
                      ? 'bg-white border-emerald-400 shadow-2xs font-bold text-emerald-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>100% Charity Shield</span>
                  </div>
                  <p className="text-[10.5px] font-normal text-slate-500 mt-0.5">
                    Eliminates CRA terminal tax completely
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleNoKinStrategyChange('named_friends_heirs')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.noKinStrategy === 'named_friends_heirs'
                      ? 'bg-white border-indigo-400 shadow-2xs font-bold text-indigo-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>👥</span>
                    <span>Friends & Mentees</span>
                  </div>
                  <p className="text-[10.5px] font-normal text-slate-500 mt-0.5">
                    Bequests to chosen non-relatives
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleNoKinStrategyChange('endowment_daf')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.noKinStrategy === 'endowment_daf'
                      ? 'bg-white border-purple-400 shadow-2xs font-bold text-purple-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>🎓</span>
                    <span>Endowment / DAF</span>
                  </div>
                  <p className="text-[10.5px] font-normal text-slate-500 mt-0.5">
                    Perpetual scholarship / community trust
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleNoKinStrategyChange('balanced_legacy')}
                  className={`p-3 rounded-xl border text-left transition ${
                    estateInputs.noKinStrategy === 'balanced_legacy'
                      ? 'bg-white border-blue-400 shadow-2xs font-bold text-blue-950'
                      : 'bg-slate-100/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>Balanced Legacy</span>
                  </div>
                  <p className="text-[10.5px] font-normal text-slate-500 mt-0.5">
                    50% Charity / 30% Friends / 20% DAF
                  </p>
                </button>
              </div>

              {/* Sliders for No-Kin Percentages */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Custom Liquidation Distribution Split:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Total: {estateInputs.charityAllocationPercent + estateInputs.namedFriendsAllocationPercent + estateInputs.endowmentAllocationPercent}%
                  </span>
                </div>

                {/* Charity Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      <span>Registered Canadian Charities (Generates 53% tax credit):</span>
                    </span>
                    <strong className="font-mono text-emerald-800 font-bold">{estateInputs.charityAllocationPercent}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={estateInputs.charityAllocationPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const rem = 100 - val;
                      setEstateInputs(prev => ({
                        ...prev,
                        charityAllocationPercent: val,
                        namedFriendsAllocationPercent: Math.min(prev.namedFriendsAllocationPercent, rem),
                        endowmentAllocationPercent: Math.max(0, rem - Math.min(prev.namedFriendsAllocationPercent, rem))
                      }));
                    }}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* Friends Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-700 font-semibold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Named Friends, Mentorees & Caregivers:</span>
                    </span>
                    <strong className="font-mono text-indigo-800 font-bold">{estateInputs.namedFriendsAllocationPercent}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100 - estateInputs.charityAllocationPercent}
                    step={5}
                    value={estateInputs.namedFriendsAllocationPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEstateInputs(prev => ({
                        ...prev,
                        namedFriendsAllocationPercent: val,
                        endowmentAllocationPercent: Math.max(0, 100 - prev.charityAllocationPercent - val)
                      }));
                    }}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* Endowment Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-700 font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Testamentary Endowment / Donor-Advised Fund:</span>
                    </span>
                    <strong className="font-mono text-purple-800 font-bold">{estateInputs.endowmentAllocationPercent}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    disabled
                    value={estateInputs.endowmentAllocationPercent}
                    className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg opacity-70"
                  />
                </div>
              </div>

              {/* Valid Will Toggle & Escheat Risk */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>I Have an Active, Legal Canadian Will</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Without a legal will and no next of kin, all estate assets escheat 100% to the Crown by law
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={estateInputs.hasValidWill}
                    onChange={(e) => setEstateInputs(prev => ({ ...prev, hasValidWill: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {!estateInputs.hasValidWill && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-950 flex items-start gap-2.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-rose-900">
                      CRITICAL LEGAL WARNING: Intestate Escheat to Provincial Government
                    </strong>
                    Under Canadian provincial succession laws (e.g. Ontario Escheats Act), when a resident dies intestate with zero legal next-of-kin, 100% of the remaining estate ($
                    {formatCur(taxAndFees.netEstateRemaining)}) forfeits to the provincial Crown. Please draft a legally binding Will or establish a trust.
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Row D: Estate Liquidation & Settlement Waterfall */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Estate Settlement & Liquidation Waterfall</span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Tax Efficiency: {taxAndFees.taxEfficiencyScore}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 1. Gross Reserves */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                1. Gross Reserves at Death
              </span>
              <div className="my-2">
                <div className="text-2xl font-extrabold font-mono text-white">
                  {formatCur(reserves.totalGrossEstate)}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Age {estateInputs.passingAge} portfolio + home equity
                </div>
              </div>
              <span className="text-[10px] text-slate-400">
                100% of accumulated lifetime wealth
              </span>
            </div>

            {/* 2. CRA Terminal T1 Tax */}
            <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
              taxAndFees.netIncomeTaxAfterCredits === 0
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  2. CRA Terminal Tax
                </span>
                {taxAndFees.charitableTaxCredit > 0 && (
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                    Shielded
                  </span>
                )}
              </div>
              <div className="my-2">
                <div className="text-2xl font-extrabold font-mono text-slate-900">
                  {formatCur(taxAndFees.netIncomeTaxAfterCredits)}
                </div>
                <div className="text-[11px] mt-0.5">
                  {taxAndFees.netIncomeTaxAfterCredits === 0 
                    ? '0% Tax (Rollover or Donation Shield)' 
                    : `Before credits: ${formatCur(taxAndFees.totalTerminalIncomeTax)}`}
                </div>
              </div>
              <span className="text-[10px] text-slate-500">
                {taxAndFees.charitableTaxCredit > 0 
                  ? `Saved ${formatCur(taxAndFees.charitableTaxCredit)} via donation credits` 
                  : 'CRA deemed disposition on T1 return'}
              </span>
            </div>

            {/* 3. Provincial Probate & Fees */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  3. Probate & Settlement
                </span>
                {taxAndFees.probateAvoidedByBeneficiaryDesignation > 0 && (
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-600 text-white font-bold">
                    Bypassed
                  </span>
                )}
              </div>
              <div className="my-2">
                <div className="text-2xl font-extrabold font-mono text-slate-900">
                  {formatCur(taxAndFees.probateFee + taxAndFees.closingAndLiquidationCosts + taxAndFees.executorCompensation)}
                </div>
                <div className="text-[11px] mt-0.5 text-amber-900">
                  Probate: {formatCur(taxAndFees.probateFee)} • Admin: {formatCur(taxAndFees.closingAndLiquidationCosts + taxAndFees.executorCompensation)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500">
                {taxAndFees.probateAvoidedByBeneficiaryDesignation > 0 
                  ? `Avoided ${formatCur(taxAndFees.probateAvoidedByBeneficiaryDesignation)} probate via beneficiary naming` 
                  : `${retirementInputs.province} court tariffs`}
              </span>
            </div>

            {/* 4. Final Net Liquidated Estate */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
                4. Net Estate for Distribution
              </span>
              <div className="my-2">
                <div className="text-2xl font-extrabold font-mono text-indigo-950">
                  {formatCur(taxAndFees.netEstateRemaining)}
                </div>
                <div className="text-[11px] text-indigo-700 mt-0.5 font-medium">
                  {((taxAndFees.netEstateRemaining / (reserves.totalGrossEstate || 1)) * 100).toFixed(1)}% of gross wealth preserved
                </div>
              </div>
              <span className="text-[10px] text-indigo-600">
                Delivered 100% clean of debt & tax
              </span>
            </div>

          </div>
        </div>

        {/* Row E: Distribution Schedule Table */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-indigo-600" />
            <span>Liquidated Estate Beneficiary Distribution Breakdown</span>
          </span>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Beneficiary / Recipient</th>
                  <th className="py-2.5 px-3 text-right">Amount ($)</th>
                  <th className="py-2.5 px-3 text-right">% of Gross</th>
                  <th className="py-2.5 px-3 text-right">% of Net</th>
                  <th className="py-2.5 px-3">Tax & Legal Status</th>
                  <th className="py-2.5 px-3">Notes & Succession Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {distributions.map((item) => {
                  const isTax = item.category === 'taxes';
                  const isProbate = item.category === 'probate';
                  const isCrown = item.category === 'crown';
                  const isCharity = item.category === 'charity';
                  const isSpouse = item.category === 'spouse';

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCrown 
                          ? 'bg-rose-100/70 font-semibold text-rose-950' 
                          : isTax 
                          ? 'bg-rose-50/40 text-rose-900' 
                          : isCharity 
                          ? 'bg-emerald-50/40 text-emerald-950'
                          : isSpouse
                          ? 'bg-indigo-50/40 text-indigo-950 font-semibold'
                          : 'bg-white text-slate-800'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans font-bold flex items-center gap-1.5">
                        <span>
                          {isCrown ? '⚠️' : isTax ? '🏛️' : isProbate ? '⚖️' : isCharity ? '🎁' : isSpouse ? '💍' : '👤'}
                        </span>
                        <span>{item.recipient}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold">
                        {formatCur(item.amount)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium">
                        {item.percentOfGross.toFixed(1)}%
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium">
                        {item.percentOfNet > 0 ? `${item.percentOfNet.toFixed(1)}%` : '-'}
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isCrown
                            ? 'bg-rose-200 text-rose-900 border border-rose-300'
                            : isTax
                            ? 'bg-rose-100 text-rose-800'
                            : isCharity
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {item.taxStatus}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-sans text-[11px] text-slate-600">
                        {item.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row F: Strategic Estate Recommendations & Insights */}
        <div className="flex flex-col gap-2.5 pt-1">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Canadian Estate Optimization Insights</span>
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keyStrategies.map((strat, sIdx) => {
              const isSuccess = strat.type === 'success';
              const isWarning = strat.type === 'warning';

              return (
                <div 
                  key={sIdx}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                    isSuccess
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : isWarning
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold flex items-center gap-1.5">
                      {isSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                      <span>{strat.title}</span>
                    </h5>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                      isSuccess ? 'bg-emerald-200/80 text-emerald-900' : isWarning ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {strat.badge}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 font-sans">
                    {strat.description}
                  </p>

                  {strat.taxSavedOrBenefit > 0 && (
                    <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 pt-1 border-t border-emerald-100">
                      <span>Quantified Benefit:</span>
                      <strong className="font-mono font-bold text-emerald-900">+{formatCur(strat.taxSavedOrBenefit)}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
        </>
      )}

    </div>
  );
};
