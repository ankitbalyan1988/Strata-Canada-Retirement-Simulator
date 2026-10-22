import React, { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';
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
import { fastSimulateEndNetWorth } from '../utils/simulator';
import { useSimulationWorker } from '../utils/simulationClient';
import { triggerConfetti } from '../utils/confettiHelper';

export interface SimulationContextValue {
  // Primary state
  inputs: RetirementInputs;
  setInputs: React.Dispatch<React.SetStateAction<RetirementInputs>>;
  updateField: <K extends keyof RetirementInputs>(
    field: K,
    value: RetirementInputs[K] | ((prev: RetirementInputs[K]) => RetirementInputs[K])
  ) => void;
  activePresetId: string;
  setActivePresetId: (id: string) => void;

  // Simulation output
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  isCalculating: boolean;

  // Stress test
  isStressTestActive: boolean;
  setIsStressTestActive: React.Dispatch<React.SetStateAction<boolean>>;
  stressTiming: 'at_retirement' | 'immediate';
  setStressTiming: React.Dispatch<React.SetStateAction<'at_retirement' | 'immediate'>>;
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

const SimulationContext = createContext<SimulationContextValue | null>(null);

export interface SimulationProviderProps {
  children: React.ReactNode;
  initialInputs?: RetirementInputs;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({
  children,
  initialInputs = DEFAULT_INPUTS
}) => {
  const [inputs, setInputs] = useState<RetirementInputs>(initialInputs);
  const [activePresetId, setActivePresetId] = useState<string>('canadian_average');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isAIPersonaModalOpen, setIsAIPersonaModalOpen] = useState(false);
  const [isStressTestActive, setIsStressTestActive] = useState(false);
  const [stressTiming, setStressTiming] = useState<'at_retirement' | 'immediate'>('at_retirement');
  const [activeChartTab, setActiveChartTab] = useState<'networth' | 'cashflow'>('networth');

  // Baseline Web Worker simulation
  const { yearlyResults, summary, isCalculating } = useSimulationWorker(inputs, undefined, {
    debounceMs: 50
  });

  const stressOptions: StressTestOptions | undefined = useMemo(() => {
    if (!isStressTestActive) return undefined;
    return {
      enabled: true,
      dropPercent: 10,
      timing: stressTiming
    };
  }, [isStressTestActive, stressTiming]);

  // Secondary stress test Web Worker simulation
  const stressSimulation = useSimulationWorker(inputs, stressOptions, {
    debounceMs: 50,
    enabled: isStressTestActive
  });

  // Keep references for callbacks that shouldn't invalidate on result changes
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const summaryRef = useRef(summary);
  summaryRef.current = summary;
  const yearlyResultsRef = useRef(yearlyResults);
  yearlyResultsRef.current = yearlyResults;

  // Granular update action
  const updateField = useCallback(<K extends keyof RetirementInputs>(
    field: K,
    value: RetirementInputs[K] | ((prev: RetirementInputs[K]) => RetirementInputs[K])
  ) => {
    setInputs((prev) => ({
      ...prev,
      [field]: typeof value === 'function' ? (value as (prev: RetirementInputs[K]) => RetirementInputs[K])(prev[field]) : value
    }));
  }, []);

  const selectPreset = useCallback((preset: ScenarioPreset) => {
    setInputs(preset.inputs);
    setActivePresetId(preset.id);
  }, []);

  const resetToDefault = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setActivePresetId('canadian_average');
  }, []);

  const applyAIPersona = useCallback((newInputs: RetirementInputs) => {
    setInputs(newInputs);
    setActivePresetId('custom_ai');
    triggerConfetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const applyRetirementAge = useCallback((newAge: number) => {
    setInputs((prev) => {
      const updated = {
        ...prev,
        retirementAge: newAge
      };

      const testRes = fastSimulateEndNetWorth(updated);
      if (testRes.isFullyFunded && !summaryRef.current.isFullyFunded) {
        triggerConfetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      return updated;
    });
  }, []);

  const applyProvince = useCallback((province: CanadianProvince) => {
    setInputs((prev) => ({
      ...prev,
      province
    }));
  }, []);

  const updateExpatInputs = useCallback((newExpat: ExpatInputs) => {
    setInputs((prev) => ({
      ...prev,
      expat: newExpat
    }));
  }, []);

  const applyMonthlyBoost = useCallback((additionalMonthly: number) => {
    setInputs((prev) => {
      const annualAddition = additionalMonthly * 12;
      const rrspRoomLeft = Math.max(0, 32490 - prev.rrspAnnualContribution);
      const toRrsp = Math.min(annualAddition, rrspRoomLeft);
      const remainder = annualAddition - toRrsp;
      const tfsaRoomLeft = Math.max(0, 7000 - prev.tfsaAnnualContribution);
      const toTfsa = Math.min(remainder, tfsaRoomLeft);
      const toNonReg = remainder - toTfsa;

      return {
        ...prev,
        rrspAnnualContribution: prev.rrspAnnualContribution + toRrsp,
        tfsaAnnualContribution: prev.tfsaAnnualContribution + toTfsa,
        nonRegAnnualContribution: prev.nonRegAnnualContribution + toNonReg
      };
    });

    triggerConfetti({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.6 }
    });
  }, []);

  const exportPdf = useCallback(async () => {
    try {
      setIsExportingPdf(true);
      const { generateRetirementPdfReport } = await import('../utils/pdfExport');
      generateRetirementPdfReport(inputsRef.current, summaryRef.current, yearlyResultsRef.current);
      setIsExportingPdf(false);
    } catch (err) {
      console.error('PDF export error:', err);
      setIsExportingPdf(false);
    }
  }, []);

  const contextValue = useMemo<SimulationContextValue>(() => ({
    inputs,
    setInputs,
    updateField,
    activePresetId,
    setActivePresetId,
    yearlyResults,
    summary,
    isCalculating,
    isStressTestActive,
    setIsStressTestActive,
    stressTiming,
    setStressTiming,
    stressSimulation,
    activeChartTab,
    setActiveChartTab,
    isExportingPdf,
    isCompareModalOpen,
    setIsCompareModalOpen,
    isAIPersonaModalOpen,
    setIsAIPersonaModalOpen,
    selectPreset,
    resetToDefault,
    applyRetirementAge,
    applyProvince,
    applyMonthlyBoost,
    applyAIPersona,
    updateExpatInputs,
    exportPdf
  }), [
    inputs,
    updateField,
    activePresetId,
    yearlyResults,
    summary,
    isCalculating,
    isStressTestActive,
    stressTiming,
    stressSimulation,
    activeChartTab,
    isExportingPdf,
    isCompareModalOpen,
    isAIPersonaModalOpen,
    selectPreset,
    resetToDefault,
    applyRetirementAge,
    applyProvince,
    applyMonthlyBoost,
    applyAIPersona,
    updateExpatInputs,
    exportPdf
  ]);

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
};

/**
 * Hook to access the full retirement simulation context.
 */
export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}

/**
 * Granular selector hook for input management only.
 */
export function useSimulationInputs() {
  const { inputs, setInputs, updateField } = useSimulation();
  return useMemo(() => ({ inputs, setInputs, updateField }), [inputs, setInputs, updateField]);
}

/**
 * Granular selector hook for simulation outputs only.
 */
export function useSimulationResults() {
  const { yearlyResults, summary, isCalculating } = useSimulation();
  return useMemo(
    () => ({ yearlyResults, summary, isCalculating }),
    [yearlyResults, summary, isCalculating]
  );
}

/**
 * Granular selector hook for stable action dispatches only.
 */
export function useSimulationActions() {
  const {
    selectPreset,
    resetToDefault,
    applyRetirementAge,
    applyProvince,
    applyMonthlyBoost,
    applyAIPersona,
    updateExpatInputs,
    exportPdf
  } = useSimulation();

  return useMemo(
    () => ({
      selectPreset,
      resetToDefault,
      applyRetirementAge,
      applyProvince,
      applyMonthlyBoost,
      applyAIPersona,
      updateExpatInputs,
      exportPdf
    }),
    [
      selectPreset,
      resetToDefault,
      applyRetirementAge,
      applyProvince,
      applyMonthlyBoost,
      applyAIPersona,
      updateExpatInputs,
      exportPdf
    ]
  );
}
