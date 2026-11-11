import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  Layers, 
  ChevronDown, 
  Check, 
  Clock, 
  Scale, 
  History,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const TopScenarioSwitcher: React.FC = () => {
  const history = useSimulationStore(useShallow((state) => state.history));
  const activeSnapshotId = useSimulationStore((state) => state.activeSnapshotId);
  const restoreSnapshot = useSimulationStore((state) => state.restoreSnapshot);
  const setIsSnapshotCompareModalOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);
  const setIsHistoryPanelOpen = useSimulationStore((state) => state.setIsHistoryPanelOpen);
  const currentInputs = useSimulationStore(useShallow((state) => state.inputs));

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine active snapshot:
  // 1. By explicit activeSnapshotId
  // 2. Or by matching key input parameters (retirementAge, currentAnnualIncome, province, targetRetirementSpendingToday)
  const currentActiveSnapshot = useMemo(() => {
    if (activeSnapshotId) {
      const match = history.find((s) => s.id === activeSnapshotId);
      if (match) return match;
    }
    // Fallback: match by critical plan parameters
    return history.find((s) => 
      s.inputs.retirementAge === currentInputs.retirementAge &&
      s.inputs.province === currentInputs.province &&
      Math.abs((s.inputs.currentAnnualIncome || 0) - (currentInputs.currentAnnualIncome || 0)) < 1 &&
      Math.abs((s.inputs.targetRetirementSpendingToday || 0) - (currentInputs.targetRetirementSpendingToday || 0)) < 1
    ) || null;
  }, [history, activeSnapshotId, currentInputs]);

  // Active label to display on trigger
  const displayLabel = currentActiveSnapshot 
    ? currentActiveSnapshot.label 
    : `Custom Plan (Modified)`;

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectScenario = (snapshotId: string) => {
    restoreSnapshot(snapshotId);
    setIsOpen(false);
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '$0';
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    return `$${Math.round(val / 1000)}k`;
  };

  // If the user does not have multiple scenarios, do NOT show this dropdown at all
  // Note: Placed after all hooks to strictly adhere to React Rules of Hooks
  if (history.length <= 1) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Switch between saved scenarios"
        title="Switch between your saved plan scenarios"
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer border ${
          isOpen
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
            : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700/80 hover:border-emerald-300 dark:hover:border-emerald-700/80'
        }`}
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Layers className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal hidden md:inline">
            Scenario:
          </span>
          <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[110px] sm:max-w-[170px] lg:max-w-[210px]">
            {displayLabel}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 font-bold hidden sm:inline">
            {history.length}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div 
          role="menu"
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Switch Plan Scenario
                </h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Select a saved snapshot to simulate instantly
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono">
              {history.length} Saved
            </span>
          </div>

          {/* Scenario List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {history.map((snap) => {
              const isSelected = currentActiveSnapshot?.id === snap.id;
              const formattedDate = new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <button
                  key={snap.id}
                  type="button"
                  onClick={() => handleSelectScenario(snap.id)}
                  className={`w-full text-left p-3 flex items-start gap-2.5 transition cursor-pointer group ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {/* Selection Indicator */}
                  <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-500'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>

                  {/* Scenario Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>
                        {snap.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formattedDate}
                      </span>
                    </div>

                    {snap.notes && (
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 italic truncate mt-0.5">
                        "{snap.notes}"
                      </p>
                    )}

                    {/* Scenario Metrics Summary Bar */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10.5px]">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        Age {snap.metrics.retirementAge}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {snap.metrics.province}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(snap.metrics.netWorthAtLifeExpectancy)} NW
                      </span>
                      <span className={`inline-flex items-center gap-0.5 font-semibold ${
                        snap.metrics.isFullyFunded
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {snap.metrics.isFullyFunded ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Solvent</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Depleted @ {snap.metrics.portfolioDepletionAge || 'early'}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Quick Action Links */}
          <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsSnapshotCompareModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-750 font-semibold transition cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-500" />
              <span>Compare All</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsHistoryPanelOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-750 font-semibold transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-emerald-500" />
              <span>Plan History</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
