import React, { useState } from 'react';
import { 
  PiggyBank, 
  User, 
  Landmark, 
  TrendingUp, 
  ArrowRightLeft,
  Users,
  Heart,
  Scale,
  Sparkles,
  ShieldCheck,
  Building2,
  Info,
  Briefcase,
  AlertOctagon,
  TrendingDown,
  ArrowDownRight,
  Home,
  DollarSign,
  Key,
  Calculator,
  Percent,
  Receipt,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  CanadianProvince, 
  DrawdownStrategyType, 
  MaritalStatus, 
  RetirementInputs, 
  SpouseInputs,
  RealEstateInputs,
  AccountReturnRates,
  CustomNonRegAccount,
  MonthlyExpenseEstimates
} from '../types/retirement';
import { DEFAULT_SPOUSE_INPUTS, DEFAULT_REAL_ESTATE_INPUTS, DEFAULT_ACCOUNT_RETURNS } from '../utils/presets';
import { PROVINCIAL_BRACKETS } from '../utils/canadianTax';
import { CurrencyInput } from './CurrencyInput';
import { NonRegAccountsManager } from './NonRegAccountsManager';
import { MonthlyExpenseEstimator } from './MonthlyExpenseEstimator';

interface InputPanelProps {
  inputs: RetirementInputs;
  onChange: (inputs: RetirementInputs) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ inputs, onChange }) => {
  const isMarried = inputs.maritalStatus === 'married';
  const [activeTab, setActiveTab] = useState<'personal' | 'expenses' | 'accounts' | 'realestate' | 'spouse' | 'pensions' | 'market' | 'strategy'>('personal');
  const [isExpanded, setIsExpanded] = useState(true);

  const updateField = <K extends keyof RetirementInputs>(field: K, value: RetirementInputs[K]) => {
    onChange({
      ...inputs,
      [field]: value
    });
  };

  const updateRealEstateField = <K extends keyof RealEstateInputs>(field: K, value: RealEstateInputs[K]) => {
    const current = inputs.realEstate || DEFAULT_REAL_ESTATE_INPUTS;
    onChange({
      ...inputs,
      realEstate: {
        ...current,
        [field]: value
      }
    });
  };

  const updateAccountReturn = (field: keyof AccountReturnRates, value: any) => {
    const current = inputs.accountReturns || DEFAULT_ACCOUNT_RETURNS;
    onChange({
      ...inputs,
      accountReturns: {
        ...current,
        [field]: value
      }
    });
  };

  const handleMaritalStatusChange = (status: MaritalStatus) => {
    if (status === 'married') {
      onChange({
        ...inputs,
        maritalStatus: 'married',
        spouse: inputs.spouse || DEFAULT_SPOUSE_INPUTS
      });
      setActiveTab('spouse'); // guide user to spouse inputs
    } else {
      onChange({
        ...inputs,
        maritalStatus: status,
        spouse: undefined
      });
      if (activeTab === 'spouse') {
        setActiveTab('personal');
      }
    }
  };

  const updateSpouseField = <K extends keyof SpouseInputs>(field: K, value: SpouseInputs[K]) => {
    if (!inputs.spouse) return;
    onChange({
      ...inputs,
      spouse: {
        ...inputs.spouse,
        [field]: value
      }
    });
  };

  const formatCur = (val: number) => `$${Math.round(val).toLocaleString()}`;

  const getCppAdjustmentText = (age: number) => {
    if (age === 65) return 'Standard baseline (100%)';
    if (age < 65) {
      const reduction = ((65 - age) * 7.2).toFixed(1);
      return `-${reduction}% permanent reduction`;
    }
    const bonus = ((age - 65) * 8.4).toFixed(1);
    return `+${bonus}% permanent enhancement`;
  };

  const getOasAdjustmentText = (age: number) => {
    if (age === 65) return 'Standard baseline';
    const bonus = ((age - 65) * 7.2).toFixed(1);
    return `+${bonus}% permanent deferral boost`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Marital Status Selector Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {isMarried ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Household Planning Structure
            </span>
            <div className="text-sm font-semibold text-white">
              {isMarried ? 'Couple Retirement Plan (Dual Income & Accounts)' : 'Individual Retirement Plan (Solo)'}
            </div>
          </div>
        </div>

        {/* Controls: Marital Status Segmented Toggle & Collapse/Expand Button */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Marital Status Segmented Toggle */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleMaritalStatusChange('single')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                inputs.maritalStatus !== 'married'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Single / Divorced
            </button>

            <button
              type="button"
              onClick={() => handleMaritalStatusChange('married')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                inputs.maritalStatus === 'married'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Married / Common-Law</span>
            </button>
          </div>

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 transition border border-slate-700/80 font-medium"
            title={isExpanded ? 'Collapse Household Planning Structure' : 'Expand Household Planning Structure'}
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Planning'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsed Summary Bar */}
      {!isExpanded && (
        <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-800">Current Inputs:</span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
              Age <strong className="text-slate-900">{inputs.currentAge}</strong> (Retiring @ <strong className="text-rose-600">{inputs.retirementAge}</strong>)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
              Income: <strong className="text-slate-900">${inputs.currentAnnualIncome.toLocaleString()}/yr</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
              Target Spending: <strong className="text-slate-900">${inputs.targetRetirementSpendingToday.toLocaleString()}/yr</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
              Province: <strong className="text-slate-900">{inputs.province}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 ml-auto"
          >
            <span>Show Full Planning Tabs</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expanded Tabs & Content */}
      {isExpanded && (
        <>
          {/* Tabs Header */}
          <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/70 p-1.5 gap-1 text-xs font-semibold">
            <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'personal'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4 text-blue-600" />
          <span>Primary Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'expenses'
              ? 'bg-rose-50 text-rose-900 shadow-sm border border-rose-200 font-bold ring-1 ring-rose-300'
              : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50/60 font-semibold'
          }`}
        >
          <Receipt className="w-4 h-4 text-rose-600" />
          <span>Living Expenses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'accounts'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PiggyBank className="w-4 h-4 text-emerald-600" />
          <span>Primary Accounts</span>
        </button>

        {/* Real Estate & Home Ownership Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('realestate')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'realestate'
              ? 'bg-amber-50 text-amber-900 shadow-sm border border-amber-200 font-bold ring-1 ring-amber-300'
              : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50/60 font-semibold'
          }`}
        >
          <Home className="w-4 h-4 text-amber-600" />
          <span>Real Estate & Home</span>
          {inputs.realEstate?.ownsHome && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          )}
        </button>

        {/* Spouse Tab - ONLY visible when married */}
        {isMarried && (
          <button
            type="button"
            onClick={() => setActiveTab('spouse')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'spouse'
                ? 'bg-rose-50 text-rose-900 shadow-sm border border-rose-200 font-bold ring-1 ring-rose-300'
                : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50/60 font-semibold'
            }`}
          >
            <Users className="w-4 h-4 text-rose-600" />
            <span>Spouse Details & Accounts</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('pensions')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'pensions'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-4 h-4 text-purple-600" />
          <span>CPP & OAS Pensions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('market')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'market'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>Returns & Inflation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('strategy')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'strategy'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-rose-600" />
          <span>Drawdown Strategy</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6">
        
        {/* TAB 1: PERSONAL & HOUSEHOLD BUDGET */}
        {activeTab === 'personal' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Primary Profile & Career Baseline</h4>
                <p className="text-xs text-slate-500">
                  {isMarried
                    ? 'Your personal timeline, employment earnings trajectory, and career disruption scenarios'
                    : 'Personal timeline, employment earnings trajectory, and career disruption scenarios'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Timeline Assumptions</h5>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Current Age:</span>
                    <span className="text-indigo-600 font-mono font-bold">{inputs.currentAge} years old</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={inputs.retirementAge - 1}
                    value={inputs.currentAge}
                    onChange={(e) => updateField('currentAge', Number(e.target.value))}
                    aria-label="Current Age"
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Life Expectancy:</span>
                    <span className="text-indigo-600 font-mono font-bold">{inputs.lifeExpectancy} years old</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(75, inputs.retirementAge + 5)}
                    max={100}
                    value={inputs.lifeExpectancy}
                    onChange={(e) => updateField('lifeExpectancy', Number(e.target.value))}
                    aria-label="Life Expectancy"
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Longevity horizon (Stats Canada average is 82-87; planning for 90-95 protects against outliving assets).
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isMarried ? 'Your Earnings & Career Trajectory' : 'Earnings & Career Trajectory'}
                </h5>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Annual Employment Income
                  </label>
                  <CurrencyInput
                    value={inputs.currentAnnualIncome}
                    onChange={(val) => updateField('currentAnnualIncome', val)}
                    min={10000}
                    step={5000}
                    aria-label="Your Annual Employment Income"
                  />

                  {/* Wage Trend Slider (supports negative wage decrease / deflation as well as positive growth) */}
                  <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Annual Wage Trajectory:</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        inputs.incomeGrowthRate > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : inputs.incomeGrowthRate < 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inputs.incomeGrowthRate > 0 ? `+${inputs.incomeGrowthRate}% / yr Growth` : inputs.incomeGrowthRate < 0 ? `${inputs.incomeGrowthRate}% / yr Decline` : '0.0% / yr Flat'}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={-5.0}
                      max={8.0}
                      step={0.1}
                      value={inputs.incomeGrowthRate}
                      onChange={(e) => updateField('incomeGrowthRate', Number(e.target.value))}
                      aria-label="Annual Wage Trend"
                      className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>-5% (Wage Erosion)</span>
                      <span>0% (Stagnant)</span>
                      <span>+8% (Strong Growth)</span>
                    </div>
                  </div>

                  {/* Career Disruption / Layoff Simulator Box */}
                  <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-white flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-slate-900">Career Disruption / Layoff Simulator</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(inputs.careerDisruption?.enabled)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateField('careerDisruption', {
                                enabled: true,
                                shockAge: Math.min(inputs.retirementAge - 2, Math.max(inputs.currentAge + 1, 50)),
                                reductionPercent: 25,
                                isTemporary: false,
                                recoveryYears: 2
                              });
                            } else {
                              updateField('careerDisruption', {
                                enabled: false,
                                shockAge: 50,
                                reductionPercent: 25,
                                isTemporary: false,
                                recoveryYears: 2
                              });
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-tight">
                      Test if your retirement plan survives industry disruption, unexpected layoffs, or forced step-downs before retirement.
                    </p>

                    {inputs.careerDisruption?.enabled && (
                      <div className="mt-1 pt-2 border-t border-slate-100 flex flex-col gap-2.5 bg-rose-50/30 p-2.5 rounded-lg border border-rose-100">
                        {/* Shock Age */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-700">Disruption Occurs At:</span>
                            <span className="text-rose-700 font-bold font-mono">Age {inputs.careerDisruption.shockAge}</span>
                          </div>
                          <input
                            type="range"
                            min={inputs.currentAge + 1}
                            max={Math.max(inputs.currentAge + 2, inputs.retirementAge - 1)}
                            step={1}
                            value={inputs.careerDisruption.shockAge}
                            onChange={(e) => updateField('careerDisruption', {
                              ...inputs.careerDisruption!,
                              shockAge: Number(e.target.value)
                            })}
                            className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* Severity Quick Buttons & Slider */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-700">Wage Reduction Severity:</span>
                            <span className="text-rose-700 font-bold font-mono">-{inputs.careerDisruption.reductionPercent}%</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                            {[15, 30, 50].map(pct => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => updateField('careerDisruption', {
                                  ...inputs.careerDisruption!,
                                  reductionPercent: pct
                                })}
                                className={`py-1 rounded text-[10px] font-bold border transition ${
                                  inputs.careerDisruption?.reductionPercent === pct
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                -{pct}% {pct === 15 ? 'Pay Cut' : pct === 30 ? 'Layoff' : 'Step-down'}
                              </button>
                            ))}
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={70}
                            step={5}
                            value={inputs.careerDisruption.reductionPercent}
                            onChange={(e) => updateField('careerDisruption', {
                              ...inputs.careerDisruption!,
                              reductionPercent: Number(e.target.value)
                            })}
                            className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* Disruption Duration */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-100">
                          <span className="text-slate-700 font-medium">Trajectory Impact:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateField('careerDisruption', {
                                ...inputs.careerDisruption!,
                                isTemporary: false
                              })}
                              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition ${
                                !inputs.careerDisruption.isTemporary
                                  ? 'bg-rose-700 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              Permanent Step-Down
                            </button>
                            <button
                              type="button"
                              onClick={() => updateField('careerDisruption', {
                                ...inputs.careerDisruption!,
                                isTemporary: true,
                                recoveryYears: 2
                              })}
                              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition ${
                                inputs.careerDisruption.isTemporary
                                  ? 'bg-rose-700 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              Temporary (2-Yr Rebound)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Next Step Guidance to Living Expenses */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Next Step: Estimate Living Expenses</div>
                  <div className="text-[11px] text-slate-500">
                    Enter your monthly household expenses in today's dollars (rent/mortgage, utilities, credit cards) and adjust post-retirement lifestyle needs.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 self-stretch sm:self-auto justify-center"
              >
                <span>Continue to Living Expenses</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVING EXPENSES & RETIREMENT BUDGET */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isMarried ? 'Household Living Expenses & Retirement Budget' : 'Living Expenses & Retirement Budget'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isMarried
                    ? 'Estimate combined household monthly living costs in today\'s dollars to determine realistic retirement replacement spending.'
                    : 'Estimate your monthly living costs in today\'s dollars to determine realistic retirement replacement spending.'}
                </p>
              </div>
            </div>

            {/* Monthly Living Expenses Estimator Component */}
            <MonthlyExpenseEstimator
              expenses={inputs.monthlyExpenses}
              currentAnnualIncome={inputs.currentAnnualIncome}
              spouseAnnualIncome={inputs.spouse?.annualIncome || 0}
              realEstate={inputs.realEstate}
              targetRetirementSpendingToday={inputs.targetRetirementSpendingToday}
              onUpdateExpenses={(newExpenses) => {
                onChange({
                  ...inputs,
                  monthlyExpenses: newExpenses
                });
              }}
              onUpdateTargetSpending={(newSpending) => {
                onChange({
                  ...inputs,
                  targetRetirementSpendingToday: newSpending
                });
              }}
            />

            {/* Target Retirement Spending Summary / Direct Override */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/90 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="font-bold text-slate-800 block text-xs">
                  {isMarried
                    ? 'Combined Household Retirement Annual Target (Today\'s Dollars)'
                    : 'Personal Retirement Annual Spending Target (Today\'s Dollars)'}
                </label>
                <span className="text-[11px] text-slate-500">
                  Auto-calculated from your monthly living expenses with post-retirement shift applied (or customize manually)
                </span>
              </div>
              <div className="w-full sm:w-48">
                <CurrencyInput
                  value={inputs.targetRetirementSpendingToday}
                  onChange={(val) => updateField('targetRetirementSpendingToday', val)}
                  min={10000}
                  step={2500}
                  aria-label="Target Annual Spending"
                />
              </div>
            </div>

            {/* Navigation Buttons: Previous and Next */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Primary Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Continue to Primary Accounts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PRIMARY ACCOUNTS & CONTRIBUTIONS */}
        {activeTab === 'accounts' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isMarried ? 'Your Personal Registered & Taxable Accounts' : 'Canadian Registered & Taxable Accounts'}
                </h4>
                <p className="text-xs text-slate-500">Your current balances and planned annual savings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* RRSP */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="text-sm font-bold text-slate-900">RRSP</span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                    Tax-Deductible
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.rrspBalance}
                      onChange={(val) => updateField('rrspBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="RRSP Current Balance"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Annual Savings</label>
                    <CurrencyInput
                      value={inputs.rrspAnnualContribution}
                      onChange={(val) => updateField('rrspAnnualContribution', val)}
                      min={0}
                      step={500}
                      aria-label="RRSP Annual Savings"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-blue-800 block mb-1 font-semibold">Expected Return</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={inputs.accountReturns?.rrspReturn ?? 6.5}
                        onChange={(e) => updateAccountReturn('rrspReturn', Number(e.target.value))}
                        className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-blue-700 rounded-lg border border-blue-200 bg-white"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-blue-500 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TFSA */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-slate-900">TFSA</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    100% Tax-Free
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.tfsaBalance}
                      onChange={(val) => updateField('tfsaBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="TFSA Current Balance"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Annual Savings</label>
                    <CurrencyInput
                      value={inputs.tfsaAnnualContribution}
                      onChange={(val) => updateField('tfsaAnnualContribution', val)}
                      min={0}
                      max={15000}
                      step={500}
                      aria-label="TFSA Annual Savings"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-emerald-800 block mb-1 font-semibold">Expected Return</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={inputs.accountReturns?.tfsaReturn ?? 7.0}
                        onChange={(e) => updateAccountReturn('tfsaReturn', Number(e.target.value))}
                        className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-emerald-700 rounded-lg border border-emerald-200 bg-white"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-emerald-600 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FHSA */}
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-sm font-bold text-slate-900">FHSA (First Home Savings Account)</span>
                  </div>
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                    Deductible + Tax-Free
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.fhsaBalance}
                      onChange={(val) => updateField('fhsaBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="FHSA Current Balance"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Annual Savings</label>
                    <CurrencyInput
                      value={inputs.fhsaAnnualContribution}
                      onChange={(val) => updateField('fhsaAnnualContribution', val)}
                      min={0}
                      max={8000}
                      step={500}
                      aria-label="FHSA Annual Savings"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-amber-800 block mb-1 font-semibold">Expected Return</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={inputs.accountReturns?.fhsaReturn ?? 6.0}
                        onChange={(e) => updateAccountReturn('fhsaReturn', Number(e.target.value))}
                        className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-amber-700 rounded-lg border border-amber-200 bg-white"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-amber-600 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Year FHSA Opened & CRA 15-Year Rollover Rules */}
                <div className="pt-2.5 border-t border-amber-200/70 flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-900 block">
                        Year FHSA Account Was Opened
                      </label>
                      <span className="text-[11px] text-slate-500">
                        CRA rules state an FHSA must close after 15 years (or at age 71).
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {[2023, 2024, 2025, 2026].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => updateField('fhsaOpenYear', yr)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition ${
                            (inputs.fhsaOpenYear || 2023) === yr
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated 15-Year Expiry & Rollover Age Card */}
                  {(() => {
                    const openYr = inputs.fhsaOpenYear || 2023;
                    const expiryYr = openYr + 15;
                    const rolloverAge = Math.min(71, inputs.currentAge + (expiryYr - 2026));
                    const isRollover71 = rolloverAge >= 71;
                    const rolloverTarget = isRollover71 ? 'RRIF' : (rolloverAge >= inputs.retirementAge ? 'RRIF / RRSP' : 'RRSP');

                    return (
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-semibold text-amber-950 flex items-center gap-1">
                            <span>⏳</span> 15-Year CRA Participation Window:
                          </span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[11px]">
                            Opened in {openYr} → 15 Yrs Ends in {expiryYr}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-amber-900 leading-snug">
                          {inputs.fhsaIntent === 'home_purchase' ? (
                            <>
                              If not utilized for a home purchase by year <strong>{expiryYr}</strong>, your FHSA balance rolls over at <strong>Age {rolloverAge}</strong> into your <strong>{rolloverTarget}</strong> 100% tax-free!
                            </>
                          ) : (
                            <>
                              After 15 years in <strong>{expiryYr}</strong>, your accumulated FHSA automatically rolls over at <span className="font-extrabold text-amber-950 underline decoration-amber-500 underline-offset-2">Age {rolloverAge}</span> directly into your <strong>{rolloverTarget}</strong> tax-free without reducing any RRSP contribution room.
                            </>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  {/* FHSA Intent Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Account Intent:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField('fhsaIntent', 'rollover_to_rrsp')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          inputs.fhsaIntent !== 'home_purchase'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Rollover to RRSP/RRIF
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('fhsaIntent', 'home_purchase')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          inputs.fhsaIntent === 'home_purchase'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Buy First Home
                      </button>
                    </div>
                  </div>

                  {inputs.fhsaIntent === 'home_purchase' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600">Planned Home Purchase Age:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={inputs.currentAge + 1}
                          max={Math.min(71, inputs.currentAge + ((inputs.fhsaOpenYear || 2023) + 15 - 2026))}
                          value={inputs.fhsaHomePurchaseAge || inputs.currentAge + 3}
                          onChange={(e) => updateField('fhsaHomePurchaseAge', Number(e.target.value))}
                          className="w-24 sm:w-32 h-1.5 bg-slate-200 rounded cursor-pointer accent-amber-600"
                        />
                        <span className="font-mono font-bold text-amber-900 text-xs">
                          Age {inputs.fhsaHomePurchaseAge || inputs.currentAge + 3}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Non-Registered (SA / Taxable) - Unified Bucket with Custom Accounts Support */}
              <NonRegAccountsManager
                accounts={inputs.nonRegCustomAccounts}
                baseBalance={inputs.nonRegBalance}
                baseAnnualContribution={inputs.nonRegAnnualContribution}
                baseReturn={inputs.accountReturns?.nonRegReturn ?? 5.5}
                onUpdate={(newAccounts, totalBal, totalCont, weightedRet) => {
                  onChange({
                    ...inputs,
                    nonRegBalance: totalBal,
                    nonRegAnnualContribution: totalCont,
                    nonRegCustomAccounts: newAccounts,
                    accountReturns: {
                      ...(inputs.accountReturns || DEFAULT_ACCOUNT_RETURNS),
                      nonRegReturn: weightedRet
                    }
                  });
                }}
                onClearToSimple={(fallbackBal, fallbackCont) => {
                  onChange({
                    ...inputs,
                    nonRegBalance: fallbackBal,
                    nonRegAnnualContribution: fallbackCont,
                    nonRegCustomAccounts: []
                  });
                }}
              />

            </div>
          </div>
        )}

        {/* TAB: REAL ESTATE & HOME OWNERSHIP */}
        {activeTab === 'realestate' && (() => {
          const re = inputs.realEstate || DEFAULT_REAL_ESTATE_INPUTS;
          const costOfHome = re.costOfHome || 650000;
          const currentMarketValue = re.currentMarketValue || costOfHome;
          const downPayment = re.downPayment ?? 130000;
          const downPaymentPct = costOfHome > 0 ? Math.round((downPayment / costOfHome) * 100) : 0;
          const mortgageInterestRate = re.mortgageInterestRate ?? 4.79;
          const mortgageTermYears = re.mortgageTermYears ?? 25;
          const mortgageStartYear = re.mortgageStartYear ?? 2021;
          const ownershipSharePercent = re.ownershipSharePercent ?? (isMarried ? 50 : 100);
          const annualAppreciationRate = re.annualAppreciationRate ?? 3.2;
          const planToSellHome = Boolean(re.planToSellHome);
          const sellHomeAge = re.sellHomeAge ?? 72;
          const sellingCostPercent = re.sellingCostPercent ?? 4.5;

          // Financial Amortization calculations
          const initialLoan = Math.max(0, costOfHome - downPayment);
          const semiAnnualRate = (mortgageInterestRate / 100) / 2;
          const monthlyRate = mortgageInterestRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
          const totalMonths = mortgageTermYears * 12;
          const monthlyPayment = (initialLoan > 0 && totalMonths > 0)
            ? (monthlyRate > 0
                ? (initialLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
                : initialLoan / totalMonths)
            : 0;

          const currentCalendarYear = 2026;
          const elapsedMonthsToday = Math.max(0, (currentCalendarYear - mortgageStartYear) * 12);
          const remainingMortgageToday = (initialLoan <= 0 || elapsedMonthsToday >= totalMonths)
            ? 0
            : Math.max(0, initialLoan * Math.pow(1 + monthlyRate, elapsedMonthsToday) - monthlyPayment * ((Math.pow(1 + monthlyRate, elapsedMonthsToday) - 1) / (monthlyRate || 1)));

          const totalEquityToday = Math.max(0, currentMarketValue - remainingMortgageToday);
          const userEquityToday = totalEquityToday * (ownershipSharePercent / 100);

          // Projected sale calculation
          const yearsToSale = Math.max(0, sellHomeAge - inputs.currentAge);
          const projectedValueAtSale = currentMarketValue * Math.pow(1 + annualAppreciationRate / 100, yearsToSale);
          const elapsedMonthsAtSale = Math.max(0, (currentCalendarYear + yearsToSale - mortgageStartYear) * 12);
          const remainingMortgageAtSale = elapsedMonthsAtSale >= totalMonths
            ? 0
            : Math.max(0, initialLoan * Math.pow(1 + monthlyRate, elapsedMonthsAtSale) - monthlyPayment * ((Math.pow(1 + monthlyRate, elapsedMonthsAtSale) - 1) / (monthlyRate || 1)));
          const netProceedsAtSale = Math.max(0, (projectedValueAtSale * (1 - sellingCostPercent / 100)) - remainingMortgageAtSale) * (ownershipSharePercent / 100);

          return (
            <div className="flex flex-col gap-6">
              
              {/* Header & Ownership Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-600" />
                    Canadian Real Estate & Home Equity Asset
                  </h4>
                  <p className="text-xs text-slate-500">
                    Model property valuation, mortgage amortization, ownership share, and future downsizing / sale proceeds
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Homeowner:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => updateRealEstateField('ownsHome', true)}
                      className={`px-3 py-1 rounded-md font-bold transition ${
                        re.ownsHome
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yes (Own Home)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRealEstateField('ownsHome', false)}
                      className={`px-3 py-1 rounded-md font-bold transition ${
                        !re.ownsHome
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      No (Renting)
                    </button>
                  </div>
                </div>
              </div>

              {!re.ownsHome ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-600">
                    <Home className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm">No Real Estate Mode (Renting)</h5>
                  <p className="text-xs text-slate-500 max-w-md">
                    Your net worth and retirement decumulation are 100% modeled through your Canadian registered (RRSP, TFSA, FHSA) and non-registered investment accounts without mortgage payments or property equity.
                  </p>
                  <button
                    type="button"
                    onClick={() => updateRealEstateField('ownsHome', true)}
                    className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100/70 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-200"
                  >
                    + Add Primary Home to Simulation
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">

                  {/* Top Live Real Estate Badge */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-100/30 p-4 rounded-2xl border border-amber-200/80">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Estimated Home Value</span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">${Math.round(currentMarketValue).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 block">Cost: ${costOfHome.toLocaleString()}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Remaining Mortgage</span>
                      <span className="text-lg font-extrabold text-rose-700 font-mono">${Math.round(remainingMortgageToday).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 block">Pmt: ${Math.round(monthlyPayment).toLocaleString()}/mo</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Home Equity</span>
                      <span className="text-lg font-extrabold text-emerald-700 font-mono">${Math.round(totalEquityToday).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 block">{Math.round((totalEquityToday / (currentMarketValue || 1)) * 100)}% equity built</span>
                    </div>

                    <div className="bg-white/80 p-2 rounded-xl border border-amber-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Your Net Share ({ownershipSharePercent}%)</span>
                      <span className="text-lg font-black text-amber-950 font-mono">${Math.round(userEquityToday).toLocaleString()}</span>
                      <span className="text-[10px] font-semibold text-amber-700 block">Added to Net Worth</span>
                    </div>
                  </div>

                  {/* 2-Column Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Property Purchase & Valuation */}
                    <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-amber-600" />
                          Property Cost & Valuation
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Primary Residence
                        </span>
                      </div>

                      {/* Cost of Home */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Original Cost of Home (Purchase Price)
                        </label>
                        <CurrencyInput
                          value={costOfHome}
                          onChange={(val) => updateRealEstateField('costOfHome', val)}
                          min={50000}
                          step={10000}
                          aria-label="Original Cost of Home"
                        />
                      </div>

                      {/* Current Market Value */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Current Estimated Market Value Today
                        </label>
                        <CurrencyInput
                          value={currentMarketValue}
                          onChange={(val) => updateRealEstateField('currentMarketValue', val)}
                          min={50000}
                          step={10000}
                          aria-label="Current Estimated Market Value Today"
                        />
                      </div>

                      {/* Down Payment */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700">Down Payment Paid:</span>
                          <span className="text-amber-700 font-mono font-bold">${downPayment.toLocaleString()} ({downPaymentPct}%)</span>
                        </div>
                        <CurrencyInput
                          value={downPayment}
                          onChange={(val) => updateRealEstateField('downPayment', val)}
                          min={0}
                          max={costOfHome}
                          step={5000}
                          aria-label="Down Payment Paid"
                        />
                      </div>

                      {/* Ownership Share */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700">Your Ownership Share of the Home:</span>
                          <span className="text-amber-800 font-bold font-mono">{ownershipSharePercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={ownershipSharePercent}
                          onChange={(e) => updateRealEstateField('ownershipSharePercent', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-amber-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>50% (Equal Co-owner)</span>
                          <span>100% (Sole Owner)</span>
                        </div>
                      </div>

                      {/* Expected Annual Appreciation */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700">Annual Real Estate Appreciation Rate:</span>
                          <span className="text-emerald-700 font-bold font-mono">{annualAppreciationRate}% / yr</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={7.0}
                          step={0.1}
                          value={annualAppreciationRate}
                          onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Mortgage Terms & Amortization */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-slate-700" />
                          Mortgage Terms & Amortization
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          Initial Loan: ${initialLoan.toLocaleString()}
                        </span>
                      </div>

                      {/* Mortgage Interest Rate */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700">Mortgage Interest Rate (Semi-Annual Compounding):</span>
                          <span className="text-rose-700 font-bold font-mono">{mortgageInterestRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={2.0}
                          max={9.0}
                          step={0.05}
                          value={mortgageInterestRate}
                          onChange={(e) => updateRealEstateField('mortgageInterestRate', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-rose-600"
                        />
                      </div>

                      {/* Mortgage Amortization Term */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700">Amortization Term:</span>
                          <span className="text-blue-700 font-bold font-mono">{mortgageTermYears} Years</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                          {[15, 20, 25, 30].map(term => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => updateRealEstateField('mortgageTermYears', term)}
                              className={`py-1 text-[11px] font-bold rounded-lg border transition ${
                                mortgageTermYears === term
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {term} yrs
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Year Mortgage Started */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700">Year Mortgage Started:</span>
                          <span className="text-slate-900 font-bold font-mono">{mortgageStartYear} ({currentCalendarYear - mortgageStartYear} yrs elapsed)</span>
                        </div>
                        <input
                          type="range"
                          min={2005}
                          max={2026}
                          step={1}
                          value={mortgageStartYear}
                          onChange={(e) => updateRealEstateField('mortgageStartYear', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-slate-800"
                        />
                      </div>

                      {/* Monthly Payment Summary Box */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Estimated Monthly Payment</span>
                          <span className="text-sm font-bold text-slate-900 font-mono">${Math.round(monthlyPayment).toLocaleString()} / mo</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block">Mortgage-Free By</span>
                          <span className="text-xs font-bold text-emerald-700 font-mono">
                            Year {mortgageStartYear + mortgageTermYears} (Age {inputs.currentAge + (mortgageStartYear + mortgageTermYears - currentCalendarYear)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disposition / Downsizing / Sale Section */}
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        <span className="text-sm font-bold text-slate-900">
                          Home Disposition & Downsizing Strategy (Backup Asset Liquidation)
                        </span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-xs font-semibold text-indigo-900 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={planToSellHome}
                          onChange={(e) => updateRealEstateField('planToSellHome', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Plan to sell / downsize home</span>
                      </label>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Choose whether you plan to sell your home at a target retirement age. Under the Canada Revenue Agency’s <strong>Principal Residence Exemption (PRE)</strong>, 100% of your capital gain is completely tax-free. When sold, your share of net proceeds is automatically deposited into your <strong>Taxable Non-Registered Account</strong> to compound and fund living expenses.
                    </p>

                    {planToSellHome && (
                      <div className="pt-3 border-t border-indigo-100 flex flex-col gap-3 bg-white p-3.5 rounded-xl border border-indigo-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-700">Planned Age at Sale:</span>
                              <span className="text-indigo-700 font-bold font-mono">Age {sellHomeAge}</span>
                            </div>
                            <input
                              type="range"
                              min={inputs.currentAge + 1}
                              max={inputs.lifeExpectancy - 1}
                              step={1}
                              value={sellHomeAge}
                              onChange={(e) => updateRealEstateField('sellHomeAge', Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                            />
                            <span className="text-[10px] text-slate-400">
                              Occurs {sellHomeAge >= inputs.retirementAge ? `${sellHomeAge - inputs.retirementAge} yrs into retirement` : `${inputs.retirementAge - sellHomeAge} yrs before retirement`}
                            </span>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-700">Selling & Legal Closing Friction:</span>
                              <span className="text-slate-800 font-bold font-mono">{sellingCostPercent}%</span>
                            </div>
                            <input
                              type="range"
                              min={2.0}
                              max={7.0}
                              step={0.5}
                              value={sellingCostPercent}
                              onChange={(e) => updateRealEstateField('sellingCostPercent', Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-slate-700"
                            />
                            <span className="text-[10px] text-slate-400">Realtor commissions, legal fees, and title transfers</span>
                          </div>
                        </div>

                        {/* Projected Proceeds Card */}
                        <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-emerald-950 block">
                              🎉 Projected Net Equity Inflow at Age {sellHomeAge}:
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              Estimated property value of ${Math.round(projectedValueAtSale).toLocaleString()} with ${Math.round(remainingMortgageAtSale).toLocaleString()} mortgage remaining.
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-emerald-800 font-mono">
                              +${Math.round(netProceedsAtSale).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 block">
                              Deposited to Taxable Account
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          );
        })()}

        {/* TAB 3: SPOUSE DETAILS & ACCOUNTS - ONLY RENDERED WHEN MARRIED */}
        {isMarried && inputs.spouse && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  Spouse Profile & Separate Registered Accounts
                </h4>
                <p className="text-xs text-slate-500">
                  In Canada, each spouse maintains their own individual RRSP room, TFSA limit, CPP pension, and OAS clawback threshold.
                </p>
              </div>

              {/* Pension Income Splitting Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-900">
                <input
                  type="checkbox"
                  checked={inputs.spouse.pensionIncomeSplitting}
                  onChange={(e) => updateSpouseField('pensionIncomeSplitting', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>CRA Pension Income Splitting (Age 65+)</span>
              </label>
            </div>

            {/* Spouse Career & Ages */}
            <div className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Spouse Name / Label</label>
                <input
                  type="text"
                  value={inputs.spouse.name}
                  onChange={(e) => updateSpouseField('name', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Current Age</label>
                <input
                  type="number"
                  min={18}
                  max={inputs.spouse.retirementAge - 1}
                  value={inputs.spouse.currentAge}
                  onChange={(e) => updateSpouseField('currentAge', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Target Retirement Age</label>
                <input
                  type="number"
                  min={Math.max(45, inputs.spouse.currentAge + 1)}
                  max={75}
                  value={inputs.spouse.retirementAge}
                  onChange={(e) => updateSpouseField('retirementAge', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Annual Employment Income</label>
                <CurrencyInput
                  value={inputs.spouse.annualIncome}
                  onChange={(val) => updateSpouseField('annualIncome', val)}
                  min={0}
                  step={5000}
                  aria-label="Spouse Annual Employment Income"
                />
                <div className="flex items-center justify-between gap-1 mt-1 text-[10.5px]">
                  <span className="text-slate-500">Wage Trend:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={-5.0}
                      max={8.0}
                      step={0.1}
                      value={inputs.spouse.incomeGrowthRate}
                      onChange={(e) => updateSpouseField('incomeGrowthRate', Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 text-xs font-mono border border-slate-200 rounded text-right font-medium"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spouse Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Spouse RRSP */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Spouse RRSP</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Deductible</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.rrspBalance}
                      onChange={(val) => updateSpouseField('rrspBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="Spouse RRSP Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Annual Contrib</label>
                    <CurrencyInput
                      value={inputs.spouse.rrspAnnualContribution}
                      onChange={(val) => updateSpouseField('rrspAnnualContribution', val)}
                      min={0}
                      step={500}
                      aria-label="Spouse RRSP Annual Contribution"
                    />
                  </div>
                </div>
              </div>

              {/* Spouse TFSA */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Spouse TFSA</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">100% Tax-Free</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.tfsaBalance}
                      onChange={(val) => updateSpouseField('tfsaBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="Spouse TFSA Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Annual Contrib</label>
                    <CurrencyInput
                      value={inputs.spouse.tfsaAnnualContribution}
                      onChange={(val) => updateSpouseField('tfsaAnnualContribution', val)}
                      min={0}
                      max={15000}
                      step={500}
                      aria-label="Spouse TFSA Annual Contribution"
                    />
                  </div>
                </div>
              </div>

              {/* Spouse FHSA */}
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Spouse FHSA</span>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Home / RRSP Roll</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.fhsaBalance}
                      onChange={(val) => updateSpouseField('fhsaBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="Spouse FHSA Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Annual Contrib</label>
                    <CurrencyInput
                      value={inputs.spouse.fhsaAnnualContribution}
                      onChange={(val) => updateSpouseField('fhsaAnnualContribution', val)}
                      min={0}
                      max={8000}
                      step={500}
                      aria-label="Spouse FHSA Annual Contribution"
                    />
                  </div>
                </div>

                {/* Spouse Year FHSA Opened & 15-yr Rollover */}
                <div className="pt-2 border-t border-amber-200/60 flex flex-col gap-2 bg-white/90 p-2.5 rounded-lg border border-amber-200/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">Year Opened:</span>
                    <div className="flex items-center gap-1">
                      {[2023, 2024, 2025, 2026].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => updateSpouseField('fhsaOpenYear', yr)}
                          className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded border transition ${
                            (inputs.spouse?.fhsaOpenYear || 2023) === yr
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const spOpenYr = inputs.spouse?.fhsaOpenYear || 2023;
                    const spExpiryYr = spOpenYr + 15;
                    const spRolloverAge = Math.min(71, (inputs.spouse?.currentAge || 40) + (spExpiryYr - 2026));
                    const spTarget = spRolloverAge >= 71 ? 'RRIF' : (spRolloverAge >= (inputs.spouse?.retirementAge || 65) ? 'RRIF / RRSP' : 'RRSP');
                    return (
                      <span className="text-[11px] text-amber-900 leading-tight">
                        CRA 15-yr limit in <strong>{spExpiryYr}</strong> → rolls over into spouse's <strong>{spTarget}</strong> at <span className="font-bold underline decoration-amber-500">Age {spRolloverAge}</span>.
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Spouse Non-Reg */}
              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Spouse Non-Reg (SA)</span>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Taxable</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.nonRegBalance}
                      onChange={(val) => updateSpouseField('nonRegBalance', val)}
                      min={0}
                      step={2000}
                      aria-label="Spouse Non-Registered Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Annual Contrib</label>
                    <CurrencyInput
                      value={inputs.spouse.nonRegAnnualContribution}
                      onChange={(val) => updateSpouseField('nonRegAnnualContribution', val)}
                      min={0}
                      step={1000}
                      aria-label="Spouse Non-Registered Annual Contribution"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Spouse CPP & OAS parameters */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Spouse CPP Start Age:</span>
                  <span className="text-blue-700 font-bold">{inputs.spouse.cppStartAge} yrs</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={70}
                  value={inputs.spouse.cppStartAge}
                  onChange={(e) => updateSpouseField('cppStartAge', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Spouse OAS Start Age:</span>
                  <span className="text-sky-700 font-bold">{inputs.spouse.oasStartAge} yrs</span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={70}
                  value={inputs.spouse.oasStartAge}
                  onChange={(e) => updateSpouseField('oasStartAge', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-sky-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CPP & OAS PENSIONS (PRIMARY) */}
        {activeTab === 'pensions' && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                {isMarried ? 'Your Personal Government Pensions' : 'Government Assistance & Public Pensions'}
              </h4>
              <p className="text-xs text-slate-500">
                Canada Pension Plan (CPP) and Old Age Security (OAS) timing trade-offs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    Canada Pension Plan (CPP)
                  </h5>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Age {inputs.cppStartAge}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">CPP Start Age (60 - 70):</span>
                    <span className="text-blue-700 font-bold">{inputs.cppStartAge} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={70}
                    step={1}
                    value={inputs.cppStartAge}
                    onChange={(e) => updateField('cppStartAge', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
                  />
                  <div className="mt-1 text-[11px] font-semibold text-blue-600">
                    Adjustment: {getCppAdjustmentText(inputs.cppStartAge)}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Career Entitlement:</span>
                    <span className="text-blue-700 font-mono font-bold">{inputs.cppEstimatedPercentOfMax}% of Maximum</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    step={5}
                    value={inputs.cppEstimatedPercentOfMax}
                    onChange={(e) => updateField('cppEstimatedPercentOfMax', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/20 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-sky-950 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-sky-600" />
                    Old Age Security (OAS)
                  </h5>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    Age {inputs.oasStartAge}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">OAS Start Age (65 - 70):</span>
                    <span className="text-sky-700 font-bold">{inputs.oasStartAge} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={65}
                    max={70}
                    step={1}
                    value={inputs.oasStartAge}
                    onChange={(e) => updateField('oasStartAge', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-sky-600"
                  />
                  <div className="mt-1 text-[11px] font-semibold text-sky-600">
                    Adjustment: {getOasAdjustmentText(inputs.oasStartAge)}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Years Lived in Canada:</span>
                    <span className="text-sky-700 font-mono font-bold">{inputs.oasEligibleYearsInCanada} / 40 yrs</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={inputs.oasEligibleYearsInCanada}
                    onChange={(e) => updateField('oasEligibleYearsInCanada', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-sky-600"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: MARKET RETURNS & INFLATION */}
        {activeTab === 'market' && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Economic Parameters & Per-Account Return Rates</h4>
              <p className="text-xs text-slate-500">Configure expected return rates independently for each Canadian account vehicle</p>
            </div>

            {/* Individual Account Returns Grid */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Individual Account Expected Return Rates
                </span>
                <span className="text-[11px] font-semibold text-indigo-700">
                  Independent compounding rates applied directly to each account
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* RRSP */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">RRSP</span>
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Expected:</span>
                    <span className="text-sm font-extrabold text-blue-700 font-mono">
                      {inputs.accountReturns?.rrspReturn ?? 6.5}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={12.0}
                    step={0.1}
                    value={inputs.accountReturns?.rrspReturn ?? 6.5}
                    onChange={(e) => updateAccountReturn('rrspReturn', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
                  />
                </div>

                {/* TFSA */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">TFSA</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Expected:</span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      {inputs.accountReturns?.tfsaReturn ?? 7.0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={12.0}
                    step={0.1}
                    value={inputs.accountReturns?.tfsaReturn ?? 7.0}
                    onChange={(e) => updateAccountReturn('tfsaReturn', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* FHSA */}
                <div className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">FHSA</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Expected:</span>
                    <span className="text-sm font-extrabold text-amber-700 font-mono">
                      {inputs.accountReturns?.fhsaReturn ?? 6.0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={12.0}
                    step={0.1}
                    value={inputs.accountReturns?.fhsaReturn ?? 6.0}
                    onChange={(e) => updateAccountReturn('fhsaReturn', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-amber-600"
                  />
                </div>

                {/* Non-Reg */}
                <div className="p-3 bg-white rounded-xl border border-purple-200 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">Non-Reg</span>
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0 ? 'Blended:' : 'Expected:'}
                    </span>
                    <span className="text-sm font-extrabold text-purple-700 font-mono">
                      {inputs.accountReturns?.nonRegReturn ?? 5.5}%
                    </span>
                  </div>
                  {inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0 ? (
                    <div className="text-[9px] text-purple-800 font-semibold bg-purple-50/80 px-1.5 py-0.5 rounded border border-purple-100 text-center">
                      Calculated from {inputs.nonRegCustomAccounts.length} custom accounts
                    </div>
                  ) : (
                    <input
                      type="range"
                      min={2.0}
                      max={12.0}
                      step={0.1}
                      value={inputs.accountReturns?.nonRegReturn ?? 5.5}
                      onChange={(e) => updateAccountReturn('nonRegReturn', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-purple-600"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Macroeconomic & Tax Friction</h5>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Annual CPI Inflation Rate:</span>
                    <span className="text-rose-700 font-mono font-bold">{inputs.inflationRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    value={inputs.inflationRate}
                    onChange={(e) => updateField('inflationRate', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-rose-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Bank of Canada benchmark target is 2.0%</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Taxable Account Annual Tax Drag:</span>
                    <span className="text-purple-700 font-mono font-bold">{inputs.nonRegYieldTaxRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    value={inputs.nonRegYieldTaxRate}
                    onChange={(e) => updateField('nonRegYieldTaxRate', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-purple-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Estimated annual tax friction on dividend yields and realized capital gains</span>
                </div>
              </div>

              {inputs.realEstate?.ownsHome ? (
                <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Property Appreciation</h5>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-amber-600" />
                        Real Estate Annual Appreciation Rate:
                      </span>
                      <span className="text-amber-700 font-mono font-bold">{inputs.realEstate.annualAppreciationRate}%</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={7.0}
                      step={0.1}
                      value={inputs.realEstate.annualAppreciationRate}
                      onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-amber-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Long-term Canadian residential market appreciation (CREA average ~3.2%)</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 mb-1">Per-Account Compounding Active</p>
                  <p className="text-[11px] leading-relaxed">
                    Each Canadian vehicle (RRSP, TFSA, FHSA, and Non-Reg) compounds year-over-year strictly using its dedicated expected return rate specified above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DRAWDOWN STRATEGY */}
        {activeTab === 'strategy' && (
          <div className="flex flex-col gap-5">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Post-Retirement Drawdown Sequencing</h4>
              <p className="text-xs text-slate-500">
                Choose how {isMarried ? 'household' : 'personal'} assets are liquidated to minimize Canadian taxes
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div
                onClick={() => updateField('drawdownStrategy', 'tax_efficient')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'tax_efficient'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">1. Tax-Efficient Classic</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-indigo-700">Non-Reg first → RRSP/RRIF second → TFSA last.</span>
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'rrsp_meltdown')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'rrsp_meltdown'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">2. RRSP Meltdown</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Bracket Smoothing
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-blue-700">Early RRSP draws before age 71 to fill lower tax brackets.</span>
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'proportional')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'proportional'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">3. Proportional (Pro-Rata)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Balanced
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Withdraws evenly across accounts based on asset weighting.
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'tfsa_first')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'tfsa_first'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">4. TFSA First</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Zero-Tax Early
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Depletes TFSA first to achieve zero tax early in retirement.
                </p>
              </div>

            </div>
          </div>
        )}

          </div>
        </>
      )}
    </div>
  );
};
