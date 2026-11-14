/**
 * Dynamic Platform & Keyboard Shortcuts Utility
 * Adapts modifier keys (Command vs Control) dynamically based on macOS vs Windows/Linux.
 */

export function isMacPlatform(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  // Modern userAgentData check
  const nav = navigator as unknown as { userAgentData?: { platform?: string } };
  if (nav.userAgentData?.platform) {
    return /mac/i.test(nav.userAgentData.platform);
  }
  // Fallback to platform or userAgent
  const platform = navigator.platform || navigator.userAgent || '';
  return /Mac|iPhone|iPod|iPad/i.test(platform);
}

export function getModifierKey(): '⌘' | 'Ctrl' {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

export function getShiftKey(): '⇧' | 'Shift' {
  return isMacPlatform() ? '⇧' : 'Shift';
}

export function formatShortcut(key: string, options?: { shift?: boolean; alt?: boolean }): string {
  const isMac = isMacPlatform();
  const mod = isMac ? '⌘' : 'Ctrl+';
  const shift = options?.shift ? (isMac ? '⇧' : 'Shift+') : '';
  const alt = options?.alt ? (isMac ? '⌥' : 'Alt+') : '';
  
  if (isMac) {
    return `${mod}${shift}${alt}${key.toUpperCase()}`;
  }
  return `${mod}${shift}${alt}${key.toUpperCase()}`;
}
