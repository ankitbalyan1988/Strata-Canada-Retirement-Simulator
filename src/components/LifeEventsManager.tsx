import React, { useMemo, useCallback } from 'react';
import {
  Gift,
  GraduationCap,
  Hammer,
  Car,
  Plane,
  Briefcase,
  Sparkles,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  Calendar,
  ShieldCheck,
  Info,
  Power
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  LifeEvent,
  LifeEventCategory,
  LifeEventKind
} from '../types/retirement';
import {
  LIFE_EVENT_PRESETS,
  LifeEventPreset
} from '../utils/engine/calculateLifeEvents';
import { CurrencyInput } from './CurrencyInput';
import { useSimulationStore } from '../store/useSimulationStore';

const EMPTY_LIFE_EVENTS: LifeEvent[] = [];

export interface LifeEventsManagerProps {
  events?: LifeEvent[];
  currentAge?: number;
  retirementAge?: number;
  lifeExpectancy?: number;
  inflationRate?: number;
  isMarried?: boolean;
  onChange?: (events: LifeEvent[]) => void;
}

const CATEGORY_META: Record<
  LifeEventCategory,
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeClass: string;
  }
> = {
  inheritance: {
    label: 'Inheritance',
    icon: Gift,
    badgeClass:
      'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
  },
  education_resp: {
    label: 'RESP / University',
    icon: GraduationCap,
    badgeClass:
      'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60'
  },
  home_renovation: {
    label: 'Home Renovation',
    icon: Hammer,
    badgeClass:
      'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
  },
  vehicle_purchase: {
    label: 'Vehicle Purchase',
    icon: Car,
    badgeClass:
      'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/60'
  },
  sabbatical_travel: {
    label: 'Sabbatical / Travel',
    icon: Plane,
    badgeClass:
      'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60'
  },
  temporary_layoff: {
    label: 'Temporary Layoff',
    icon: Briefcase,
    badgeClass:
      'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/70'
  },
  custom_inflow: {
    label: 'Custom Windfall',
    icon: TrendingUp,
    badgeClass:
      'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
  },
  custom_outflow: {
    label: 'Custom Expense',
    icon: TrendingDown,
    badgeClass:
      'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
  }
};

function formatShortCur(val: number): string {
  const abs = Math.abs(Math.round(val));
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  return `$${abs.toLocaleString('en-CA')}`;
}

export const LifeEventsManager: React.FC<LifeEventsManagerProps> = React.memo(
  ({
    events: propEvents,
    currentAge: propCurrentAge,
    retirementAge: propRetirementAge,
    lifeExpectancy: propLifeExpectancy,
    inflationRate: propInflationRate,
    isMarried: propIsMarried,
    onChange
  }) => {
    const storeSlice = useSimulationStore(
      useShallow((state) => ({
        lifeEvents: state.inputs.lifeEvents,
        currentAge: state.inputs.currentAge,
        retirementAge: state.inputs.retirementAge,
        lifeExpectancy: state.inputs.lifeExpectancy,
        inflationRate: state.inputs.inflationRate,
        isMarried: state.inputs.maritalStatus === 'married'
      }))
    );
    const storeUpdateField = useSimulationStore((state) => state.updateField);

    const events = propEvents ?? storeSlice.lifeEvents ?? EMPTY_LIFE_EVENTS;
    const currentAge = propCurrentAge ?? storeSlice.currentAge ?? 35;
    const retirementAge = propRetirementAge ?? storeSlice.retirementAge ?? 65;
    const lifeExpectancy = propLifeExpectancy ?? storeSlice.lifeExpectancy ?? 90;
    const inflationRate = propInflationRate ?? storeSlice.inflationRate ?? 2.1;
    const isMarried = propIsMarried ?? storeSlice.isMarried ?? false;

    const commitEvents = useCallback(
      (nextEvents: LifeEvent[]) => {
        if (onChange) {
          onChange(nextEvents);
        } else {
          storeUpdateField('lifeEvents', nextEvents);
        }
      },
      [onChange, storeUpdateField]
    );

    const handleAddPreset = useCallback(
      (preset: LifeEventPreset) => {
        const clampedAge = Math.min(
          lifeExpectancy,
          Math.max(
            currentAge,
            preset.kind === 'income_shock'
              ? Math.min(Math.max(currentAge, retirementAge - 1), currentAge + preset.defaultAgeOffset)
              : currentAge + preset.defaultAgeOffset
          )
        );
        const newEvent: LifeEvent = {
          id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: preset.name,
          category: preset.category,
          kind: preset.kind,
          enabled: true,
          startAge: clampedAge,
          durationYears: preset.durationYears,
          amount: preset.amount,
          inflationAdjusted: preset.inflationAdjusted,
          isTaxable: preset.isTaxable ?? false,
          incomeReductionPercent: preset.incomeReductionPercent,
          replacementIncome: preset.replacementIncome,
          affectsPerson: preset.affectsPerson ?? 'primary',
          notes: preset.description
        };
        commitEvents([...events, newEvent]);
      },
      [events, currentAge, retirementAge, lifeExpectancy, commitEvents]
    );

    const handleAddCustomEvent = useCallback(() => {
      const targetAge = Math.min(lifeExpectancy, currentAge + 5);
      const newEvent: LifeEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: 'Custom Cash Flow Shock',
        category: 'custom_outflow',
        kind: 'outflow',
        enabled: true,
        startAge: targetAge,
        durationYears: 1,
        amount: 25000,
        inflationAdjusted: true,
        isTaxable: false
      };
      commitEvents([...events, newEvent]);
    }, [events, currentAge, lifeExpectancy, commitEvents]);

    const handleUpdateEvent = useCallback(
      (id: string, patch: Partial<LifeEvent>) => {
        commitEvents(events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
      },
      [events, commitEvents]
    );

    const handleRemoveEvent = useCallback(
      (id: string) => {
        commitEvents(events.filter((ev) => ev.id !== id));
      },
      [events, commitEvents]
    );

    const stats = useMemo(() => {
      const active = events.filter((e) => e.enabled);
      let totalInflowsToday = 0;
      let totalOutflowsToday = 0;
      let incomeShockYears = 0;

      for (const ev of active) {
        const dur = Math.max(1, Math.round(ev.durationYears || 1));
        if (ev.kind === 'inflow') {
          totalInflowsToday += (ev.amount || 0) * dur;
        } else if (ev.kind === 'outflow') {
          totalOutflowsToday += (ev.amount || 0) * dur;
        } else if (ev.kind === 'income_shock') {
          incomeShockYears += dur;
          totalOutflowsToday += (ev.amount || 0) * dur;
          totalInflowsToday += (ev.replacementIncome || 0) * dur;
        }
      }

      const chronological = [...active].sort((a, b) => a.startAge - b.startAge);
      return {
        activeCount: active.length,
        pausedCount: events.length - active.length,
        totalInflowsToday,
        totalOutflowsToday,
        incomeShockYears,
        chronological
      };
    }, [events]);

    const currentYear = 2026;

    return (
      <div className="flex flex-col gap-5">
        {/* Top Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scheduled Events
              </span>
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {stats.activeCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                active{stats.pausedCount > 0 ? ` · ${stats.pausedCount} paused` : ''}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/25 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Discrete Windfalls (Today&apos;s $)
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                +{formatShortCur(stats.totalInflowsToday)}
              </span>
              <span className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                inheritances &amp; offsets
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/25 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Discrete Outflows &amp; Pauses
              </span>
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                -{formatShortCur(stats.totalOutflowsToday)}
              </span>
              {stats.incomeShockYears > 0 && (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  + {stats.incomeShockYears} yr{stats.incomeShockYears > 1 ? 's' : ''} income shock
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chronological Event Timeline Strip (when at least 1 active event exists) */}
        {stats.chronological.length > 0 && (
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chronological Cash Flow Shock Timeline
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                Age {currentAge} → Retire {retirementAge} → Age {lifeExpectancy}
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stats.chronological.map((ev) => {
                const isInflow = ev.kind === 'inflow';
                const isShock = ev.kind === 'income_shock';
                const endAge = ev.startAge + Math.max(1, ev.durationYears) - 1;
                const ageTag =
                  ev.durationYears > 1 ? `Age ${ev.startAge}–${endAge}` : `Age ${ev.startAge}`;

                return (
                  <div
                    key={ev.id}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                      isInflow
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                        : isShock
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                        : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 border border-current/15">
                      {ageTag}
                    </span>
                    <span className="font-semibold">{ev.name}</span>
                    <span className="font-mono font-bold text-[11px]">
                      {isInflow
                        ? `+${formatShortCur(ev.amount)}`
                        : isShock
                        ? `-${ev.incomeReductionPercent || 0}% pay`
                        : `-${formatShortCur(ev.amount)}${ev.durationYears > 1 ? '/yr' : ''}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick-Add One-Click Canadian Event Templates */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Quick-Add Common Life Events &amp; Shocks
              </h5>
            </div>
            <button
              type="button"
              onClick={handleAddCustomEvent}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Event</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {LIFE_EVENT_PRESETS.map((preset) => {
              const meta = CATEGORY_META[preset.category];
              const Icon = meta.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="group flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400/70 dark:hover:border-emerald-500/60 hover:shadow-xs text-left transition cursor-pointer"
                >
                  <div
                    className={`p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${meta.badgeClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {preset.name}
                      </span>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0" />
                    </div>
                    <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {preset.tagline}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active / Configured Event Editor Cards */}
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-8 text-center">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
              No Discrete Life Events Scheduled Yet
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Click any template above to test how an expected inheritance, university tuition,
              $40k home renovation, vehicle purchase, sabbatical year, or temporary layoff impacts
              your retirement timeline and portfolio reserves.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const meta = CATEGORY_META[ev.category] || CATEGORY_META.custom_outflow;
              const Icon = meta.icon;
              const yearsAhead = Math.max(0, Math.round(ev.startAge) - currentAge);
              const eventCalYear = currentYear + yearsAhead;
              const inflFactor = ev.inflationAdjusted
                ? Math.pow(1 + inflationRate / 100, yearsAhead)
                : 1;
              const projectedNominalAmt = Math.round((ev.amount || 0) * inflFactor);
              const duration = Math.max(1, Math.round(ev.durationYears || 1));

              return (
                <div
                  key={ev.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    ev.enabled
                      ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700/80 shadow-2xs'
                      : 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-65'
                  }`}
                >
                  {/* Card Top Row: Category Icon, Name Input, Kind Selector, Enable Toggle, Delete */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 ${meta.badgeClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={ev.name}
                        onChange={(e) => handleUpdateEvent(ev.id, { name: e.target.value })}
                        aria-label="Life event name"
                        className="flex-1 min-w-0 bg-transparent text-sm font-bold text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-emerald-500 focus:bg-slate-50 dark:focus:bg-slate-800 rounded-lg px-2 py-1 outline-none transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Kind Segmented Selector */}
                      <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold">
                        {(
                          [
                            { id: 'inflow', label: 'Windfall' },
                            { id: 'outflow', label: 'Expense' },
                            { id: 'income_shock', label: 'Income Shock' }
                          ] as Array<{ id: LifeEventKind; label: string }>
                        ).map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() =>
                              handleUpdateEvent(ev.id, {
                                kind: k.id,
                                category:
                                  k.id === 'inflow'
                                    ? ev.category === 'inheritance'
                                      ? 'inheritance'
                                      : 'custom_inflow'
                                    : k.id === 'income_shock'
                                    ? ev.category === 'sabbatical_travel' ||
                                      ev.category === 'temporary_layoff'
                                      ? ev.category
                                      : 'temporary_layoff'
                                    : ev.kind === 'outflow'
                                    ? ev.category
                                    : 'custom_outflow',
                                incomeReductionPercent:
                                  k.id === 'income_shock'
                                    ? ev.incomeReductionPercent ?? 50
                                    : ev.incomeReductionPercent
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                              ev.kind === k.id
                                ? k.id === 'inflow'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : k.id === 'income_shock'
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-rose-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {k.label}
                          </button>
                        ))}
                      </div>

                      {/* Enable/Pause Toggle */}
                      <button
                        type="button"
                        onClick={() => handleUpdateEvent(ev.id, { enabled: !ev.enabled })}
                        title={ev.enabled ? 'Pause this event to compare impact' : 'Re-enable this event'}
                        aria-pressed={ev.enabled}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                          ev.enabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{ev.enabled ? 'Active' : 'Paused'}</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveEvent(ev.id)}
                        title="Remove life event"
                        aria-label={`Remove ${ev.name}`}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Primary Parameters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3.5">
                    {/* Start Age */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Start Age{' '}
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          ({eventCalYear})
                        </span>
                      </label>
                      <input
                        type="number"
                        min={currentAge}
                        max={lifeExpectancy}
                        value={ev.startAge}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          if (!isNaN(parsed)) {
                            handleUpdateEvent(ev.id, {
                              startAge: Math.min(lifeExpectancy, Math.max(currentAge, parsed))
                            });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 tabular-nums"
                      />
                    </div>

                    {/* Duration (Years) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Duration (Years)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={duration}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          if (!isNaN(parsed)) {
                            handleUpdateEvent(ev.id, {
                              durationYears: Math.min(20, Math.max(1, parsed))
                            });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 tabular-nums"
                      />
                    </div>

                    {/* Dollar Amount (Per Year) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {ev.kind === 'inflow'
                          ? duration > 1
                            ? 'Windfall / Year'
                            : 'Windfall Amount'
                          : ev.kind === 'income_shock'
                          ? 'Extra Annual Cost (e.g. Travel)'
                          : duration > 1
                          ? 'Cost / Year'
                          : 'Total Expense'}
                      </label>
                      <CurrencyInput
                        value={ev.amount}
                        onChange={(val) => handleUpdateEvent(ev.id, { amount: Math.max(0, val) })}
                        min={0}
                        step={2500}
                        aria-label={`${ev.name} amount`}
                      />
                    </div>

                    {/* Inflation Indexing */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Dollar Basis
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateEvent(ev.id, { inflationAdjusted: !ev.inflationAdjusted })
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold transition text-left flex items-center justify-between cursor-pointer ${
                          ev.inflationAdjusted
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-200'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{ev.inflationAdjusted ? "Today's $ (CPI)" : 'Fixed Nominal $'}</span>
                        <span className="text-[10px] font-mono opacity-80">
                          {ev.inflationAdjusted ? `+${inflationRate}%/yr` : '0%'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Context-Specific Row: Tax Treatment (Windfall) OR Income Reduction & EI (Income Shock) */}
                  {ev.kind === 'inflow' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          {ev.isTaxable
                            ? 'Taxed as ordinary Canadian income in the year received.'
                            : '100% CRA tax-free windfall (Canadian inheritances & gifts have no recipient tax).'}
                        </span>
                      </div>
                      <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateEvent(ev.id, { isTaxable: false })}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            !ev.isTaxable
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Tax-Free
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateEvent(ev.id, { isTaxable: true })}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            ev.isTaxable
                              ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Taxable
                        </button>
                      </div>
                    </div>
                  )}

                  {ev.kind === 'income_shock' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {/* Salary Drop % */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Income Reduction %</span>
                          </label>
                          <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300 font-mono">
                            -{ev.incomeReductionPercent ?? 50}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[25, 50, 75, 100].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() =>
                                handleUpdateEvent(ev.id, { incomeReductionPercent: pct })
                              }
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                (ev.incomeReductionPercent ?? 50) === pct
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* EI / Severance Replacement */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          EI / Severance Offset (Taxable / yr)
                        </label>
                        <CurrencyInput
                          value={ev.replacementIncome ?? 0}
                          onChange={(val) =>
                            handleUpdateEvent(ev.id, { replacementIncome: Math.max(0, val) })
                          }
                          min={0}
                          step={1000}
                          aria-label={`${ev.name} EI or severance offset`}
                        />
                      </div>

                      {/* Affects Person (Couples) */}
                      {isMarried ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Applies To Earner
                          </label>
                          <div className="inline-flex w-full p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold">
                            {(
                              [
                                { id: 'primary', label: 'Primary' },
                                { id: 'spouse', label: 'Spouse' },
                                { id: 'both', label: 'Both' }
                              ] as const
                            ).map((person) => (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateEvent(ev.id, { affectsPerson: person.id })
                                }
                                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                                  (ev.affectsPerson || 'primary') === person.id
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {person.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl px-3 py-2">
                            Any cash shortfall during this pause draws automatically from Non-Reg,
                            then TFSA, then RRSP reserves.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Live Projection Strip */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {ev.kind === 'inflow'
                          ? `Injects ~${formatShortCur(projectedNominalAmt)}${duration > 1 ? '/yr' : ''} (${ev.isTaxable ? 'taxable' : 'tax-free'}) into TFSA & Non-Reg savings in ${eventCalYear}.`
                          : ev.kind === 'income_shock'
                          ? `Reduces salary by ${ev.incomeReductionPercent ?? 50}% for ${duration} yr${duration > 1 ? 's' : ''} starting Age ${ev.startAge} (${eventCalYear}); full salary resumes automatically afterward.`
                          : `Adds ~${formatShortCur(projectedNominalAmt)}${duration > 1 ? '/yr' : ''} nominal outflow in ${eventCalYear}; funded from cash flow, then liquid reserves if needed.`}
                      </span>
                    </div>
                    {ev.startAge >= retirementAge && ev.kind === 'income_shock' && (
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        Note: Start age is at/after retirement (employment income is already $0).
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

LifeEventsManager.displayName = 'LifeEventsManager';
