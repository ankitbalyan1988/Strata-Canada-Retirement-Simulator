import React from 'react';
import {
  CanadianProvince,
  RetirementInputs,
  ScenarioPreset,
  SimulationSummary,
  YearSimulationResult,
  StressTestOptions
} from '../types/retirement';
import { ExpatInputs } from '../types/expat';
import { SavingsPulseResult } from '../utils/simulator';
import { useSimulationStore, SimulationState } from '../store/useSimulationStore';

export interface SimulationContextValue {
  // Primary state
  inputs: RetirementInputs;
  setInputs: (inputs: RetirementInputs | ((prev: RetirementInputs) => RetirementInputs)) => void;
  updateField: <K extends keyof RetirementInputs>(
    field: K,
    value: RetirementInputs[K] | ((prev: RetirementInputs[K]) => RetirementInputs[K])
  ) => void;
  activePresetId: string;
  setActivePresetId: (id: string) => void;

  // Simulation output
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  pulse: SavingsPulseResult;
  isCalculating: boolean;

  // Stress test
  isStressTestActive: boolean;
  setIsStressTestActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  stressTiming: 'at_retirement' | 'immediate';
  setStressTiming: (timing: 'at_retirement' | 'immediate') => void;
  stressSimulation: {
    yearlyResults: YearSimulationResult[];
    summary: SimulationSummary;
    isCalculating: boolean;
  };

  // UI & Modals
  activeChartTab: 'networth' | 'cashflow';
  setActiveChartTab: (tab: 'networth' | 'cashflow') => void;
  isExportingPdf: boolean;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  isAIPersonaModalOpen: boolean;
  setIsAIPersonaModalOpen: (open: boolean) => void;

  // Actions
  selectPreset: (preset: ScenarioPreset) => void;
  resetToDefault: () => void;
  applyRetirementAge: (age: number) => void;
  applyProvince: (province: CanadianProvince) => void;
  applyMonthlyBoost: (additionalMonthly: number) => void;
  applyAIPersona: (newInputs: RetirementInputs) => void;
  updateExpatInputs: (newExpat: ExpatInputs) => void;
  exportPdf: () => Promise<void>;
}

export interface SimulationProviderProps {
  children: React.ReactNode;
}

/**
 * Backward-compatible SimulationProvider component.
 * Note: Under the Zustand architecture, global state is managed directly via useSimulationStore.
 */
export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children }) => {
  return <>{children}</>;
};

/**
 * Backward-compatible useSimulation hook forwarding directly to useSimulationStore.
 */
export function useSimulation(): SimulationState {
  return useSimulationStore();
}

/**
 * Granular selector hook for input management only.
 */
export function useSimulationInputs() {
  const inputs = useSimulationStore((state) => state.inputs);
  const setInputs = useSimulationStore((state) => state.setInputs);
  const updateField = useSimulationStore((state) => state.updateField);
  return { inputs, setInputs, updateField };
}

/**
 * Granular selector hook for simulation outputs only.
 */
export function useSimulationResults() {
  const yearlyResults = useSimulationStore((state) => state.yearlyResults);
  const summary = useSimulationStore((state) => state.summary);
  const isCalculating = useSimulationStore((state) => state.isCalculating);
  return { yearlyResults, summary, isCalculating };
}

/**
 * Granular selector hook for stable action dispatches only.
 */
export function useSimulationActions() {
  const selectPreset = useSimulationStore((state) => state.selectPreset);
  const resetToDefault = useSimulationStore((state) => state.resetToDefault);
  const applyRetirementAge = useSimulationStore((state) => state.applyRetirementAge);
  const applyProvince = useSimulationStore((state) => state.applyProvince);
  const applyMonthlyBoost = useSimulationStore((state) => state.applyMonthlyBoost);
  const applyAIPersona = useSimulationStore((state) => state.applyAIPersona);
  const updateExpatInputs = useSimulationStore((state) => state.updateExpatInputs);
  const exportPdf = useSimulationStore((state) => state.exportPdf);

  return {
    selectPreset,
    resetToDefault,
    applyRetirementAge,
    applyProvince,
    applyMonthlyBoost,
    applyAIPersona,
    updateExpatInputs,
    exportPdf
  };
}
