import { useState, useEffect, useRef, useTransition } from 'react';
import {
  RetirementInputs,
  StressTestOptions,
  YearSimulationResult,
  SimulationSummary
} from '../types/retirement';
import { runRetirementSimulation, calculateSavingsPulse, SavingsPulseResult, SimulationOptions } from './simulator';
import { SimulatorWorkerRequest, SimulatorWorkerResponse } from './simulator.worker';

let workerInstance: Worker | null = null;
let currentRequestId = 0;
const pendingCallbacks = new Map<number, (res: SimulatorWorkerResponse) => void>();

/**
 * Initializes or retrieves the singleton Web Worker instance with fallback detection.
 */
function getSimulationWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./simulator.worker.ts', import.meta.url), {
        type: 'module'
      });

      workerInstance.addEventListener('message', (event: MessageEvent<SimulatorWorkerResponse>) => {
        const { id } = event.data;
        if (id !== undefined && pendingCallbacks.has(id)) {
          const callback = pendingCallbacks.get(id);
          pendingCallbacks.delete(id);
          callback?.(event.data);
        }
      });

      workerInstance.addEventListener('error', (err) => {
        console.warn('Simulation worker encountered an error, falling back to sync execution:', err);
      });
    } catch (err) {
      console.warn('Failed to construct Simulation Worker, using sync fallback:', err);
      workerInstance = null;
    }
  }

  return workerInstance;
}

export interface SimulationPayload {
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  pulse: SavingsPulseResult;
}

/**
 * Asynchronously calculates the retirement simulation and savings pulse via Web Worker,
 * with automatic fallback to synchronous execution in unsupported or test environments.
 */
export function calculateSimulationAsync(
  inputs: RetirementInputs,
  stressTest?: StressTestOptions,
  simulationOptions?: SimulationOptions
): Promise<SimulationPayload> {
  const worker = getSimulationWorker();

  if (!worker) {
    // Synchronous execution fallback
    const sim = runRetirementSimulation(inputs, stressTest, simulationOptions);
    const pulse = calculateSavingsPulse(inputs, sim.summary);
    return Promise.resolve({
      yearlyResults: sim.yearlyResults,
      summary: sim.summary,
      pulse
    });
  }

  return new Promise((resolve, reject) => {
    const id = ++currentRequestId;
    const timeoutId = setTimeout(() => {
      pendingCallbacks.delete(id);
      // If worker times out or hangs, fallback to sync
      try {
        const sim = runRetirementSimulation(inputs, stressTest, simulationOptions);
        const pulse = calculateSavingsPulse(inputs, sim.summary);
        resolve({
          yearlyResults: sim.yearlyResults,
          summary: sim.summary,
          pulse
        });
      } catch (e) {
        reject(e);
      }
    }, 1500);

    pendingCallbacks.set(id, (response) => {
      clearTimeout(timeoutId);
      if (response && response.success && response.yearlyResults && response.summary && response.pulse) {
        resolve({
          yearlyResults: response.yearlyResults,
          summary: response.summary,
          pulse: response.pulse
        });
      } else {
        // Fallback on error
        try {
          const sim = runRetirementSimulation(inputs, stressTest, simulationOptions);
          const pulse = calculateSavingsPulse(inputs, sim.summary);
          resolve({
            yearlyResults: sim.yearlyResults,
            summary: sim.summary,
            pulse
          });
        } catch (e) {
          reject(new Error(response.error || 'Worker simulation failed'));
        }
      }
    });

    const request: SimulatorWorkerRequest = {
      id,
      inputs,
      stressTest,
      simulationOptions
    };

    worker.postMessage(request);
  });
}

export interface UseSimulationWorkerOptions {
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * React hook that connects components to background Worker execution while keeping
 * immediate interactive UI responsive without main-thread stuttering.
 */
export function useSimulationWorker(
  inputs: RetirementInputs,
  stressTest?: StressTestOptions,
  options: UseSimulationWorkerOptions = {}
): {
  yearlyResults: YearSimulationResult[];
  summary: SimulationSummary;
  pulse: SavingsPulseResult;
  isCalculating: boolean;
} {
  const { debounceMs = 60, enabled = true } = options;

  // Compute initial baseline synchronously on first mount for instant 0ms initial render if enabled
  const initialRef = useRef<SimulationPayload | null>(null);
  if (!initialRef.current && enabled) {
    const initialSim = runRetirementSimulation(inputs, stressTest);
    const initialPulse = calculateSavingsPulse(inputs, initialSim.summary);
    initialRef.current = {
      yearlyResults: initialSim.yearlyResults,
      summary: initialSim.summary,
      pulse: initialPulse
    };
  }

  const [simulationState, setSimulationState] = useState<SimulationPayload>(
    initialRef.current || {
      yearlyResults: [],
      summary: {} as SimulationSummary,
      pulse: {} as SavingsPulseResult
    }
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [, startTransition] = useTransition();

  const latestInputsRef = useRef(inputs);
  const latestStressRef = useRef(stressTest);
  latestInputsRef.current = inputs;
  latestStressRef.current = stressTest;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRunIdRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setIsCalculating(false);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsCalculating(true);

    timerRef.current = setTimeout(() => {
      const runId = ++activeRunIdRef.current;
      const targetInputs = latestInputsRef.current;
      const targetStress = latestStressRef.current;

      calculateSimulationAsync(targetInputs, targetStress)
        .then((result) => {
          // Only update if this request is still the latest one
          if (runId === activeRunIdRef.current) {
            startTransition(() => {
              setSimulationState(result);
              setIsCalculating(false);
            });
          }
        })
        .catch((err) => {
          console.error('Simulation execution failed:', err);
          if (runId === activeRunIdRef.current) {
            setIsCalculating(false);
          }
        });
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [inputs, stressTest, debounceMs, enabled]);

  return {
    yearlyResults: simulationState.yearlyResults,
    summary: simulationState.summary,
    pulse: simulationState.pulse,
    isCalculating
  };
}
