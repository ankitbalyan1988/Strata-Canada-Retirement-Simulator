import { useSimulationStore } from '../store/useSimulationStore';

export type ExportDocumentFormat = 'pdf' | 'excel';

export interface ExportPasswordPromptRequest {
  format: ExportDocumentFormat;
  documentTitle: string;
  confirmLabel?: string;
  initialProtect?: boolean;
}

export type ExportPasswordPromptResult =
  | { confirmed: false }
  | { confirmed: true; password: string | null };

let pendingResolver: ((result: ExportPasswordPromptResult) => void) | null = null;

/**
 * Opens the global ExportPasswordModal asking the user whether to password-protect
 * the exported document (and prompting them to enter & confirm a password if yes).
 * Resolves with `{ confirmed: false }` if cancelled, or `{ confirmed: true, password }`.
 */
export function requestExportPassword(
  request: ExportPasswordPromptRequest
): Promise<ExportPasswordPromptResult> {
  // Cleanly cancel any stale unresolved prompt before opening a new one
  if (pendingResolver) {
    const staleResolver = pendingResolver;
    pendingResolver = null;
    staleResolver({ confirmed: false });
  }

  return new Promise<ExportPasswordPromptResult>((resolve) => {
    pendingResolver = resolve;
    useSimulationStore.getState().setExportPasswordPrompt(request);
  });
}

/**
 * Resolves the currently active password prompt and closes the modal.
 * Passwords remain strictly ephemeral in memory and are never persisted.
 */
export function resolveExportPasswordPrompt(result: ExportPasswordPromptResult): void {
  useSimulationStore.getState().setExportPasswordPrompt(null);
  const resolver = pendingResolver;
  pendingResolver = null;
  if (resolver) {
    resolver(result);
  }
}
