import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  Calendar, 
  ArrowRightLeft, 
  ShieldAlert, 
  Sliders, 
  SlidersHorizontal, 
  Landmark, 
  Globe, 
  Scale, 
  Layers, 
  History, 
  Users, 
  BookOpen, 
  HelpCircle, 
  FileSpreadsheet, 
  FileDown, 
  Sun, 
  Moon, 
  RotateCcw, 
  X,
  Command,
  Monitor,
  Apple
} from 'lucide-react';
import { useSimulationStore, AppView, DashboardTab } from '../store/useSimulationStore';
import { isMacPlatform } from '../utils/keyboardShortcuts';

export interface PaletteCommand {
  id: string;
  title: string;
  subtitle: string;
  category: 'Dashboard Tabs' | 'App Views' | 'Tools & Guides' | 'Actions & Exports';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  shortcutMac: string;
  shortcutWin: string;
  keywords: string[];
  action: () => void;
}

export const CommandPaletteModal: React.FC = () => {
  const isCommandPaletteOpen = useSimulationStore((state) => state.isCommandPaletteOpen);
  const setIsCommandPaletteOpen = useSimulationStore((state) => state.setIsCommandPaletteOpen);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const setActiveDashboardTab = useSimulationStore((state) => state.setActiveDashboardTab);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const theme = useSimulationStore((state) => state.theme);
  const toggleHistoryPanel = useSimulationStore((state) => state.toggleHistoryPanel);
  const setIsWealthGuideModalOpen = useSimulationStore((state) => state.setIsWealthGuideModalOpen);
  const setIsHelpGuideModalOpen = useSimulationStore((state) => state.setIsHelpGuideModalOpen);
  const setIsCompareModalOpen = useSimulationStore((state) => state.setIsCompareModalOpen);
  const setIsSnapshotCompareModalOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const exportPdf = useSimulationStore((state) => state.exportPdf);
  const resetToBlankCanvas = useSimulationStore((state) => state.resetToBlankCanvas);
  const inputs = useSimulationStore((state) => state.inputs);
  const summary = useSimulationStore((state) => state.summary);
  const yearlyResults = useSimulationStore((state) => state.yearlyResults);
  const estateInputs = useSimulationStore((state) => state.estateInputs);
  const stressTiming = useSimulationStore((state) => state.stressTiming);
  const customStressAge = useSimulationStore((state) => state.customStressAge);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Dynamic OS detection
  const isMac = useMemo(() => isMacPlatform(), []);

  // Define full command library
  const commands = useMemo<PaletteCommand[]>(() => {
    return [
      // 1. Dashboard Subtabs
      {
        id: 'tab_dashboard',
        title: 'Main Dashboard',
        subtitle: 'Key retirement metrics, timeline milestones & portfolio health',
        category: 'Dashboard Tabs',
        icon: LayoutDashboard,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        shortcutMac: '⌘1',
        shortcutWin: 'Ctrl+1',
        keywords: ['home', 'kpi', 'milestones', 'summary', 'readiness', 'retirement'],
        action: () => {
          setActiveView('dashboard');
          setActiveDashboardTab('dashboard');
        }
      },
      {
        id: 'tab_ledger',
        title: 'Simulation Ledger',
        subtitle: 'Annual year-by-year cashflow schedule and break-even analysis',
        category: 'Dashboard Tabs',
        icon: Calendar,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        shortcutMac: '⌘2',
        shortcutWin: 'Ctrl+2',
        keywords: ['annual', 'table', 'break-even', 'rrsp', 'rrif', 'tax', 'schedule'],
        action: () => {
          setActiveView('dashboard');
          setActiveDashboardTab('ledger');
        }
      },
      {
        id: 'tab_cashflows',
        title: 'Current & Projected Cash Flows',
        subtitle: 'Annual income inflows, living outflows, savings and tax forecast',
        category: 'Dashboard Tabs',
        icon: ArrowRightLeft,
        iconBg: 'bg-teal-50 dark:bg-teal-950/60',
        iconColor: 'text-teal-600 dark:text-teal-400',
        shortcutMac: '⌘3',
        shortcutWin: 'Ctrl+3',
        keywords: ['inflow', 'outflow', 'expenses', 'taxes', 'savings', 'bar chart', 'flows'],
        action: () => {
          setActiveView('dashboard');
          setActiveDashboardTab('cashflows');
        }
      },
      {
        id: 'tab_stresstest',
        title: 'Plan Stress Test',
        subtitle: 'Economic resilience, market crashes, inflation spikes & sequence risk',
        category: 'Dashboard Tabs',
        icon: ShieldAlert,
        iconBg: 'bg-rose-50 dark:bg-rose-950/60',
        iconColor: 'text-rose-600 dark:text-rose-400',
        shortcutMac: '⌘4',
        shortcutWin: 'Ctrl+4',
        keywords: ['crash', '1970', 'stagflation', 'dot-com', '2008', 'gfc', 'sequence', 'resilience'],
        action: () => {
          setActiveView('dashboard');
          setActiveDashboardTab('stresstest');
        }
      },
      {
        id: 'tab_whatif',
        title: 'What-If Analysis',
        subtitle: 'Interactive sensitivity lab adjusting returns, inflation & house prices',
        category: 'Dashboard Tabs',
        icon: Sliders,
        iconBg: 'bg-purple-50 dark:bg-purple-950/60',
        iconColor: 'text-purple-600 dark:text-purple-400',
        shortcutMac: '⌘5',
        shortcutWin: 'Ctrl+5',
        keywords: ['sensitivity', 'slider', 'returns', 'inflation', 'appreciation', 'scenarios'],
        action: () => {
          setActiveView('dashboard');
          setActiveDashboardTab('whatif');
        }
      },

      // 2. Main Application Views
      {
        id: 'view_inputs',
        title: 'Profile & Plan Inputs',
        subtitle: 'Configure household income, living budget, accounts, mortgages & debt',
        category: 'App Views',
        icon: SlidersHorizontal,
        iconBg: 'bg-blue-50 dark:bg-blue-950/60',
        iconColor: 'text-blue-600 dark:text-blue-400',
        shortcutMac: '⌘I',
        shortcutWin: 'Ctrl+I',
        keywords: ['inputs', 'profile', 'accounts', 'rrsp', 'tfsa', 'fhsa', 'salary', 'income'],
        action: () => {
          setActiveView('inputs');
        }
      },
      {
        id: 'view_estate',
        title: 'Estate Planning Module',
        subtitle: 'Deemed disposition at death under ITA s.70(5), probate fees & terminal taxes',
        category: 'App Views',
        icon: Landmark,
        iconBg: 'bg-purple-50 dark:bg-purple-950/60',
        iconColor: 'text-purple-600 dark:text-purple-400',
        shortcutMac: '⌘⇧E',
        shortcutWin: 'Ctrl+Shift+E',
        keywords: ['death', 'probate', 'will', 'inheritance', 'terminal', 'tax', 'rollover'],
        action: () => {
          setActiveView('estate');
        }
      },
      {
        id: 'view_expat',
        title: 'Expat Planning Module',
        subtitle: 'Cross-border emigration, Section 128.1 deemed departure tax & treaties',
        category: 'App Views',
        icon: Globe,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60',
        iconColor: 'text-amber-600 dark:text-amber-400',
        shortcutMac: '⌘⇧X',
        shortcutWin: 'Ctrl+Shift+X',
        keywords: ['emigration', 'departure', 'treaty', 'mexico', 'portugal', 'costa rica', 'cross-border'],
        action: () => {
          setActiveView('expat');
        }
      },

      // 3. Tools, Analysis & Guides
      {
        id: 'tool_history',
        title: 'Plan Version History',
        subtitle: 'Side-drawer displaying saved simulation snapshots and time points',
        category: 'Tools & Guides',
        icon: History,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        shortcutMac: '⌘H',
        shortcutWin: 'Ctrl+H',
        keywords: ['history', 'snapshots', 'versions', 'restore', 'save'],
        action: () => {
          toggleHistoryPanel();
        }
      },
      {
        id: 'tool_wealth_guide',
        title: 'Rules & Wealth Guide',
        subtitle: 'Statutory reference for 7 essential CRA rules (CPP, OAS, RRIF, TFSA, FHSA)',
        category: 'Tools & Guides',
        icon: BookOpen,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        shortcutMac: '⌘⇧R',
        shortcutWin: 'Ctrl+Shift+R',
        keywords: ['cra', 'rules', 'guide', 'tax act', 'pensions', 'oas clawback', 'rrif minimum'],
        action: () => {
          setIsWealthGuideModalOpen(true);
        }
      },
      {
        id: 'tool_help_guide',
        title: 'Help & Technical Guide',
        subtitle: 'Comprehensive functional user manual and architectural technical guide',
        category: 'Tools & Guides',
        icon: HelpCircle,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        shortcutMac: '?',
        shortcutWin: '?',
        keywords: ['help', 'manual', 'docs', 'technical', 'formula', 'methodology', 'faq'],
        action: () => {
          setIsHelpGuideModalOpen(true);
        }
      },
      {
        id: 'tool_compare_ages',
        title: 'Compare Retirement Ages',
        subtitle: 'Side-by-side comparison matrix of retiring at ages 55, 60, 65, 70',
        category: 'Tools & Guides',
        icon: Scale,
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-300',
        shortcutMac: '⌘⇧A',
        shortcutWin: 'Ctrl+Shift+A',
        keywords: ['compare', 'ages', 'retire early', 'matrix'],
        action: () => {
          setIsCompareModalOpen(true);
        }
      },
      {
        id: 'tool_compare_snapshots',
        title: 'Compare Saved Snapshots',
        subtitle: 'Diff two or more saved plans to evaluate trade-offs',
        category: 'Tools & Guides',
        icon: Layers,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        shortcutMac: '⌘⇧S',
        shortcutWin: 'Ctrl+Shift+S',
        keywords: ['diff', 'compare snapshots', 'scenarios', 'matrix'],
        action: () => {
          setIsSnapshotCompareModalOpen(true);
        }
      },
      {
        id: 'tool_personas',
        title: 'Standard & AI Personas',
        subtitle: 'Load curated Canadian archetypes (FIRE, Tech Professional, Family, Couple)',
        category: 'Tools & Guides',
        icon: Users,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60',
        iconColor: 'text-amber-600 dark:text-amber-400',
        shortcutMac: '⌘⇧P',
        shortcutWin: 'Ctrl+Shift+P',
        keywords: ['personas', 'archetype', 'presets', 'sample', 'examples'],
        action: () => {
          setIsAIPersonaModalOpen(true);
        }
      },

      // 4. Actions & Exports
      {
        id: 'action_export_master_excel',
        title: 'Export Master Excel Workbook',
        subtitle: 'Export Annual, Estate, 6 Stress Tests, and Expat Ledgers into 1 multi-tab file',
        category: 'Actions & Exports',
        icon: FileSpreadsheet,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        shortcutMac: '⌘E',
        shortcutWin: 'Ctrl+E',
        keywords: ['excel', 'export', 'spreadsheet', 'download', 'audit', 'master'],
        action: async () => {
          const { exportMasterComprehensiveExcel } = await import('../utils/excelExport');
          await exportMasterComprehensiveExcel({
            inputs,
            summary,
            yearlyResults,
            estateInputs,
            expatInputs: inputs.expat,
            stressTiming,
            customStressAge
          });
        }
      },
      {
        id: 'action_export_pdf',
        title: 'Export Executive PDF Plan',
        subtitle: 'Generate branded, personalized Canadian Wealth Dossier report',
        category: 'Actions & Exports',
        icon: FileDown,
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        shortcutMac: '⌘P',
        shortcutWin: 'Ctrl+P',
        keywords: ['pdf', 'report', 'dossier', 'download', 'print'],
        action: () => {
          exportPdf();
        }
      },
      {
        id: 'action_toggle_theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: `Currently in ${theme === 'dark' ? 'Dark' : 'Light'} theme`,
        category: 'Actions & Exports',
        icon: theme === 'dark' ? Sun : Moon,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60',
        iconColor: 'text-amber-600 dark:text-amber-400',
        shortcutMac: '⌘J',
        shortcutWin: 'Ctrl+J',
        keywords: ['theme', 'dark mode', 'light mode', 'sun', 'moon'],
        action: () => {
          toggleTheme();
        }
      },
      {
        id: 'action_clean_canvas',
        title: 'Clean Canvas ($0)',
        subtitle: 'Wipe all user data and reset simulation inputs to fresh $0 state',
        category: 'Actions & Exports',
        icon: RotateCcw,
        iconBg: 'bg-rose-50 dark:bg-rose-950/60',
        iconColor: 'text-rose-600 dark:text-rose-400',
        shortcutMac: '⌘⇧⌫',
        shortcutWin: 'Ctrl+Shift+Del',
        keywords: ['reset', 'clear', 'wipe', 'delete', 'clean', 'zero'],
        action: () => {
          if (window.confirm('Reset all entered data and return to blank canvas ($0)?')) {
            resetToBlankCanvas();
          }
        }
      }
    ];
  }, [
    setActiveView,
    setActiveDashboardTab,
    toggleTheme,
    theme,
    toggleHistoryPanel,
    setIsWealthGuideModalOpen,
    setIsHelpGuideModalOpen,
    setIsCompareModalOpen,
    setIsSnapshotCompareModalOpen,
    setIsAIPersonaModalOpen,
    exportPdf,
    resetToBlankCanvas,
    inputs,
    summary,
    yearlyResults,
    estateInputs,
    stressTiming,
    customStressAge
  ]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;
    const q = searchQuery.toLowerCase().trim();
    return commands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchSubtitle = cmd.subtitle.toLowerCase().includes(q);
      const matchCategory = cmd.category.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchCategory || matchKeywords;
    });
  }, [commands, searchQuery]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Auto focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCommandPaletteOpen]);

  // Handle keyboard navigation inside the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  };

  const executeCommand = (cmd: PaletteCommand) => {
    setIsCommandPaletteOpen(false);
    cmd.action();
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette & Keyboard Shortcut Manager"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#11141A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Command className="w-5 h-5" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMac ? "Type a command, tab, or tool... (⌘K to toggle)" : "Type a command, tab, or tool... (Ctrl+K to toggle)"}
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-mono font-bold border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2.5 animate-pulse" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No commands matching &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                Try searching for tabs (&ldquo;Ledger&rdquo;, &ldquo;Cash Flows&rdquo;), modules (&ldquo;Estate&rdquo;, &ldquo;Expat&rdquo;), or actions (&ldquo;Excel&rdquo;, &ldquo;PDF&rdquo;).
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              const Icon = cmd.icon;
              const shortcut = isMac ? cmd.shortcutMac : cmd.shortcutWin;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-2xs'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-transform ${cmd.iconBg} ${cmd.iconColor} ${
                        isSelected ? 'scale-105' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold truncate ${
                          isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {cmd.title}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {cmd.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {cmd.subtitle}
                      </p>
                    </div>
                  </div>

                  {shortcut && (
                    <kbd className={`ml-3 shrink-0 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic Footer Bar with Navigation Hints & Detected Platform */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] font-mono">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] font-mono">↵</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] font-mono">esc</kbd>
              <span>Close</span>
            </span>
          </div>

          {/* Dynamic OS indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-2xs">
            {isMac ? (
              <>
                <Apple className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                <span>macOS (⌘ Command Mode)</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                <span>Windows / PC (Ctrl Mode)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
