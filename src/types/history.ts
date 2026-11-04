import { RetirementInputs, SimulationSummary } from './retirement';

export interface SnapshotMetrics {
  retirementAge: number;
  currentAge: number;
  province: string;
  netWorthAtLifeExpectancy: number;
  netWorthAtRetirement: number;
  peakNetWorth: number;
  peakNetWorthAge: number;
  lifetimeTaxesPaid: number;
  isFullyFunded: boolean;
  yearsFunded: number;
  portfolioDepletionAge: number | null;
}

export interface SimulationSnapshot {
  id: string;
  timestamp: number;
  label: string;
  notes?: string;
  source: 'manual' | 'preset' | 'slider_milestone' | 'auto';
  inputs: RetirementInputs;
  summary: SimulationSummary;
  metrics: SnapshotMetrics;
}
