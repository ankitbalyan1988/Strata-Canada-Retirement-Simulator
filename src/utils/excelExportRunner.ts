import { useSimulationStore } from '../store/useSimulationStore';

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
 * Orchestrates any Excel export with the global loading overlay while keeping
 * `excelExport.ts` and `exceljs` strictly code-split into on-demand lazy chunks.
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

  try {
    // Phase 1: Show overlay immediately & fetch the lazy ExcelJS chunk in parallel with paint
    store.startExcelExportOverlay(
      options.title,
      'Fetching ExcelJS workbook engine & formula modules...'
    );

    const [excelModule] = await Promise.all([
      import('./excelExport'),
      waitForNextPaint()
    ]);

    // Phase 2: Transition to data processing & workbook generation
    useSimulationStore.getState().updateExcelExportOverlayPhase(
      'processing',
      options.processingSubtitle ||
        'Building formatted worksheets, CRA audit columns, and live Excel formulas...'
    );
    await waitForNextPaint();

    // Execute the actual workbook assembly and file save
    await task(excelModule);

    // Phase 3: Brief visual confirmation of file handoff before dismissing overlay
    useSimulationStore.getState().updateExcelExportOverlayPhase(
      'downloading',
      'Finalizing .xlsx package and triggering browser download...'
    );
    await sleep(220);

    useSimulationStore.getState().showToast(
      {
        status: 'success',
        title: 'Excel Export Complete',
        message:
          options.successMessage ||
          'Your formatted .xlsx workbook has finished generating and started downloading.'
      },
      4500
    );
  } catch (err) {
    console.error('Excel export failed:', err);
    useSimulationStore.getState().showToast(
      {
        status: 'error',
        title: 'Excel Export Failed',
        message: 'Something went wrong while generating your Excel workbook. Please try again.'
      },
      5000
    );
    throw err;
  } finally {
    useSimulationStore.getState().finishExcelExportOverlay();
  }
}
