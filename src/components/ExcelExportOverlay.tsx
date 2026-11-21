import React, { useEffect, useRef } from 'react';
import { FileSpreadsheet, Loader2, CheckCircle2, Check, ChevronRight } from 'lucide-react';
import { useSimulationStore, ExcelExportPhase } from '../store/useSimulationStore';
import { AppIcon } from './AppIcon';

interface ExportStep {
  id: ExcelExportPhase;
  label: string;
  detail: string;
}

const EXPORT_STEPS: ExportStep[] = [
  {
    id: 'loading_chunk',
    label: 'Loading Excel Engine Chunk',
    detail: 'Fetching on-demand ExcelJS spreadsheet & styling modules'
  },
  {
    id: 'processing',
    label: 'Processing Ledger Data & Formulas',
    detail: 'Formatting worksheets, currency cells, and live SUM / tax formulas'
  },
  {
    id: 'downloading',
    label: 'Preparing .xlsx Download',
    detail: 'Packaging workbook buffer for instant browser save'
  }
];

const PHASE_INDEX: Record<ExcelExportPhase, number> = {
  loading_chunk: 0,
  processing: 1,
  downloading: 2
};

const PHASE_PROGRESS_WIDTH: Record<ExcelExportPhase, string> = {
  loading_chunk: 'w-1/3',
  processing: 'w-3/4',
  downloading: 'w-full'
};

function formatElapsedSeconds(elapsedMs: number): string {
  const seconds = elapsedMs / 1000;
  return `+${seconds.toFixed(1)}s`;
}

export const ExcelExportOverlay: React.FC = () => {
  const overlay = useSimulationStore((state) => state.excelExportOverlay);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const logsCount = overlay?.logs.length ?? 0;

  // Keep the newest text progress log line smoothly scrolled into view
  useEffect(() => {
    const el = logContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logsCount]);

  if (!overlay) return null;

  const activeIdx = PHASE_INDEX[overlay.phase];
  const isFinalizing = overlay.phase === 'downloading';
  const completedLogCount = overlay.logs.filter((entry) => entry.status === 'done').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="excel-export-overlay-title"
      aria-describedby="excel-export-overlay-subtitle"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/55 dark:bg-black/75 backdrop-blur-sm transition-opacity duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-[#11141A] border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-950/25 dark:shadow-black/60">
        {/* Top Animated Phase Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-500 ease-out ${PHASE_PROGRESS_WIDTH[overlay.phase]}`}
          />
        </div>

        <div className="p-6 sm:p-7 flex flex-col items-center text-center">
          {/* Center Branded Spinner Emblem */}
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute -inset-2 rounded-2xl bg-emerald-500/15 dark:bg-emerald-400/15 blur-md animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/80 dark:to-teal-950/80 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-center shadow-sm">
              {isFinalizing ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <>
                  <FileSpreadsheet className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                  <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-[#11141A] border border-emerald-200 dark:border-emerald-700 flex items-center justify-center shadow-xs">
                    <Loader2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Title & Live Status Subtitle */}
          <h2
            id="excel-export-overlay-title"
            className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight"
          >
            {overlay.title}
          </h2>
          <p
            id="excel-export-overlay-subtitle"
            aria-live="polite"
            className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md"
          >
            {overlay.subtitle}
          </p>

          {/* 3-Step Asynchronous Phase Tracker */}
          <div className="mt-4 w-full rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/90 p-3.5 text-left space-y-2">
            {EXPORT_STEPS.map((step, index) => {
              const isCompleted = index < activeIdx || (isFinalizing && index === activeIdx);
              const isActive = index === activeIdx && !isFinalizing;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-2.5 transition-opacity duration-200 ${
                    index > activeIdx ? 'opacity-45' : 'opacity-100'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                    ) : (
                      <span className="block w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold leading-snug ${
                        isActive || isCompleted
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Granular Text-Based Progress Log */}
          <div className="mt-3 w-full text-left">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Export Progress Log
              </span>
              <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                {completedLogCount}/{overlay.logs.length}{' '}
                {overlay.logs.length === 1 ? 'step' : 'steps'}
              </span>
            </div>

            <div
              ref={logContainerRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className="w-full max-h-36 overflow-y-auto rounded-xl bg-slate-950/[0.03] dark:bg-black/45 border border-slate-200/80 dark:border-slate-800/90 px-3 py-2.5 font-mono text-[11px] space-y-1.5"
            >
              {overlay.logs.map((entry) => {
                const isDone = entry.status === 'done';
                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-2.5 leading-snug"
                  >
                    <div className="flex items-start gap-1.5 min-w-0">
                      {isDone ? (
                        <Check
                          className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronRight
                          className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400 animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          isDone
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-emerald-200 font-semibold'
                        }
                      >
                        {entry.message}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {formatElapsedSeconds(entry.elapsedMs)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Reassurance */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <AppIcon size="xs" alt="Strata" />
            <span>Download starts automatically once workbook generation completes.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
