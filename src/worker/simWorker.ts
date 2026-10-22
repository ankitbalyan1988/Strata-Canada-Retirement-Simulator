import { RetirementInputs, StressTestOptions, YearSimulationResult, SimulationSummary } from '../types/retirement';
import { runRetirementSimulation, calculateSavingsPulse, SavingsPulseResult, SimulationOptions } from '../utils/simulator';

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
  pulse?: SavingsPulseResult;
  error?: string;
}

// Dedicated Web Worker thread executing heavy retirement simulations and binary-search savings pulses
self.addEventListener('message', (event: MessageEvent<SimWorkerRequest>) => {
  const { id, type, inputs, stressTest, simulationOptions } = event.data;

  if (type === 'RUN_SIMULATION') {
    try {
      const simResult = runRetirementSimulation(inputs, stressTest, simulationOptions);
      const pulse = calculateSavingsPulse(inputs, simResult.summary);
      const response: SimWorkerResponse = {
        id,
        type: 'SIMULATION_RESULT',
        yearlyResults: simResult.yearlyResults,
        summary: simResult.summary,
        pulse
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
});
