import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Users,
  Heart,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { MaritalStatus, RetirementInputs } from '../types/retirement';
import { DEFAULT_SPOUSE_INPUTS } from '../utils/presets';
import { getDebtQualifierFlags } from '../utils/debtCalculator';
import { useSimulationStore, AUTOSAVE_PLAN_STORAGE_KEY } from '../store/useSimulationStore';
import { useInputTabDispatch } from './InputTabs/inputTabHelpers';
import { PrimaryProfileTab } from './InputTabs/PrimaryProfileTab';
import { LivingExpensesTab } from './InputTabs/LivingExpensesTab';
import { PrimaryAccountsTab } from './InputTabs/PrimaryAccountsTab';
import { DebtsTab } from './InputTabs/DebtsTab';
import { RealEstateTab } from './InputTabs/RealEstateTab';
import { SpouseProfileTab } from './InputTabs/SpouseProfileTab';
import { PensionsTab } from './InputTabs/PensionsTab';
import { ReturnsInflationTab } from './InputTabs/ReturnsInflationTab';
import { DrawdownStrategyTab } from './InputTabs/DrawdownStrategyTab';
import { ExpatRelocationTab } from './InputTabs/ExpatRelocationTab';

interface AutoSaveStatusBadgeProps {
  externalInputs?: RetirementInputs;
}

const AutoSaveStatusBadge: React.FC<AutoSaveStatusBadgeProps> = React.memo(({ externalInputs }) => {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(AUTOSAVE_PLAN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.timestamp) {
            return new Date(parsed.timestamp);
          }
        }
      } catch (_) {}
    }
    return null;
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const latestExternalInputsRef = useRef<RetirementInputs | undefined>(externalInputs);
  latestExternalInputsRef.current = externalInputs;

  const persistPlanData = useCallback((currentInputs: RetirementInputs) => {
    if (typeof window === 'undefined') return;
    try {
      setSaveStatus('saving');
      localStorage.setItem(
        AUTOSAVE_PLAN_STORAGE_KEY,
        JSON.stringify({
          inputs: currentInputs,
          timestamp: new Date().toISOString(),
          version: '2026.1'
        })
      );
      setLastSavedAt(new Date());
      setSaveStatus('saved');
    } catch (err) {
      console.warn('Auto-save to localStorage failed:', err);
      setSaveStatus('idle');
    }
  }, []);

  // Uncontrolled store subscription: debounced save without re-rendering InputPanel
  useEffect(() => {
    if (externalInputs !== undefined) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useSimulationStore.subscribe((state, prevState) => {
      if (state.inputs !== prevState.inputs) {
        setSaveStatus('saving');
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          persistPlanData(useSimulationStore.getState().inputs);
        }, 1200);
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [externalInputs !== undefined, persistPlanData]);

  // Controlled-prop debounced save (when explicit inputs prop is supplied)
  useEffect(() => {
    if (externalInputs === undefined) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      persistPlanData(externalInputs);
    }, 1200);
    return () => clearTimeout(timer);
  }, [externalInputs, persistPlanData]);

  // Periodic background persistence interval (every 25s) & unload flush — attached once without churning on keystrokes
  useEffect(() => {
    const getLatest = () => latestExternalInputsRef.current ?? useSimulationStore.getState().inputs;
    const interval = setInterval(() => {
      persistPlanData(getLatest());
    }, 25000);

    const handleBeforeUnload = () => {
      persistPlanData(getLatest());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistPlanData(getLatest());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [persistPlanData]);

  const handleManualSave = useCallback(() => {
    const current = latestExternalInputsRef.current ?? useSimulationStore.getState().inputs;
    persistPlanData(current);
  }, [persistPlanData]);

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs shadow-2xs"
      title="Plan data is automatically persisted to browser local storage so your progress is preserved across sessions"
    >
      {saveStatus === 'saving' ? (
        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="font-medium text-[11px]">Saving...</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium">
            {lastSavedAt ? (
              <>
                Auto-saved <span className="text-slate-400 dark:text-slate-500 font-mono">({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
              </>
            ) : (
              'Auto-save active'
            )}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleManualSave}
        title="Click to force-save current plan inputs to local storage now"
        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
      >
        <Save className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

AutoSaveStatusBadge.displayName = 'AutoSaveStatusBadge';

export interface InputPanelProps {
  inputs?: RetirementInputs;
  onChange?: React.Dispatch<React.SetStateAction<RetirementInputs>> | ((inputs: RetirementInputs) => void);
}

export const InputPanel: React.FC<InputPanelProps> = React.memo((props) => {
  const isPlanningCollapsed = useSimulationStore((state) => Boolean(state.collapsedSections.planning));
  const activeTab = useSimulationStore((state) => state.activeInputTab);
  const setActiveTab = useSimulationStore((state) => state.setActiveInputTab);
  const toggleSectionCollapse = useSimulationStore((state) => state.toggleSectionCollapse);
  const setSectionCollapse = useSimulationStore((state) => state.setSectionCollapse);

  const { dispatchInputsChange } = useInputTabDispatch(props.onChange);

  // Atomic primitive summary & tab-qualifier selectors (zero cascading renders on unrelated edits)
  const storeHeaderSummary = useSimulationStore(
    useShallow((state) => ({
      maritalStatus: state.inputs.maritalStatus,
      userName: state.inputs.userName,
      currentAge: state.inputs.currentAge,
      retirementAge: state.inputs.retirementAge,
      currentAnnualIncome: state.inputs.currentAnnualIncome,
      targetRetirementSpendingToday: state.inputs.targetRetirementSpendingToday,
      province: state.inputs.province
    }))
  );

  const storeQualifiers = useSimulationStore(
    useShallow((state) => {
      const dFlags = getDebtQualifierFlags(state.inputs);
      const hStatus: 'own' | 'rent' = state.inputs.housingStatus ?? (
        state.inputs.realEstate?.ownsHome && state.inputs.realEstate?.purchaseType !== 'future'
          ? 'own'
          : (state.inputs.realEstate?.purchaseType === 'future' ? 'rent' : (state.inputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
      );
      const planFutureHome: boolean = state.inputs.planFutureHomePurchase ?? Boolean(
        state.inputs.realEstate?.ownsHome && state.inputs.realEstate?.purchaseType === 'future'
      );
      const showRealEstate = hStatus === 'own' || (hStatus === 'rent' && planFutureHome);
      const planExpat: boolean = state.inputs.planExpatExit ?? Boolean(state.inputs.expat?.planToEmigrate);
      return {
        hasDebtModule: dFlags.hasDebtModule,
        showRealEstateSection: showRealEstate,
        planExpatExit: planExpat
      };
    })
  );

  const summary = props.inputs
    ? {
        maritalStatus: props.inputs.maritalStatus,
        userName: props.inputs.userName,
        currentAge: props.inputs.currentAge,
        retirementAge: props.inputs.retirementAge,
        currentAnnualIncome: props.inputs.currentAnnualIncome,
        targetRetirementSpendingToday: props.inputs.targetRetirementSpendingToday,
        province: props.inputs.province
      }
    : storeHeaderSummary;

  const isMarried = summary.maritalStatus === 'married';
  const isExpanded = !isPlanningCollapsed;

  const setIsExpanded = useCallback(
    (expanded: boolean | ((prev: boolean) => boolean)) => {
      if (typeof expanded === 'function') {
        toggleSectionCollapse('planning');
      } else {
        setSectionCollapse('planning', !expanded);
      }
    },
    [toggleSectionCollapse, setSectionCollapse]
  );

  const propQualifiers = useMemo(() => {
    if (!props.inputs) return null;
    const dFlags = getDebtQualifierFlags(props.inputs);
    const hStatus: 'own' | 'rent' = props.inputs.housingStatus ?? (
      props.inputs.realEstate?.ownsHome && props.inputs.realEstate?.purchaseType !== 'future'
        ? 'own'
        : (props.inputs.realEstate?.purchaseType === 'future' ? 'rent' : (props.inputs.realEstate?.ownsHome === false ? 'rent' : 'own'))
    );
    const planFutureHome: boolean = props.inputs.planFutureHomePurchase ?? Boolean(
      props.inputs.realEstate?.ownsHome && props.inputs.realEstate?.purchaseType === 'future'
    );
    return {
      hasDebtModule: dFlags.hasDebtModule,
      showRealEstateSection: hStatus === 'own' || (hStatus === 'rent' && planFutureHome),
      planExpatExit: props.inputs.planExpatExit ?? Boolean(props.inputs.expat?.planToEmigrate)
    };
  }, [props.inputs]);

  const hasDebts = propQualifiers ? propQualifiers.hasDebtModule : storeQualifiers.hasDebtModule;
  const showRealEstateSection = propQualifiers ? propQualifiers.showRealEstateSection : storeQualifiers.showRealEstateSection;
  const planExpatExit = propQualifiers ? propQualifiers.planExpatExit : storeQualifiers.planExpatExit;

  useEffect(() => {
    if (activeTab === 'debts' && !hasDebts) {
      setActiveTab('personal');
    } else if (activeTab === 'realestate' && !showRealEstateSection) {
      setActiveTab('personal');
    } else if (activeTab === 'expat' && !planExpatExit) {
      setActiveTab('personal');
    } else if (activeTab === 'spouse' && !isMarried) {
      setActiveTab('personal');
    }
  }, [activeTab, hasDebts, showRealEstateSection, planExpatExit, isMarried, setActiveTab]);

  const handleMaritalStatusChange = useCallback(
    (status: MaritalStatus) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
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
    },
    [dispatchInputsChange, setActiveTab, activeTab]
  );

  return (
    <div
      data-focus-zone="input-content"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-colors"
    >

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
                summary.maritalStatus !== 'married'
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
                summary.maritalStatus === 'married'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Married / Common-Law</span>
            </button>
          </div>

          {/* Auto-Save Status Indicator & Manual Save Button (Isolated so timer/status updates never re-render InputPanel) */}
          <AutoSaveStatusBadge externalInputs={props.inputs} />

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
            {summary.userName && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{summary.userName}</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Age <strong className="text-slate-900 dark:text-white">{summary.currentAge}</strong> (Retiring @ <strong className="text-emerald-600 dark:text-emerald-400">{summary.retirementAge}</strong>)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Income: <strong className="text-slate-900 dark:text-white">${summary.currentAnnualIncome.toLocaleString()}/yr</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Target Spending: <strong className="text-slate-900 dark:text-white">${summary.targetRetirementSpendingToday.toLocaleString()}/yr</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300">
              Province: <strong className="text-slate-900 dark:text-white">{summary.province}</strong>
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

      {/* Expanded Content — renders ONLY the active tab sub-component */}
      {isExpanded && (
        <div className="p-5 sm:p-6">
          {activeTab === 'personal' && (
            <PrimaryProfileTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'expenses' && (
            <LivingExpensesTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'accounts' && (
            <PrimaryAccountsTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'debts' && (
            <DebtsTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'realestate' && (
            <RealEstateTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'spouse' && isMarried && (
            <SpouseProfileTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'pensions' && (
            <PensionsTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'market' && (
            <ReturnsInflationTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'strategy' && (
            <DrawdownStrategyTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
          {activeTab === 'expat' && (
            <ExpatRelocationTab externalInputs={props.inputs} externalOnChange={props.onChange} />
          )}
        </div>
      )}
    </div>
  );
});

InputPanel.displayName = 'InputPanel';
