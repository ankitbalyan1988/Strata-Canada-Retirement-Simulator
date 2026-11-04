/// <reference lib="webworker" />
import { RetirementInputs, StressTestOptions, YearSimulationResult, SimulationSummary } from '../types/retirement';
import { runRetirementSimulation, calculateSavingsPulse, SavingsPulseResult, SimulationOptions } from './simulator';

export interface SimulatorWorkerRequest {
  id?: number;
  inputs: RetirementInputs;
  stressTest?: StressTestOptions;
  simulationOptions?: SimulationOptions;
}

export interface SimulatorWorkerResponse {
  id?: number;
  yearlyResults?: YearSimulationResult[];
  summary?: SimulationSummary;
  pulse?: SavingsPulseResult;
  error?: string;
  success: boolean;
}

/**
 * Dedicated Web Worker executing heavy multi-decade retirement projection simulations
 * and calculations off the main UI thread.
 */
self.addEventListener('message', (event: MessageEvent<SimulatorWorkerRequest | RetirementInputs>) => {
  const data = event.data;
  let id: number | undefined;
  let inputs: RetirementInputs;
  let stressTest: StressTestOptions | undefined;
  let simulationOptions: SimulationOptions | undefined;

  if (data && typeof data === 'object' && 'inputs' in data) {
    id = (data as SimulatorWorkerRequest).id;
    inputs = (data as SimulatorWorkerRequest).inputs;
    stressTest = (data as SimulatorWorkerRequest).stressTest;
    simulationOptions = (data as SimulatorWorkerRequest).simulationOptions;
  } else {
    inputs = data as RetirementInputs;
  }

  try {
    const simResult = runRetirementSimulation(inputs, stressTest, simulationOptions);
    const pulse = calculateSavingsPulse(inputs, simResult.summary);
    const response: SimulatorWorkerResponse = {
      id,
      yearlyResults: simResult.yearlyResults,
      summary: simResult.summary,
      pulse,
      success: true
    };
    self.postMessage(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorResponse: SimulatorWorkerResponse = {
      id,
      error: errorMsg,
      success: false
    };
    self.postMessage(errorResponse);
  }
});

export {};
