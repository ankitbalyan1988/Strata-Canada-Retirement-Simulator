import { create } from 'zustand';
import {
  CanadianProvince,
  RetirementInputs,
  ScenarioPreset,
  SimulationSummary,
  YearSimulationResult,
  StressTestOptions
} from '../types/retirement';
import { ExpatInputs } from '../types/expat';
import { WhatIfSettings } from '../types/whatIf';
import { DEFAULT_INPUTS } from '../utils/presets';
import { DEFAULT_WHAT_IF_SETTINGS } from '../utils/whatIfCalculator';
import {
  runRetirementSimulation,
  calculateSavingsPulse,
  SavingsPulseResult,
  fastSimulateEndNetWorth
} from '../utils/simulator';
import { calculateSimulationAsync } from '../utils/simulationClient';
import { triggerConfetti } from '../utils/confettiHelper';

export interface SimulationState {
  // Primary state
  inputs: RetirementInputs;
  activePresetId: string;
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  optimisticSummary: SimulationSummary;
  pulse: SavingsPulseResult;
  isCalculating: boolean;
  isRecalculatingLedger: boolean;

  // Stress test
  isStressTestActive: boolean;
  stressTiming: 'at_retirement' | 'immediate';
  stressSimulation: {
    yearlyResults: YearSimulationResult[];
    summary: SimulationSummary;
    isCalculating: boolean;
  };

  // UI & Modals
  theme: 'light' | 'dark';
  activeChartTab: 'networth' | 'cashflow';
  isExportingPdf: boolean;
  isCompareModalOpen: boolean;
  isAIPersonaModalOpen: boolean;

  // What-If Sensitivity Analysis
  whatIfSettings: WhatIfSettings;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setInputs: (inputs: RetirementInputs | ((prev: RetirementInputs) => RetirementInputs)) => void;
  updateField: <K extends keyof RetirementInputs>(
    field: K,
    value: RetirementInputs[K] | ((prev: RetirementInputs[K]) => RetirementInputs[K])
  ) => void;
  setActivePresetId: (id: string) => void;
  selectPreset: (preset: ScenarioPreset) => void;
  resetToDefault: () => void;
  applyRetirementAge: (age: number) => void;
  applyProvince: (province: CanadianProvince) => void;
  applyMonthlyBoost: (additionalMonthly: number) => void;
  applyAIPersona: (newInputs: RetirementInputs) => void;
  updateExpatInputs: (newExpat: ExpatInputs) => void;
  setIsStressTestActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  setStressTiming: (timing: 'at_retirement' | 'immediate') => void;
  setIsWhatIfActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  setWhatIfSettings: (settings: Partial<WhatIfSettings> | ((prev: WhatIfSettings) => WhatIfSettings)) => void;
  resetWhatIfSettings: () => void;
  setActiveChartTab: (tab: 'networth' | 'cashflow') => void;
  setIsCompareModalOpen: (open: boolean) => void;
  setIsAIPersonaModalOpen: (open: boolean) => void;
  exportPdf: () => Promise<void>;
}

/**
 * Fast-pass synchronous calculator:
 * Uses fastSimulateEndNetWorth to immediately compute responsive KPI values
 * (funded status, readiness score, nest egg at retirement & life expectancy) in <0.1ms.
 */
export function computeOptimisticSummary(
  inputs: RetirementInputs,
  baseSummary: SimulationSummary
): SimulationSummary {
  const fastRes = fastSimulateEndNetWorth(inputs);
  const totalYearsInRetirement = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
  const yearsFunded = fastRes.isFullyFunded
    ? totalYearsInRetirement
    : (fastRes.depletionAge !== null && fastRes.depletionAge !== undefined
        ? Math.max(0, fastRes.depletionAge - inputs.retirementAge)
        : 0);
  const readinessScore = fastRes.isFullyFunded
    ? 100
    : Math.min(99, Math.max(0, Math.round((yearsFunded / totalYearsInRetirement) * 100)));

  const netWorthAtRetire = Math.round(fastRes.netWorthAtRetirement);
  const netWorthAtEnd = Math.round(fastRes.netWorthAtLifeExpectancy);

  return {
    ...baseSummary,
    isFullyFunded: fastRes.isFullyFunded,
    netWorthAtRetirement: netWorthAtRetire,
    netWorthAtLifeExpectancy: netWorthAtEnd,
    portfolioDepletionAge: fastRes.depletionAge,
    totalYearsInRetirement,
    yearsFunded,
    readinessScore,
    retirementAge: inputs.retirementAge,
    cppStartAge: inputs.cppStartAge,
    oasStartAge: inputs.oasStartAge,
    peakNetWorth: Math.max(baseSummary.peakNetWorth, netWorthAtRetire),
    peakNetWorthAge: netWorthAtRetire > baseSummary.peakNetWorth ? inputs.retirementAge : baseSummary.peakNetWorthAge
  };
}

// Module-scoped timer and request tracker for debounced execution (250ms)
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentRunId = 0;

function scheduleHeavyCalculation(
  get: () => SimulationState,
  set: (fn: (state: SimulationState) => Partial<SimulationState>) => void
) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set isRecalculatingLedger and isCalculating to true while waiting or running
  set(() => ({
    isRecalculatingLedger: true,
    isCalculating: true
  }));

  debounceTimer = setTimeout(async () => {
    const runId = ++currentRunId;
    const { inputs, isStressTestActive, stressTiming } = get();

    try {
      const mainPromise = calculateSimulationAsync(inputs);
      const stressPromise = isStressTestActive
        ? calculateSimulationAsync(inputs, { enabled: true, dropPercent: 10, timing: stressTiming })
        : Promise.resolve(null);

      const [mainResult, stressResult] = await Promise.all([mainPromise, stressPromise]);

      if (runId === currentRunId) {
        set((state) => ({
          yearlyResults: mainResult.yearlyResults,
          summary: mainResult.summary,
          optimisticSummary: mainResult.summary,
          pulse: mainResult.pulse,
          stressSimulation: stressResult
            ? {
                yearlyResults: stressResult.yearlyResults,
                summary: stressResult.summary,
                isCalculating: false
              }
            : state.stressSimulation,
          isCalculating: false,
          isRecalculatingLedger: false
        }));
      }
    } catch (err) {
      console.warn('Simulation worker execution failed, running synchronous fallback:', err);
      try {
        const sim = runRetirementSimulation(inputs);
        const pulse = calculateSavingsPulse(inputs, sim.summary);
        if (runId === currentRunId) {
          set(() => ({
            yearlyResults: sim.yearlyResults,
            summary: sim.summary,
            optimisticSummary: sim.summary,
            pulse,
            isCalculating: false,
            isRecalculatingLedger: false
          }));
        }
      } catch (fallbackErr) {
        console.error('Fatal simulation error:', fallbackErr);
        if (runId === currentRunId) {
          set(() => ({
            isCalculating: false,
            isRecalculatingLedger: false
          }));
        }
      }
    }
  }, 250);
}

// Compute initial state synchronously on first load
const initialSim = runRetirementSimulation(DEFAULT_INPUTS);
const initialPulse = calculateSavingsPulse(DEFAULT_INPUTS, initialSim.summary);

// Theme detection
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('strata-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (_) {}
  }
  return 'light';
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  inputs: DEFAULT_INPUTS,
  activePresetId: 'canadian_average',
  yearlyResults: initialSim.yearlyResults,
  summary: initialSim.summary,
  optimisticSummary: initialSim.summary,
  pulse: initialPulse,
  isCalculating: false,
  isRecalculatingLedger: false,

  isStressTestActive: false,
  stressTiming: 'at_retirement',
  stressSimulation: {
    yearlyResults: [],
    summary: {} as SimulationSummary,
    isCalculating: false
  },

  theme: getInitialTheme(),
  activeChartTab: 'networth',
  isExportingPdf: false,
  isCompareModalOpen: false,
  isAIPersonaModalOpen: false,
  whatIfSettings: DEFAULT_WHAT_IF_SETTINGS,

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata-theme', theme);
      } catch (_) {}
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setInputs: (newInputs) => {
    const prevInputs = get().inputs;
    const nextInputs = typeof newInputs === 'function' ? newInputs(prevInputs) : newInputs;
    const optimisticSummary = computeOptimisticSummary(nextInputs, get().summary);

    set({
      inputs: nextInputs,
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  updateField: (field, value) => {
    const prevInputs = get().inputs;
    const nextValue = typeof value === 'function' ? (value as any)(prevInputs[field]) : value;
    const nextInputs = {
      ...prevInputs,
      [field]: nextValue
    };
    const optimisticSummary = computeOptimisticSummary(nextInputs, get().summary);

    set({
      inputs: nextInputs,
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  setActivePresetId: (id) => {
    set({ activePresetId: id });
  },

  selectPreset: (preset) => {
    const optimisticSummary = computeOptimisticSummary(preset.inputs, get().summary);
    set({
      inputs: preset.inputs,
      activePresetId: preset.id,
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  resetToDefault: () => {
    const optimisticSummary = computeOptimisticSummary(DEFAULT_INPUTS, get().summary);
    set({
      inputs: DEFAULT_INPUTS,
      activePresetId: 'canadian_average',
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  applyRetirementAge: (age) => {
    const prevInputs = get().inputs;
    const prevSummary = get().summary;
    const updatedInputs = {
      ...prevInputs,
      retirementAge: age
    };

    const optimisticSummary = computeOptimisticSummary(updatedInputs, prevSummary);

    if (optimisticSummary.isFullyFunded && !prevSummary.isFullyFunded) {
      triggerConfetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    set({
      inputs: updatedInputs,
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  applyProvince: (province) => {
    const nextInputs = {
      ...get().inputs,
      province
    };
    const optimisticSummary = computeOptimisticSummary(nextInputs, get().summary);

    set({
      inputs: nextInputs,
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  applyMonthlyBoost: (additionalMonthly) => {
    const state = get();
    const annualAddition = additionalMonthly * 12;
    const rrspRoomLeft = Math.max(0, 32490 - state.inputs.rrspAnnualContribution);
    const toRrsp = Math.min(annualAddition, rrspRoomLeft);
    const remainder = annualAddition - toRrsp;
    const tfsaRoomLeft = Math.max(0, 7000 - state.inputs.tfsaAnnualContribution);
    const toTfsa = Math.min(remainder, tfsaRoomLeft);
    const toNonReg = remainder - toTfsa;

    const nextInputs = {
      ...state.inputs,
      rrspAnnualContribution: state.inputs.rrspAnnualContribution + toRrsp,
      tfsaAnnualContribution: state.inputs.tfsaAnnualContribution + toTfsa,
      nonRegAnnualContribution: state.inputs.nonRegAnnualContribution + toNonReg
    };
    const optimisticSummary = computeOptimisticSummary(nextInputs, state.summary);

    set({
      inputs: nextInputs,
      optimisticSummary,
      isRecalculatingLedger: true
    });

    triggerConfetti({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.6 }
    });

    scheduleHeavyCalculation(get, set);
  },

  applyAIPersona: (newInputs) => {
    const optimisticSummary = computeOptimisticSummary(newInputs, get().summary);
    set({
      inputs: newInputs,
      activePresetId: 'custom_ai',
      optimisticSummary,
      isRecalculatingLedger: true
    });

    triggerConfetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });

    scheduleHeavyCalculation(get, set);
  },

  updateExpatInputs: (newExpat) => {
    const nextInputs = {
      ...get().inputs,
      expat: newExpat
    };
    const optimisticSummary = computeOptimisticSummary(nextInputs, get().summary);

    set({
      inputs: nextInputs,
      optimisticSummary,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  setIsStressTestActive: (active) => {
    set((state) => ({
      isStressTestActive: typeof active === 'function' ? active(state.isStressTestActive) : active,
      isRecalculatingLedger: true
    }));
    scheduleHeavyCalculation(get, set);
  },

  setStressTiming: (timing) => {
    set({ stressTiming: timing, isRecalculatingLedger: true });
    scheduleHeavyCalculation(get, set);
  },

  setIsWhatIfActive: (active) => {
    set((state) => ({
      whatIfSettings: {
        ...state.whatIfSettings,
        isActive: typeof active === 'function' ? active(state.whatIfSettings.isActive) : active
      }
    }));
  },

  setWhatIfSettings: (updater) => {
    set((state) => ({
      whatIfSettings: {
        ...state.whatIfSettings,
        ...(typeof updater === 'function' ? updater(state.whatIfSettings) : updater)
      }
    }));
  },

  resetWhatIfSettings: () => {
    set(() => ({
      whatIfSettings: DEFAULT_WHAT_IF_SETTINGS
    }));
  },

  setActiveChartTab: (tab) => {
    set({ activeChartTab: tab });
  },

  setIsCompareModalOpen: (open) => {
    set({ isCompareModalOpen: open });
  },

  setIsAIPersonaModalOpen: (open) => {
    set({ isAIPersonaModalOpen: open });
  },

  exportPdf: async () => {
    const { inputs, summary, yearlyResults } = get();
    try {
      set({ isExportingPdf: true });
      const { generateRetirementPdfReport } = await import('../utils/pdfExport');
      generateRetirementPdfReport(inputs, summary, yearlyResults);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      set({ isExportingPdf: false });
    }
  }
}));
