import { RetirementInputs, StressTestOptions, YearSimulationResult, SimulationSummary } from '../types/retirement';
import { runRetirementSimulation, SimulationOptions } from '../utils/simulator';

export interface SimWorkerRequest {
  id: number;
  type: 'RUN_SIMULATION';
  inputs: RetirementInputs;
  stressTest?: StressTestOptions;
  simulationOptions?: SimulationOptions;
}

export interface SimWorkerResponse {
  id: number;
  type: 'SIMULATION_RESULT' | 'SIMULATION_ERROR';
  yearlyResults?: YearSimulationResult[];
  summary?: SimulationSummary;
  error?: string;
}

// Dedicated Web Worker thread for running heavy Canadian retirement simulations
self.onmessage = (event: MessageEvent<SimWorkerRequest>) => {
  const { id, type, inputs, stressTest, simulationOptions } = event.data;

  if (type === 'RUN_SIMULATION') {
    try {
      const result = runRetirementSimulation(inputs, stressTest, simulationOptions);
      const response: SimWorkerResponse = {
        id,
        type: 'SIMULATION_RESULT',
        yearlyResults: result.yearlyResults,
        summary: result.summary
      };
      self.postMessage(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorResponse: SimWorkerResponse = {
        id,
        type: 'SIMULATION_ERROR',
        error: errorMessage
      };
      self.postMessage(errorResponse);
    }
  }
};
