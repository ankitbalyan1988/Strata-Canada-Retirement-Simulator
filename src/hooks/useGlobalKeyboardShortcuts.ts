import { useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

/**
 * Global Keyboard Shortcut Manager
 * Dynamically intercepts standard keyboard shortcuts across macOS (Meta/Cmd) and Windows/Linux (Ctrl).
 */
export function useGlobalKeyboardShortcuts() {
  const toggleCommandPalette = useSimulationStore((state) => state.toggleCommandPalette);
  const setIsCommandPaletteOpen = useSimulationStore((state) => state.setIsCommandPaletteOpen);
  const isCommandPaletteOpen = useSimulationStore((state) => state.isCommandPaletteOpen);
  const setActiveView = useSimulationStore((state) => state.setActiveView);
  const setActiveDashboardTab = useSimulationStore((state) => state.setActiveDashboardTab);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
  const toggleHistoryPanel = useSimulationStore((state) => state.toggleHistoryPanel);
  const setIsWealthGuideModalOpen = useSimulationStore((state) => state.setIsWealthGuideModalOpen);
  const setIsHelpGuideModalOpen = useSimulationStore((state) => state.setIsHelpGuideModalOpen);
  const setIsCompareModalOpen = useSimulationStore((state) => state.setIsCompareModalOpen);
  const setIsSnapshotCompareModalOpen = useSimulationStore((state) => state.setIsSnapshotCompareModalOpen);
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in a form input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Check whether Command (Mac) or Control (Windows/Linux) is pressed
      const isModifier = e.metaKey || e.ctrlKey;

      // 1. Command + K / Ctrl + K -> Toggle Command Palette (Works globally, even from inputs!)
      if (isModifier && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // 2. Escape key -> Close Command Palette if currently open
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        setIsCommandPaletteOpen(false);
        return;
      }

      // 3. Quick '/' key to open command palette (only when not typing in an input)
      if (!isInputFocused && !isModifier && e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // 4. Quick '?' key to open Help Guide (only when not typing in an input)
      if (!isInputFocused && !isModifier && e.key === '?') {
        e.preventDefault();
        setIsHelpGuideModalOpen(true);
        return;
      }

      // 5. Modifier Shortcuts (Cmd on Mac, Ctrl on Win/Linux)
      if (isModifier) {
        // Tab 1: Main Dashboard (Cmd+1 / Ctrl+1)
        if (e.key === '1') {
          e.preventDefault();
          setActiveView('dashboard');
          setActiveDashboardTab('dashboard');
          return;
        }

        // Tab 2: Simulation Ledger (Cmd+2 / Ctrl+2)
        if (e.key === '2') {
          e.preventDefault();
          setActiveView('dashboard');
          setActiveDashboardTab('ledger');
          return;
        }

        // Tab 3: Cash Flows (Cmd+3 / Ctrl+3)
        if (e.key === '3') {
          e.preventDefault();
          setActiveView('dashboard');
          setActiveDashboardTab('cashflows');
          return;
        }

        // Tab 4: Plan Stress Test (Cmd+4 / Ctrl+4)
        if (e.key === '4') {
          e.preventDefault();
          setActiveView('dashboard');
          setActiveDashboardTab('stresstest');
          return;
        }

        // Tab 5: What-If Analysis (Cmd+5 / Ctrl+5)
        if (e.key === '5') {
          e.preventDefault();
          setActiveView('dashboard');
          setActiveDashboardTab('whatif');
          return;
        }

        // Toggle Theme (Cmd+J / Ctrl+J)
        if (e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          toggleTheme();
          return;
        }

        // Open Inputs View (Cmd+I / Ctrl+I without shift)
        if (!e.shiftKey && (e.key === 'i' || e.key === 'I')) {
          e.preventDefault();
          setActiveView('inputs');
          return;
        }

        // Toggle Plan History Drawer (Cmd+H / Ctrl+H)
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          toggleHistoryPanel();
          return;
        }

        // Shift modifier combinations
        if (e.shiftKey) {
          // Estate Planning (Cmd+Shift+E / Ctrl+Shift+E)
          if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            setActiveView('estate');
            return;
          }

          // Expat Planning (Cmd+Shift+X / Ctrl+Shift+X)
          if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            setActiveView('expat');
            return;
          }

          // CRA Wealth Guide (Cmd+Shift+R / Ctrl+Shift+R)
          if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            setIsWealthGuideModalOpen(true);
            return;
          }

          // Compare Ages Modal (Cmd+Shift+A / Ctrl+Shift+A)
          if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            setIsCompareModalOpen(true);
            return;
          }

          // Compare Snapshots Modal (Cmd+Shift+S / Ctrl+Shift+S)
          if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            setIsSnapshotCompareModalOpen(true);
            return;
          }

          // AI & Standard Personas (Cmd+Shift+P / Ctrl+Shift+P)
          if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            setIsAIPersonaModalOpen(true);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isCommandPaletteOpen,
    toggleCommandPalette,
    setIsCommandPaletteOpen,
    setActiveView,
    setActiveDashboardTab,
    toggleTheme,
    toggleHistoryPanel,
    setIsWealthGuideModalOpen,
    setIsHelpGuideModalOpen,
    setIsCompareModalOpen,
    setIsSnapshotCompareModalOpen,
    setIsAIPersonaModalOpen
  ]);
}
