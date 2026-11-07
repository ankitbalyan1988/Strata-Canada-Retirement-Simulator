import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  History,
  X,
  Camera,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Download,
  Upload,
  Clock,
  Layers,
  Copy
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useShallow } from 'zustand/react/shallow';
import { SimulationSnapshot } from '../types/history';

export const SimulationHistoryPanel: React.FC = () => {
  const isOpen = useSimulationStore((state) => state.isHistoryPanelOpen);
  const setIsOpen = useSimulationStore((state) => state.setIsHistoryPanelOpen);
  const history = useSimulationStore(useShallow((state) => state.history));
  const currentInputs = useSimulationStore(useShallow((state) => state.inputs));
  const currentSummary = useSimulationStore(useShallow((state) => state.summary));
  const saveSnapshot = useSimulationStore((state) => state.saveSnapshot);
  const restoreSnapshot = useSimulationStore((state) => state.restoreSnapshot);
  const deleteSnapshot = useSimulationStore((state) => state.deleteSnapshot);
  const clearHistory = useSimulationStore((state) => state.clearHistory);
  const renameSnapshot = useSimulationStore((state) => state.renameSnapshot);
  const setIsSnapshotCompareModalOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);

  const [searchQuery, setSearchQuery] = useState('');
  const [newLabelInput, setNewLabelInput] = useState('');
  const [newNotesInput, setNewNotesInput] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [justRestoredId, setJustRestoredId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Prevent background scrolling when panel is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCapture = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const label = newLabelInput.trim() || undefined;
    const notes = newNotesInput.trim() || undefined;
    const snap = saveSnapshot(label, notes, 'manual');
    setNewLabelInput('');
    setNewNotesInput('');
    setShowNotesField(false);
    setSaveSuccessMessage(`Captured: "${snap.label}"`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleRestore = (id: string, label: string) => {
    restoreSnapshot(id);
    setJustRestoredId(id);
    setTimeout(() => setJustRestoredId(null), 2500);
  };

  const handleStartRename = (id: string, currentText: string, currentNotes?: string) => {
    setEditingId(id);
    setEditingLabel(currentText);
    setEditingNotes(currentNotes || '');
  };

  const handleSaveRename = (id: string) => {
    if (editingLabel.trim()) {
      renameSnapshot(id, editingLabel.trim(), editingNotes.trim());
    }
    setEditingId(null);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `strata-simulation-history-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered list based on search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q) ||
        s.inputs.province.toLowerCase().includes(q) ||
        `age ${s.metrics.retirementAge}`.includes(q)
    );
  }, [history, searchQuery]);

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={panelRef}
        aria-label="Simulation History Drawer"
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
      >
        <div className="w-screen max-w-md sm:max-w-lg lg:max-w-xl bg-white dark:bg-[#10141D] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-all">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Simulation History
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    {history.length} {history.length === 1 ? 'Snapshot' : 'Snapshots'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Capture scenario versions, compare net worth deltas, and restore past runs
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close history panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Capture Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
            <form onSubmit={handleCapture} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    maxLength={80}
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    placeholder={`Snapshot title (e.g. Age ${currentInputs.retirementAge} + Downsizing)...`}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2 pr-14 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-2xs font-medium"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] font-mono text-slate-400 pointer-events-none">
                    {newLabelInput.length}/80
                  </span>
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture</span>
                </button>
              </div>

              {/* Optional Description / Scenario Notes Accordion */}
              {showNotesField ? (
                <div className="relative animate-in slide-in-from-top-1 duration-150">
                  <input
                    type="text"
                    maxLength={200}
                    value={newNotesInput}
                    onChange={(e) => setNewNotesInput(e.target.value)}
                    placeholder="Optional scenario notes / assumptions (max 200 chars)..."
                    className="w-full text-[11px] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-3 py-1.5 pr-14 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 pointer-events-none">
                    {newNotesInput.length}/200
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotesField(true)}
                  className="self-start text-[10.5px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                >
                  + Add scenario description (optional)
                </button>
              )}
            </form>

            {saveSuccessMessage && (
              <div className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Current Live Baseline Pill */}
          <div className="px-4 py-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-700 dark:text-slate-300">Active Live Simulation:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                Retire Age {currentInputs.retirementAge} ({currentInputs.province})
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              End: <strong className="text-slate-800 dark:text-slate-200">{formatCur(currentSummary.netWorthAtLifeExpectancy)}</strong>
            </div>
          </div>

          {/* Search & Tool Bar */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by name, age, province..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {history.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSnapshotCompareModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Compare saved snapshots side-by-side"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Compare</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Export history as JSON"
                  aria-label="Export history"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all saved simulation history snapshots?')) {
                      clearHistory();
                    }
                  }}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  title="Clear all history"
                  aria-label="Clear all history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Snapshots List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {searchQuery ? 'No matching snapshots' : 'No snapshots captured yet'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                  {searchQuery
                    ? 'Try searching with a different keyword or retirement age.'
                    : 'Capture your current scenario as a baseline version so you can safely experiment with retirement ages, returns, and real estate.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleCapture()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Baseline Snapshot</span>
                  </button>
                )}
              </div>
            ) : (
              filteredHistory.map((snapshot) => {
                const isEditing = editingId === snapshot.id;
                const isExpanded = expandedDiffId === snapshot.id;
                const isJustRestored = justRestoredId === snapshot.id;

                // Compute Net Worth Delta vs Current Live Simulation
                const netWorthDelta = snapshot.summary.netWorthAtLifeExpectancy - currentSummary.netWorthAtLifeExpectancy;
                const ageDelta = snapshot.metrics.retirementAge - currentInputs.retirementAge;

                return (
                  <div
                    key={snapshot.id}
                    className={`rounded-2xl border transition-all ${
                      isJustRestored
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                    }`}
                  >
                    {/* Snapshot Header */}
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 w-full bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-emerald-400 dark:border-emerald-500/40">
                              <div className="relative">
                                <input
                                  type="text"
                                  maxLength={80}
                                  value={editingLabel}
                                  onChange={(e) => setEditingLabel(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(snapshot.id)}
                                  autoFocus
                                  placeholder="Snapshot title (max 80 chars)"
                                  className="text-xs font-bold bg-white dark:bg-slate-900 px-2 py-1.5 pr-12 rounded-lg border border-emerald-500 text-slate-900 dark:text-slate-100 focus:outline-none w-full"
                                />
                                <span className="absolute right-2 top-1.5 text-[9px] font-mono text-slate-400 pointer-events-none">
                                  {editingLabel.length}/80
                                </span>
                              </div>
                              <div className="relative">
                                <textarea
                                  maxLength={200}
                                  rows={2}
                                  value={editingNotes}
                                  onChange={(e) => setEditingNotes(e.target.value)}
                                  placeholder="Optional description / notes (max 200 chars)"
                                  className="text-[11px] bg-white dark:bg-slate-900 px-2 py-1 pr-14 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none w-full resize-none leading-relaxed"
                                />
                                <span className="absolute right-2 bottom-1.5 text-[9px] font-mono text-slate-400 pointer-events-none">
                                  {editingNotes.length}/200
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-2 py-0.5 rounded text-[10.5px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(snapshot.id)}
                                  className="px-2.5 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group">
                              <div className="flex items-start gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 break-words [overflow-wrap:anywhere] leading-snug">
                                  {snapshot.label}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => handleStartRename(snapshot.id, snapshot.label, snapshot.notes)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition shrink-0 p-0.5 cursor-pointer"
                                  title="Rename snapshot & edit description"
                                  aria-label="Rename snapshot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              {snapshot.notes && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words [overflow-wrap:anywhere] leading-relaxed line-clamp-3" title={snapshot.notes}>
                                  {snapshot.notes}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatRelativeTime(snapshot.timestamp)}</span>
                            </span>
                            <span>•</span>
                            <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-500">
                              {snapshot.inputs.province}
                            </span>
                            {snapshot.source && snapshot.source !== 'manual' && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                  {snapshot.source}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Funded Status Pill */}
                        <div className="shrink-0">
                          {snapshot.summary.isFullyFunded ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              <span>100% Funded</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Depletes @ {snapshot.summary.portfolioDepletionAge || 80}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Snapshot Key Metrics Grid */}
                    <div className="p-3.5 grid grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-800/50 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Retire Age</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-mono font-bold">
                          Age {snapshot.metrics.retirementAge}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">End Net Worth</span>
                        <strong
                          className={`font-mono font-bold ${
                            snapshot.metrics.netWorthAtLifeExpectancy > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatCur(snapshot.metrics.netWorthAtLifeExpectancy)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Peak Wealth</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-mono font-bold">
                          {formatCur(snapshot.metrics.peakNetWorth)}
                        </strong>
                      </div>
                    </div>

                    {/* Delta Comparison vs Active Live State */}
                    <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                      <span>Comparison vs Live:</span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        {ageDelta !== 0 && (
                          <span
                            className={
                              ageDelta < 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-amber-600 dark:text-amber-400 font-semibold'
                            }
                          >
                            {ageDelta < 0 ? `${Math.abs(ageDelta)} yrs earlier` : `${ageDelta} yrs later`}
                          </span>
                        )}
                        <span
                          className={`font-bold ${
                            netWorthDelta > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : netWorthDelta < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {netWorthDelta > 0 ? `+${formatCur(netWorthDelta)}` : formatCur(netWorthDelta)}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Parameter Diff Details */}
                    {isExpanded && (
                      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs space-y-2 animate-in slide-in-from-top-1 duration-150">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Scenario Parameters
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Employment Salary:</span>
                            <span className="font-mono font-bold">${snapshot.inputs.currentAnnualIncome.toLocaleString()}/yr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Target Spending:</span>
                            <span className="font-mono font-bold">${snapshot.inputs.targetRetirementSpendingToday.toLocaleString()}/yr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">RRSP Balance:</span>
                            <span className="font-mono font-bold">${snapshot.inputs.rrspBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">TFSA Balance:</span>
                            <span className="font-mono font-bold">${snapshot.inputs.tfsaBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Non-Reg (SA):</span>
                            <span className="font-mono font-bold">${snapshot.inputs.nonRegBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Lifetime Tax:</span>
                            <span className="font-mono font-bold">${Math.round(snapshot.metrics.lifetimeTaxesPaid).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/50 rounded-b-2xl">
                      <button
                        type="button"
                        onClick={() => setExpandedDiffId(isExpanded ? null : snapshot.id)}
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deleteSnapshot(snapshot.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Delete snapshot"
                          aria-label="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestore(snapshot.id, snapshot.label)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs hover:shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore Version</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Status Bar */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[11px] flex items-center justify-between">
            <span>Saved locally in browser storage</span>
            <button
              type="button"
              onClick={() => handleCapture()}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>Capture Current State</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
