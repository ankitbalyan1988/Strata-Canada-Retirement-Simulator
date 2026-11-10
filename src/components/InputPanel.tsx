import React, { useState, useMemo, useEffect, startTransition } from 'react';
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
  AlertTriangle,
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
  ChevronUp,
  Calendar,
  CheckCircle2,
  Globe,
  Plane,
  CreditCard,
  FileText,
  Check,
  Minus,
  Plus
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
  MonthlyExpenseEstimates,
  CppCalculationMethod,
  EmployerMatchConfig
} from '../types/retirement';
import { ExpatInputs } from '../types/expat';
import { DEFAULT_SPOUSE_INPUTS, DEFAULT_REAL_ESTATE_INPUTS, DEFAULT_ACCOUNT_RETURNS } from '../utils/presets';
import { EXPAT_DESTINATIONS, DEFAULT_EXPAT_INPUTS } from '../utils/expatCountries';
import { PROVINCIAL_BRACKETS } from '../utils/canadianTax';
import { calculateAdjustedServiceCanadaCpp, getCppTimingFactor } from '../utils/cppCalculator';
import { calculateEmployerRrspMatch } from '../utils/employerMatch';
import { CurrencyInput } from './CurrencyInput';
import { NonRegAccountsManager } from './NonRegAccountsManager';
import { MonthlyExpenseEstimator } from './MonthlyExpenseEstimator';
import { DebtsManager } from './DebtsManager';
import { CashFlowContributionStressTest } from './CashFlowContributionStressTest';
import { RealtorHomeCostCard } from './RealtorHomeCostCard';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';

export interface InputPanelProps {
  inputs?: RetirementInputs;
  onChange?: React.Dispatch<React.SetStateAction<RetirementInputs>> | ((inputs: RetirementInputs) => void);
}

export const InputPanel: React.FC<InputPanelProps> = (props) => {
  const storeInputs = useSimulationStore(useShallow((state) => state.inputs));
  const storeSetInputs = useSimulationStore((state) => state.setInputs);
  const isPlanningCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.planning));
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const setSectionCollapse = useSimulationStore((state) => state.setSectionCollapse);

  const inputs = props.inputs ?? storeInputs;
  const onChange = props.onChange ?? storeSetInputs;
  const isMarried = inputs.maritalStatus === 'married';
  const activeTab = useSimulationStore((state) => state.activeInputTab);
  const setActiveTab = useSimulationStore((state) => state.setActiveInputTab);
  const isExpanded = !isPlanningCollapsed;
  const setIsExpanded = (expanded: boolean | ((prev: boolean) => boolean)) => {
    if (typeof expanded === 'function') {
      toggleSectionCollapse('planning');
    } else {
      setSectionCollapse('planning', !expanded);
    }
  };
  const [expatRegionFilter, setExpatRegionFilter] = useState<'all' | 'Europe' | 'Americas' | 'Asia-Pacific' | 'Caribbean'>('all');

  // Conditional flow qualifiers
  const hasDebts = inputs.hasOngoingOrFutureDebts ?? Boolean(inputs.debts && inputs.debts.length > 0);

  const housingStatus: 'own' | 'rent' = inputs.housingStatus ?? (
    inputs.realEstate?.ownsHome && inputs.realEstate?.purchaseType !== 'future'
      ? 'own'
      : (inputs.realEstate?.purchaseType === 'future' ? 'rent' : (inputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
  );

  const planFutureHomePurchase: boolean = inputs.planFutureHomePurchase ?? Boolean(
    inputs.realEstate?.ownsHome && inputs.realEstate?.purchaseType === 'future'
  );

  const showRealEstateSection = housingStatus === 'own' || (housingStatus === 'rent' && planFutureHomePurchase);

  const planExpatExit: boolean = inputs.planExpatExit ?? Boolean(inputs.expat?.planToEmigrate);

  useEffect(() => {
    if (activeTab === 'debts' && !hasDebts) {
      setActiveTab('personal');
    } else if (activeTab === 'realestate' && !showRealEstateSection) {
      setActiveTab('personal');
    } else if (activeTab === 'expat' && !planExpatExit) {
      setActiveTab('personal');
    }
  }, [activeTab, hasDebts, showRealEstateSection, planExpatExit]);

  const dispatchInputsChange = (updater: (prev: RetirementInputs) => RetirementInputs) => {
    startTransition(() => {
      (onChange as any)(updater);
    });
  };

  const updateExpatField = <K extends keyof ExpatInputs>(field: K, value: ExpatInputs[K]) => {
    const current = inputs.expat || {
      ...DEFAULT_EXPAT_INPUTS,
      emigrationAge: Math.max(inputs.currentAge + 1, inputs.retirementAge - 2),
      yearsLivedInCanadaAfter18: Math.min(40, Math.max(20, inputs.retirementAge - 18))
    };
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      return {
        ...base,
        expat: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const updateField = <K extends keyof RetirementInputs>(field: K, value: RetirementInputs[K]) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      return {
        ...base,
        [field]: value
      };
    });
  };

  const updateRealEstate = (patch: Partial<RealEstateInputs>) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      const current = base.realEstate || DEFAULT_REAL_ESTATE_INPUTS;
      return {
        ...base,
        realEstate: {
          ...current,
          ...patch
        }
      };
    });
  };

  const updateRealEstateField = <K extends keyof RealEstateInputs>(field: K, value: RealEstateInputs[K]) => {
    updateRealEstate({ [field]: value } as Partial<RealEstateInputs>);
  };

  const updateAccountReturn = (field: keyof AccountReturnRates, value: any) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      const current = base.accountReturns || DEFAULT_ACCOUNT_RETURNS;
      return {
        ...base,
        accountReturns: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleMaritalStatusChange = (status: MaritalStatus) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      if (status === 'married') {
        return {
          ...base,
          maritalStatus: 'married',
          spouse: base.spouse || DEFAULT_SPOUSE_INPUTS
        };
      } else {
        return {
          ...base,
          maritalStatus: status,
          spouse: undefined
        };
      }
    });
    if (status === 'married') {
      setActiveTab('spouse'); // guide user to spouse inputs
    } else if (activeTab === 'spouse') {
      setActiveTab('personal');
    }
  };

  const updateSpouseField = <K extends keyof SpouseInputs>(field: K, value: SpouseInputs[K]) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      if (!base.spouse) return base;
      return {
        ...base,
        spouse: {
          ...base.spouse,
          [field]: value
        }
      };
    });
  };

  const updateEmployerMatch = (patch: Partial<EmployerMatchConfig>) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      const current: EmployerMatchConfig = base.employerMatch || {
        enabled: false,
        matchType: 'percent_of_salary',
        matchPercentOfSalary: 4,
        matchRatePercent: 100,
        fixedAnnualAmount: 3000
      };
      return {
        ...base,
        employerMatch: {
          ...current,
          ...patch
        }
      };
    });
  };

  const updateSpouseEmployerMatch = (patch: Partial<EmployerMatchConfig>) => {
    dispatchInputsChange((prev: RetirementInputs) => {
      const base = typeof prev === 'object' && prev !== null ? prev : inputs;
      if (!base.spouse) return base;
      const current: EmployerMatchConfig = base.spouse.employerMatch || {
        enabled: false,
        matchType: 'percent_of_salary',
        matchPercentOfSalary: 4,
        matchRatePercent: 100,
        fixedAnnualAmount: 3000
      };
      return {
        ...base,
        spouse: {
          ...base.spouse,
          employerMatch: {
            ...current,
            ...patch
          }
        }
      };
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

  const primaryCppMethod: CppCalculationMethod = inputs.cppCalculationMethod || 'percentage';
  const primaryServiceCanadaEstimate = inputs.cppServiceCanadaEstimateAt65 ?? 917;

  const primaryCppAdjResult = useMemo(() => {
    return calculateAdjustedServiceCanadaCpp({
      serviceCanadaMonthlyAt65: primaryServiceCanadaEstimate,
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      cppStartAge: inputs.cppStartAge,
      currentAnnualIncome: inputs.currentAnnualIncome,
      careerDisruption: inputs.careerDisruption
    });
  }, [
    primaryServiceCanadaEstimate,
    inputs.currentAge,
    inputs.retirementAge,
    inputs.cppStartAge,
    inputs.currentAnnualIncome,
    inputs.careerDisruption
  ]);

  const spouseCppMethod: CppCalculationMethod = inputs.spouse?.cppCalculationMethod || 'percentage';
  const spouseServiceCanadaEstimate = inputs.spouse?.cppServiceCanadaEstimateAt65 ?? 917;

  const spouseCppAdjResult = useMemo(() => {
    if (!inputs.spouse) return null;
    return calculateAdjustedServiceCanadaCpp({
      serviceCanadaMonthlyAt65: spouseServiceCanadaEstimate,
      currentAge: inputs.spouse.currentAge,
      retirementAge: inputs.spouse.retirementAge,
      cppStartAge: inputs.spouse.cppStartAge,
      currentAnnualIncome: inputs.spouse.annualIncome,
      careerDisruption: inputs.spouse.careerDisruption
    });
  }, [
    inputs.spouse,
    spouseServiceCanadaEstimate,
    inputs.spouse?.currentAge,
    inputs.spouse?.retirementAge,
    inputs.spouse?.cppStartAge,
    inputs.spouse?.annualIncome,
    inputs.spouse?.careerDisruption
  ]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-colors">
      
      {/* Marital Status Selector Bar */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 p-4 text-slate-900 dark:text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20">
            {isMarried ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Household Planning Structure
            </span>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {isMarried ? 'Couple Retirement Plan (Dual Income & Accounts)' : 'Individual Retirement Plan (Solo)'}
            </div>
          </div>
        </div>

        {/* Controls: Marital Status Segmented Toggle & Collapse/Expand Button */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Marital Status Segmented Toggle */}
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-xl p-1 border border-slate-300/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleMaritalStatusChange('single')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                inputs.maritalStatus !== 'married'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Single / Divorced
            </button>

            <button
              type="button"
              onClick={() => handleMaritalStatusChange('married')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                inputs.maritalStatus === 'married'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700/80 font-medium"
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
        <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-900 dark:text-white">Current Inputs:</span>
            {inputs.userName && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{inputs.userName}</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Age <strong className="text-slate-900 dark:text-white">{inputs.currentAge}</strong> (Retiring @ <strong className="text-emerald-600 dark:text-emerald-400">{inputs.retirementAge}</strong>)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Income: <strong className="text-slate-900 dark:text-white">${inputs.currentAnnualIncome.toLocaleString()}/yr</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Target Spending: <strong className="text-slate-900 dark:text-white">${inputs.targetRetirementSpendingToday.toLocaleString()}/yr</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Province: <strong className="text-slate-900 dark:text-white">{inputs.province}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 ml-auto"
          >
            <span>Show Full Planning Tabs</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 sm:p-6">
        
        {/* TAB 1: PERSONAL & HOUSEHOLD BUDGET */}
        {activeTab === 'personal' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Primary Profile & Career Baseline</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isMarried
                    ? 'Your personal timeline, employment earnings trajectory, and career disruption scenarios'
                    : 'Personal timeline, employment earnings trajectory, and career disruption scenarios'}
                </p>
              </div>
            </div>

            {/* Required Client / Account Holder Name */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 via-slate-50 to-slate-50/60 dark:from-emerald-500/10 dark:via-slate-800/60 dark:to-slate-800/40 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label htmlFor="primary-client-name" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Primary Client / Account Holder Name</span>
                </label>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-2 py-0.5 rounded-md">
                  * Required
                </span>
              </div>
              <div className="relative">
                <input
                  id="primary-client-name"
                  type="text"
                  required
                  value={inputs.userName ?? ''}
                  onChange={(e) => updateField('userName', e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition outline-none bg-white dark:bg-slate-900 ${
                    !inputs.userName?.trim()
                      ? 'border-rose-300 dark:border-rose-500/50 focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white'
                      : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white'
                  }`}
                  aria-invalid={!inputs.userName?.trim()}
                />
              </div>
              {!inputs.userName?.trim() ? (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Please enter your name. Your name is required to personalize your wealth dossier PDF and exported Excel schedule.</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Printed on your customized Canadian Retirement Wealth Dossier (PDF) and audit-grade annual ledger (Excel).
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-4 bg-slate-50/60 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Timeline Assumptions</h5>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Current Age:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{inputs.currentAge} years old</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={inputs.retirementAge - 1}
                    value={inputs.currentAge}
                    onChange={(e) => updateField('currentAge', Number(e.target.value))}
                    aria-label="Current Age"
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Life Expectancy:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{inputs.lifeExpectancy} years old</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(75, inputs.retirementAge + 5)}
                    max={100}
                    value={inputs.lifeExpectancy}
                    onChange={(e) => updateField('lifeExpectancy', Number(e.target.value))}
                    aria-label="Life Expectancy"
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Longevity horizon (Stats Canada average is 82-87; planning for 90-95 protects against outliving assets).
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-slate-50/60 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {isMarried ? 'Your Earnings & Career Trajectory' : 'Earnings & Career Trajectory'}
                </h5>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
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
                  <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Annual Wage Trajectory:</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        inputs.incomeGrowthRate > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : inputs.incomeGrowthRate < 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>-5% (Wage Erosion)</span>
                      <span>0% (Stagnant)</span>
                      <span>+8% (Strong Growth)</span>
                    </div>
                  </div>

                  {/* Career Disruption / Layoff Simulator Box */}
                  <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Career Disruption / Layoff Simulator</span>
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
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Test if your retirement plan survives industry disruption, unexpected layoffs, or forced step-downs before retirement.
                    </p>

                    {inputs.careerDisruption?.enabled && (
                      <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 bg-rose-50/30 dark:bg-rose-500/10 p-2.5 rounded-lg border border-rose-100 dark:border-rose-500/20">
                        {/* Shock Age */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-700 dark:text-slate-300">Disruption Occurs At:</span>
                            <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">Age {inputs.careerDisruption.shockAge}</span>
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
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* Severity Quick Buttons & Slider */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-700 dark:text-slate-300">Wage Reduction Severity:</span>
                            <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">-{inputs.careerDisruption.reductionPercent}%</span>
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
                                className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                  inputs.careerDisruption?.reductionPercent === pct
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* Disruption Duration */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-100 dark:border-rose-500/20">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Trajectory Impact:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateField('careerDisruption', {
                                ...inputs.careerDisruption!,
                                isTemporary: false
                              })}
                              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition cursor-pointer ${
                                !inputs.careerDisruption.isTemporary
                                  ? 'bg-rose-700 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
                              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition cursor-pointer ${
                                inputs.careerDisruption.isTemporary
                                  ? 'bg-rose-700 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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

            {/* Household Scope & Life Circumstances Qualifying Questions */}
            <div className="flex flex-col gap-4 pt-2">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Planning Scope & Life Circumstances</span>
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Answer these qualifying questions so Strata configures the relevant debt, real estate, and relocation modules for your situation.
                </p>
              </div>

              {/* CARD 1: DEBTS & LOANS QUESTION */}
              <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/30 dark:bg-rose-500/10 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                        Do you have any ongoing debts or do you want to model any future debts other than a home?
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Includes student loans, auto loans, personal loans, lines of credit (LOC), or credit cards.
                      </p>
                    </div>
                  </div>

                  {/* Yes / No Segmented Choice */}
                  <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-rose-200 dark:border-rose-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateField('hasOngoingOrFutureDebts', true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        hasDebts
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {hasDebts && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('hasOngoingOrFutureDebts', false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        !hasDebts
                          ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {!hasDebts && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>No</span>
                    </button>
                  </div>
                </div>

                {hasDebts && (
                  <div className="pt-2.5 border-t border-rose-200/70 dark:border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200 text-xs">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="font-semibold">
                        Debts & Loans module is enabled in your planning tabs.
                        {inputs.debts && inputs.debts.length > 0 && ` (${inputs.debts.length} active debt${inputs.debts.length > 1 ? 's' : ''} loaded)`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('debts')}
                      className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Configure Debts & Loans</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 2: REAL ESTATE & HOUSING QUESTION */}
              <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/10 flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1.5 rounded-lg bg-amber-600 text-white shrink-0 mt-0.5">
                      <Home className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                        Do you currently own or rent a home?
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tell us whether you have an existing primary residence or are currently renting.
                      </p>
                    </div>
                  </div>

                  {/* Own vs Rent Segmented Buttons */}
                  <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-200 dark:border-amber-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        updateField('housingStatus', 'own');
                        updateField('planFutureHomePurchase', false);
                        updateRealEstate({
                          ownsHome: true,
                          purchaseType: 'current'
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        housingStatus === 'own'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {housingStatus === 'own' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Own</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('housingStatus', 'rent');
                        if (planFutureHomePurchase) {
                          updateRealEstate({
                            ownsHome: true,
                            purchaseType: 'future',
                            futurePurchaseAge: inputs.realEstate?.futurePurchaseAge || Math.min(inputs.retirementAge, inputs.currentAge + 3)
                          });
                        } else {
                          updateRealEstate({
                            ownsHome: false
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        housingStatus === 'rent'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {housingStatus === 'rent' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Rent</span>
                    </button>
                  </div>
                </div>

                {/* If user selected "Own": Current homeownership status banner */}
                {housingStatus === 'own' && (
                  <div className="pt-2.5 border-t border-amber-200/70 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="font-semibold">
                        Owns home today: Real Estate section is active with your current property, mortgage balance & accumulated equity.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('realestate')}
                      className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Configure Current Home & Mortgage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* If user selected "Rent": Follow-up question appears */}
                {housingStatus === 'rent' && (
                  <div className="pt-3 border-t border-blue-200 dark:border-blue-500/30 flex flex-col gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200/60 dark:border-blue-500/20 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2">
                        <span className="p-1 rounded-md bg-blue-600 text-white shrink-0 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h6 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                            Do you plan to purchase a home in the future?
                          </h6>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Simulate future home buying with FHSA / RRSP Home Buyers' Plan (HBP) down payment funding.
                          </p>
                        </div>
                      </div>

                      {/* Yes / No for Future Purchase */}
                      <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-blue-200 dark:border-blue-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            updateField('planFutureHomePurchase', true);
                            updateRealEstate({
                              ownsHome: true,
                              purchaseType: 'future',
                              futurePurchaseAge: inputs.realEstate?.futurePurchaseAge || Math.min(inputs.retirementAge, inputs.currentAge + 3)
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            planFutureHomePurchase
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {planFutureHomePurchase && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateField('planFutureHomePurchase', false);
                            updateRealEstate({
                              ownsHome: false
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            !planFutureHomePurchase
                              ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {!planFutureHomePurchase && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          <span>No</span>
                        </button>
                      </div>
                    </div>

                    {/* Feedback based on choice */}
                    {planFutureHomePurchase ? (
                      <div className="pt-2 border-t border-blue-200/60 dark:border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span className="font-semibold">
                            Future Home Purchase Simulator enabled: Real Estate section shows only the future home purchase simulator.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('realestate')}
                          className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Open Future Home Purchase Simulator</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>
                          Renting throughout retirement: Real Estate & Home section is hidden. Monthly rent is modeled under Living Expenses.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD 3: EXPAT EMIGRATION PLANNING QUESTION */}
              <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-500/10 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1.5 rounded-lg bg-cyan-600 text-white shrink-0 mt-0.5">
                      <Globe className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                        Do you plan to exit Canada and settle in a different country?
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Model CRA non-resident Part XIII withholding taxes, deemed disposition departure tax (S. 128.1), and local purchasing power (PPP).
                      </p>
                    </div>
                  </div>

                  {/* Yes / No Segmented Choice */}
                  <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-cyan-200 dark:border-cyan-500/30 shrink-0 self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        updateField('planExpatExit', true);
                        updateExpatField('planToEmigrate', true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        planExpatExit
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {planExpatExit && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('planExpatExit', false);
                        updateExpatField('planToEmigrate', false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        !planExpatExit
                          ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {!planExpatExit && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>No</span>
                    </button>
                  </div>
                </div>

                {planExpatExit && (
                  <div className="pt-3 border-t border-cyan-200/80 dark:border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Destination:</span>
                        <select
                          value={inputs.expat?.destinationCountryId || 'mexico'}
                          onChange={(e) => updateExpatField('destinationCountryId', e.target.value)}
                          className="text-xs font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 shadow-2xs focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                        >
                          {EXPAT_DESTINATIONS.map(d => (
                            <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {d.flag} {d.name} ({d.purchasingPowerMultiplier.toFixed(1)}x PPP • {d.currencyCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label htmlFor="expat-planned-exit-age" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Planned Exit Age:
                        </label>
                        <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs overflow-hidden focus-within:ring-1 focus-within:ring-cyan-500">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = inputs.expat?.emigrationAge || inputs.retirementAge;
                              const next = Math.max(inputs.currentAge, cur - 1);
                              updateExpatField('emigrationAge', next);
                            }}
                            disabled={(inputs.expat?.emigrationAge || inputs.retirementAge) <= inputs.currentAge}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Decrease planned exit age"
                            aria-label="Decrease planned exit age"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <div className="flex items-center px-1">
                            <span className="text-[11px] font-medium text-slate-400 select-none mr-1">Age</span>
                            <input
                              id="expat-planned-exit-age"
                              type="number"
                              min={inputs.currentAge}
                              max={Math.max(inputs.currentAge + 1, inputs.lifeExpectancy - 1)}
                              value={inputs.expat?.emigrationAge || inputs.retirementAge}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  updateExpatField(
                                    'emigrationAge',
                                    Math.max(inputs.currentAge, Math.min(inputs.lifeExpectancy - 1, val))
                                  );
                                }
                              }}
                              aria-label="Planned Exit Age"
                              className="w-10 text-xs font-mono font-bold text-cyan-900 dark:text-cyan-200 bg-transparent text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = inputs.expat?.emigrationAge || inputs.retirementAge;
                              const next = Math.min(inputs.lifeExpectancy - 1, cur + 1);
                              updateExpatField('emigrationAge', next);
                            }}
                            disabled={(inputs.expat?.emigrationAge || inputs.retirementAge) >= inputs.lifeExpectancy - 1}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Increase planned exit age"
                            aria-label="Increase planned exit age"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('expat')}
                      className="text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Configure Full Expat Parameters</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Next Step Guidance to Living Expenses */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-50">Next Step: Estimate Living Expenses</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter your monthly household expenses in today's dollars (rent/mortgage, utilities, credit cards) and adjust post-retirement lifestyle needs.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 self-stretch sm:self-auto justify-center cursor-pointer"
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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {isMarried ? 'Household Living Expenses & Retirement Budget' : 'Living Expenses & Retirement Budget'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
              onUpdateExpenses={(newExpenses, newSpending) => {
                dispatchInputsChange((prev: RetirementInputs) => {
                  const base = typeof prev === 'object' && prev !== null ? prev : inputs;
                  return {
                    ...base,
                    monthlyExpenses: newExpenses,
                    ...(newSpending !== undefined ? { targetRetirementSpendingToday: newSpending } : {})
                  };
                });
              }}
            />

            {/* Target Retirement Spending Summary / Direct Override */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/90 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  {isMarried
                    ? 'Combined Household Retirement Annual Target (Today\'s Dollars)'
                    : 'Personal Retirement Annual Spending Target (Today\'s Dollars)'}
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Primary Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {isMarried ? 'Your Personal Registered & Taxable Accounts' : 'Canadian Registered & Taxable Accounts'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your current balances and planned annual contributions target</p>
              </div>
            </div>

            {/* Live Cash Flow Stress Test & Dynamic Priority Waterfall Allocation */}
            <CashFlowContributionStressTest
              inputs={inputs}
              onUpdateInputs={(partial) => {
                const updated = { ...inputs, ...partial };
                onChange(updated);
              }}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* RRSP */}
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-50">RRSP</span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-500/20 px-2 py-0.5 rounded">
                    Tax-Deductible
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.rrspBalance}
                      onChange={(val) => updateField('rrspBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="RRSP Current Balance"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Annual Contributions Target</label>
                    <CurrencyInput
                      value={inputs.rrspAnnualContribution}
                      onChange={(val) => updateField('rrspAnnualContribution', val)}
                      min={0}
                      step={500}
                      aria-label="RRSP Annual Contributions Target"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-blue-800 dark:text-blue-300 block mb-1 font-semibold">Expected Return</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={inputs.accountReturns?.rrspReturn ?? 6.5}
                        onChange={(e) => updateAccountReturn('rrspReturn', Number(e.target.value))}
                        className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-blue-500 dark:text-blue-400 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Employer RRSP / DPSP Match Section */}
                <div className="pt-3 mt-1 border-t border-blue-100 dark:border-blue-500/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!inputs.employerMatch?.enabled}
                        onChange={(e) => updateEmployerMatch({ enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <span>🏢 Employer Contribution Match</span>
                        {inputs.employerMatch?.enabled && (
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">
                            +${calculateEmployerRrspMatch(inputs.currentAnnualIncome, inputs.rrspAnnualContribution, inputs.employerMatch).toLocaleString()}/yr
                          </span>
                        )}
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Group RRSP / DPSP</span>
                  </div>

                  {inputs.employerMatch?.enabled && (
                    <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/25 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Match Formula:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateEmployerMatch({ matchType: 'percent_of_salary' })}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                              (!inputs.employerMatch.matchType || inputs.employerMatch.matchType === 'percent_of_salary')
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            % of Salary Cap
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEmployerMatch({ matchType: 'percent_of_contribution' })}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                              inputs.employerMatch.matchType === 'percent_of_contribution'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            % of Contribution
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEmployerMatch({ matchType: 'fixed_dollar' })}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                              inputs.employerMatch.matchType === 'fixed_dollar'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Fixed Dollar ($/yr)
                          </button>
                        </div>
                      </div>

                      {(!inputs.employerMatch.matchType || inputs.employerMatch.matchType === 'percent_of_salary') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                              Match Rate (% of your contrib)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={200}
                                step={5}
                                value={inputs.employerMatch.matchRatePercent ?? 100}
                                onChange={(e) => updateEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                                className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">100% = dollar-for-dollar match</span>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                              Employer Cap (% of base salary)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0.5}
                                max={18}
                                step={0.5}
                                value={inputs.employerMatch.matchPercentOfSalary ?? 4}
                                onChange={(e) => updateEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                                className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                              Max match cap: ${Math.round(inputs.currentAnnualIncome * ((inputs.employerMatch.matchPercentOfSalary ?? 4) / 100)).toLocaleString()}/yr
                            </span>
                          </div>
                        </div>
                      )}

                      {inputs.employerMatch.matchType === 'percent_of_contribution' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                              Match Rate (% of contribution)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={200}
                                step={5}
                                value={inputs.employerMatch.matchRatePercent ?? 50}
                                onChange={(e) => updateEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                                className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">e.g. 50% = 50¢ on each dollar</span>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                              Salary Cap (% of base salary)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={18}
                                step={0.5}
                                value={inputs.employerMatch.matchPercentOfSalary ?? 6}
                                onChange={(e) => updateEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                                className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Max match cap as % of base salary</span>
                          </div>
                        </div>
                      )}

                      {inputs.employerMatch.matchType === 'fixed_dollar' && (
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                            Fixed Annual Employer Match ($/year)
                          </label>
                          <CurrencyInput
                            value={inputs.employerMatch.fixedAnnualAmount ?? 3000}
                            onChange={(val) => updateEmployerMatch({ fixedAnnualAmount: val })}
                            min={0}
                            step={250}
                            aria-label="Primary Employer Fixed Annual Match"
                          />
                        </div>
                      )}

                      {/* Real-time match summary badge */}
                      {(() => {
                        const matchVal = calculateEmployerRrspMatch(inputs.currentAnnualIncome, inputs.rrspAnnualContribution, inputs.employerMatch);
                        const totalAddition = inputs.rrspAnnualContribution + matchVal;
                        return (
                          <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-500/20 text-xs flex flex-col gap-1.5">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-blue-800 dark:text-blue-300">Total RRSP Savings Compounding:</span>
                              <span className="text-slate-900 dark:text-slate-100 font-mono">
                                ${totalAddition.toLocaleString()}/yr ({formatCur(totalAddition / 12)}/mo)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                              <span>Your out-of-pocket: <strong className="font-mono text-slate-700 dark:text-slate-300">${inputs.rrspAnnualContribution.toLocaleString()}/yr</strong></span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                +${matchVal.toLocaleString()}/yr Free Employer Match
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                              CRA note: An employer's group RRSP / DPSP contribution consumes your overall statutory RRSP deduction limit ($32,490/yr). Your out-of-pocket paycheck contributions (${inputs.rrspAnnualContribution.toLocaleString()}/yr) plus employer match (${matchVal.toLocaleString()}/yr) together fill your statutory room without overcontributing.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* TFSA */}
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-50">TFSA</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                    100% Tax-Free
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.tfsaBalance}
                      onChange={(val) => updateField('tfsaBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="TFSA Current Balance"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Annual Contributions Target</label>
                    <CurrencyInput
                      value={inputs.tfsaAnnualContribution}
                      onChange={(val) => updateField('tfsaAnnualContribution', val)}
                      min={0}
                      max={15000}
                      step={500}
                      aria-label="TFSA Annual Contributions Target"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 block mb-1 font-semibold">Expected Return</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={inputs.accountReturns?.tfsaReturn ?? 7.0}
                        onChange={(e) => updateAccountReturn('tfsaReturn', Number(e.target.value))}
                        className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-white dark:bg-slate-950"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FHSA */}
              <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/10 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-50">FHSA (First Home Savings Account)</span>
                  </div>
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20 px-2 py-0.5 rounded">
                    Deductible + Tax-Free
                  </span>
                </div>

                {(() => {
                  const remainingRoom = inputs.fhsaRemainingContributionRoom !== undefined
                    ? Math.min(40000, Math.max(0, inputs.fhsaRemainingContributionRoom))
                    : Math.max(0, 40000 - Math.min(40000, inputs.fhsaBalance));
                  const contributedSoFar = Math.max(0, 40000 - remainingRoom);

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
                        {/* Column 1: Current Balance */}
                        <div className="flex flex-col justify-end">
                          <div className="min-h-[48px] flex flex-col justify-end pb-1.5">
                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block leading-tight">
                              Current Balance
                            </label>
                          </div>
                          <CurrencyInput
                            value={inputs.fhsaBalance}
                            onChange={(val) => updateField('fhsaBalance', val)}
                            min={0}
                            step={1000}
                            className="h-[34px]"
                            aria-label="FHSA Current Balance"
                          />
                        </div>

                        {/* Column 2: Remaining Room */}
                        <div className="flex flex-col justify-end">
                          <div className="min-h-[48px] flex flex-col justify-end pb-1.5">
                            <div className="flex items-baseline justify-between gap-1">
                              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                                Remaining Room
                              </label>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold shrink-0">
                                Max $40k
                              </span>
                            </div>
                          </div>
                          <CurrencyInput
                            value={remainingRoom}
                            onChange={(val) => {
                              const clamped = Math.min(40000, Math.max(0, val));
                              updateField('fhsaRemainingContributionRoom', clamped);
                            }}
                            min={0}
                            max={40000}
                            step={1000}
                            className="h-[34px]"
                            aria-label="FHSA Remaining Contribution Room"
                          />
                        </div>

                        {/* Column 3: Annual Contributions Target */}
                        <div className="flex flex-col justify-end">
                          <div className="min-h-[48px] flex flex-col justify-end pb-1.5">
                            <div className="flex items-baseline justify-between gap-1">
                              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                                Annual Contributions Target
                              </label>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                                Max $8k/yr
                              </span>
                            </div>
                          </div>
                          <CurrencyInput
                            value={inputs.fhsaAnnualContribution}
                            onChange={(val) => updateField('fhsaAnnualContribution', val)}
                            min={0}
                            max={8000}
                            step={500}
                            className="h-[34px]"
                            aria-label="FHSA Annual Contributions Target"
                          />
                        </div>

                        {/* Column 4: Expected Return */}
                        <div className="flex flex-col justify-end">
                          <div className="min-h-[48px] flex flex-col justify-end pb-1.5">
                            <label className="text-[11px] font-medium text-amber-800 dark:text-amber-300 block leading-tight font-semibold">
                              Expected Return
                            </label>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={15}
                              step={0.1}
                              value={inputs.accountReturns?.fhsaReturn ?? 6.0}
                              onChange={(e) => updateAccountReturn('fhsaReturn', Number(e.target.value))}
                              className="w-full pl-2.5 pr-6 h-[34px] text-xs font-mono font-bold text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-500/40 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition"
                            />
                            <span className="absolute right-2.5 top-2 text-xs text-amber-600 dark:text-amber-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Remaining Contribution Room Status & Quick Presets */}
                      <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-amber-950 dark:text-amber-200 text-[11px] flex items-center gap-1">
                            <span>🍁</span> CRA Lifetime Limit ($40k):
                          </span>
                          <span className="font-mono text-amber-900 dark:text-amber-200 text-xs">
                            <strong className="font-bold text-amber-950 dark:text-amber-100">${contributedSoFar.toLocaleString()}</strong> contributed • <strong className="font-bold text-amber-950 dark:text-amber-100">${remainingRoom.toLocaleString()}</strong> room left to invest
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto">
                          <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium mr-0.5">Quick set room:</span>
                          {[40000, 32000, 24000, 16000, 8000, 0].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => updateField('fhsaRemainingContributionRoom', amt)}
                              className={`px-2 py-0.5 text-[10px] font-mono rounded-md border transition cursor-pointer ${
                                remainingRoom === amt
                                  ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700'
                              }`}
                              title={`Set remaining contribution room to $${amt.toLocaleString()}`}
                            >
                              {amt === 40000 ? '$40k' : amt === 0 ? '$0' : `$${amt / 1000}k`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Year FHSA Opened & CRA 15-Year Rollover Rules */}
                <div className="pt-2.5 border-t border-amber-200/70 dark:border-amber-500/30 flex flex-col gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200/90 dark:border-amber-500/30 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-900 dark:text-slate-50 block">
                        Year FHSA Account Was Opened
                      </label>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        CRA rules state an FHSA must close after 15 years (or at age 71).
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {[2023, 2024, 2025, 2026].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => updateField('fhsaOpenYear', yr)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
                            (inputs.fhsaOpenYear || 2023) === yr
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                      <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                            <span>⏳</span> 15-Year CRA Participation Window:
                          </span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px]">
                            Opened in {openYr} → 15 Yrs Ends in {expiryYr}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-amber-900 dark:text-amber-200 leading-snug">
                          {inputs.fhsaIntent === 'home_purchase' ? (
                            <>
                              If not utilized for a home purchase by year <strong>{expiryYr}</strong>, your FHSA balance rolls over at <strong>Age {rolloverAge}</strong> into your <strong>{rolloverTarget}</strong> 100% tax-free!
                            </>
                          ) : (
                            <>
                              After 15 years in <strong>{expiryYr}</strong>, your accumulated FHSA automatically rolls over at <span className="font-extrabold text-amber-950 dark:text-amber-100 underline decoration-amber-500 underline-offset-2">Age {rolloverAge}</span> directly into your <strong>{rolloverTarget}</strong> tax-free without reducing any RRSP contribution room.
                            </>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  {/* FHSA Intent Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Intent:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField('fhsaIntent', 'rollover_to_rrsp')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          inputs.fhsaIntent !== 'home_purchase'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        Rollover to RRSP/RRIF
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('fhsaIntent', 'home_purchase')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          inputs.fhsaIntent === 'home_purchase'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        Buy First Home
                      </button>
                    </div>
                  </div>

                  {inputs.fhsaIntent === 'home_purchase' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Planned Home Purchase Age:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={inputs.currentAge + 1}
                          max={Math.min(71, inputs.currentAge + ((inputs.fhsaOpenYear || 2023) + 15 - 2026))}
                          value={inputs.fhsaHomePurchaseAge || inputs.currentAge + 3}
                          onChange={(e) => updateField('fhsaHomePurchaseAge', Number(e.target.value))}
                          className="w-24 sm:w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-amber-600"
                        />
                        <span className="font-mono font-bold text-amber-900 dark:text-amber-300 text-xs">
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
                  startTransition(() => {
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
                  });
                }}
                onClearToSimple={(fallbackBal, fallbackCont) => {
                  startTransition(() => {
                    onChange({
                      ...inputs,
                      nonRegBalance: fallbackBal,
                      nonRegAnnualContribution: fallbackCont,
                      nonRegCustomAccounts: []
                    });
                  });
                }}
              />

            </div>
          </div>
        )}

        {/* TAB: FIXED-TERM DEBTS & LOANS */}
        {activeTab === 'debts' && (
          <DebtsManager
            debts={inputs.debts || []}
            currentAge={inputs.currentAge}
            retirementAge={inputs.retirementAge}
            debtStrategy={inputs.debtStrategy}
            onUpdateDebts={(newDebts) => updateField('debts', newDebts)}
            onUpdateStrategy={(newStrategy) => updateField('debtStrategy', newStrategy)}
            onChange={(newDebts) => updateField('debts', newDebts)}
          />
        )}

        {/* TAB: REAL ESTATE & HOME OWNERSHIP */}
        {activeTab === 'realestate' && (() => {
          const re = inputs.realEstate || DEFAULT_REAL_ESTATE_INPUTS;
          const costOfHome = re.costOfHome || 650000;
          const currentMarketValue = re.currentMarketValue || costOfHome;
          const downPayment = re.downPayment ?? 130000;
          const downPaymentPct = costOfHome > 0 ? Math.round((downPayment / costOfHome) * 100) : 20;
          const mortgageInterestRate = re.mortgageInterestRate ?? 4.79;
          const mortgageTermYears = re.mortgageTermYears ?? 25;
          const mortgageStartYear = re.mortgageStartYear ?? 2021;
          const ownershipSharePercent = re.ownershipSharePercent ?? (isMarried ? 50 : 100);
          const annualAppreciationRate = re.annualAppreciationRate ?? 3.2;
          const planToSellHome = Boolean(re.planToSellHome);
          const sellHomeAge = re.sellHomeAge ?? 72;
          const sellingCostPercent = re.sellingCostPercent ?? 4.5;
          const isFuturePurchase = Boolean(re.ownsHome && re.purchaseType === 'future');
          const futurePurchaseAge = re.futurePurchaseAge ?? Math.min(inputs.retirementAge, inputs.currentAge + 3);

          // Living expenses rent auto-population & override detection
          const livingExpensesRent = inputs.monthlyExpenses?.rentOrMortgage;
          const isRentOverridden = Boolean(re.rentOverridden);
          const currentRent = (isRentOverridden && re.currentRent !== undefined)
            ? re.currentRent
            : (livingExpensesRent ?? re.currentRent ?? 2200);

          // Down payment percentage presets (5%, 10%, 15%, 20%, or custom)
          const downPaymentPreset = re.downPaymentPercentPreset ?? (costOfHome > 0 && Math.abs((downPayment / costOfHome) - 0.20) < 0.01 ? 20 : 'custom');

          // Accounts to fund the down payment
          const fundWithFhsa = re.fundWithFhsa !== false;
          const fundWithHbp = re.fundWithHbp !== false && re.useHbp !== false;
          const fundWithTfsa = re.fundWithTfsa !== false;
          const fundWithNonReg = re.fundWithNonReg !== false;
          const useHbp = fundWithHbp;

          const currentCalendarYear = 2026;
          const yearsToPurchase = Math.max(1, futurePurchaseAge - inputs.currentAge);
          const futurePurchaseYear = currentCalendarYear + yearsToPurchase;

          // Amortization math
          const semiAnnualRate = (mortgageInterestRate / 100) / 2;
          const monthlyRate = mortgageInterestRate > 0 ? Math.pow(1 + semiAnnualRate, 2 / 12) - 1 : 0;
          const totalMonths = mortgageTermYears * 12;

          // Current Homeowner calculations
          const initialLoan = Math.max(0, costOfHome - downPayment);
          const monthlyPayment = (initialLoan > 0 && totalMonths > 0)
            ? (monthlyRate > 0
                ? (initialLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
                : initialLoan / totalMonths)
            : 0;

          const elapsedMonthsToday = Math.max(0, (currentCalendarYear - mortgageStartYear) * 12);
          const remainingMortgageToday = (initialLoan <= 0 || elapsedMonthsToday >= totalMonths)
            ? 0
            : Math.max(0, initialLoan * Math.pow(1 + monthlyRate, elapsedMonthsToday) - monthlyPayment * ((Math.pow(1 + monthlyRate, elapsedMonthsToday) - 1) / (monthlyRate || 1)));

          const totalEquityToday = Math.max(0, currentMarketValue - remainingMortgageToday);
          const userEquityToday = totalEquityToday * (ownershipSharePercent / 100);

          // Future Purchase calculations
          const projectedPurchasePrice = Math.round(costOfHome * Math.pow(1 + annualAppreciationRate / 100, yearsToPurchase));
          const projectedDownPayment = Math.round(projectedPurchasePrice * (downPaymentPct / 100));
          const futureInitialLoan = Math.max(0, projectedPurchasePrice - projectedDownPayment);
          const futureMonthlyPayment = (futureInitialLoan > 0 && totalMonths > 0)
            ? (monthlyRate > 0
                ? (futureInitialLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
                : futureInitialLoan / totalMonths)
            : 0;
          const mortgageFreeAge = futurePurchaseAge + mortgageTermYears;

          // Projected sale calculation
          const effectiveBasePrice = isFuturePurchase ? projectedPurchasePrice : currentMarketValue;
          const baseAge = isFuturePurchase ? futurePurchaseAge : inputs.currentAge;
          const yearsToSale = Math.max(0, sellHomeAge - baseAge);
          const projectedValueAtSale = effectiveBasePrice * Math.pow(1 + annualAppreciationRate / 100, yearsToSale);
          const elapsedMonthsAtSale = isFuturePurchase
            ? Math.max(0, (sellHomeAge - futurePurchaseAge) * 12)
            : Math.max(0, (currentCalendarYear + yearsToSale - mortgageStartYear) * 12);
          const saleLoan = isFuturePurchase ? futureInitialLoan : initialLoan;
          const saleMonthlyPmt = isFuturePurchase ? futureMonthlyPayment : monthlyPayment;
          const remainingMortgageAtSale = elapsedMonthsAtSale >= totalMonths
            ? 0
            : Math.max(0, saleLoan * Math.pow(1 + monthlyRate, elapsedMonthsAtSale) - saleMonthlyPmt * ((Math.pow(1 + monthlyRate, elapsedMonthsAtSale) - 1) / (monthlyRate || 1)));
          const netProceedsAtSale = Math.max(0, (projectedValueAtSale * (1 - sellingCostPercent / 100)) - remainingMortgageAtSale) * (ownershipSharePercent / 100);

          return (
            <div className="flex flex-col gap-6">
              
              {/* Contextual Header based on Housing Selection from Primary Profile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    {housingStatus === 'rent' ? (
                      <>
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Canadian Real Estate: Future Home Purchase Simulator</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-extrabold uppercase">Simulator</span>
                      </>
                    ) : (
                      <>
                        <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Canadian Real Estate: Home Ownership & Mortgage Equity</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold uppercase">Owns Home</span>
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {housingStatus === 'rent'
                      ? `Currently renting; model future purchase timing at age ${futurePurchaseAge}, FHSA/HBP down payments, and financial impact.`
                      : 'Model existing home value, mortgage principal amortization, accumulated equity, and downsizing strategy.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition self-start sm:self-auto cursor-pointer"
                >
                  <span>Change Housing Plan in Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* VIEW 1: RENT LONG-TERM (NO REAL ESTATE) */}
              {!re.ownsHome && (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-50 text-sm">Long-Term Renting Mode Active</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mt-1">
                      You indicated in your Primary Profile that you currently rent and do not plan to purchase a home in the future. Monthly rent is modeled under Living Expenses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('personal')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer mt-1"
                  >
                    <span>Change Housing Plan in Primary Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* VIEW 2: FUTURE HOME PURCHASE (CURRENTLY RENTING) */}
              {re.ownsHome && isFuturePurchase && (
                <div className="flex flex-col gap-6">

                  {/* Future Buyer Stepper Journey Bar */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-emerald-950/30 border border-blue-200/90 dark:border-blue-500/30 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-blue-200/60 dark:border-blue-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-100 uppercase tracking-wide">
                          Future Home Purchase Journey (Assumption: Currently Renting)
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 font-mono">
                        {yearsToPurchase} {yearsToPurchase === 1 ? 'Year' : 'Years'} Until Purchase
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-blue-200/70 dark:border-blue-500/30">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">1. Today (Age {inputs.currentAge})</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">🏢 Currently Renting</span>
                        <span className="text-[11px] text-blue-700 dark:text-blue-400 font-mono font-semibold">${Math.round(currentRent).toLocaleString()} / month</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-500/30">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block">2. Age {futurePurchaseAge} ({futurePurchaseYear})</span>
                        <span className="font-extrabold text-indigo-950 dark:text-indigo-100 block mt-0.5">🏡 Buy Primary Home</span>
                        <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono font-semibold">${Math.round(projectedPurchasePrice).toLocaleString()} est. price</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-500/30">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block">3. Down Payment</span>
                        <span className="font-extrabold text-indigo-950 dark:text-indigo-100 block mt-0.5">💰 ${Math.round(projectedDownPayment).toLocaleString()} ({downPaymentPct}%)</span>
                        <span className="text-[10.5px] text-slate-600 dark:text-slate-400 block truncate">
                          {[fundWithFhsa && 'FHSA', fundWithHbp && 'HBP', fundWithTfsa && 'TFSA', fundWithNonReg && 'Non-Reg'].filter(Boolean).join(' + ') || 'Mortgage Only'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-500/30">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">4. Age {mortgageFreeAge}</span>
                        <span className="font-extrabold text-emerald-950 dark:text-emerald-100 block mt-0.5">🎉 100% Mortgage-Free</span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">$0 Housing Debt</span>
                      </div>
                    </div>
                  </div>

                  {/* Future Purchase Top Metrics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-blue-100/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-900/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-500/30">
                    <div>
                      <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">Target Purchase Age</span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 font-mono">Age {futurePurchaseAge}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Year {futurePurchaseYear} ({yearsToPurchase} yrs away)</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">Projected Home Price</span>
                      <span className="text-lg font-extrabold text-indigo-950 dark:text-indigo-100 font-mono">${Math.round(projectedPurchasePrice).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">(${costOfHome.toLocaleString()} in today's $)</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Target Down Payment</span>
                      <span className="text-lg font-extrabold text-amber-900 dark:text-amber-200 font-mono">${Math.round(projectedDownPayment).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{downPaymentPct}% of purchase price</span>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-200 dark:border-blue-500/30 shadow-2xs">
                      <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">Future Mortgage</span>
                      <span className="text-lg font-black text-blue-950 dark:text-blue-100 font-mono">${Math.round(futureMonthlyPayment).toLocaleString()}/mo</span>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">Free by Age {mortgageFreeAge}</span>
                    </div>
                  </div>

                  {/* Realtor.ca Monthly Cost Projection & Land Transfer Tax Card */}
                  <RealtorHomeCostCard
                    realEstate={re}
                    province={inputs.province}
                    isFuturePurchase={true}
                    futurePurchaseAge={futurePurchaseAge}
                    futurePurchaseYear={futurePurchaseYear}
                    currentRentMonthly={currentRent}
                    onUpdate={updateRealEstate}
                  />

                  {/* 2-Column Inputs Grid for Future Home Purchase */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Column 1: Future Purchase Timing & Price */}
                    <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Purchase Timing & Current Rent
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                          Renting → Buying
                        </span>
                      </div>

                      {/* Target Purchase Age */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Planned Age of Home Purchase:</span>
                          <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">Age {futurePurchaseAge} (in {yearsToPurchase} yrs)</span>
                        </div>
                        <input
                          type="range"
                          min={inputs.currentAge + 1}
                          max={Math.min(75, inputs.retirementAge + 5)}
                          step={1}
                          value={futurePurchaseAge}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateRealEstateField('futurePurchaseAge', val);
                            if (inputs.fhsaIntent === 'home_purchase') {
                              updateField('fhsaHomePurchaseAge', val);
                            }
                          }}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <span>Earliest: Age {inputs.currentAge + 1}</span>
                          <span>Retirement: Age {inputs.retirementAge}</span>
                        </div>
                      </div>

                      {/* Current Monthly Rent */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                          <label className="text-slate-700 dark:text-slate-300">
                            Current Monthly Rent Paid Today (Prior to Purchase)
                          </label>
                          {livingExpensesRent && isRentOverridden && (
                            <button
                              type="button"
                              onClick={() => {
                                updateRealEstate({
                                  rentOverridden: false,
                                  currentRent: livingExpensesRent
                                });
                              }}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-semibold cursor-pointer"
                            >
                              Sync with Living Expenses (${livingExpensesRent.toLocaleString()}/mo)
                            </button>
                          )}
                        </div>
                        <CurrencyInput
                          value={currentRent}
                          onChange={(val) => {
                            updateRealEstate({
                              currentRent: val,
                              rentOverridden: true
                            });
                          }}
                          min={0}
                          step={50}
                          aria-label="Current Monthly Rent"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                          {isRentOverridden
                            ? 'Custom rent override active for pre-purchase rental phase.'
                            : livingExpensesRent
                            ? `Auto-populated from Living Expenses tab ($${livingExpensesRent.toLocaleString()}/month). Edit value to override.`
                            : 'Your housing cost during the rental period before buying the home.'}
                        </span>
                      </div>

                      {/* Target Home Price in Today's Dollars */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Target Home Cost in Today's Dollars
                        </label>
                        <CurrencyInput
                          value={costOfHome}
                          onChange={(val) => {
                            updateRealEstate({
                              costOfHome: val,
                              ...(typeof downPaymentPreset === 'number' ? { downPayment: Math.round(val * (downPaymentPreset / 100)) } : {})
                            });
                          }}
                          min={100000}
                          step={10000}
                          aria-label="Target Home Cost in Today's Dollars"
                        />
                        <span className="text-[10.5px] text-blue-700 dark:text-blue-400 font-medium mt-0.5 block">
                          At {annualAppreciationRate}% annual growth, this home will cost ~${Math.round(projectedPurchasePrice).toLocaleString()} at Age {futurePurchaseAge}.
                        </span>
                      </div>

                      {/* Target Down Payment with Percentage Presets */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] font-semibold mb-1.5">
                          <span className="text-slate-700 dark:text-slate-300">Target Down Payment:</span>
                          <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">${downPayment.toLocaleString()} ({downPaymentPct}%)</span>
                        </div>

                        {/* Percentage Preset Pill Buttons: 5%, 10%, 15%, 20%, Custom */}
                        <div className="flex items-center gap-1.5 mb-2">
                          {[5, 10, 15, 20].map((pct) => {
                            const isSelected = downPaymentPreset === pct;
                            return (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  const autoAmount = Math.round(costOfHome * (pct / 100));
                                  updateRealEstate({
                                    downPayment: autoAmount,
                                    downPaymentPercentPreset: pct as any
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {pct}%
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              updateRealEstateField('downPaymentPercentPreset', 'custom');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              downPaymentPreset === 'custom'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Custom
                          </button>
                        </div>

                        <CurrencyInput
                          value={downPayment}
                          onChange={(val) => {
                            const matchedPreset = [5, 10, 15, 20].find(p => Math.abs(Math.round(costOfHome * (p / 100)) - val) < 100);
                            updateRealEstate({
                              downPayment: val,
                              downPaymentPercentPreset: matchedPreset ? (matchedPreset as any) : 'custom'
                            });
                          }}
                          min={0}
                          max={costOfHome}
                          step={5000}
                          aria-label="Target Down Payment"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                          Projected down payment at purchase: ~${Math.round(projectedDownPayment).toLocaleString()}.
                        </span>
                      </div>

                      {/* Selectable Accounts to Fund Down Payment */}
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/30 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Select Accounts to Fund Down Payment
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Choose all accounts that apply
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 text-xs">
                          {/* 1. FHSA */}
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                            fundWithFhsa
                              ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                              : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={fundWithFhsa}
                              onChange={(e) => updateRealEstateField('fundWithFhsa', e.target.checked)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <strong className="font-bold text-[11.5px]">FHSA (First Home Savings Account)</strong>
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                  fundWithFhsa ? 'bg-blue-200/80 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {fundWithFhsa ? '100% Tax-Free' : 'Preserved'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {fundWithFhsa
                                  ? `Qualifying tax-free withdrawal of accumulated FHSA balance at Age ${futurePurchaseAge}.`
                                  : 'FHSA will NOT be used for down payment; balance remains invested for rollover into RRSP.'}
                              </p>
                            </div>
                          </label>

                          {/* 2. RRSP Home Buyers' Plan */}
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                            fundWithHbp
                              ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                              : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={fundWithHbp}
                              onChange={(e) => {
                                updateRealEstate({
                                  fundWithHbp: e.target.checked,
                                  useHbp: e.target.checked
                                });
                              }}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <strong className="font-bold text-[11.5px]">RRSP Home Buyers' Plan (HBP)</strong>
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                  fundWithHbp ? 'bg-blue-200/80 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {fundWithHbp ? (isMarried ? 'Up to $120,000' : 'Up to $60,000') : 'Preserved'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {fundWithHbp
                                  ? 'Withdraw up to $60,000 tax-free per person from RRSP (CRA 15-year repayment schedule).'
                                  : 'RRSP retirement investments will remain untouched.'}
                              </p>
                            </div>
                          </label>

                          {/* 3. TFSA */}
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                            fundWithTfsa
                              ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                              : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={fundWithTfsa}
                              onChange={(e) => updateRealEstateField('fundWithTfsa', e.target.checked)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <strong className="font-bold text-[11.5px]">TFSA (Tax-Free Savings Account)</strong>
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                  fundWithTfsa ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {fundWithTfsa ? 'Tax-Free Withdrawal' : 'Preserved'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {fundWithTfsa
                                  ? 'Withdraw liquid TFSA savings to fund any remaining down payment portion.'
                                  : 'TFSA investments will be protected and left to compound tax-free.'}
                              </p>
                            </div>
                          </label>

                          {/* 4. Non-Registered */}
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                            fundWithNonReg
                              ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
                              : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={fundWithNonReg}
                              onChange={(e) => updateRealEstateField('fundWithNonReg', e.target.checked)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <strong className="font-bold text-[11.5px]">Non-Registered / Taxable Accounts</strong>
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                  fundWithNonReg ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {fundWithNonReg ? 'Liquid Savings' : 'Preserved'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {fundWithNonReg
                                  ? 'Deploy taxable high-interest savings, investments, or cash toward down payment.'
                                  : 'Non-registered investments will remain untouched.'}
                              </p>
                            </div>
                          </label>

                          {!fundWithFhsa && !fundWithHbp && !fundWithTfsa && !fundWithNonReg && (
                            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-[10.5px] text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>No funding accounts selected. 100% of the purchase price will be financed as mortgage debt.</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Column 2: Mortgage Terms & Future Amortization */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                          Future Mortgage Terms
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                          Est. Loan: ${Math.round(futureInitialLoan).toLocaleString()}
                        </span>
                      </div>

                      {/* Mortgage Interest Rate */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Mortgage Interest Rate (Semi-Annual Compounding):</span>
                          <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">{mortgageInterestRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={2.0}
                          max={9.0}
                          step={0.05}
                          value={mortgageInterestRate}
                          onChange={(e) => updateRealEstateField('mortgageInterestRate', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                        />
                      </div>

                      {/* Mortgage Amortization Term */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Amortization Term:</span>
                          <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">{mortgageTermYears} Years</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                          {[15, 20, 25, 30].map(term => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => updateRealEstateField('mortgageTermYears', term)}
                              className={`py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                mortgageTermYears === term
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              {term} yrs
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Expected Annual Appreciation */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Annual Real Estate Appreciation Rate:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{annualAppreciationRate}% / yr</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={7.0}
                          step={0.1}
                          value={annualAppreciationRate}
                          onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                        />
                      </div>

                      {/* Ownership Share */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Your Ownership Share of the Home:</span>
                          <span className="text-blue-800 dark:text-blue-300 font-bold font-mono">{ownershipSharePercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={ownershipSharePercent}
                          onChange={(e) => updateRealEstateField('ownershipSharePercent', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <span>50% (Equal Co-owner)</span>
                          <span>100% (Sole Owner)</span>
                        </div>
                      </div>

                      {/* Future Payment Summary Box */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Projected Monthly Payment</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">${Math.round(futureMonthlyPayment).toLocaleString()} / mo</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">vs Rent: ${Math.round(currentRent).toLocaleString()}/mo</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mortgage-Free By</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            Age {mortgageFreeAge} (Year {futurePurchaseYear + mortgageTermYears})
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                            {mortgageFreeAge <= inputs.retirementAge ? 'Paid before retirement!' : `${mortgageFreeAge - inputs.retirementAge} yrs into retirement`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disposition / Downsizing / Sale Section */}
                  <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-500/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          Future Home Downsizing / Sale (Backup Asset Liquidation)
                        </span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-900 dark:text-indigo-200 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={planToSellHome}
                          onChange={(e) => updateRealEstateField('planToSellHome', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Plan to sell / downsize home later</span>
                      </label>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Optionally model selling the home at an older age. Capital gains are 100% tax-free under Canada’s <strong>Principal Residence Exemption (PRE)</strong>. Net equity proceeds are deposited into your <strong>Taxable Non-Registered Account</strong>.
                    </p>

                    {planToSellHome && (
                      <div className="pt-3 border-t border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-700 dark:text-slate-300">Planned Age at Sale:</span>
                              <span className="text-indigo-700 dark:text-indigo-400 font-bold font-mono">Age {sellHomeAge}</span>
                            </div>
                            <input
                              type="range"
                              min={futurePurchaseAge + 1}
                              max={inputs.lifeExpectancy - 1}
                              step={1}
                              value={Math.max(futurePurchaseAge + 1, sellHomeAge)}
                              onChange={(e) => updateRealEstateField('sellHomeAge', Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
                            />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {sellHomeAge - futurePurchaseAge} years after purchasing
                            </span>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-700 dark:text-slate-300">Selling & Legal Closing Friction:</span>
                              <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{sellingCostPercent}%</span>
                            </div>
                            <input
                              type="range"
                              min={2.0}
                              max={7.0}
                              step={0.5}
                              value={sellingCostPercent}
                              onChange={(e) => updateRealEstateField('sellingCostPercent', Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-700 dark:accent-slate-400"
                            />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Realtor commissions & closing costs</span>
                          </div>
                        </div>

                        {/* Projected Proceeds Card */}
                        <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                              🎉 Projected Net Equity Inflow at Age {sellHomeAge}:
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Estimated property value of ${Math.round(projectedValueAtSale).toLocaleString()} with ${Math.round(remainingMortgageAtSale).toLocaleString()} mortgage remaining.
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                              +${Math.round(netProceedsAtSale).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                              Deposited to Taxable Account
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* VIEW 3: CURRENT HOMEOWNER (PURCHASED IN PAST) */}
              {re.ownsHome && !isFuturePurchase && (
                <div className="flex flex-col gap-6">

                  {/* Top Live Real Estate Badge */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-100/30 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-500/30">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Estimated Home Value</span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 font-mono">${Math.round(currentMarketValue).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Cost: ${costOfHome.toLocaleString()}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">Remaining Mortgage</span>
                      <span className="text-lg font-extrabold text-rose-700 dark:text-rose-400 font-mono">${Math.round(remainingMortgageToday).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pmt: ${Math.round(monthlyPayment).toLocaleString()}/mo</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Total Home Equity</span>
                      <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">${Math.round(totalEquityToday).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{Math.round((totalEquityToday / (currentMarketValue || 1)) * 100)}% equity built</span>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-amber-200 dark:border-amber-500/30 shadow-2xs">
                      <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">Your Net Share ({ownershipSharePercent}%)</span>
                      <span className="text-lg font-black text-amber-950 dark:text-amber-100 font-mono">${Math.round(userEquityToday).toLocaleString()}</span>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 block">Added to Net Worth</span>
                    </div>
                  </div>

                  {/* Realtor.ca Monthly Cost Breakdown & Ongoing Ownership Card */}
                  <RealtorHomeCostCard
                    realEstate={re}
                    province={inputs.province}
                    isFuturePurchase={false}
                    futurePurchaseAge={inputs.currentAge}
                    futurePurchaseYear={currentCalendarYear}
                    currentRentMonthly={0}
                    onUpdate={updateRealEstate}
                  />

                  {/* 2-Column Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Property Purchase & Valuation */}
                    <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-500/10 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          Property Cost & Valuation
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                          Primary Residence
                        </span>
                      </div>

                      {/* Cost of Home */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
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
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
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
                          <span className="text-slate-700 dark:text-slate-300">Down Payment Paid:</span>
                          <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">${downPayment.toLocaleString()} ({downPaymentPct}%)</span>
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
                          <span className="text-slate-700 dark:text-slate-300">Your Ownership Share of the Home:</span>
                          <span className="text-amber-800 dark:text-amber-300 font-bold font-mono">{ownershipSharePercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={ownershipSharePercent}
                          onChange={(e) => updateRealEstateField('ownershipSharePercent', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <span>50% (Equal Co-owner)</span>
                          <span>100% (Sole Owner)</span>
                        </div>
                      </div>

                      {/* Expected Annual Appreciation */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Annual Real Estate Appreciation Rate:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{annualAppreciationRate}% / yr</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={7.0}
                          step={0.1}
                          value={annualAppreciationRate}
                          onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Mortgage Terms & Amortization */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                          Mortgage Terms & Amortization
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Initial Loan: ${initialLoan.toLocaleString()}
                        </span>
                      </div>

                      {/* Mortgage Interest Rate */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Mortgage Interest Rate (Semi-Annual Compounding):</span>
                          <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">{mortgageInterestRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={2.0}
                          max={9.0}
                          step={0.05}
                          value={mortgageInterestRate}
                          onChange={(e) => updateRealEstateField('mortgageInterestRate', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                        />
                      </div>

                      {/* Mortgage Amortization Term */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Amortization Term:</span>
                          <span className="text-blue-700 dark:text-blue-400 font-bold font-mono">{mortgageTermYears} Years</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                          {[15, 20, 25, 30].map(term => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => updateRealEstateField('mortgageTermYears', term)}
                              className={`py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                mortgageTermYears === term
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                          <span className="text-slate-700 dark:text-slate-300">Year Mortgage Started:</span>
                          <span className="text-slate-900 dark:text-slate-100 font-bold font-mono">{mortgageStartYear} ({currentCalendarYear - mortgageStartYear} yrs elapsed)</span>
                        </div>
                        <input
                          type="range"
                          min={2005}
                          max={2026}
                          step={1}
                          value={mortgageStartYear}
                          onChange={(e) => updateRealEstateField('mortgageStartYear', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-800 dark:accent-slate-400"
                        />
                      </div>

                      {/* Monthly Payment Summary Box */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Estimated Monthly Payment</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">${Math.round(monthlyPayment).toLocaleString()} / mo</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mortgage-Free By</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            Year {mortgageStartYear + mortgageTermYears} (Age {inputs.currentAge + (mortgageStartYear + mortgageTermYears - currentCalendarYear)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disposition / Downsizing / Sale Section */}
                  <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-500/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          Home Disposition & Downsizing Strategy (Backup Asset Liquidation)
                        </span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-900 dark:text-indigo-200 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={planToSellHome}
                          onChange={(e) => updateRealEstateField('planToSellHome', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Plan to sell / downsize home</span>
                      </label>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Choose whether you plan to sell your home at a target retirement age. Under the Canada Revenue Agency’s <strong>Principal Residence Exemption (PRE)</strong>, 100% of your capital gain is completely tax-free. When sold, your share of net proceeds is automatically deposited into your <strong>Taxable Non-Registered Account</strong> to compound and fund living expenses.
                    </p>

                    {planToSellHome && (
                      <div className="pt-3 border-t border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-700 dark:text-slate-300">Planned Age at Sale:</span>
                              <span className="text-indigo-700 dark:text-indigo-400 font-bold font-mono">Age {sellHomeAge}</span>
                            </div>
                            <input
                              type="range"
                              min={inputs.currentAge + 1}
                              max={inputs.lifeExpectancy - 1}
                              step={1}
                              value={sellHomeAge}
                              onChange={(e) => updateRealEstateField('sellHomeAge', Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
                            />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Occurs {sellHomeAge >= inputs.retirementAge ? `${sellHomeAge - inputs.retirementAge} yrs into retirement` : `${inputs.retirementAge - sellHomeAge} yrs before retirement`}
                            </span>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-700 dark:text-slate-300">Selling & Legal Closing Friction:</span>
                              <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{sellingCostPercent}%</span>
                            </div>
                            <input
                              type="range"
                              min={2.0}
                              max={7.0}
                              step={0.5}
                              value={sellingCostPercent}
                              onChange={(e) => updateRealEstateField('sellingCostPercent', Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-slate-700 dark:accent-slate-400"
                            />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Realtor commissions, legal fees, and title transfers</span>
                          </div>
                        </div>

                        {/* Projected Proceeds Card */}
                        <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                              🎉 Projected Net Equity Inflow at Age {sellHomeAge}:
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Estimated property value of ${Math.round(projectedValueAtSale).toLocaleString()} with ${Math.round(remainingMortgageAtSale).toLocaleString()} mortgage remaining.
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                              +${Math.round(netProceedsAtSale).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
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
            <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-500/20 pb-3">
              <div>
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Spouse Profile & Separate Registered Accounts
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  In Canada, each spouse maintains their own individual RRSP room, TFSA limit, CPP pension, and OAS clawback threshold.
                </p>
              </div>

              {/* Pension Income Splitting Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-900 dark:text-rose-200">
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
            <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/20 dark:bg-rose-500/10 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Spouse Name / Label</label>
                <input
                  type="text"
                  value={inputs.spouse.name}
                  onChange={(e) => updateSpouseField('name', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current Age</label>
                <input
                  type="number"
                  min={18}
                  max={inputs.spouse.retirementAge - 1}
                  value={inputs.spouse.currentAge}
                  onChange={(e) => updateSpouseField('currentAge', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Retirement Age</label>
                <input
                  type="number"
                  min={Math.max(45, inputs.spouse.currentAge + 1)}
                  max={75}
                  value={inputs.spouse.retirementAge}
                  onChange={(e) => updateSpouseField('retirementAge', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Annual Employment Income</label>
                <CurrencyInput
                  value={inputs.spouse.annualIncome}
                  onChange={(val) => updateSpouseField('annualIncome', val)}
                  min={0}
                  step={5000}
                  aria-label="Spouse Annual Employment Income"
                />
                <div className="flex items-center justify-between gap-1 mt-1 text-[10.5px]">
                  <span className="text-slate-500 dark:text-slate-400">Wage Trend:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={-5.0}
                      max={8.0}
                      step={0.1}
                      value={inputs.spouse.incomeGrowthRate}
                      onChange={(e) => updateSpouseField('incomeGrowthRate', Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded text-right font-medium"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spouse Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Spouse RRSP */}
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse RRSP</span>
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded">Deductible</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.rrspBalance}
                      onChange={(val) => updateSpouseField('rrspBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="Spouse RRSP Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Annual Contrib</label>
                    <CurrencyInput
                      value={inputs.spouse.rrspAnnualContribution}
                      onChange={(val) => updateSpouseField('rrspAnnualContribution', val)}
                      min={0}
                      step={500}
                      aria-label="Spouse RRSP Annual Contribution"
                    />
                  </div>
                </div>

                {/* Spouse Employer Match Section */}
                <div className="pt-2 mt-0.5 border-t border-blue-100 dark:border-blue-500/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!inputs.spouse.employerMatch?.enabled}
                        onChange={(e) => updateSpouseEmployerMatch({ enabled: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <span>🏢 Employer Match</span>
                        {inputs.spouse.employerMatch?.enabled && (
                          <span className="text-[9.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-500/20 px-1.5 py-0.2 rounded">
                            +${calculateEmployerRrspMatch(inputs.spouse.annualIncome, inputs.spouse.rrspAnnualContribution, inputs.spouse.employerMatch).toLocaleString()}/yr
                          </span>
                        )}
                      </span>
                    </label>
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500">Group RRSP</span>
                  </div>

                  {inputs.spouse.employerMatch?.enabled && (
                    <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/25 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Formula:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateSpouseEmployerMatch({ matchType: 'percent_of_salary' })}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                              (!inputs.spouse.employerMatch.matchType || inputs.spouse.employerMatch.matchType === 'percent_of_salary')
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            % Salary Cap
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSpouseEmployerMatch({ matchType: 'percent_of_contribution' })}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                              inputs.spouse.employerMatch.matchType === 'percent_of_contribution'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            % Contrib
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSpouseEmployerMatch({ matchType: 'fixed_dollar' })}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                              inputs.spouse.employerMatch.matchType === 'fixed_dollar'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Fixed ($)
                          </button>
                        </div>
                      </div>

                      {(!inputs.spouse.employerMatch.matchType || inputs.spouse.employerMatch.matchType === 'percent_of_salary') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Match Rate</label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={200}
                                step={5}
                                value={inputs.spouse.employerMatch.matchRatePercent ?? 100}
                                onChange={(e) => updateSpouseEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                                className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Salary Cap</label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0.5}
                                max={18}
                                step={0.5}
                                value={inputs.spouse.employerMatch.matchPercentOfSalary ?? 4}
                                onChange={(e) => updateSpouseEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                                className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {inputs.spouse.employerMatch.matchType === 'percent_of_contribution' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Match %</label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={200}
                                step={5}
                                value={inputs.spouse.employerMatch.matchRatePercent ?? 50}
                                onChange={(e) => updateSpouseEmployerMatch({ matchRatePercent: Number(e.target.value) })}
                                className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Salary Cap %</label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={18}
                                step={0.5}
                                value={inputs.spouse.employerMatch.matchPercentOfSalary ?? 6}
                                onChange={(e) => updateSpouseEmployerMatch({ matchPercentOfSalary: Number(e.target.value) })}
                                className="w-full pl-2 pr-5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 rounded border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-950"
                              />
                              <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {inputs.spouse.employerMatch.matchType === 'fixed_dollar' && (
                        <div>
                          <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Fixed Annual Match ($/yr)</label>
                          <CurrencyInput
                            value={inputs.spouse.employerMatch.fixedAnnualAmount ?? 3000}
                            onChange={(val) => updateSpouseEmployerMatch({ fixedAnnualAmount: val })}
                            min={0}
                            step={250}
                            aria-label="Spouse Fixed Annual Match"
                          />
                        </div>
                      )}

                      {(() => {
                        const sMatch = calculateEmployerRrspMatch(inputs.spouse.annualIncome, inputs.spouse.rrspAnnualContribution, inputs.spouse.employerMatch);
                        const sTotal = inputs.spouse.rrspAnnualContribution + sMatch;
                        return (
                          <div className="pt-1.5 border-t border-blue-200/50 dark:border-blue-500/20 text-[10.5px] flex items-center justify-between font-semibold">
                            <span className="text-blue-800 dark:text-blue-300">Total Spouse RRSP Additions:</span>
                            <span className="font-mono text-slate-900 dark:text-slate-100">
                              ${sTotal.toLocaleString()}/yr (+${sMatch.toLocaleString()} match)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Spouse TFSA */}
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-500/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse TFSA</span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">100% Tax-Free</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.tfsaBalance}
                      onChange={(val) => updateSpouseField('tfsaBalance', val)}
                      min={0}
                      step={1000}
                      aria-label="Spouse TFSA Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Annual Contrib</label>
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
              <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-500/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse FHSA</span>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded">Home / RRSP Roll</span>
                </div>
                {(() => {
                  const sRemainingRoom = inputs.spouse?.fhsaRemainingContributionRoom !== undefined
                    ? Math.min(40000, Math.max(0, inputs.spouse.fhsaRemainingContributionRoom))
                    : Math.max(0, 40000 - Math.min(40000, inputs.spouse?.fhsaBalance || 0));

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                      <div className="flex flex-col justify-end">
                        <div className="min-h-[34px] flex flex-col justify-end pb-1.5">
                          <label className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">Current Balance</label>
                        </div>
                        <CurrencyInput
                          value={inputs.spouse.fhsaBalance}
                          onChange={(val) => updateSpouseField('fhsaBalance', val)}
                          min={0}
                          step={1000}
                          className="h-[34px]"
                          aria-label="Spouse FHSA Current Balance"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="min-h-[34px] flex flex-col justify-end pb-1.5">
                          <div className="flex items-baseline justify-between gap-1">
                            <label className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Remaining Room</label>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold shrink-0">Max $40k</span>
                          </div>
                        </div>
                        <CurrencyInput
                          value={sRemainingRoom}
                          onChange={(val) => {
                            const clamped = Math.min(40000, Math.max(0, val));
                            updateSpouseField('fhsaRemainingContributionRoom', clamped);
                          }}
                          min={0}
                          max={40000}
                          step={1000}
                          className="h-[34px]"
                          aria-label="Spouse FHSA Remaining Contribution Room"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="min-h-[34px] flex flex-col justify-end pb-1.5">
                          <label className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">Annual Contrib Target</label>
                        </div>
                        <CurrencyInput
                          value={inputs.spouse.fhsaAnnualContribution}
                          onChange={(val) => updateSpouseField('fhsaAnnualContribution', val)}
                          min={0}
                          max={8000}
                          step={500}
                          className="h-[34px]"
                          aria-label="Spouse FHSA Annual Contribution"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Spouse Year FHSA Opened & 15-yr Rollover */}
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-500/30 flex flex-col gap-2 bg-white/90 dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-500/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Year Opened:</span>
                    <div className="flex items-center gap-1">
                      {[2023, 2024, 2025, 2026].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => updateSpouseField('fhsaOpenYear', yr)}
                          className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded border transition cursor-pointer ${
                            (inputs.spouse?.fhsaOpenYear || 2023) === yr
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                      <span className="text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
                        CRA 15-yr limit in <strong>{spExpiryYr}</strong> → rolls over into spouse's <strong>{spTarget}</strong> at <span className="font-bold underline decoration-amber-500">Age {spRolloverAge}</span>.
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Spouse Non-Reg */}
              <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 bg-purple-50/20 dark:bg-purple-500/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Spouse Non-Reg (SA)</span>
                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-2 py-0.5 rounded">Taxable</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Current Balance</label>
                    <CurrencyInput
                      value={inputs.spouse.nonRegBalance}
                      onChange={(val) => updateSpouseField('nonRegBalance', val)}
                      min={0}
                      step={2000}
                      aria-label="Spouse Non-Registered Current Balance"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Annual Contrib</label>
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
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Spouse Government Pensions (CPP & OAS)
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Model spouse's Canada Pension Plan and Old Age Security entitlements independently
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Spouse CPP Card */}
                <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Spouse CPP
                    </h5>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                      Age {inputs.spouse.cppStartAge} • ${spouseCppMethod === 'service_canada' && spouseCppAdjResult ? Math.round(spouseCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString() : Math.round((1433.50 * ((inputs.spouse.cppEstimatedPercentOfMax ?? 64) / 100)) * getCppTimingFactor(inputs.spouse.cppStartAge).factor).toLocaleString()}/mo
                    </span>
                  </div>

                  {/* Spouse Method Toggle */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Estimation Method:</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {spouseCppMethod === 'service_canada' ? 'Service Canada SOC' : 'Percentage of Maximum'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateSpouseField('cppCalculationMethod', 'percentage')}
                        className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all ${
                          spouseCppMethod === 'percentage'
                            ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        % of Maximum
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSpouseField('cppCalculationMethod', 'service_canada')}
                        className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                          spouseCppMethod === 'service_canada'
                            ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Service Canada Statement
                      </button>
                    </div>
                  </div>

                  {/* Spouse CPP Start Age Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Spouse CPP Start Age (60 - 70):</span>
                      <span className="text-blue-700 dark:text-blue-400 font-bold">{inputs.spouse.cppStartAge} yrs</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={70}
                      step={1}
                      value={inputs.spouse.cppStartAge}
                      onChange={(e) => updateSpouseField('cppStartAge', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                    />
                    <div className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                      <span>Adjustment: {getCppAdjustmentText(inputs.spouse.cppStartAge)}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                        {inputs.spouse.cppStartAge < 65 ? '-0.6%/mo' : inputs.spouse.cppStartAge > 65 ? '+0.7%/mo' : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Spouse % of Max */}
                  {spouseCppMethod === 'percentage' && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Career Entitlement (% of Max):</span>
                          <span className="text-blue-700 dark:text-blue-400 font-mono font-bold">
                            {inputs.spouse.cppEstimatedPercentOfMax ?? 64}% of Maximum
                          </span>
                        </div>
                        <input
                          type="range"
                          min={30}
                          max={100}
                          step={5}
                          value={inputs.spouse.cppEstimatedPercentOfMax ?? 64}
                          onChange={(e) => updateSpouseField('cppEstimatedPercentOfMax', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '64% CRA Avg (~$917)', val: 64 },
                          { label: '85% Strong Career', val: 85 },
                          { label: '100% Max YMPE', val: 100 }
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => updateSpouseField('cppEstimatedPercentOfMax', preset.val)}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                              (inputs.spouse?.cppEstimatedPercentOfMax ?? 64) === preset.val
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-100/40 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">Anticipated CPP:</span>
                        <div className="text-right">
                          <span className="font-bold text-blue-700 dark:text-blue-300">
                            ${Math.round((1433.50 * ((inputs.spouse?.cppEstimatedPercentOfMax ?? 64) / 100)) * getCppTimingFactor(inputs.spouse?.cppStartAge || 65).factor).toLocaleString()} / mo
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1.5">
                            (${Math.round((1433.50 * ((inputs.spouse?.cppEstimatedPercentOfMax ?? 64) / 100)) * getCppTimingFactor(inputs.spouse?.cppStartAge || 65).factor * 12).toLocaleString()} / yr)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Spouse Service Canada Statement */}
                  {spouseCppMethod === 'service_canada' && spouseCppAdjResult && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
                      <div>
                        <div className="flex justify-between items-center text-xs font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Spouse Statement Monthly @ Age 65:</span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">From MSCA Statement</span>
                        </div>
                        <CurrencyInput
                          value={inputs.spouse?.cppServiceCanadaEstimateAt65 ?? 917}
                          onChange={(val) => updateSpouseField('cppServiceCanadaEstimateAt65', val)}
                          min={0}
                          step={50}
                          aria-label="Spouse Service Canada Statement Monthly CPP at Age 65"
                        />
                      </div>

                      {/* Quick Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '$600/mo', val: 600 },
                          { label: '$800/mo', val: 800 },
                          { label: '$1,000/mo', val: 1000 },
                          { label: '$1,200/mo', val: 1200 },
                          { label: '$1,433/mo (Max)', val: 1433 }
                        ].map((chip) => (
                          <button
                            key={chip.val}
                            type="button"
                            onClick={() => updateSpouseField('cppServiceCanadaEstimateAt65', chip.val)}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                              (inputs.spouse?.cppServiceCanadaEstimateAt65 ?? 917) === chip.val
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      {/* Spouse Actuarial Recalibration Box */}
                      <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-700/60 flex flex-col gap-2.5 text-xs shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/70 pb-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Spouse Recalibration Engine
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                            Dynamic Adjustment
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          Adjusted for spouse retiring at age <strong>{inputs.spouse.retirementAge}</strong>
                          {inputs.spouse.careerDisruption?.enabled ? ' and spouse career downturns' : ''}.
                        </p>

                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                            <span className="text-slate-600 dark:text-slate-400">1. Statement Base @ 65:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              ${spouseCppAdjResult.serviceCanadaMonthlyAt65.toFixed(2)}/mo
                            </span>
                          </div>

                          <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                            <span className="text-slate-600 dark:text-slate-400">
                              2. Early Retirement Dilution (Age {inputs.spouse.retirementAge}):
                            </span>
                            <span className={`font-semibold ${
                              spouseCppAdjResult.earlyRetirementImpactPercent < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {spouseCppAdjResult.earlyRetirementImpactPercent < 0
                                ? `${spouseCppAdjResult.earlyRetirementImpactPercent.toFixed(1)}% (${spouseCppAdjResult.earlyRetirementYearsLost} yrs early)`
                                : '0.0% (Working to 65+)'}
                            </span>
                          </div>

                          {spouseCppAdjResult.careerDownturnImpactPercent < 0 && (
                            <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                              <span className="text-slate-600 dark:text-slate-400">3. Career Downturn:</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {spouseCppAdjResult.careerDownturnImpactPercent.toFixed(1)}%
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                            <span className="text-slate-600 dark:text-slate-400">Adjusted Base @ 65:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              ${spouseCppAdjResult.adjustedMonthlyAt65.toFixed(2)}/mo (${Math.round(spouseCppAdjResult.adjustedAnnualAt65).toLocaleString()}/yr)
                            </span>
                          </div>

                          <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                            <span className="text-slate-600 dark:text-slate-400">Timing Adjustment (@ Age {inputs.spouse.cppStartAge}):</span>
                            <span className={`font-semibold ${
                              spouseCppAdjResult.timingAdjustmentPercent < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : spouseCppAdjResult.timingAdjustmentPercent > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {spouseCppAdjResult.timingAdjustmentPercent >= 0 ? '+' : ''}{spouseCppAdjResult.timingAdjustmentPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Spouse Final Banner */}
                        <div className="mt-1 p-2 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                              Anticipated Spouse CPP
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Effective {spouseCppAdjResult.effectivePercentOfMaxAtStartAge.toFixed(1)}% of 2026 Max
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">
                              ${Math.round(spouseCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString()} <span className="text-xs font-normal">/ mo</span>
                            </div>
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                              ${Math.round(spouseCppAdjResult.anticipatedAnnualAtStartAge).toLocaleString()} / yr (today's $)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Spouse OAS Card */}
                <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50/20 dark:bg-sky-500/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      Spouse Old Age Security (OAS)
                    </h5>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300">
                      Age {inputs.spouse.oasStartAge}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Spouse OAS Start Age (65 - 70):</span>
                      <span className="text-sky-700 dark:text-sky-400 font-bold">{inputs.spouse.oasStartAge} yrs</span>
                    </div>
                    <input
                      type="range"
                      min={65}
                      max={70}
                      step={1}
                      value={inputs.spouse.oasStartAge}
                      onChange={(e) => updateSpouseField('oasStartAge', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
                    />
                    <div className="mt-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                      Adjustment: {getOasAdjustmentText(inputs.spouse.oasStartAge)}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Years Lived in Canada:</span>
                      <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">
                        {inputs.spouse.oasEligibleYearsInCanada ?? 40} / 40 yrs
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={40}
                      step={1}
                      value={inputs.spouse.oasEligibleYearsInCanada ?? 40}
                      onChange={(e) => updateSpouseField('oasEligibleYearsInCanada', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CPP & OAS PENSIONS (PRIMARY) */}
        {activeTab === 'pensions' && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {isMarried ? 'Your Personal Government Pensions' : 'Government Assistance & Public Pensions'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Canada Pension Plan (CPP) and Old Age Security (OAS) timing trade-offs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-500/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Canada Pension Plan (CPP)
                  </h5>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                    Age {inputs.cppStartAge} • ${primaryCppMethod === 'service_canada' ? Math.round(primaryCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString() : Math.round((1433.50 * (inputs.cppEstimatedPercentOfMax / 100)) * getCppTimingFactor(inputs.cppStartAge).factor).toLocaleString()}/mo
                  </span>
                </div>

                {/* Calculation Mode Toggle */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Estimation Method:</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      {primaryCppMethod === 'service_canada' ? 'Service Canada SOC' : 'Percentage of Maximum'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateField('cppCalculationMethod', 'percentage')}
                      className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all ${
                        primaryCppMethod === 'percentage'
                          ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      % of Maximum
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('cppCalculationMethod', 'service_canada')}
                      className={`text-xs font-semibold py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                        primaryCppMethod === 'service_canada'
                          ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Service Canada Statement
                    </button>
                  </div>
                </div>

                {/* CPP Start Age Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">CPP Start Age (60 - 70):</span>
                    <span className="text-blue-700 dark:text-blue-400 font-bold">{inputs.cppStartAge} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={70}
                    step={1}
                    value={inputs.cppStartAge}
                    onChange={(e) => updateField('cppStartAge', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                  />
                  <div className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span>Adjustment: {getCppAdjustmentText(inputs.cppStartAge)}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      {inputs.cppStartAge < 65 ? '-0.6%/mo' : inputs.cppStartAge > 65 ? '+0.7%/mo' : 'Standard'}
                    </span>
                  </div>
                </div>

                {/* Sub-Panel: Percentage of Max */}
                {primaryCppMethod === 'percentage' && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Career Entitlement (% of Max):</span>
                        <span className="text-blue-700 dark:text-blue-400 font-mono font-bold">{inputs.cppEstimatedPercentOfMax}% of Maximum</span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={100}
                        step={5}
                        value={inputs.cppEstimatedPercentOfMax}
                        onChange={(e) => updateField('cppEstimatedPercentOfMax', Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '64% CRA Avg (~$917)', val: 64 },
                        { label: '85% Strong Career', val: 85 },
                        { label: '100% Max YMPE', val: 100 }
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => updateField('cppEstimatedPercentOfMax', preset.val)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                            inputs.cppEstimatedPercentOfMax === preset.val
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Preview Summary */}
                    <div className="p-2.5 rounded-lg bg-blue-100/40 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">Anticipated CPP:</span>
                      <div className="text-right">
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          ${Math.round((1433.50 * (inputs.cppEstimatedPercentOfMax / 100)) * getCppTimingFactor(inputs.cppStartAge).factor).toLocaleString()} / mo
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1.5">
                          (${Math.round((1433.50 * (inputs.cppEstimatedPercentOfMax / 100)) * getCppTimingFactor(inputs.cppStartAge).factor * 12).toLocaleString()} / yr)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Panel: Service Canada Statement */}
                {primaryCppMethod === 'service_canada' && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-blue-100 dark:border-blue-500/20">
                    <div>
                      <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Statement Monthly Estimate at Age 65:</span>
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">From My Service Canada (SOC)</span>
                      </div>
                      <CurrencyInput
                        value={inputs.cppServiceCanadaEstimateAt65 ?? 917}
                        onChange={(val) => updateField('cppServiceCanadaEstimateAt65', val)}
                        min={0}
                        step={50}
                        aria-label="Service Canada Statement Monthly CPP at Age 65"
                      />
                    </div>

                    {/* Quick Statement Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '$600/mo', val: 600 },
                        { label: '$800/mo', val: 800 },
                        { label: '$1,000/mo', val: 1000 },
                        { label: '$1,200/mo', val: 1200 },
                        { label: '$1,433/mo (Max)', val: 1433 }
                      ].map((chip) => (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => updateField('cppServiceCanadaEstimateAt65', chip.val)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                            (inputs.cppServiceCanadaEstimateAt65 ?? 917) === chip.val
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Actuarial Recalibration Breakdown Card */}
                    <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-700/60 flex flex-col gap-2.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/70 pb-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Service Canada Recalibration Engine
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Dynamic Actuarial Adjustment
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Service Canada assumes you earn at your recent pace until 65. Our engine recalibrates for retiring at age <strong>{inputs.retirementAge}</strong>
                        {inputs.careerDisruption?.enabled ? ' and modeled career downturns' : ''}.
                      </p>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                          <span className="text-slate-600 dark:text-slate-400">1. Statement Base @ 65:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            ${primaryCppAdjResult.serviceCanadaMonthlyAt65.toFixed(2)}/mo
                          </span>
                        </div>

                        <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                          <span className="text-slate-600 dark:text-slate-400">
                            2. Early Retirement Dilution (Age {inputs.retirementAge}):
                          </span>
                          <span className={`font-semibold ${
                            primaryCppAdjResult.earlyRetirementImpactPercent < 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {primaryCppAdjResult.earlyRetirementImpactPercent < 0
                              ? `${primaryCppAdjResult.earlyRetirementImpactPercent.toFixed(1)}% (${primaryCppAdjResult.earlyRetirementYearsLost} yrs early)`
                              : '0.0% (Working to 65+)'}
                          </span>
                        </div>

                        {primaryCppAdjResult.careerDownturnImpactPercent < 0 && (
                          <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                            <span className="text-slate-600 dark:text-slate-400">3. Career Downturn Impact:</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              {primaryCppAdjResult.careerDownturnImpactPercent.toFixed(1)}%
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                          <span className="text-slate-600 dark:text-slate-400">Adjusted Age-65 Baseline:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            ${primaryCppAdjResult.adjustedMonthlyAt65.toFixed(2)}/mo (${Math.round(primaryCppAdjResult.adjustedAnnualAt65).toLocaleString()}/yr)
                          </span>
                        </div>

                        <div className="flex justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/50">
                          <span className="text-slate-600 dark:text-slate-400">Collection Timing Factor (@ Age {inputs.cppStartAge}):</span>
                          <span className={`font-semibold ${
                            primaryCppAdjResult.timingAdjustmentPercent < 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : primaryCppAdjResult.timingAdjustmentPercent > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {primaryCppAdjResult.timingAdjustmentPercent >= 0 ? '+' : ''}{primaryCppAdjResult.timingAdjustmentPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Final Anticipated Benefit Banner */}
                      <div className="mt-1 p-2 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                            Anticipated True CPP
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Effective {primaryCppAdjResult.effectivePercentOfMaxAtStartAge.toFixed(1)}% of 2026 Max
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">
                            ${Math.round(primaryCppAdjResult.anticipatedMonthlyAtStartAge).toLocaleString()} <span className="text-xs font-normal">/ mo</span>
                          </div>
                          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            ${Math.round(primaryCppAdjResult.anticipatedAnnualAtStartAge).toLocaleString()} / yr (today's $)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50/20 dark:bg-sky-500/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Old Age Security (OAS)
                  </h5>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300">
                    Age {inputs.oasStartAge}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">OAS Start Age (65 - 70):</span>
                    <span className="text-sky-700 dark:text-sky-400 font-bold">{inputs.oasStartAge} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={65}
                    max={70}
                    step={1}
                    value={inputs.oasStartAge}
                    onChange={(e) => updateField('oasStartAge', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
                  />
                  <div className="mt-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    Adjustment: {getOasAdjustmentText(inputs.oasStartAge)}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Years Lived in Canada:</span>
                    <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">{inputs.oasEligibleYearsInCanada} / 40 yrs</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={inputs.oasEligibleYearsInCanada}
                    onChange={(e) => updateField('oasEligibleYearsInCanada', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-sky-600"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: MARKET RETURNS & INFLATION */}
        {activeTab === 'market' && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Economic Parameters & Per-Account Return Rates</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure expected return rates independently for each Canadian account vehicle</p>
            </div>

            {/* Individual Account Returns Grid */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Individual Account Expected Return Rates
                </span>
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                  Independent compounding rates applied directly to each account
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* RRSP */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-500/30 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">RRSP</span>
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Expected:</span>
                    <span className="text-sm font-extrabold text-blue-700 dark:text-blue-400 font-mono">
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
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                  />
                </div>

                {/* TFSA */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-500/30 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">TFSA</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Expected:</span>
                    <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
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
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* FHSA */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-500/30 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300">FHSA</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Expected:</span>
                    <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 font-mono">
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
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600"
                  />
                </div>

                {/* Non-Reg */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-500/30 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Non-Reg</span>
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0 ? 'Blended:' : 'Expected:'}
                    </span>
                    <span className="text-sm font-extrabold text-purple-700 dark:text-purple-400 font-mono">
                      {inputs.accountReturns?.nonRegReturn ?? 5.5}%
                    </span>
                  </div>
                  {inputs.nonRegCustomAccounts && inputs.nonRegCustomAccounts.length > 0 ? (
                    <div className="text-[9px] text-purple-800 dark:text-purple-300 font-semibold bg-purple-50/80 dark:bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-500/30 text-center">
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
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-purple-600"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Macroeconomic & Tax Friction</h5>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Annual CPI Inflation Rate:</span>
                    <span className="text-rose-700 dark:text-rose-400 font-mono font-bold">{inputs.inflationRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    value={inputs.inflationRate}
                    onChange={(e) => updateField('inflationRate', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-600"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Bank of Canada benchmark target is 2.0%</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Taxable Account Annual Tax Drag:</span>
                    <span className="text-purple-700 dark:text-purple-400 font-mono font-bold">{inputs.nonRegYieldTaxRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    value={inputs.nonRegYieldTaxRate}
                    onChange={(e) => updateField('nonRegYieldTaxRate', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-purple-600"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Estimated annual tax friction on dividend yields and realized capital gains</span>
                </div>
              </div>

              {inputs.realEstate?.ownsHome ? (
                <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Property Appreciation</h5>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Real Estate Annual Appreciation Rate:
                      </span>
                      <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">{inputs.realEstate.annualAppreciationRate}%</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={7.0}
                      step={0.1}
                      value={inputs.realEstate.annualAppreciationRate}
                      onChange={(e) => updateRealEstateField('annualAppreciationRate', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-600"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Long-term Canadian residential market appreciation (CREA average ~3.2%)</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Per-Account Compounding Active</p>
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
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Post-Retirement Drawdown Sequencing</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how {isMarried ? 'household' : 'personal'} assets are liquidated to minimize Canadian taxes
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div
                onClick={() => updateField('drawdownStrategy', 'tax_efficient')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'tax_efficient'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">1. Tax-Efficient Classic</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">Non-Reg first → RRSP/RRIF second → TFSA last.</span>
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'rrsp_meltdown')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'rrsp_meltdown'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">2. RRSP Meltdown</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                    Bracket Smoothing
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">Early RRSP draws before age 71 to fill lower tax brackets.</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Calculates optimal break-even age to prevent OAS clawbacks & estate taxes.</span>
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'proportional')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'proportional'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">3. Proportional (Pro-Rata)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Balanced
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Withdraws evenly across accounts based on asset weighting.
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'tfsa_first')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'tfsa_first'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">4. TFSA First</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    Zero-Tax Early
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Depletes TFSA first to achieve zero tax early in retirement.
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'minimize_overall_tax')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'minimize_overall_tax'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">5. Minimize Overall Tax</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    Lifetime Optimizer
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Equalizes taxable income across all career & retirement brackets.</span>
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'maximize_govt_pensions')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'maximize_govt_pensions'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">6. Maximize Govt Pensions</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300">
                    CPP/OAS Maximizer
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-400">Bridges with portfolio to Age 70 for +42% permanent indexed benefits.</span>
                </p>
              </div>

              <div
                onClick={() => updateField('drawdownStrategy', 'minimize_post_retirement_tax')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  inputs.drawdownStrategy === 'minimize_post_retirement_tax'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">7. Minimize Post-Retirement Tax</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300">
                    Decumulation Focus
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-purple-700 dark:text-purple-400">Keeps withdrawals strictly within BPA & lowest brackets; rest tax-free.</span>
                </p>
              </div>

            </div>
          </div>
        )}

        {/* TAB: EXPAT EMIGRATION & NON-RESIDENT RETIREMENT */}
        {activeTab === 'expat' && (
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
                    checked={Boolean(inputs.expat?.planToEmigrate)}
                    onChange={(e) => updateExpatField('planToEmigrate', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            </div>

            {/* If Expat Plan is Inactive */}
            {!inputs.expat?.planToEmigrate && (
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
            {inputs.expat?.planToEmigrate && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                
                {/* Destination Country Selection */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>1. Which country do you plan to settle in?</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      Selected: <strong className="text-cyan-900 dark:text-cyan-300 font-bold">{EXPAT_DESTINATIONS.find(d => d.id === (inputs.expat?.destinationCountryId || 'mexico'))?.name}</strong>
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
                        const isSelected = dest.id === (inputs.expat?.destinationCountryId || 'mexico');
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
                        Age {inputs.expat?.emigrationAge || inputs.retirementAge}
                      </strong>
                    </div>

                    <input
                      type="range"
                      min={inputs.currentAge}
                      max={inputs.lifeExpectancy - 2}
                      step={1}
                      value={inputs.expat?.emigrationAge || inputs.retirementAge}
                      onChange={(e) => updateExpatField('emigrationAge', Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
                    />

                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>Current ({inputs.currentAge})</span>
                      <span>Retire ({inputs.retirementAge})</span>
                      <span>Max ({inputs.lifeExpectancy})</span>
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {(inputs.expat?.emigrationAge || inputs.retirementAge) < inputs.retirementAge
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
                        {inputs.expat?.yearsLivedInCanadaAfter18 || 30} Years
                      </strong>
                    </div>

                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={inputs.expat?.yearsLivedInCanadaAfter18 || 30}
                      onChange={(e) => updateExpatField('yearsLivedInCanadaAfter18', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
                    />

                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>5 yrs</span>
                      <span className="text-indigo-700 dark:text-indigo-300 font-bold">20 yrs (OAS Worldwide Threshold)</span>
                      <span>40 yrs (Full OAS)</span>
                    </div>

                    <div className="text-[11px] mt-1 flex items-center gap-1.5">
                      {(inputs.expat?.yearsLivedInCanadaAfter18 || 30) >= 20 ? (
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
                {inputs.realEstate?.ownsHome && (
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
                          (inputs.expat?.realEstateStrategy || 'keep_and_rent') === 'sell_before_departure'
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
                          (inputs.expat?.realEstateStrategy || 'keep_and_rent') === 'keep_and_rent'
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
                          (inputs.expat?.realEstateStrategy || 'keep_and_rent') === 'sell_after_departure'
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
        )}

          </div>
      )}
    </div>
  );
};
