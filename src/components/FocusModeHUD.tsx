import React from 'react';
import { Keyboard, HelpCircle, X } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const FocusModeHUD: React.FC = () => {
  const isFocusMode = useSimulationStore((state) => state.isFocusMode);
  const focusModeZone = useSimulationStore((state) => state.focusModeZone);
  const setIsFocusMode = useSimulationStore((state) => state.setIsFocusMode);
  const setIsHelpGuideModalOpen = useSimulationStore((state) => state.setIsHelpGuideModalOpen);

  if (!isFocusMode) return null;

  return (
    <aside
      aria-label="Keyboard Focus Mode Controls"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white border border-emerald-500/40 shadow-xl shadow-slate-950/30 text-xs max-w-[92vw]"
    >
      {/* Active Status & Current Zone */}
      <div className="flex items-center gap-2 pr-2.5 border-r border-slate-700/80 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-bold text-white tracking-tight">Focus Mode</span>
        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
          {focusModeZone === 'tabs' ? 'Tabs' : 'Controls'}
        </span>
      </div>

      {/* Inline Arrow Key Hints */}
      <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-300">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 dark:bg-slate-900 border border-slate-700 font-mono text-[10px] text-emerald-300">
            ← →
          </kbd>
          <span>{focusModeZone === 'tabs' ? 'Switch Tabs' : 'Move / Slider'}</span>
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 dark:bg-slate-900 border border-slate-700 font-mono text-[10px] text-emerald-300">
            ↑ ↓
          </kbd>
          <span>{focusModeZone === 'tabs' ? 'Enter Controls' : 'Next / Prev'}</span>
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 dark:bg-slate-900 border border-slate-700 font-mono text-[10px] text-slate-200">
            Esc
          </kbd>
          <span>{focusModeZone === 'content' ? 'Tabs' : 'Exit'}</span>
        </span>
      </div>

      {/* Shortcuts Cheat Sheet & Exit Buttons */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/80 shrink-0">
        <button
          type="button"
          onClick={() => setIsHelpGuideModalOpen(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer"
          title="Open Keyboard Shortcuts Cheat Sheet (?)"
        >
          <HelpCircle className="w-3 h-3 text-indigo-400" />
          <span>Shortcuts</span>
        </button>
        <button
          type="button"
          onClick={() => setIsFocusMode(false)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer"
          title="Exit Focus Mode (Esc or F)"
          aria-label="Exit Focus Mode"
        >
          <X className="w-3 h-3" />
          <span>Exit</span>
        </button>
      </div>
    </aside>
  );
};
