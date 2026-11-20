import { useEffect } from 'react';
import { AppView, useSimulationStore } from '../store/useSimulationStore';

const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])'
].join(', ');

const VIEW_ORDER: AppView[] = ['dashboard', 'inputs', 'estate', 'expat'];

function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function getFocusableElements(container: Element | null): HTMLElement[] {
  if (!container) return [];
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (!isElementVisible(el)) return false;
    // Skip elements inside hidden aria regions or invisible tooltip popovers
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return true;
  });
}

function getActiveTabBar(activeView: AppView): HTMLElement | null {
  if (activeView === 'dashboard') {
    return document.querySelector<HTMLElement>('[data-focus-zone="dashboard-tabs"]');
  }
  if (activeView === 'inputs') {
    return document.querySelector<HTMLElement>('[data-focus-zone="input-tabs"]');
  }
  return null;
}

function getActiveContentContainer(activeView: AppView): HTMLElement | null {
  if (activeView === 'inputs') {
    return document.querySelector<HTMLElement>('[data-focus-zone="input-content"]');
  }
  if (activeView === 'dashboard') {
    return document.querySelector<HTMLElement>('[data-focus-zone="dashboard-content"]');
  }
  return document.querySelector<HTMLElement>('[data-focus-zone="view-content"]');
}

function focusElementSmoothly(el: HTMLElement | null) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

function focusCurrentActiveTab(activeView: AppView): boolean {
  const tabBar = getActiveTabBar(activeView);
  if (!tabBar) return false;
  const activeTabBtn =
    tabBar.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ||
    tabBar.querySelector<HTMLElement>('[role="tab"]');
  if (activeTabBtn && isElementVisible(activeTabBtn)) {
    focusElementSmoothly(activeTabBtn);
    return true;
  }
  return false;
}

/**
 * 2D spatial neighbor finder: locates the closest visible focusable element
 * in the requested arrow direction based on bounding rects.
 */
function findSpatialNeighbor(
  current: HTMLElement,
  candidates: HTMLElement[],
  direction: 'up' | 'down' | 'left' | 'right'
): HTMLElement | null {
  const curRect = current.getBoundingClientRect();
  const curCx = curRect.left + curRect.width / 2;
  const curCy = curRect.top + curRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - curCx;
    const dy = cy - curCy;

    if (direction === 'down') {
      // Must be meaningfully below current element
      if (dy <= 6) continue;
      // Favor elements vertically aligned (same column), penalize horizontal drift
      const score = dy + Math.abs(dx) * 1.8;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    } else if (direction === 'up') {
      if (dy >= -6) continue;
      const score = Math.abs(dy) + Math.abs(dx) * 1.8;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    } else if (direction === 'right') {
      // Same visual row tolerance: vertical centers within ~44px (or overlapping Y spans)
      const verticalOverlap = r.top < curRect.bottom + 14 && r.bottom > curRect.top - 14;
      if (dx <= 6 || (!verticalOverlap && Math.abs(dy) > 48)) continue;
      const score = dx + Math.abs(dy) * 3.0;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    } else if (direction === 'left') {
      const verticalOverlap = r.top < curRect.bottom + 14 && r.bottom > curRect.top - 14;
      if (dx >= -6 || (!verticalOverlap && Math.abs(dy) > 48)) continue;
      const score = Math.abs(dx) + Math.abs(dy) * 3.0;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
  }

  return best;
}

/**
 * Keyboard Focus Mode Navigation System
 * Enables full mouse-free Arrow key (Up / Down / Left / Right) navigation across
 * Dashboard tabs, Input tabs, and all interactive Input / Dashboard sub-components.
 */
export function useFocusModeNavigation() {
  const isFocusMode = useSimulationStore((state) => state.isFocusMode);
  const activeView = useSimulationStore((state) => state.activeView);
  const activeDashboardTab = useSimulationStore((state) => state.activeDashboardTab);
  const activeInputTab = useSimulationStore((state) => state.activeInputTab);
  const setFocusModeZone = useSimulationStore((state) => state.setFocusModeZone);

  // Sync html class & focus active tab when Focus Mode turns ON
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('focus-mode-active', isFocusMode);

    if (isFocusMode) {
      const raf = window.requestAnimationFrame(() => {
        const focusedTab = focusCurrentActiveTab(useSimulationStore.getState().activeView);
        if (focusedTab) {
          setFocusModeZone('tabs');
        } else {
          const content = getActiveContentContainer(useSimulationStore.getState().activeView);
          const first = getFocusableElements(content)[0] ?? null;
          if (first) {
            focusElementSmoothly(first);
            setFocusModeZone('content');
          }
        }
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [isFocusMode, setFocusModeZone]);

  // Keep focusModeZone synchronized when user tabs or clicks manually
  useEffect(() => {
    if (!isFocusMode) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('[data-focus-zone="dashboard-tabs"]') ||
        target.closest('[data-focus-zone="input-tabs"]')
      ) {
        setFocusModeZone('tabs');
      } else if (
        target.closest('[data-focus-zone="input-content"]') ||
        target.closest('[data-focus-zone="dashboard-content"]') ||
        target.closest('[data-focus-zone="view-content"]')
      ) {
        setFocusModeZone('content');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [isFocusMode, setFocusModeZone]);

  // Primary Arrow-key navigation handler
  useEffect(() => {
    if (!isFocusMode) return;

    const cycleTabs = (direction: -1 | 1): boolean => {
      const { activeView: view } = useSimulationStore.getState();
      const tabBar = getActiveTabBar(view);
      if (!tabBar) return false;

      const tabs = Array.from(tabBar.querySelectorAll<HTMLElement>('[role="tab"]')).filter(
        isElementVisible
      );
      if (tabs.length === 0) return false;

      const currentIdx = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const safeCurrent = currentIdx === -1 ? 0 : currentIdx;
      const nextIdx = (safeCurrent + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIdx];
      if (!nextTab) return false;

      nextTab.click();
      setFocusModeZone('tabs');
      window.requestAnimationFrame(() => {
        focusElementSmoothly(nextTab);
      });
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useSimulationStore.getState();

      // Pause Focus Mode arrow interception whenever a modal, drawer, or export overlay is open
      if (
        state.isCommandPaletteOpen ||
        state.isHelpGuideModalOpen ||
        state.isCompareModalOpen ||
        state.isSnapshotCompareModalOpen ||
        state.isAIPersonaModalOpen ||
        state.isWealthGuideModalOpen ||
        state.isHistoryPanelOpen ||
        state.excelExportOverlay !== null
      ) {
        return;
      }

      const key = e.key;
      const activeEl = document.activeElement as HTMLElement | null;

      // Alt + ArrowLeft / ArrowRight: Switch horizontal tabs from ANYWHERE
      if (e.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
        if (cycleTabs(key === 'ArrowRight' ? 1 : -1)) {
          e.preventDefault();
        }
        return;
      }

      // Alt + ArrowUp / ArrowDown: Switch primary views (Dashboard / Inputs / Estate / Expat)
      if (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
        e.preventDefault();
        const curIdx = VIEW_ORDER.indexOf(state.activeView);
        const dir = key === 'ArrowDown' ? 1 : -1;
        const nextView = VIEW_ORDER[(curIdx + dir + VIEW_ORDER.length) % VIEW_ORDER.length];
        state.setActiveView(nextView);
        window.requestAnimationFrame(() => {
          const focused = focusCurrentActiveTab(nextView);
          state.setFocusModeZone(focused ? 'tabs' : 'content');
        });
        return;
      }

      // Ignore standard modified combos (Ctrl/Cmd/Shift) except pure Arrow/Home/End/Escape
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const tabBar = getActiveTabBar(state.activeView);
      const contentContainer = getActiveContentContainer(state.activeView);

      const isInTabBar = Boolean(activeEl && tabBar && tabBar.contains(activeEl));
      const isInContent = Boolean(
        activeEl && contentContainer && contentContainer.contains(activeEl)
      );
      const isNoFocus = !activeEl || activeEl === document.body || activeEl === document.documentElement;

      // ESCAPE: Return from content controls -> Tab Bar; or exit Focus Mode if already at Tab Bar
      if (key === 'Escape') {
        if (isInContent && tabBar) {
          e.preventDefault();
          focusCurrentActiveTab(state.activeView);
          setFocusModeZone('tabs');
          return;
        }
        e.preventDefault();
        state.setIsFocusMode(false);
        if (activeEl && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
        return;
      }

      // ZONE 1: Tab Bar navigation (or initial body focus)
      if (isInTabBar || (isNoFocus && tabBar)) {
        if (key === 'ArrowRight' || key === 'ArrowLeft') {
          e.preventDefault();
          cycleTabs(key === 'ArrowRight' ? 1 : -1);
          return;
        }

        if (key === 'Home' || key === 'End') {
          const tabs = Array.from(tabBar!.querySelectorAll<HTMLElement>('[role="tab"]')).filter(
            isElementVisible
          );
          if (tabs.length > 0) {
            e.preventDefault();
            const targetTab = key === 'Home' ? tabs[0] : tabs[tabs.length - 1];
            targetTab.click();
            setFocusModeZone('tabs');
            window.requestAnimationFrame(() => focusElementSmoothly(targetTab));
          }
          return;
        }

        if (key === 'ArrowDown') {
          const controls = getFocusableElements(contentContainer);
          if (controls.length > 0) {
            e.preventDefault();
            focusElementSmoothly(controls[0]);
            setFocusModeZone('content');
          }
          return;
        }

        return;
      }

      // ZONE 2: Content Sub-Components navigation (Inputs & Dashboard controls)
      if (isInContent || (isNoFocus && contentContainer)) {
        if (
          key !== 'ArrowUp' &&
          key !== 'ArrowDown' &&
          key !== 'ArrowLeft' &&
          key !== 'ArrowRight'
        ) {
          return;
        }

        const controls = getFocusableElements(contentContainer);
        if (controls.length === 0) return;

        // If body was focused (no tab bar present, e.g. Estate/Expat), land on first control
        if (!activeEl || !isInContent) {
          e.preventDefault();
          focusElementSmoothly(controls[0]);
          setFocusModeZone('content');
          return;
        }

        const tag = activeEl.tagName;
        const inputType = tag === 'INPUT' ? (activeEl as HTMLInputElement).type.toLowerCase() : '';

        // Preserve native Left/Right for range sliders and text/number/search/email inputs
        const preservesHorizontalKeys =
          tag === 'TEXTAREA' ||
          (tag === 'INPUT' &&
            ['text', 'number', 'search', 'email', 'password', 'tel', 'url', 'range'].includes(
              inputType
            ));

        if ((key === 'ArrowLeft' || key === 'ArrowRight') && preservesHorizontalKeys) {
          return;
        }

        const currentIndex = controls.indexOf(activeEl);

        if (key === 'ArrowDown') {
          e.preventDefault();
          const spatialNext = findSpatialNeighbor(activeEl, controls, 'down');
          const next =
            spatialNext || (currentIndex >= 0 && currentIndex + 1 < controls.length ? controls[currentIndex + 1] : null);
          if (next) {
            focusElementSmoothly(next);
          }
          return;
        }

        if (key === 'ArrowUp') {
          e.preventDefault();
          const spatialPrev = findSpatialNeighbor(activeEl, controls, 'up');
          if (spatialPrev) {
            focusElementSmoothly(spatialPrev);
          } else if (tabBar) {
            // Reached the top of the panel: smoothly climb back to the active Tab Bar
            focusCurrentActiveTab(state.activeView);
            setFocusModeZone('tabs');
          } else if (currentIndex > 0) {
            focusElementSmoothly(controls[currentIndex - 1]);
          }
          return;
        }

        if (key === 'ArrowRight') {
          e.preventDefault();
          const spatialRight = findSpatialNeighbor(activeEl, controls, 'right');
          if (spatialRight) {
            focusElementSmoothly(spatialRight);
          } else if (currentIndex >= 0 && currentIndex + 1 < controls.length) {
            focusElementSmoothly(controls[currentIndex + 1]);
          }
          return;
        }

        if (key === 'ArrowLeft') {
          e.preventDefault();
          const spatialLeft = findSpatialNeighbor(activeEl, controls, 'left');
          if (spatialLeft) {
            focusElementSmoothly(spatialLeft);
          } else if (currentIndex > 0) {
            focusElementSmoothly(controls[currentIndex - 1]);
          } else if (tabBar) {
            focusCurrentActiveTab(state.activeView);
            setFocusModeZone('tabs');
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, activeView, activeDashboardTab, activeInputTab, setFocusModeZone]);
}
