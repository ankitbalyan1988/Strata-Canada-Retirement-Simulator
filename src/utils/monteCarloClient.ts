import { RetirementInputs } from '../types/retirement';
import {
  MonteCarloOptimizerOptions,
  MonteCarloOptimizerResult,
  runMonteCarloRetirementOptimizer
} from './monteCarloOptimizer';
import type { MonteCarloWorkerResponse } from './monteCarlo.worker';

let workerInstance: Worker | null = null;
let requestCounter = 0;
const pendingCallbacks = new Map<number, (resp: MonteCarloWorkerResponse) => void>();

function getMonteCarloWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./monteCarlo.worker.ts', import.meta.url), {
        type: 'module'
      });
      workerInstance.addEventListener('message', (event: MessageEvent<MonteCarloWorkerResponse>) => {
        const data = event.data;
        if (data && typeof data.id === 'number' && pendingCallbacks.has(data.id)) {
          const cb = pendingCallbacks.get(data.id);
          pendingCallbacks.delete(data.id);
          cb?.(data);
        }
      });
      workerInstance.addEventListener('error', (err) => {
        console.warn('[MonteCarloWorker] Error occurred, falling back to sync execution:', err);
      });
    } catch (err) {
      console.warn('[MonteCarloWorker] Failed to initialize Web Worker, using sync fallback:', err);
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * Executes Monte Carlo retirement age optimization asynchronously via Web Worker
 * with graceful fallback to synchronous execution if Worker is unavailable.
 */
export function runMonteCarloOptimizerAsync(
  inputs: RetirementInputs,
  options: MonteCarloOptimizerOptions
): Promise<MonteCarloOptimizerResult> {
  const worker = getMonteCarloWorker();
  if (!worker) {
    return Promise.resolve(runMonteCarloRetirementOptimizer(inputs, options));
  }

  return new Promise((resolve, reject) => {
    const id = ++requestCounter;
    const timeoutId = setTimeout(() => {
      pendingCallbacks.delete(id);
      try {
        resolve(runMonteCarloRetirementOptimizer(inputs, options));
      } catch (err) {
        reject(err);
      }
    }, 3000);

    pendingCallbacks.set(id, (resp) => {
      clearTimeout(timeoutId);
      if (resp.success && resp.result) {
        resolve(resp.result);
      } else {
        try {
          resolve(runMonteCarloRetirementOptimizer(inputs, options));
        } catch (err) {
          reject(err);
        }
      }
    });

    worker.postMessage({ id, inputs, options });
  });
}
