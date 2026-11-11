import React from 'react';
import { MilestoneTable } from '../MilestoneTable';
import { RrspBreakEvenModule } from '../RrspBreakEvenModule';

export const LedgerTabContent: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Annual Simulation Ledger Table */}
      <MilestoneTable />

      {/* 2. RRSP/RRIF Break-Even Withdrawal Analysis Module (Placed directly below main ledger) */}
      <RrspBreakEvenModule />
    </div>
  );
};
