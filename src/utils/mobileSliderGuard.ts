/**
 * Prevents mobile browsers and Android WebViews from opening the on-screen
 * virtual keyboard when users tap or drag `<input type="range">` sliders,
 * while preserving desktop keyboard (Tab + Arrow key) accessibility and
 * normal keyboard opening for text/numeric inputs.
 */

const TOUCH_FOCUS_SUPPRESSION_WINDOW_MS = 1000;

function isRangeInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === 'range';
}

function isTextEditableElement(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return ![
      'range',
      'checkbox',
      'radio',
      'button',
      'submit',
      'reset',
      'file',
      'color',
      'image'
    ].includes(el.type);
  }
  return false;
}

export function installMobileSliderKeyboardGuard(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let activeTouchRangeEl: HTMLInputElement | null = null;
  let lastRangeTouchMs = 0;
  let clearTimer: number | null = null;

  const ensureNoInputMode = (el: HTMLInputElement) => {
    if (el.getAttribute('inputmode') !== 'none') {
      el.setAttribute('inputmode', 'none');
    }
  };

  const blurActiveIfNeeded = (rangeEl: HTMLInputElement) => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      if (active === rangeEl || isTextEditableElement(active)) {
        active.blur();
      }
    }
  };

  const recordRangeTouch = (el: HTMLInputElement) => {
    ensureNoInputMode(el);
    activeTouchRangeEl = el;
    lastRangeTouchMs = Date.now();
    if (clearTimer !== null) {
      window.clearTimeout(clearTimer);
      clearTimer = null;
    }
    blurActiveIfNeeded(el);
  };

  const scheduleTouchRangeClear = () => {
    if (clearTimer !== null) {
      window.clearTimeout(clearTimer);
    }
    clearTimer = window.setTimeout(() => {
      activeTouchRangeEl = null;
      clearTimer = null;
    }, 500);
  };

  const isTouchTriggeredFocus = (el: HTMLInputElement): boolean => {
    return (
      el === activeTouchRangeEl ||
      Date.now() - lastRangeTouchMs < TOUCH_FOCUS_SUPPRESSION_WINDOW_MS
    );
  };

  const onTouchStart = (e: TouchEvent) => {
    if (isRangeInput(e.target)) {
      recordRangeTouch(e.target);
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (isRangeInput(e.target)) {
      lastRangeTouchMs = Date.now();
      ensureNoInputMode(e.target);
      if (document.activeElement === e.target) {
        e.target.blur();
      }
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (isRangeInput(e.target) || activeTouchRangeEl) {
      lastRangeTouchMs = Date.now();
      const targetEl = isRangeInput(e.target) ? e.target : activeTouchRangeEl;
      if (targetEl && document.activeElement === targetEl) {
        targetEl.blur();
      }
      scheduleTouchRangeClear();
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if ((e.pointerType === 'touch' || e.pointerType === 'pen') && isRangeInput(e.target)) {
      recordRangeTouch(e.target);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if ((e.pointerType === 'touch' || e.pointerType === 'pen') && isRangeInput(e.target)) {
      lastRangeTouchMs = Date.now();
      if (document.activeElement === e.target) {
        e.target.blur();
      }
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (
      (e.pointerType === 'touch' || e.pointerType === 'pen') &&
      (isRangeInput(e.target) || activeTouchRangeEl)
    ) {
      lastRangeTouchMs = Date.now();
      const targetEl = isRangeInput(e.target) ? e.target : activeTouchRangeEl;
      if (targetEl && document.activeElement === targetEl) {
        targetEl.blur();
      }
      scheduleTouchRangeClear();
    }
  };

  const onFocusIn = (e: FocusEvent) => {
    if (!isRangeInput(e.target)) return;
    const rangeEl = e.target;
    ensureNoInputMode(rangeEl);

    if (isTouchTriggeredFocus(rangeEl)) {
      rangeEl.blur();
      window.requestAnimationFrame(() => {
        if (document.activeElement === rangeEl) {
          rangeEl.blur();
        }
      });
    }
  };

  const onRangeInputOrChange = (e: Event) => {
    if (!isRangeInput(e.target)) return;
    const rangeEl = e.target;
    ensureNoInputMode(rangeEl);
    if (isTouchTriggeredFocus(rangeEl) && document.activeElement === rangeEl) {
      rangeEl.blur();
    }
  };

  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
  document.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('input', onRangeInputOrChange, true);
  document.addEventListener('change', onRangeInputOrChange, true);

  return () => {
    if (clearTimer !== null) {
      window.clearTimeout(clearTimer);
    }
    document.removeEventListener('touchstart', onTouchStart, true);
    document.removeEventListener('touchmove', onTouchMove, true);
    document.removeEventListener('touchend', onTouchEnd, true);
    document.removeEventListener('touchcancel', onTouchEnd, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('input', onRangeInputOrChange, true);
    document.removeEventListener('change', onRangeInputOrChange, true);
  };
}
