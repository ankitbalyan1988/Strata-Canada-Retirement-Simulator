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
import { DEFAULT_INPUTS } from '../utils/presets';
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
  pulse: SavingsPulseResult;
  isCalculating: boolean;

  // Stress test
  isStressTestActive: boolean;
  stressTiming: 'at_retirement' | 'immediate';
  stressSimulation: {
    yearlyResults: YearSimulationResult[];
    summary: SimulationSummary;
    isCalculating: boolean;
  };

  // UI & Modals
  activeChartTab: 'networth' | 'cashflow';
  isExportingPdf: boolean;
  isCompareModalOpen: boolean;
  isAIPersonaModalOpen: boolean;

  // Actions
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
  setActiveChartTab: (tab: 'networth' | 'cashflow') => void;
  setIsCompareModalOpen: (open: boolean) => void;
  setIsAIPersonaModalOpen: (open: boolean) => void;
  exportPdf: () => Promise<void>;
}

// Module-scoped timer and request tracker for debounced worker execution
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentRunId = 0;

function scheduleWorkerCalculation(
  get: () => SimulationState,
  set: (fn: (state: SimulationState) => Partial<SimulationState>) => void
) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  set(() => ({ isCalculating: true }));

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
          pulse: mainResult.pulse,
          stressSimulation: stressResult
            ? {
                yearlyResults: stressResult.yearlyResults,
                summary: stressResult.summary,
                isCalculating: false
              }
            : state.stressSimulation,
          isCalculating: false
        }));
      }
    } catch (err) {
      console.error('Failed to run simulation in worker:', err);
      if (runId === currentRunId) {
        set(() => ({ isCalculating: false }));
      }
    }
  }, 50);
}

// Compute initial state synchronously on first load
const initialSim = runRetirementSimulation(DEFAULT_INPUTS);
const initialPulse = calculateSavingsPulse(DEFAULT_INPUTS, initialSim.summary);

export const useSimulationStore = create<SimulationState>((set, get) => ({
  inputs: DEFAULT_INPUTS,
  activePresetId: 'canadian_average',
  yearlyResults: initialSim.yearlyResults,
  summary: initialSim.summary,
  pulse: initialPulse,
  isCalculating: false,

  isStressTestActive: false,
  stressTiming: 'at_retirement',
  stressSimulation: {
    yearlyResults: [],
    summary: {} as SimulationSummary,
    isCalculating: false
  },

  activeChartTab: 'networth',
  isExportingPdf: false,
  isCompareModalOpen: false,
  isAIPersonaModalOpen: false,

  setInputs: (newInputs) => {
    set((state) => ({
      inputs: typeof newInputs === 'function' ? newInputs(state.inputs) : newInputs
    }));
    scheduleWorkerCalculation(get, set);
  },

  updateField: (field, value) => {
    set((state) => ({
      inputs: {
        ...state.inputs,
        [field]: typeof value === 'function' ? (value as any)(state.inputs[field]) : value
      }
    }));
    scheduleWorkerCalculation(get, set);
  },

  setActivePresetId: (id) => {
    set({ activePresetId: id });
  },

  selectPreset: (preset) => {
    set({
      inputs: preset.inputs,
      activePresetId: preset.id
    });
    scheduleWorkerCalculation(get, set);
  },

  resetToDefault: () => {
    set({
      inputs: DEFAULT_INPUTS,
      activePresetId: 'canadian_average'
    });
    scheduleWorkerCalculation(get, set);
  },

  applyRetirementAge: (age) => {
    const prevSummary = get().summary;
    set((state) => {
      const updated = {
        ...state.inputs,
        retirementAge: age
      };

      const testRes = fastSimulateEndNetWorth(updated);
      if (testRes.isFullyFunded && !prevSummary.isFullyFunded) {
        triggerConfetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      return { inputs: updated };
    });
    scheduleWorkerCalculation(get, set);
  },

  applyProvince: (province) => {
    set((state) => ({
      inputs: {
        ...state.inputs,
        province
      }
    }));
    scheduleWorkerCalculation(get, set);
  },

  applyMonthlyBoost: (additionalMonthly) => {
    set((state) => {
      const annualAddition = additionalMonthly * 12;
      const rrspRoomLeft = Math.max(0, 32490 - state.inputs.rrspAnnualContribution);
      const toRrsp = Math.min(annualAddition, rrspRoomLeft);
      const remainder = annualAddition - toRrsp;
      const tfsaRoomLeft = Math.max(0, 7000 - state.inputs.tfsaAnnualContribution);
      const toTfsa = Math.min(remainder, tfsaRoomLeft);
      const toNonReg = remainder - toTfsa;

      return {
        inputs: {
          ...state.inputs,
          rrspAnnualContribution: state.inputs.rrspAnnualContribution + toRrsp,
          tfsaAnnualContribution: state.inputs.tfsaAnnualContribution + toTfsa,
          nonRegAnnualContribution: state.inputs.nonRegAnnualContribution + toNonReg
        }
      };
    });

    triggerConfetti({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.6 }
    });

    scheduleWorkerCalculation(get, set);
  },

  applyAIPersona: (newInputs) => {
    set({
      inputs: newInputs,
      activePresetId: 'custom_ai'
    });

    triggerConfetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });

    scheduleWorkerCalculation(get, set);
  },

  updateExpatInputs: (newExpat) => {
    set((state) => ({
      inputs: {
        ...state.inputs,
        expat: newExpat
      }
    }));
    scheduleWorkerCalculation(get, set);
  },

  setIsStressTestActive: (active) => {
    set((state) => ({
      isStressTestActive: typeof active === 'function' ? active(state.isStressTestActive) : active
    }));
    scheduleWorkerCalculation(get, set);
  },

  setStressTiming: (timing) => {
    set({ stressTiming: timing });
    scheduleWorkerCalculation(get, set);
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
