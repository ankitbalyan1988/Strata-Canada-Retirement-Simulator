import React from 'react';
import { CashFlowVisualizer } from '../CashFlowVisualizer';
import { CashFlowLedgerTable } from '../CashFlowLedgerTable';

export const CashFlowTabContent: React.FC = React.memo(() => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Interactive Top-of-Tab Cash Flow Visualizer (KPIs, stream filters, responsive SVG chart, retirement demarcation line, hover card) */}
      <CashFlowVisualizer />

      {/* 2. Formatted Annual Cash Flow & Tax Liability Ledger Table with Excel export */}
      <CashFlowLedgerTable />
    </div>
  );
});

CashFlowTabContent.displayName = 'CashFlowTabContent';
