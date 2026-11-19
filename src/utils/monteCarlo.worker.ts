/// <reference lib="webworker" />
import { RetirementInputs } from '../types/retirement';
import {
  MonteCarloOptimizerOptions,
  MonteCarloOptimizerResult,
  runMonteCarloRetirementOptimizer
} from './monteCarloOptimizer';

export interface MonteCarloWorkerRequest {
  id: number;
  inputs: RetirementInputs;
  options: MonteCarloOptimizerOptions;
}

export interface MonteCarloWorkerResponse {
  id: number;
  success: boolean;
  result?: MonteCarloOptimizerResult;
  error?: string;
}

self.addEventListener('message', (event: MessageEvent<MonteCarloWorkerRequest>) => {
  const { id, inputs, options } = event.data;
  try {
    const result = runMonteCarloRetirementOptimizer(inputs, options);
    const response: MonteCarloWorkerResponse = {
      id,
      success: true,
      result
    };
    self.postMessage(response);
  } catch (err: unknown) {
    const errorResponse: MonteCarloWorkerResponse = {
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
    self.postMessage(errorResponse);
  }
});

export {};
