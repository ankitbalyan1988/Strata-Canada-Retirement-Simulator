import { useSimulationStore } from '../store/useSimulationStore';
import { requestExportPassword } from './exportPasswordPrompt';
import { dynamicImportWithRetry } from './dynamicImportWithRetry';

type ExcelExportModule = typeof import('./excelExport');

export interface ExcelExportRunnerOptions {
  /** Primary overlay heading (e.g., "Exporting Master Excel Workbook") */
  title: string;
  /** Subtitle shown during Phase 2 (workbook construction & formula generation) */
  processingSubtitle?: string;
  /** Confirmation toast message shown after download is triggered */
  successMessage?: string;
}

/**
 * Yields to the browser's rendering pipeline so React commits and paints the
 * global loading overlay before heavy dynamic import evaluation or synchronous
 * ExcelJS cell/formula serialization executes on the main thread.
 */
function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    } else {
      setTimeout(resolve, 16);
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Orchestrates any Excel export with an optional password protection prompt and
 * the global loading overlay while keeping `excelExport.ts` and `exceljs` strictly
 * code-split into on-demand lazy chunks.
 */
export async function runWithExcelExportOverlay(
  options: ExcelExportRunnerOptions,
  task: (excelModule: ExcelExportModule) => Promise<void>
): Promise<void> {
  const store = useSimulationStore.getState();

  // Prevent overlapping concurrent exports
  if (store.excelExportOverlay) {
    return;
  }

  // Ask whether the user wants to password-protect this Excel workbook before downloading
  const promptResult = await requestExportPassword({
    format: 'excel',
    documentTitle: options.title.replace(/^Exporting\s+/i, '')
  });

  if (!promptResult.confirmed) {
    return;
  }

  const exportPassword = promptResult.password;
  const isProtected = Boolean(exportPassword && exportPassword.length > 0);

  let loadedExcelModule: ExcelExportModule | null = null;

  try {
    // Phase 1: Show overlay immediately & fetch the lazy ExcelJS chunk in parallel with paint
    useSimulationStore.getState().startExcelExportOverlay(
      options.title,
      'Fetching ExcelJS workbook engine & formula modules...'
    );

    const [excelModule] = await Promise.all([
      dynamicImportWithRetry(() => import('./excelExport')),
      waitForNextPaint()
    ]);
    loadedExcelModule = excelModule;

    // Install granular progress logger & transient encryption password
    excelModule.setActiveExcelExportPassword(exportPassword);
    excelModule.setActiveExcelProgressLogger(async (message: string) => {
      useSimulationStore.getState().appendExcelExportLog(message);
      await waitForNextPaint();
      await sleep(75);
    });

    // Phase 2: Transition to data processing & workbook generation
    useSimulationStore.getState().updateExcelExportOverlayPhase(
      'processing',
      options.processingSubtitle ||
        'Building formatted worksheets, CRA audit columns, and live Excel formulas...'
    );
    await waitForNextPaint();

    // Execute the actual workbook assembly, optional encryption, and file save
    await task(excelModule);

    // Phase 3: Brief visual confirmation of file handoff before dismissing overlay
    useSimulationStore.getState().updateExcelExportOverlayPhase(
      'downloading',
      isProtected
        ? 'Finalizing password-protected .xlsx package and triggering browser download...'
        : 'Finalizing .xlsx package and triggering browser download...'
    );
    useSimulationStore.getState().appendExcelExportLog(
      isProtected
        ? 'Encrypted workbook ready — starting browser download...'
        : 'Workbook ready — starting browser download...'
    );
    await waitForNextPaint();
    await sleep(160);
    useSimulationStore.getState().completeExcelExportLogs();
    await sleep(180);

    useSimulationStore.getState().showToast(
      {
        status: 'success',
        title: isProtected ? 'Password-Protected Excel Export Complete' : 'Excel Export Complete',
        message: isProtected
          ? 'Your encrypted .xlsx workbook has started downloading. Opening it will require your password.'
          : options.successMessage ||
            'Your formatted .xlsx workbook has finished generating and started downloading.'
      },
      5000
    );
  } catch (err) {
    console.error('Excel export failed:', err);
    useSimulationStore.getState().showToast(
      {
        status: 'error',
        title: 'Excel Export Failed',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong while generating your Excel workbook. Please try again.'
      },
      5000
    );
    throw err;
  } finally {
    if (loadedExcelModule) {
      loadedExcelModule.setActiveExcelProgressLogger(null);
      loadedExcelModule.setActiveExcelExportPassword(null);
    }
    useSimulationStore.getState().finishExcelExportOverlay();
  }
}
