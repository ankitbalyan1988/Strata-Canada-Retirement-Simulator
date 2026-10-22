import { useState, useEffect, useRef, useTransition } from 'react';
import {
  RetirementInputs,
  StressTestOptions,
  YearSimulationResult,
  SimulationSummary
} from '../types/retirement';
import { runRetirementSimulation, SimulationOptions } from './simulator';
import { SimWorkerRequest, SimWorkerResponse } from '../worker/simWorker';

let workerInstance: Worker | null = null;
let currentRequestId = 0;
const pendingCallbacks = new Map<number, (res: SimWorkerResponse) => void>();

/**
 * Initializes or retrieves the singleton Web Worker instance with fallback detection.
 */
function getSimulationWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('../worker/simWorker.ts', import.meta.url), {
        type: 'module'
      });

      workerInstance.onmessage = (event: MessageEvent<SimWorkerResponse>) => {
        const { id } = event.data;
        const callback = pendingCallbacks.get(id);
        if (callback) {
          callback(event.data);
          pendingCallbacks.delete(id);
        }
      };

      workerInstance.onerror = (err) => {
        console.warn('Simulation worker encountered an error, falling back to sync execution:', err);
      };
    } catch (err) {
      console.warn('Failed to construct Simulation Worker, using sync fallback:', err);
      workerInstance = null;
    }
  }

  return workerInstance;
}

/**
 * Asynchronously calculates the retirement simulation via Web Worker,
 * with automatic fallback to synchronous execution in unsupported or test environments.
 */
export function calculateSimulationAsync(
  inputs: RetirementInputs,
  stressTest?: StressTestOptions,
  simulationOptions?: SimulationOptions
): Promise<{ yearlyResults: YearSimulationResult[]; summary: SimulationSummary }> {
  const worker = getSimulationWorker();

  if (!worker) {
    // Synchronous execution fallback
    return Promise.resolve(runRetirementSimulation(inputs, stressTest, simulationOptions));
  }

  return new Promise((resolve, reject) => {
    const id = ++currentRequestId;
    const timeoutId = setTimeout(() => {
      pendingCallbacks.delete(id);
      // If worker times out or hangs, fallback to sync
      try {
        resolve(runRetirementSimulation(inputs, stressTest, simulationOptions));
      } catch (e) {
        reject(e);
      }
    }, 1000);

    pendingCallbacks.set(id, (response) => {
      clearTimeout(timeoutId);
      if (response.type === 'SIMULATION_RESULT' && response.yearlyResults && response.summary) {
        resolve({
          yearlyResults: response.yearlyResults,
          summary: response.summary
        });
      } else {
        // Fallback on error
        try {
          resolve(runRetirementSimulation(inputs, stressTest, simulationOptions));
        } catch (e) {
          reject(new Error(response.error || 'Worker simulation failed'));
        }
      }
    });

    const request: SimWorkerRequest = {
      id,
      type: 'RUN_SIMULATION',
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
  isCalculating: boolean;
} {
  const { debounceMs = 60, enabled = true } = options;

  // Compute initial baseline synchronously on first mount for instant 0ms initial render if enabled
  const initialRef = useRef<{ yearlyResults: YearSimulationResult[]; summary: SimulationSummary } | null>(null);
  if (!initialRef.current && enabled) {
    initialRef.current = runRetirementSimulation(inputs, stressTest);
  }

  const [simulationState, setSimulationState] = useState(
    initialRef.current || {
      yearlyResults: [],
      summary: {} as SimulationSummary
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

      calculateSimulationAsync(targetInputs, targetStress).then((result) => {
        // Only update if this request is still the latest one
        if (runId === activeRunIdRef.current) {
          startTransition(() => {
            setSimulationState(result);
            setIsCalculating(false);
          });
        }
      }).catch((err) => {
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
    isCalculating
  };
}
