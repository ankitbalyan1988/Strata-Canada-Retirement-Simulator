import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, X, FileText } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const ToastBanner: React.FC = () => {
  const toast = useSimulationStore((state) => state.toastNotification);
  const dismissToast = useSimulationStore((state) => state.dismissToast);

  if (!toast) return null;

  const isLoading = toast.status === 'loading';
  const isSuccess = toast.status === 'success';
  const isError = toast.status === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 sm:top-[72px] right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-lg transition-colors ${
          isSuccess
            ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-500/40'
            : isError
            ? 'bg-white/95 dark:bg-slate-900/95 border-rose-200 dark:border-rose-500/40'
            : 'bg-white/95 dark:bg-slate-900/95 border-indigo-200 dark:border-indigo-500/40'
        }`}
      >
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : isError
              ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
            {toast.title}
          </div>
          {toast.message && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug break-words">
              {toast.message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss notification"
          title="Dismiss"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
