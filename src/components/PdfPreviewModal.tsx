import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  Download,
  Printer,
  Maximize2,
  Minimize2,
  X,
  Check,
  Loader2,
  MapPin,
  Calendar,
  User,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { requestExportPassword } from '../utils/exportPasswordPrompt';
import { AppIcon } from './AppIcon';

// Configure PDF.js worker using Vite's same-origin bundled worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface PdfPageCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  totalPages: number;
  scale: number;
  onRegisterContainer: (pageNumber: number, el: HTMLDivElement | null) => void;
  onRegisterCanvas: (pageNumber: number, el: HTMLCanvasElement | null) => void;
}

const PdfPageCanvas: React.FC<PdfPageCanvasProps> = React.memo(
  ({ pdfDoc, pageNumber, totalPages, scale, onRegisterContainer, onRegisterCanvas }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isRendering, setIsRendering] = useState<boolean>(true);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    const handleCanvasRef = useCallback(
      (node: HTMLCanvasElement | null) => {
        canvasRef.current = node;
        onRegisterCanvas(pageNumber, node);
      },
      [onRegisterCanvas, pageNumber]
    );

    const handleContainerRef = useCallback(
      (node: HTMLDivElement | null) => {
        onRegisterContainer(pageNumber, node);
      },
      [onRegisterContainer, pageNumber]
    );

    useEffect(() => {
      let isCancelled = false;
      let renderTask: RenderTask | null = null;

      const renderPage = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsRendering(true);
        setRenderError(null);

        try {
          const page = await pdfDoc.getPage(pageNumber);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);

          const cssWidth = Math.floor(viewport.width);
          const cssHeight = Math.floor(viewport.height);

          setDimensions({ width: cssWidth, height: cssHeight });

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;

          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

          renderTask = page.render({
            canvas,
            viewport,
            transform
          });

          await renderTask.promise;

          if (!isCancelled) {
            setIsRendering(false);
          }
        } catch (err: unknown) {
          const errorName = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
          if (isCancelled || errorName === 'RenderingCancelledException') {
            return;
          }
          console.error(`Failed to render PDF page ${pageNumber}:`, err);
          if (!isCancelled) {
            setRenderError('Unable to render this page.');
            setIsRendering(false);
          }
        }
      };

      renderPage();

      return () => {
        isCancelled = true;
        if (renderTask) {
          try {
            renderTask.cancel();
          } catch (_) {}
        }
      };
    }, [pdfDoc, pageNumber, scale]);

    return (
      <div
        ref={handleContainerRef}
        data-pdf-page={pageNumber}
        className="flex flex-col items-center gap-2 shrink-0"
      >
        <div
          className={`relative bg-white rounded-lg shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 overflow-hidden transition-shadow ${
            !dimensions ? 'min-w-[320px] min-h-[420px]' : ''
          }`}
        >
          {isRendering && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-[1px]">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-[11px] font-medium text-slate-500">
                Rendering page {pageNumber}...
              </span>
            </div>
          )}

          {renderError && !isRendering && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50 p-4 text-center">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span className="text-xs font-medium text-slate-600">{renderError}</span>
            </div>
          )}

          <canvas ref={handleCanvasRef} className="block bg-white" />
        </div>

        <span className="text-[10.5px] font-mono font-semibold text-slate-500 dark:text-slate-400 select-none">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    );
  }
);

PdfPageCanvas.displayName = 'PdfPageCanvas';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.15;

export const PdfPreviewModal: React.FC = () => {
  const pdfPreview = useSimulationStore((state) => state.pdfPreview);
  const closePdfPreview = useSimulationStore((state) => state.closePdfPreview);
  const regeneratePdfWithPassword = useSimulationStore((state) => state.regeneratePdfWithPassword);
  const isExportingPdf = useSimulationStore((state) => state.isExportingPdf);
  const showToast = useSimulationStore((state) => state.showToast);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [basePageWidth, setBasePageWidth] = useState<number>(612); // US Letter width in pt
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const registerPageContainer = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageContainerRefs.current.set(pageNum, el);
    } else {
      pageContainerRefs.current.delete(pageNum);
    }
  }, []);

  const registerPageCanvas = useCallback((pageNum: number, el: HTMLCanvasElement | null) => {
    if (el) {
      pageCanvasRefs.current.set(pageNum, el);
    } else {
      pageCanvasRefs.current.delete(pageNum);
    }
  }, []);

  // Compute ideal fit-to-width scale based on the scroll viewport container width
  const computeFitWidthScale = useCallback(
    (pageWidthPt: number) => {
      const container = viewportRef.current;
      if (!container || pageWidthPt <= 0) return 1.0;
      const horizontalPadding = window.innerWidth < 640 ? 28 : 72;
      const availableWidth = Math.max(280, container.clientWidth - horizontalPadding);
      const rawScale = availableWidth / pageWidthPt;
      return Math.min(1.45, Math.max(0.45, Number(rawScale.toFixed(2))));
    },
    []
  );

  // Load PDF bytes directly into PDF.js (completely bypasses Chrome's blocked iframe PDF viewer)
  useEffect(() => {
    if (!pdfPreview) return;

    let isCancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let loadedDoc: PDFDocumentProxy | null = null;

    setIsLoadingDoc(true);
    setLoadError(null);
    setHasDownloaded(false);
    setCurrentPage(1);
    setPdfDoc(null);
    setNumPages(0);
    setIsFitWidth(true);

    const loadDocument = async () => {
      try {
        const buffer = await pdfPreview.blob.arrayBuffer();
        if (isCancelled) return;

        const data = new Uint8Array(buffer);
        loadingTask = pdfjsLib.getDocument({
          data,
          ...(pdfPreview.sessionPassword ? { password: pdfPreview.sessionPassword } : {})
        });
        loadedDoc = await loadingTask.promise;

        if (isCancelled) {
          await loadingTask.destroy();
          return;
        }

        const firstPage = await loadedDoc.getPage(1);
        if (isCancelled) {
          await loadingTask.destroy();
          return;
        }

        const defaultViewport = firstPage.getViewport({ scale: 1 });
        const pageWidth = defaultViewport.width || 612;

        setBasePageWidth(pageWidth);
        setZoomScale(computeFitWidthScale(pageWidth));
        setNumPages(loadedDoc.numPages);
        setPdfDoc(loadedDoc);
        setIsLoadingDoc(false);
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to parse PDF preview with PDF.js:', err);
        setLoadError('Could not render the inline preview. You can still download the PDF directly below.');
        setIsLoadingDoc(false);
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (loadedDoc) {
        loadedDoc.cleanup().catch(() => {});
      }
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [pdfPreview, computeFitWidthScale]);

  // Keep fit-to-width responsive when toggling fullscreen or resizing the browser window
  useEffect(() => {
    if (!isFitWidth || !pdfDoc) return;

    const updateFit = () => {
      setZoomScale(computeFitWidthScale(basePageWidth));
    };

    const timer = window.setTimeout(updateFit, 50);
    window.addEventListener('resize', updateFit);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateFit);
    };
  }, [isFitWidth, isFullscreen, basePageWidth, pdfDoc, computeFitWidthScale]);

  // Observe visible PDF pages to keep "Page X of N" synchronized while scrolling
  useEffect(() => {
    const root = viewportRef.current;
    if (!root || !pdfDoc || numPages <= 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage = -1;
        let bestRatio = 0;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= bestRatio) {
            const pageAttr = Number(entry.target.getAttribute('data-pdf-page'));
            if (!Number.isNaN(pageAttr)) {
              bestRatio = entry.intersectionRatio;
              bestPage = pageAttr;
            }
          }
        }

        if (bestPage > 0) {
          setCurrentPage(bestPage);
        }
      },
      {
        root,
        threshold: [0.25, 0.5, 0.75]
      }
    );

    for (const el of pageContainerRefs.current.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pdfDoc, numPages, zoomScale]);

  const scrollToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(numPages || 1, targetPage));
      setCurrentPage(clamped);
      const targetEl = pageContainerRefs.current.get(clamped);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [numPages]
  );

  // Keyboard shortcuts while preview modal is open (Esc to close, PageUp/PageDown to turn pages)
  useEffect(() => {
    if (!pdfPreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (useSimulationStore.getState().exportPasswordPrompt) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePdfPreview();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        scrollToPage(currentPage + 1);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        scrollToPage(currentPage - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfPreview, closePdfPreview, currentPage, scrollToPage]);

  if (!pdfPreview) return null;

  const handleZoomIn = () => {
    setIsFitWidth(false);
    setZoomScale((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  };

  const handleZoomOut = () => {
    setIsFitWidth(false);
    setZoomScale((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleResetFit = () => {
    setIsFitWidth(true);
    setZoomScale(computeFitWidthScale(basePageWidth));
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = pdfPreview.blobUrl;
      link.download = pdfPreview.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setHasDownloaded(true);
      showToast(
        {
          status: 'success',
          title: pdfPreview.isPasswordProtected ? 'Protected PDF Downloaded' : 'PDF Downloaded',
          message: pdfPreview.isPasswordProtected
            ? `Saved password-protected ${pdfPreview.fileName}`
            : `Saved ${pdfPreview.fileName}`
        },
        4000
      );
      window.setTimeout(() => setHasDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to trigger PDF download:', err);
      showToast(
        {
          status: 'error',
          title: 'Download Failed',
          message: 'Unable to download the PDF file. Please try again.'
        },
        4500
      );
    }
  };

  // Print rendered PDF pages via a clean same-origin HTML print iframe (never blocked by Chrome's PDF plugin)
  const handlePrint = async () => {
    if (!pdfDoc || isPrinting) return;

    setIsPrinting(true);
    try {
      const pageImages: string[] = [];

      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const existingCanvas = pageCanvasRefs.current.get(p);
        if (existingCanvas && existingCanvas.width > 0 && existingCanvas.height > 0) {
          pageImages.push(existingCanvas.toDataURL('image/png'));
        } else {
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 1.75 });
          const offscreen = document.createElement('canvas');
          offscreen.width = Math.floor(viewport.width);
          offscreen.height = Math.floor(viewport.height);
          await page.render({ canvas: offscreen, viewport }).promise;
          pageImages.push(offscreen.toDataURL('image/png'));
        }
      }

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.setAttribute('aria-hidden', 'true');

      const imagesMarkup = pageImages
        .map(
          (src, idx) =>
            `<div class="pdf-print-page"><img src="${src}" alt="Page ${idx + 1}" /></div>`
        )
        .join('');

      printFrame.srcdoc = `<!DOCTYPE html>
<html>
  <head>
    <title>${pdfPreview.fileName.replace(/[<>"]/g, '')}</title>
    <style>
      @page { margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .pdf-print-page { page-break-after: always; break-after: page; width: 100%; display: flex; justify-content: center; }
      .pdf-print-page:last-child { page-break-after: auto; break-after: auto; }
      img { width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>${imagesMarkup}</body>
</html>`;

      document.body.appendChild(printFrame);

      printFrame.onload = () => {
        window.setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (printErr) {
            console.warn('Unable to open print dialog:', printErr);
          } finally {
            window.setTimeout(() => {
              if (printFrame.parentNode) {
                printFrame.parentNode.removeChild(printFrame);
              }
              setIsPrinting(false);
            }, 1500);
          }
        }, 150);
      };
    } catch (err) {
      console.error('Failed to prepare PDF for printing:', err);
      setIsPrinting(false);
      showToast(
        {
          status: 'error',
          title: 'Print Unavailable',
          message: 'Please download the PDF first to print it from your device.'
        },
        4500
      );
    }
  };

  const generatedTime = (() => {
    try {
      return new Date(pdfPreview.generatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '';
    }
  })();

  const totalPageCount = numPages || pdfPreview.pageCount;
  const pageNumbers = Array.from({ length: numPages }, (_, idx) => idx + 1);
  const zoomPercent = Math.round(zoomScale * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePdfPreview();
        }
      }}
      className={`fixed inset-0 z-[65] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ${
        isFullscreen ? 'p-0 sm:p-2' : 'p-2 sm:p-5'
      }`}
    >
      <div
        className={`bg-white dark:bg-[#11141A] border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none sm:rounded-2xl'
            : 'w-full max-w-6xl h-[92vh] rounded-2xl'
        }`}
      >
        {/* Top Preview Toolbar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Document Identity & Metadata */}
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon size="md" alt="Strata Report" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="pdf-preview-modal-title"
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate"
                >
                  Executive Retirement Report Preview
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 shrink-0">
                  {totalPageCount} {totalPageCount === 1 ? 'Page' : 'Pages'}
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shrink-0">
                  {formatFileSize(pdfPreview.sizeBytes)}
                </span>
                {pdfPreview.isPasswordProtected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shrink-0">
                    <Lock className="w-3 h-3" />
                    <span>Password Protected</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{pdfPreview.clientName}</span>
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Retire Age {pdfPreview.retirementAge}</span>
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{pdfPreview.province}</span>
                </span>
                {generatedTime && (
                  <span className="hidden md:inline font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    Generated {generatedTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions (Password, Print, Fullscreen, Download, Close) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const res = await requestExportPassword({
                  format: 'pdf',
                  documentTitle: 'Update PDF Password Protection',
                  confirmLabel: 'Apply Password to PDF',
                  initialProtect: !pdfPreview.isPasswordProtected
                });
                if (res.confirmed) {
                  await regeneratePdfWithPassword(res.password);
                }
              }}
              disabled={isExportingPdf}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${
                pdfPreview.isPasswordProtected
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/70'
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title={
                pdfPreview.isPasswordProtected
                  ? 'Change or remove PDF password'
                  : 'Add password protection to this PDF'
              }
            >
              {pdfPreview.isPasswordProtected ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Add Password</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfDoc || isPrinting}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print PDF Report"
              aria-label="Print PDF Report"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              )}
              <span>{isPrinting ? 'Preparing...' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="hidden sm:inline-flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand to Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand to Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-xs ${
                hasDownloaded
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title={`Download ${pdfPreview.fileName}`}
            >
              {hasDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={closePdfPreview}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close PDF Preview (Esc)"
              aria-label="Close PDF Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Controls Sub-Bar (Page Navigation & Zoom) */}
        <div className="px-4 sm:px-5 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#151922] flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={!pdfDoc || currentPage <= 1}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page (PageUp)"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 select-none">
              Page {currentPage} / {totalPageCount}
            </span>
            <button
              type="button"
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={!pdfDoc || currentPage >= totalPageCount}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page (PageDown)"
              aria-label="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!pdfDoc || zoomScale <= MIN_ZOOM}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-[52px] text-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 select-none">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!pdfDoc || zoomScale >= MAX_ZOOM}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetFit}
              disabled={!pdfDoc}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isFitWidth
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Fit Document Width"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Fit</span>
            </button>
          </div>
        </div>

        {/* Native PDF.js Canvas Document Viewport */}
        <div
          ref={viewportRef}
          className="relative flex-1 bg-slate-200/90 dark:bg-slate-950 overflow-auto"
        >
          {isLoadingDoc && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/95 dark:bg-slate-950/95 text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <p className="text-xs font-semibold">Rendering PDF document preview...</p>
            </div>
          )}

          {loadError && !isLoadingDoc && (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 max-w-md">
                {loadError}
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Directly</span>
              </button>
            </div>
          )}

          {!isLoadingDoc && !loadError && pdfDoc && (
            <div className="flex flex-col items-center gap-6 py-6 px-3 sm:px-6 min-w-max mx-auto">
              {pageNumbers.map((pageNum) => (
                <PdfPageCanvas
                  key={pageNum}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  totalPages={numPages}
                  scale={zoomScale}
                  onRegisterContainer={registerPageContainer}
                  onRegisterCanvas={registerPageCanvas}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom File Metadata & Action Footer */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11141A] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2 min-w-0 max-w-full">
            <span className="font-mono text-[10.5px] text-slate-600 dark:text-slate-300 truncate">
              {pdfPreview.fileName}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
              Review all {totalPageCount} pages above before saving a copy locally.
            </span>
            <button
              type="button"
              onClick={closePdfPreview}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
