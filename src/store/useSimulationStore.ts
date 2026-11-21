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
import { EstatePlanningInputs } from '../types/estate';
import { WhatIfSettings } from '../types/whatIf';
import { DEFAULT_INPUTS, BLANK_CANVAS_INPUTS } from '../utils/presets';
import { DEFAULT_ESTATE_INPUTS } from '../utils/estatePlanning';
import { DEFAULT_WHAT_IF_SETTINGS } from '../utils/whatIfCalculator';
import {
  runRetirementSimulation,
  calculateSavingsPulse,
  SavingsPulseResult,
  fastSimulateEndNetWorth
} from '../utils/simulator';
import { triggerConfetti } from '../utils/confettiHelper';
import { SimulationSnapshot } from '../types/history';

export type AppView = 'dashboard' | 'inputs' | 'estate' | 'expat';
export type DashboardTab = 'dashboard' | 'ledger' | 'cashflows' | 'readiness' | 'stresstest' | 'whatif';

/**
 * Single source of truth mapping every view & dashboard tab to the exact collapsible section keys rendered on that page.
 * Used by both the Header "Collapse All / Expand All" toggle and store.toggleCollapseAll().
 */
export function getSectionKeysForPage(activeView: AppView, activeDashboardTab: DashboardTab): string[] {
  if (activeView === 'inputs') {
    return ['planning'];
  }
  if (activeView === 'estate') {
    return ['estate'];
  }
  if (activeView === 'expat') {
    return ['expat'];
  }

  switch (activeDashboardTab) {
    case 'dashboard':
      return [
        'milestoneTimeline',
        'scorecard',
        'savingsRate',
        'retirementAgeSimulator',
        'pulse',
        'netWorthOverTime',
        'netWorthChart',
        'incomeStreamChart',
        'taxBracketChart'
      ];
    case 'ledger':
      return ['ledger', 'breakEven'];
    case 'cashflows':
      return ['cashFlowVisualizer', 'cashFlowLedger'];
    case 'readiness':
      return ['progress', 'retirementAgeOptimizer'];
    case 'stresstest':
      return ['stressTest', 'stressTestChart'];
    case 'whatif':
      return ['whatIfOverview', 'whatIfSensitivity', 'whatIfChart'];
    default:
      return [
        'milestoneTimeline',
        'scorecard',
        'savingsRate',
        'retirementAgeSimulator',
        'pulse',
        'netWorthOverTime',
        'netWorthChart',
        'incomeStreamChart',
        'taxBracketChart'
      ];
  }
}
export type InputTab = 
  | 'personal'
  | 'expenses'
  | 'accounts'
  | 'debts'
  | 'realestate'
  | 'spouse'
  | 'pensions'
  | 'market'
  | 'strategy'
  | 'expat';

export type ExcelExportPhase = 'loading_chunk' | 'processing' | 'downloading';

export interface ExcelExportLogEntry {
  id: string;
  message: string;
  status: 'active' | 'done';
  elapsedMs: number;
}

export interface ExcelExportOverlayState {
  phase: ExcelExportPhase;
  title: string;
  subtitle: string;
  startedAt: number;
  logs: ExcelExportLogEntry[];
}

export interface PdfPreviewData {
  blob: Blob;
  blobUrl: string;
  fileName: string;
  pageCount: number;
  sizeBytes: number;
  generatedAt: string;
  clientName: string;
  retirementAge: number;
  province: string;
}

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

  // View & Sidebar Navigation State
  activeView: AppView;
  activeDashboardTab: DashboardTab;
  activeInputTab: InputTab;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;

  // Stress test
  isStressTestActive: boolean;
  stressTiming: 'at_retirement' | 'immediate' | 'custom';
  customStressAge: number;
  stressSimulation: {
    yearlyResults: YearSimulationResult[];
    summary: SimulationSummary;
    isCalculating: boolean;
  };

  // UI & Modals
  theme: 'light' | 'dark';
  activeChartTab: 'networth' | 'cashflow' | 'taxbracket';
  isExportingPdf: boolean;
  pdfPreview: PdfPreviewData | null;
  excelExportOverlay: ExcelExportOverlayState | null;
  toastNotification: {
    id: number;
    status: 'loading' | 'success' | 'error';
    title: string;
    message?: string;
    variant?: 'default' | 'subtle';
  } | null;
  isCompareModalOpen: boolean;
  isSnapshotCompareModalOpen: boolean;
  selectedCompareSnapshotIds: string[];
  isAIPersonaModalOpen: boolean;
  isWealthGuideModalOpen: boolean;
  isHelpGuideModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isFocusMode: boolean;
  focusModeZone: 'tabs' | 'content';

  // Section Collapse State
  collapsedSections: Record<string, boolean>;

  // What-If Sensitivity Analysis
  whatIfSettings: WhatIfSettings;

  // Simulation History
  history: SimulationSnapshot[];
  isHistoryPanelOpen: boolean;
  activePreviewSnapshotId: string | null;
  activeSnapshotId: string | null;

  // Actions
  setActiveView: (view: AppView) => void;
  setActiveDashboardTab: (tab: DashboardTab) => void;
  setActiveInputTab: (tab: InputTab) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
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
  resetToBlankCanvas: () => void;
  applyRetirementAge: (age: number) => void;
  applyProvince: (province: CanadianProvince) => void;
  applyMonthlyBoost: (additionalMonthly: number) => void;
  applyAIPersona: (newInputs: RetirementInputs) => void;
  updateExpatInputs: (newExpat: ExpatInputs) => void;
  estateInputs: EstatePlanningInputs;
  setEstateInputs: (estateInputs: EstatePlanningInputs | ((prev: EstatePlanningInputs) => EstatePlanningInputs)) => void;
  setIsStressTestActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  setStressTiming: (timing: 'at_retirement' | 'immediate' | 'custom') => void;
  setCustomStressAge: (age: number) => void;
  setIsWhatIfActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  setWhatIfSettings: (settings: Partial<WhatIfSettings> | ((prev: WhatIfSettings) => WhatIfSettings)) => void;
  resetWhatIfSettings: () => void;
  setActiveChartTab: (tab: 'networth' | 'cashflow' | 'taxbracket') => void;
  setIsCompareModalOpen: (open: boolean) => void;
  setIsSnapshotCompareModalOpen: (open: boolean) => void;
  setSelectedCompareSnapshotIds: (ids: string[]) => void;
  openSnapshotCompare: (snapshotIds?: string[]) => void;
  setIsAIPersonaModalOpen: (open: boolean) => void;
  setIsWealthGuideModalOpen: (open: boolean) => void;
  setIsHelpGuideModalOpen: (open: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setIsFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  setFocusModeZone: (zone: 'tabs' | 'content') => void;
  toggleSectionCollapse: (sectionId: string) => void;
  setSectionCollapse: (sectionId: string, collapsed: boolean) => void;
  toggleCollapseAll: () => void;
  exportPdf: () => Promise<void>;
  closePdfPreview: () => void;
  startExcelExportOverlay: (title: string, subtitle?: string) => void;
  updateExcelExportOverlayPhase: (phase: ExcelExportPhase, subtitle?: string) => void;
  appendExcelExportLog: (message: string) => void;
  completeExcelExportLogs: () => void;
  finishExcelExportOverlay: () => void;
  showToast: (
    toast: {
      status: 'loading' | 'success' | 'error';
      title: string;
      message?: string;
      variant?: 'default' | 'subtle';
    },
    autoDismissMs?: number
  ) => number;
  dismissToast: () => void;

  // History Actions
  setIsHistoryPanelOpen: (open: boolean) => void;
  toggleHistoryPanel: () => void;
  setActivePreviewSnapshotId: (id: string | null) => void;
  setActiveSnapshotId: (id: string | null) => void;
  saveSnapshot: (label?: string, notes?: string, source?: SimulationSnapshot['source']) => SimulationSnapshot;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  clearHistory: () => void;
  renameSnapshot: (snapshotId: string, label: string, notes?: string) => void;
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
  const isCouple = inputs.maritalStatus === 'married' && Boolean(inputs.spouse);
  const spouse = inputs.spouse;
  const isBlankCanvas = (
    (inputs.currentAnnualIncome || 0) === 0 &&
    (inputs.targetRetirementSpendingToday || 0) === 0 &&
    (inputs.rrspBalance || 0) === 0 &&
    (inputs.tfsaBalance || 0) === 0 &&
    (inputs.nonRegBalance || 0) === 0 &&
    (inputs.fhsaBalance || 0) === 0 &&
    (!isCouple || (((spouse?.annualIncome || 0) === 0) && ((spouse?.rrspBalance || 0) === 0)))
  );

  if (isBlankCanvas) {
    const totalYearsInRetirement = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
    return {
      ...baseSummary,
      isFullyFunded: false,
      readinessScore: 0,
      yearsFunded: 0,
      totalYearsInRetirement,
      netWorthAtRetirement: 0,
      netWorthAtLifeExpectancy: 0,
      peakNetWorth: 0,
      peakNetWorthAge: inputs.retirementAge,
      lifetimeEmploymentIncome: 0,
      lifetimeCppReceived: 0,
      lifetimeOasReceived: 0,
      lifetimeTaxesPaid: 0,
      lifetimeInvestmentGrowth: 0,
      averageAnnualRetirementSpendNominal: 0,
      averageEffectiveTaxInRetirement: 0
    };
  }

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

// Instantiate Vite Web Worker for asynchronous multi-decade calculations
let simulatorWorker: Worker | null = null;
let currentWorkerRequestId = 0;
const pendingWorkerRequests = new Map<number, (res: any) => void>();

function getSimulatorWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!simulatorWorker) {
    try {
      simulatorWorker = new Worker(new URL('../utils/simulator.worker.ts', import.meta.url), {
        type: 'module'
      });
      simulatorWorker.addEventListener('message', (event: MessageEvent) => {
        const { id } = event.data;
        if (id !== undefined && pendingWorkerRequests.has(id)) {
          const callback = pendingWorkerRequests.get(id);
          pendingWorkerRequests.delete(id);
          callback?.(event.data);
        }
      });
      simulatorWorker.addEventListener('error', (err) => {
        console.warn('Simulation worker encountered an error, falling back to sync execution:', err);
      });
    } catch (err) {
      console.warn('Failed to construct Simulation Worker, using sync fallback:', err);
      simulatorWorker = null;
    }
  }
  return simulatorWorker;
}

function calculateSimulationAsync(
  inputs: RetirementInputs,
  stressTest?: StressTestOptions
): Promise<{ yearlyResults: YearSimulationResult[]; summary: SimulationSummary; pulse: SavingsPulseResult }> {
  const worker = getSimulatorWorker();

  if (!worker) {
    const sim = runRetirementSimulation(inputs, stressTest);
    const pulse = calculateSavingsPulse(inputs, sim.summary);
    return Promise.resolve({
      yearlyResults: sim.yearlyResults,
      summary: sim.summary,
      pulse
    });
  }

  return new Promise((resolve, reject) => {
    const id = ++currentWorkerRequestId;
    const timeoutId = setTimeout(() => {
      pendingWorkerRequests.delete(id);
      try {
        const sim = runRetirementSimulation(inputs, stressTest);
        const pulse = calculateSavingsPulse(inputs, sim.summary);
        resolve({
          yearlyResults: sim.yearlyResults,
          summary: sim.summary,
          pulse
        });
      } catch (err) {
        reject(err);
      }
    }, 2000);

    pendingWorkerRequests.set(id, (response) => {
      clearTimeout(timeoutId);
      if (response && response.success && response.yearlyResults && response.summary && response.pulse) {
        resolve({
          yearlyResults: response.yearlyResults,
          summary: response.summary,
          pulse: response.pulse
        });
      } else {
        try {
          const sim = runRetirementSimulation(inputs, stressTest);
          const pulse = calculateSavingsPulse(inputs, sim.summary);
          resolve({
            yearlyResults: sim.yearlyResults,
            summary: sim.summary,
            pulse
          });
        } catch (err) {
          reject(new Error(response?.error || 'Worker simulation calculation failed'));
        }
      }
    });

    worker.postMessage({ id, inputs, stressTest });
  });
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
    const { inputs, isStressTestActive, stressTiming, customStressAge } = get();

    try {
      const mainPromise = calculateSimulationAsync(inputs);
      const stressPromise = isStressTestActive
        ? calculateSimulationAsync(inputs, {
            enabled: true,
            dropPercent: 10,
            timing: stressTiming,
            customAge: stressTiming === 'custom' ? customStressAge : undefined
          })
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

export const AUTOSAVE_PLAN_STORAGE_KEY = 'strata_autosaved_plan_inputs';

const loadSavedPlanInputs = (): RetirementInputs => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(AUTOSAVE_PLAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const data = parsed.inputs || parsed;
        if (data && typeof data === 'object' && typeof data.currentAge === 'number') {
          return { ...DEFAULT_INPUTS, ...data };
        }
      }
    } catch (_) {}
  }
  return DEFAULT_INPUTS;
};

// Compute initial state synchronously on first load
const initialPlanInputs = loadSavedPlanInputs();
const initialSim = runRetirementSimulation(initialPlanInputs);
const initialPulse = calculateSavingsPulse(initialPlanInputs, initialSim.summary);

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

// Sidebar collapsed preference detection
const getInitialSidebarCollapsed = (): boolean => {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('strata-sidebar-collapsed') === 'true';
    } catch (_) {}
  }
  return false;
};

// Focus mode preference detection
const getInitialFocusMode = (): boolean => {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('strata-focus-mode') === 'true';
    } catch (_) {}
  }
  return false;
};

const loadSavedHistory = (): SimulationSnapshot[] => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('strata_simulation_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
  }
  return [];
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  inputs: initialPlanInputs,
  activePresetId: 'blank',
  yearlyResults: initialSim.yearlyResults,
  summary: initialSim.summary,
  optimisticSummary: initialSim.summary,
  pulse: initialPulse,
  isCalculating: false,
  isRecalculatingLedger: false,

  // Navigation & Sidebar
  activeView: 'dashboard',
  activeDashboardTab: 'dashboard',
  activeInputTab: 'personal',
  isSidebarCollapsed: getInitialSidebarCollapsed(),
  isMobileSidebarOpen: false,

  isStressTestActive: false,
  stressTiming: 'at_retirement',
  customStressAge: DEFAULT_INPUTS.retirementAge,
  stressSimulation: {
    yearlyResults: [],
    summary: {} as SimulationSummary,
    isCalculating: false
  },

  theme: getInitialTheme(),
  activeChartTab: 'networth',
  isExportingPdf: false,
  pdfPreview: null,
  excelExportOverlay: null,
  toastNotification: null,
  isCompareModalOpen: false,
  isSnapshotCompareModalOpen: false,
  selectedCompareSnapshotIds: [],
  isAIPersonaModalOpen: false,
  isWealthGuideModalOpen: false,
  isHelpGuideModalOpen: false,
  isCommandPaletteOpen: false,
  isFocusMode: getInitialFocusMode(),
  focusModeZone: 'tabs',
  collapsedSections: {
    personaSelection: false,
    aiPersona: false,
    planning: false,
    milestoneTimeline: false,
    scorecard: false,
    savingsRate: false,
    progress: false,
    retirementAgeOptimizer: false,
    retirementAgeSimulator: false,
    stressTest: false,
    stressTestChart: false,
    whatIfOverview: false,
    whatIfSensitivity: false,
    whatIfChart: false,
    cashFlowVisualizer: false,
    cashFlowLedger: false,
    pulse: false,
    netWorthOverTime: false,
    netWorthChart: false,
    incomeStreamChart: false,
    taxBracketChart: false,
    charts: false,
    ledger: false,
    breakEven: false,
    estate: false,
    expat: false,
    tips: false
  },
  whatIfSettings: DEFAULT_WHAT_IF_SETTINGS,
  estateInputs: {
    ...DEFAULT_ESTATE_INPUTS,
    passingAge: DEFAULT_INPUTS.lifeExpectancy || 85,
    hasNextOfKin: DEFAULT_INPUTS.maritalStatus === 'married' || Boolean(DEFAULT_INPUTS.spouse),
    kinCategory: (DEFAULT_INPUTS.maritalStatus === 'married' || Boolean(DEFAULT_INPUTS.spouse)) ? 'spouse' : 'children',
  },

  // History State
  history: loadSavedHistory(),
  isHistoryPanelOpen: false,
  activePreviewSnapshotId: null,
  activeSnapshotId: null,

  // View & Sidebar Actions
  setActiveView: (view) => {
    set({
      activeView: view,
      isMobileSidebarOpen: false
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  setActiveDashboardTab: (tab) => {
    set({ activeDashboardTab: tab });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  setActiveInputTab: (tab) => {
    set({ activeInputTab: tab });
  },

  setIsSidebarCollapsed: (collapsed) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata-sidebar-collapsed', String(collapsed));
      } catch (_) {}
    }
    set({ isSidebarCollapsed: collapsed });
  },

  toggleSidebarCollapsed: () => {
    const next = !get().isSidebarCollapsed;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata-sidebar-collapsed', String(next));
      } catch (_) {}
    }
    set({ isSidebarCollapsed: next });
  },

  setIsMobileSidebarOpen: (open) => {
    set({ isMobileSidebarOpen: open });
  },

  toggleMobileSidebar: () => {
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen }));
  },

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
      activePresetId: get().activePresetId === 'blank' ? 'custom' : get().activePresetId,
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
      activePresetId: get().activePresetId === 'blank' ? 'custom' : get().activePresetId,
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
    get().resetToBlankCanvas();
  },

  resetToBlankCanvas: () => {
    // 1. Wipe simulation snapshots history and autosaved plan draft from persistent storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('strata_simulation_history');
        localStorage.removeItem(AUTOSAVE_PLAN_STORAGE_KEY);
      } catch (_) {}
    }

    // 2. Compute pristine blank outputs
    const blankSim = runRetirementSimulation(BLANK_CANVAS_INPUTS);
    const blankPulse = calculateSavingsPulse(BLANK_CANVAS_INPUTS, blankSim.summary);

    // 3. Clear scheduled worker calculations
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    set({
      inputs: BLANK_CANVAS_INPUTS,
      activePresetId: 'blank',
      history: [],
      selectedCompareSnapshotIds: [],
      activePreviewSnapshotId: null,
      activeSnapshotId: null,
      whatIfSettings: DEFAULT_WHAT_IF_SETTINGS,
      isStressTestActive: false,
      stressTiming: 'at_retirement',
      customStressAge: BLANK_CANVAS_INPUTS.retirementAge,
      summary: blankSim.summary,
      optimisticSummary: blankSim.summary,
      yearlyResults: blankSim.yearlyResults,
      pulse: blankPulse,
      isRecalculatingLedger: false,
      isCalculating: false
    });
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

  setEstateInputs: (updater) => {
    set((state) => ({
      estateInputs: typeof updater === 'function' ? updater(state.estateInputs) : updater
    }));
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

  setCustomStressAge: (age) => {
    set({ customStressAge: age, isRecalculatingLedger: true });
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

  setIsSnapshotCompareModalOpen: (open) => {
    set({ isSnapshotCompareModalOpen: open });
  },

  setSelectedCompareSnapshotIds: (ids) => {
    set({ selectedCompareSnapshotIds: ids });
  },

  openSnapshotCompare: (snapshotIds) => {
    set((state) => ({
      isSnapshotCompareModalOpen: true,
      selectedCompareSnapshotIds: snapshotIds || state.selectedCompareSnapshotIds
    }));
  },

  setIsAIPersonaModalOpen: (open) => {
    set({ isAIPersonaModalOpen: open });
  },

  setIsWealthGuideModalOpen: (open) => {
    set({ isWealthGuideModalOpen: open });
  },

  setIsHelpGuideModalOpen: (open) => {
    set({ isHelpGuideModalOpen: open });
  },

  setIsCommandPaletteOpen: (open) => {
    set({ isCommandPaletteOpen: open });
  },

  toggleCommandPalette: () => {
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }));
  },

  setIsFocusMode: (enabled) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata-focus-mode', String(enabled));
      } catch (_) {}
      document.documentElement.classList.toggle('focus-mode-active', enabled);
    }
    set({
      isFocusMode: enabled,
      focusModeZone: 'tabs'
    });
  },

  toggleFocusMode: () => {
    const next = !get().isFocusMode;
    get().setIsFocusMode(next);
  },

  setFocusModeZone: (zone) => {
    set({ focusModeZone: zone });
  },

  toggleSectionCollapse: (sectionId) => {
    set((state) => ({
      collapsedSections: {
        ...state.collapsedSections,
        [sectionId]: !state.collapsedSections[sectionId]
      }
    }));
  },

  setSectionCollapse: (sectionId, collapsed) => {
    set((state) => ({
      collapsedSections: {
        ...state.collapsedSections,
        [sectionId]: collapsed
      }
    }));
  },

  toggleCollapseAll: () => {
    set((state) => {
      const relevantKeys = getSectionKeysForPage(state.activeView, state.activeDashboardTab);
      // Check if any visible section on this page/tab is currently expanded (i.e. not collapsed)
      const hasAnyExpanded = relevantKeys.some((k) => !state.collapsedSections[k]);
      // If at least one section on the current page is expanded, collapse all on this page; otherwise expand all
      const nextCollapsedState = hasAnyExpanded;
      const next: Record<string, boolean> = { ...state.collapsedSections };
      for (const k of relevantKeys) {
        next[k] = nextCollapsedState;
      }
      return { collapsedSections: next };
    });
  },

  startExcelExportOverlay: (title, subtitle) => {
    const now = Date.now();
    set({
      excelExportOverlay: {
        phase: 'loading_chunk',
        title,
        subtitle: subtitle || 'Fetching ExcelJS workbook engine & formula modules...',
        startedAt: now,
        logs: [
          {
            id: `log-${now}-0`,
            message: 'Loading ExcelJS workbook engine chunk...',
            status: 'active',
            elapsedMs: 0
          }
        ]
      }
    });
  },

  updateExcelExportOverlayPhase: (phase, subtitle) =>
    set((state) => {
      if (!state.excelExportOverlay) return {};
      return {
        excelExportOverlay: {
          ...state.excelExportOverlay,
          phase,
          subtitle: subtitle ?? state.excelExportOverlay.subtitle
        }
      };
    }),

  appendExcelExportLog: (message) =>
    set((state) => {
      const current = state.excelExportOverlay;
      if (!current) return {};
      const now = Date.now();
      const elapsedMs = Math.max(0, now - current.startedAt);
      const completedPrevious: ExcelExportLogEntry[] = current.logs.map((entry) =>
        entry.status === 'done' ? entry : { ...entry, status: 'done' }
      );
      return {
        excelExportOverlay: {
          ...current,
          logs: [
            ...completedPrevious,
            {
              id: `log-${now}-${completedPrevious.length}`,
              message,
              status: 'active',
              elapsedMs
            }
          ]
        }
      };
    }),

  completeExcelExportLogs: () =>
    set((state) => {
      const current = state.excelExportOverlay;
      if (!current) return {};
      return {
        excelExportOverlay: {
          ...current,
          logs: current.logs.map((entry) =>
            entry.status === 'done' ? entry : { ...entry, status: 'done' }
          )
        }
      };
    }),

  finishExcelExportOverlay: () => set({ excelExportOverlay: null }),

  showToast: (toast, autoDismissMs) => {
    const toastId = Date.now();
    set({
      toastNotification: {
        id: toastId,
        ...toast
      }
    });
    if (autoDismissMs && autoDismissMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (get().toastNotification?.id === toastId) {
          set({ toastNotification: null });
        }
      }, autoDismissMs);
    }
    return toastId;
  },

  dismissToast: () => set({ toastNotification: null }),

  closePdfPreview: () => {
    const current = get().pdfPreview;
    if (current?.blobUrl && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(current.blobUrl);
      } catch (_) {}
    }
    set({ pdfPreview: null });
  },

  exportPdf: async () => {
    const {
      inputs,
      summary,
      yearlyResults,
      pulse,
      whatIfSettings,
      isStressTestActive,
      stressTiming,
      customStressAge,
      stressSimulation,
      history,
      pdfPreview: previousPreview
    } = get();
    const toastId = Date.now();
    try {
      set({
        isExportingPdf: true,
        toastNotification: {
          id: toastId,
          status: 'loading',
          title: 'Generating Executive PDF Plan...',
          message: 'Loading PDF engine and building your retirement report.'
        }
      });
      const [{ createRetirementPdfPreview }, { loadCroppedAppIconDataUrl }] = await Promise.all([
        import('../utils/pdfExport'),
        import('../components/AppIcon'),
        new Promise<void>((resolve) => {
          if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => resolve());
          } else {
            setTimeout(resolve, 0);
          }
        })
      ]);
      const brandIconDataUrl = await loadCroppedAppIconDataUrl(128);
      const preview = createRetirementPdfPreview(inputs, summary, yearlyResults, {
        pulse,
        whatIfSettings,
        stressTest: isStressTestActive
          ? {
              enabled: true,
              dropPercent: 10,
              timing: stressTiming,
              customAge: stressTiming === 'custom' ? customStressAge : undefined,
              summary: stressSimulation?.summary,
              yearlyResults: stressSimulation?.yearlyResults
            }
          : undefined,
        savedScenarios: history,
        brandIconDataUrl: brandIconDataUrl ?? undefined
      });

      // Cleanly revoke any prior preview Blob URL before storing the new one
      if (previousPreview?.blobUrl && typeof URL !== 'undefined') {
        try {
          URL.revokeObjectURL(previousPreview.blobUrl);
        } catch (_) {}
      }

      set({
        pdfPreview: {
          blob: preview.blob,
          blobUrl: preview.blobUrl,
          fileName: preview.fileName,
          pageCount: preview.pageCount,
          sizeBytes: preview.sizeBytes,
          generatedAt: preview.generatedAt,
          clientName: preview.clientName,
          retirementAge: preview.retirementAge,
          province: preview.province
        },
        toastNotification: {
          id: toastId,
          status: 'success',
          title: 'PDF Report Ready to Preview',
          message: `${preview.pageCount}-page retirement dossier generated. Review and download below.`
        }
      });
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (get().toastNotification?.id === toastId) {
            set({ toastNotification: null });
          }
        }, 4000);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      set({
        toastNotification: {
          id: toastId,
          status: 'error',
          title: 'PDF Export Failed',
          message: 'Something went wrong while generating your PDF. Please try again.'
        }
      });
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (get().toastNotification?.id === toastId) {
            set({ toastNotification: null });
          }
        }, 5000);
      }
    } finally {
      set({ isExportingPdf: false });
    }
  },

  setIsHistoryPanelOpen: (open) => set({ isHistoryPanelOpen: open }),
  toggleHistoryPanel: () => set((state) => ({ isHistoryPanelOpen: !state.isHistoryPanelOpen })),
  setActivePreviewSnapshotId: (id) => set({ activePreviewSnapshotId: id }),
  setActiveSnapshotId: (id) => set({ activeSnapshotId: id }),

  saveSnapshot: (customLabel, notes, source = 'manual') => {
    const state = get();
    const timestamp = Date.now();
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Character limits: max 80 for title, max 200 for description/notes
    const SNAPSHOT_TITLE_MAX = 80;
    const SNAPSHOT_NOTES_MAX = 200;

    const trimmedLabel = customLabel ? customLabel.trim().slice(0, SNAPSHOT_TITLE_MAX) : '';
    const defaultLabel = trimmedLabel || `Scenario @ Age ${state.inputs.retirementAge} (${timeStr})`;
    const trimmedNotes = notes ? notes.trim().slice(0, SNAPSHOT_NOTES_MAX) : undefined;

    const snapshot: SimulationSnapshot = {
      id: `snap_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      label: defaultLabel,
      notes: trimmedNotes,
      source,
      inputs: JSON.parse(JSON.stringify(state.inputs)),
      summary: JSON.parse(JSON.stringify(state.summary)),
      metrics: {
        retirementAge: state.inputs.retirementAge,
        currentAge: state.inputs.currentAge,
        province: state.inputs.province,
        netWorthAtLifeExpectancy: state.summary.netWorthAtLifeExpectancy,
        netWorthAtRetirement: state.summary.netWorthAtRetirement,
        peakNetWorth: state.summary.peakNetWorth,
        peakNetWorthAge: state.summary.peakNetWorthAge,
        lifetimeTaxesPaid: state.summary.lifetimeTaxesPaid,
        isFullyFunded: state.summary.isFullyFunded,
        yearsFunded: state.summary.yearsFunded,
        portfolioDepletionAge: state.summary.portfolioDepletionAge
      }
    };

    const nextHistory = [snapshot, ...state.history].slice(0, 50);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata_simulation_history', JSON.stringify(nextHistory));
      } catch (_) {}
    }

    set({ history: nextHistory, activeSnapshotId: snapshot.id });
    return snapshot;
  },

  restoreSnapshot: (snapshotId) => {
    const target = get().history.find((s) => s.id === snapshotId);
    if (!target) return;

    const restoredInputs = JSON.parse(JSON.stringify(target.inputs));
    const optimisticSummary = computeOptimisticSummary(restoredInputs, target.summary);

    set({
      inputs: restoredInputs,
      optimisticSummary,
      activeSnapshotId: snapshotId,
      activePreviewSnapshotId: null,
      isRecalculatingLedger: true
    });
    scheduleHeavyCalculation(get, set);
  },

  deleteSnapshot: (snapshotId) => {
    const nextHistory = get().history.filter((s) => s.id !== snapshotId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata_simulation_history', JSON.stringify(nextHistory));
      } catch (_) {}
    }
    set((state) => ({
      history: nextHistory,
      activePreviewSnapshotId: state.activePreviewSnapshotId === snapshotId ? null : state.activePreviewSnapshotId,
      activeSnapshotId: state.activeSnapshotId === snapshotId ? null : state.activeSnapshotId
    }));
  },

  clearHistory: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('strata_simulation_history');
      } catch (_) {}
    }
    set({ history: [], activePreviewSnapshotId: null, activeSnapshotId: null });
  },

  renameSnapshot: (snapshotId, label, notes) => {
    const cleanLabel = (label || '').trim().slice(0, 80);
    const cleanNotes = notes !== undefined ? notes.trim().slice(0, 200) : undefined;
    const nextHistory = get().history.map((s) => {
      if (s.id === snapshotId) {
        return {
          ...s,
          label: cleanLabel || s.label,
          ...(cleanNotes !== undefined ? { notes: cleanNotes } : {})
        };
      }
      return s;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('strata_simulation_history', JSON.stringify(nextHistory));
      } catch (_) {}
    }
    set({ history: nextHistory });
  }
}));
