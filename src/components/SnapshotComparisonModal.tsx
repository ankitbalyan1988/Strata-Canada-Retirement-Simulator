import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Camera,
  Check,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  DollarSign,
  Plus,
  ShieldCheck,
  Trash2,
  Clock,
  Edit2
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { SimulationSnapshot } from '../types/history';
import { RetirementInputs, SimulationSummary } from '../types/retirement';

export interface SnapshotComparisonModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ComparisonColumnData {
  id: string;
  isLive: boolean;
  label: string;
  notes?: string;
  timestamp?: number;
  source?: SimulationSnapshot['source'];
  inputs: RetirementInputs;
  summary: SimulationSummary;
}

export const SnapshotComparisonModal: React.FC<SnapshotComparisonModalProps> = (props) => {
  const storeIsOpen = useSimulationStore((state) => state.isSnapshotCompareModalOpen);
  const storeSetIsOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);
  const history = useSimulationStore(useShallow((state) => state.history));
  const currentInputs = useSimulationStore(useShallow((state) => state.inputs));
  const currentSummary = useSimulationStore(useShallow((state) => state.summary));
  const restoreSnapshot = useSimulationStore((state) => state.restoreSnapshot);
  const saveSnapshot = useSimulationStore((state) => state.saveSnapshot);
  const deleteSnapshot = useSimulationStore((state) => state.deleteSnapshot);
  const renameSnapshot = useSimulationStore((state) => state.renameSnapshot);
  const selectedCompareSnapshotIds = useSimulationStore((state) => state.selectedCompareSnapshotIds);
  const setSelectedCompareSnapshotIds = useSimulationStore((state) => state.setSelectedCompareSnapshotIds);

  const isOpen = props.isOpen ?? storeIsOpen;
  const onClose = props.onClose ?? (() => storeSetIsOpen(false));

  const [includeLive, setIncludeLive] = useState<boolean>(true);
  const [restoredNotification, setRestoredNotification] = useState<string | null>(null);
  const [capturedMessage, setCapturedMessage] = useState<string | null>(null);

  // Rename inline state
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Custom capture modal state
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [newSnapshotTitle, setNewSnapshotTitle] = useState('');
  const [newSnapshotNotes, setNewSnapshotNotes] = useState('');

  // Initialize selected snapshot IDs if empty: default to up to 2 most recent snapshots
  const activeSelectedIds = useMemo(() => {
    if (selectedCompareSnapshotIds && selectedCompareSnapshotIds.length > 0) {
      // Filter out any IDs that were deleted
      const valid = selectedCompareSnapshotIds.filter((id) => history.some((s) => s.id === id));
      if (valid.length > 0) return valid;
    }
    // Default to first 2 or 3 snapshots from history
    return history.slice(0, includeLive ? 2 : 3).map((s) => s.id);
  }, [selectedCompareSnapshotIds, history, includeLive]);

  // Toggle selection of a snapshot (limit to max 3 snapshots when live is enabled, or max 4 when live is disabled)
  const maxSnapshots = includeLive ? 3 : 4;

  const handleToggleSnapshot = (id: string) => {
    if (activeSelectedIds.includes(id)) {
      if (activeSelectedIds.length === 1 && !includeLive) {
        // Don't deselect the last one if live is disabled
        return;
      }
      setSelectedCompareSnapshotIds(activeSelectedIds.filter((item) => item !== id));
    } else {
      if (activeSelectedIds.length >= maxSnapshots) {
        // Replace oldest or keep max
        const updated = [...activeSelectedIds.slice(1), id];
        setSelectedCompareSnapshotIds(updated);
      } else {
        setSelectedCompareSnapshotIds([...activeSelectedIds, id]);
      }
    }
  };

  // Build the list of columns to display
  const columns: ComparisonColumnData[] = useMemo(() => {
    const list: ComparisonColumnData[] = [];

    if (includeLive) {
      list.push({
        id: 'live-simulation',
        isLive: true,
        label: 'Active Live Plan',
        inputs: currentInputs,
        summary: currentSummary
      });
    }

    activeSelectedIds.forEach((id) => {
      const snap = history.find((s) => s.id === id);
      if (snap) {
        list.push({
          id: snap.id,
          isLive: false,
          label: snap.label,
          notes: snap.notes,
          timestamp: snap.timestamp,
          source: snap.source,
          inputs: snap.inputs,
          summary: snap.summary
        });
      }
    });

    return list;
  }, [includeLive, currentInputs, currentSummary, activeSelectedIds, history]);

  if (!isOpen) return null;

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    return `$${Math.round(val).toLocaleString()}`;
  };

  const formatDelta = (val: number) => {
    const rounded = Math.round(val);
    if (rounded === 0) return 'Identical';
    const sign = rounded > 0 ? '+' : '';
    if (Math.abs(rounded) >= 1_000_000) return `${sign}${(rounded / 1_000_000).toFixed(2)}M`;
    return `${sign}$${Math.round(rounded / 1000)}k`;
  };

  const handleRestore = (id: string, label: string) => {
    restoreSnapshot(id);
    setRestoredNotification(`Restored: "${label}" as your active plan`);
    setTimeout(() => {
      setRestoredNotification(null);
      onClose();
    }, 1200);
  };

  const handleStartEdit = (id: string, currentTitle: string, currentNotes?: string) => {
    setEditingSnapshotId(id);
    setEditTitle(currentTitle);
    setEditNotes(currentNotes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      renameSnapshot(id, editTitle.trim(), editNotes.trim());
    }
    setEditingSnapshotId(null);
  };

  const handleOpenCaptureModal = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNewSnapshotTitle(`Scenario @ Age ${currentInputs.retirementAge} (${timeStr})`);
    setNewSnapshotNotes('');
    setIsCaptureModalOpen(true);
  };

  const handleConfirmSaveSnapshot = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newSnapshotTitle.trim() || undefined;
    const notes = newSnapshotNotes.trim() || undefined;
    const snap = saveSnapshot(title, notes, 'manual');
    setCapturedMessage(`Saved snapshot: "${snap.label}"`);
    setSelectedCompareSnapshotIds([...activeSelectedIds, snap.id].slice(-maxSnapshots));
    setIsCaptureModalOpen(false);
    setTimeout(() => setCapturedMessage(null), 3000);
  };

  const handleCreateSampleScenarios = () => {
    // Scenario 1: Early FIRE scenario (retire 4 years earlier with slightly leaner spending)
    const earlyAge = Math.max(currentInputs.currentAge + 1, currentInputs.retirementAge - 4);
    const earlySnap = saveSnapshot(
      `Early FIRE (Age ${earlyAge})`,
      'Hypothetical early exit with reduced living expenses',
      'manual'
    );

    // Scenario 2: Delayed retirement with max pension
    const delayedAge = Math.min(72, currentInputs.retirementAge + 4);
    const delayedSnap = saveSnapshot(
      `Delayed Pension Bump (Age ${delayedAge})`,
      'Working additional years to maximize CPP/OAS and compounding',
      'manual'
    );

    setSelectedCompareSnapshotIds([earlySnap.id, delayedSnap.id]);
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-7xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col transition-colors">
        
        {/* 1. Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                  Compare Simulation Snapshots
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  {columns.length} Active {columns.length === 1 ? 'Scenario' : 'Scenarios'}
                </span>
                {restoredNotification && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{restoredNotification}</span>
                  </span>
                )}
                {capturedMessage && (
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1 animate-in fade-in">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{capturedMessage}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                High-level side-by-side comparison of your saved retirement scenarios against your active live plan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCaptureModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
              title="Snapshot your current configuration with title and description"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              <span>Snapshot Current</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Comparison Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Snapshot Selector Pill Bar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
              <Scale className="w-3.5 h-3.5 text-indigo-500" />
              <span>Include in Compare:</span>
            </span>

            {/* Toggle Live Plan */}
            <button
              type="button"
              onClick={() => {
                if (includeLive && activeSelectedIds.length === 0) return;
                setIncludeLive(!includeLive);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                includeLive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${includeLive ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
              <span>Active Live Plan (Age {currentInputs.retirementAge})</span>
            </button>

            {/* Snapshot pills */}
            {history.map((snap) => {
              const isSelected = activeSelectedIds.includes(snap.id);
              return (
                <button
                  key={snap.id}
                  type="button"
                  onClick={() => handleToggleSnapshot(snap.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer max-w-[240px] ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  title={`${snap.label}${snap.notes ? ` • ${snap.notes}` : ''} • Age ${snap.metrics.retirementAge} • ${snap.inputs.province}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                  <span className="truncate flex-1 min-w-0 text-left">{snap.label}</span>
                  <span className="text-[10px] opacity-75 font-mono shrink-0">Age {snap.metrics.retirementAge}</span>
                </button>
              );
            })}

            {history.length === 0 && (
              <span className="text-slate-500 dark:text-slate-400 text-xs italic">
                No saved snapshots yet in history.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {history.length < 2 && (
              <button
                type="button"
                onClick={handleCreateSampleScenarios}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Sample Scenarios</span>
              </button>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Max {maxSnapshots} scenarios side-by-side
            </span>
          </div>
        </div>

        {/* 3. Empty State (When no columns selected or 0 snapshots) */}
        {columns.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Scenarios Selected</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
              Please check the Active Live Plan or select at least one snapshot from the pill bar above to compare.
            </p>
            <button
              type="button"
              onClick={() => setIncludeLive(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              Show Active Live Plan
            </button>
          </div>
        ) : (
          /* 4. Multi-Column Comparison Grid */
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div
              className={`grid gap-4 sm:gap-5 min-w-[300px] ${
                columns.length === 1
                  ? 'grid-cols-1 max-w-xl mx-auto'
                  : columns.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto'
                  : columns.length === 3
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {columns.map((col, index) => {
                const isLive = col.isLive;
                const summary = col.summary;
                const inputs = col.inputs;
                const yearsToRetire = Math.max(0, inputs.retirementAge - inputs.currentAge);
                const retirementSpan = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);

                // Compare deltas against the live simulation if available
                const liveEndNetWorth = currentSummary.netWorthAtLifeExpectancy;
                const liveRetireNestEgg = currentSummary.netWorthAtRetirement;
                const liveLifetimeTaxes = currentSummary.lifetimeTaxesPaid;

                const endNetWorthDelta = summary.netWorthAtLifeExpectancy - liveEndNetWorth;
                const retireNestEggDelta = summary.netWorthAtRetirement - liveRetireNestEgg;
                const taxesDelta = summary.lifetimeTaxesPaid - liveLifetimeTaxes;

                return (
                  <div
                    key={col.id}
                    className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all relative ${
                      isLive
                        ? 'border-emerald-500 dark:border-emerald-400/90 ring-2 ring-emerald-500/20 bg-emerald-50/15 dark:bg-emerald-500/5 shadow-md'
                        : index === 1
                        ? 'border-indigo-400 dark:border-indigo-500/70 bg-white dark:bg-slate-900 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm'
                    }`}
                  >
                    {/* Top Tag */}
                    {isLive && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold px-3 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>ACTIVE LIVE PLAN</span>
                      </span>
                    )}

                    <div>
                      {/* Column Title Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {isLive ? 'Current Workspace' : `Snapshot #${index}`}
                            </span>
                            {col.timestamp && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatTime(col.timestamp)}</span>
                              </span>
                            )}
                          </div>

                          {editingSnapshotId === col.id ? (
                            <div className="mt-2 flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-500/40">
                              <div className="relative">
                                <input
                                  type="text"
                                  maxLength={80}
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="Snapshot title (max 80 chars)"
                                  className="w-full text-xs font-bold bg-white dark:bg-slate-900 px-2.5 py-1.5 pr-12 rounded-lg border border-indigo-400 dark:border-indigo-500/50 text-slate-900 dark:text-slate-100 focus:outline-none"
                                />
                                <span className="absolute right-2 top-1.5 text-[9.5px] font-mono text-slate-400 pointer-events-none">
                                  {editTitle.length}/80
                                </span>
                              </div>
                              <div className="relative">
                                <textarea
                                  maxLength={200}
                                  rows={2}
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  placeholder="Optional description / scenario notes (max 200 chars)"
                                  className="w-full text-[11px] bg-white dark:bg-slate-900 p-2 pr-14 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none resize-none leading-relaxed"
                                />
                                <span className="absolute right-2 bottom-1.5 text-[9.5px] font-mono text-slate-400 pointer-events-none">
                                  {editNotes.length}/200
                                </span>
                              </div>
                              <div className="flex items-center gap-2 justify-end mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSnapshotId(null)}
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(col.id)}
                                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group mt-1">
                              <div className="flex items-start gap-1.5">
                                <h4
                                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words [overflow-wrap:anywhere] leading-snug"
                                  title={col.label}
                                >
                                  {col.label}
                                </h4>
                                {!isLive && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(col.id, col.label, col.notes)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition shrink-0 cursor-pointer"
                                    title="Edit title & description"
                                    aria-label="Edit title and description"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {col.notes && (
                                <p
                                  className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 break-words [overflow-wrap:anywhere] leading-normal line-clamp-3"
                                  title={col.notes}
                                >
                                  {col.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0 self-start">
                          <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-50">
                            Age {inputs.retirementAge}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                            {inputs.province}
                          </span>
                        </div>
                      </div>

                      {/* Funded Status Banner */}
                      <div className="mt-3.5">
                        {(summary.readinessScore === 0 && (inputs.currentAnnualIncome || 0) === 0 && (inputs.targetRetirementSpendingToday || 0) === 0) ? (
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Blank Canvas • Awaiting Profile Inputs</span>
                          </div>
                        ) : summary.isFullyFunded ? (
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>100% Fully Funded to Age {inputs.lifeExpectancy}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Depletes at Age {summary.portfolioDepletionAge} ({summary.yearsFunded} yrs)</span>
                          </div>
                        )}
                      </div>

                      {/* Primary Metrics Comparison Stack */}
                      <div className="mt-4 flex flex-col gap-2.5 text-xs">
                        
                        {/* 1. Nest Egg at Retirement */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block font-medium">Nest Egg at Retire:</span>
                            {!isLive && Math.abs(retireNestEggDelta) > 500 && (
                              <span className={`text-[10px] font-bold ${retireNestEggDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatDelta(retireNestEggDelta)} vs live
                              </span>
                            )}
                          </div>
                          <strong className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {formatCur(summary.netWorthAtRetirement)}
                          </strong>
                        </div>

                        {/* 2. End Net Worth at Life Expectancy */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block font-medium">
                              End Net Worth (Age {inputs.lifeExpectancy}):
                            </span>
                            {!isLive && Math.abs(endNetWorthDelta) > 500 && (
                              <span className={`text-[10px] font-bold ${endNetWorthDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatDelta(endNetWorthDelta)} vs live
                              </span>
                            )}
                          </div>
                          <strong className={`font-mono font-bold text-sm ${
                            summary.netWorthAtLifeExpectancy > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {formatCur(summary.netWorthAtLifeExpectancy)}
                          </strong>
                        </div>

                        {/* 3. Peak Net Worth */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Peak Net Worth:</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatCur(summary.peakNetWorth)} <span className="text-[11px] text-slate-400">(Age {summary.peakNetWorthAge})</span>
                          </span>
                        </div>

                        {/* 4. Target Spending in Retirement */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Retirement Spending:</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatCur(inputs.targetRetirementSpendingToday)}/yr
                          </span>
                        </div>

                        {/* 5. Lifetime Govt Pensions */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Lifetime CPP & OAS:</span>
                          <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCur(summary.lifetimeCppReceived + summary.lifetimeOasReceived)}
                          </span>
                        </div>

                        {/* 6. Lifetime CRA Taxes */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block font-medium">Lifetime Taxes:</span>
                            {!isLive && Math.abs(taxesDelta) > 500 && (
                              <span className={`text-[10px] font-bold ${taxesDelta < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatDelta(taxesDelta)} taxes vs live
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                            {formatCur(summary.lifetimeTaxesPaid)}
                          </span>
                        </div>

                        {/* 7. Working vs Retirement Horizon */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Horizon:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px]">
                            {yearsToRetire}y work • {retirementSpan}y retired
                          </span>
                        </div>

                        {/* 8. Core Assumptions Chips */}
                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                            Key Assumptions
                          </span>
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              Growth: {inputs.accountReturns?.rrspReturn ?? inputs.preRetirementReturn ?? 6}%
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              CPP: Age {inputs.cppStartAge}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              OAS: Age {inputs.oasStartAge}
                            </span>
                            {inputs.expat?.planToEmigrate && (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold">
                                Expat ({inputs.expat.destinationCountryId?.toUpperCase()})
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Column Action Footer */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {isLive ? (
                        <div className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-center">
                          Active In Main Planner
                        </div>
                      ) : (
                        <div className="w-full flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRestore(col.id, col.label)}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm cursor-pointer"
                            title="Load this entire scenario into your main interactive simulation"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore Plan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              deleteSnapshot(col.id);
                              setSelectedCompareSnapshotIds(activeSelectedIds.filter((id) => id !== col.id));
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete this snapshot from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Footer Summary Guidance */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Tip: Restoring a snapshot will safely load its retirement age, province, spending, and accounts without losing other saved history.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Close Comparison
          </button>
        </div>

      </div>

      {/* 6. Custom Capture Snapshot Modal with strict character limits */}
      {isCaptureModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Snapshot Current Workspace
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Save as a comparative scenario
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCaptureModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveSnapshot} className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Snapshot Title <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${newSnapshotTitle.length >= 75 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                    {newSnapshotTitle.length}/80
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  value={newSnapshotTitle}
                  onChange={(e) => setNewSnapshotTitle(e.target.value)}
                  placeholder="E.g. Early FIRE at Age 60 + Downsizing"
                  autoFocus
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  Max 80 characters
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Description & Assumptions <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <span className={`text-[10px] font-mono ${newSnapshotNotes.length >= 180 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                    {newSnapshotNotes.length}/200
                  </span>
                </div>
                <textarea
                  maxLength={200}
                  rows={3}
                  value={newSnapshotNotes}
                  onChange={(e) => setNewSnapshotNotes(e.target.value)}
                  placeholder="Briefly describe key changes (e.g. tested $60k spending with 4-year delayed CPP/OAS)..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none leading-relaxed"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  Max 200 characters
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCaptureModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Save Snapshot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
