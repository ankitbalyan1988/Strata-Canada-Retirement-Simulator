import React from 'react';
import { Loader2, Landmark, Globe, Layers, Sparkles } from 'lucide-react';

export interface ModuleLoadingFallbackProps {
  moduleName?: string;
  subtitle?: string;
  icon?: 'estate' | 'expat' | 'default';
  themeColor?: 'purple' | 'amber' | 'emerald';
}

export const ModuleLoadingFallback: React.FC<ModuleLoadingFallbackProps> = ({
  moduleName = 'Strata Intelligence Module',
  subtitle = 'Loading dynamic actuarial tax engine & cross-border calculators...',
  icon = 'default',
  themeColor = 'emerald'
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      spinner: 'text-emerald-600 dark:text-emerald-400'
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/15',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/20',
      badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      spinner: 'text-purple-600 dark:text-purple-400'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
      badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      spinner: 'text-amber-600 dark:text-amber-400'
    }
  };

  const theme = colorMap[themeColor] || colorMap.emerald;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full" aria-busy="true" aria-live="polite">
      {/* Branded Loading Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${theme.bg} ${theme.text} ${theme.border} border shrink-0 flex items-center justify-center relative`}>
              {icon === 'estate' ? (
                <Landmark className="w-6 h-6 animate-pulse" />
              ) : icon === 'expat' ? (
                <Globe className="w-6 h-6 animate-pulse" />
              ) : (
                <Layers className="w-6 h-6 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{moduleName}</span>
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${theme.badge}`}>
                  <Loader2 className={`w-3 h-3 animate-spin ${theme.spinner}`} />
                  <span>Loading Chunk</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Assembling code split bundle</span>
          </div>
        </div>
      </div>

      {/* Realistic Pulsing Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Skeleton Ledger Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 animate-pulse">
        {/* Controls Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800/80 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Center Loading Indicator & Micro-Notice */}
        <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600/10 to-teal-500/20 dark:from-emerald-500/20 dark:to-teal-400/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Initializing CRA Tax & Actuarial Models
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Strata is loading modular calculation dependencies without blocking the primary dashboard experience.
            </p>
          </div>
        </div>

        {/* Simulated Table Rows */}
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3].map((r) => (
            <div
              key={r}
              className="h-9 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
