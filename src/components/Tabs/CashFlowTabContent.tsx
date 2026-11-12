import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { CashFlowVisualizer } from '../CashFlowVisualizer';
import { CashFlowLedgerTable } from '../CashFlowLedgerTable';

export const CashFlowTabContent: React.FC = () => {
  const yearlyResults = useSimulationStore(useShallow((state) => state.yearlyResults));
  const inputs = useSimulationStore(useShallow((state) => state.inputs));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Interactive Top-of-Tab Cash Flow Visualizer (KPIs, stream filters, responsive SVG chart, retirement demarcation line, hover card) */}
      <CashFlowVisualizer
        yearlyResults={yearlyResults}
        inputs={inputs}
      />

      {/* 2. Formatted Annual Cash Flow & Tax Liability Ledger Table with Excel export */}
      <CashFlowLedgerTable
        yearlyResults={yearlyResults}
        inputs={inputs}
      />
    </div>
  );
};
