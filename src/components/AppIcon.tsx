import React from 'react';

export const APP_ICON_SRC =
  '/assets/aistudio/Gemini_Generated_Image_poxx63poxx63poxx_1bbf4a0e.jpeg';

export type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AppIconProps {
  size?: AppIconSize;
  className?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<AppIconSize, string> = {
  xs: 'w-6 h-6 rounded-[6px]',
  sm: 'w-8 h-8 rounded-[8px]',
  md: 'w-9 h-9 rounded-[10px]',
  lg: 'w-10 h-10 rounded-[11px]',
  xl: 'w-12 h-12 rounded-[13px]'
};

/**
 * Brand App Icon component referencing the user-supplied Strata icon directly.
 * Uses overflow-hidden + 1.27x zoom to trim the baked-in outer margin cleanly
 * so only the dark-bezel emerald & gold maple leaf emblem renders.
 */
export const AppIcon: React.FC<AppIconProps> = React.memo(
  ({ size = 'md', className = '', alt = 'Strata App Icon' }) => {
    return (
      <span
        className={`relative inline-flex items-center justify-center overflow-hidden bg-[#10261E] shadow-xs ring-1 ring-emerald-950/30 dark:ring-emerald-400/20 shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
      >
        <img
          src={APP_ICON_SRC}
          alt={alt}
          draggable={false}
          className="w-full h-full object-cover scale-[1.27] pointer-events-none"
        />
      </span>
    );
  }
);

AppIcon.displayName = 'AppIcon';

let cachedDataUrlPromise: Promise<string | null> | null = null;

/**
 * Loads the app icon into an offscreen canvas, trims the outer checkerboard margin,
 * clips clean rounded corners, and returns a transparent-corner PNG data URL.
 * Used for both the crisp browser tab favicon and branded PDF report headers.
 */
export function loadCroppedAppIconDataUrl(outputSize = 128): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  if (outputSize === 128 && cachedDataUrlPromise) {
    return cachedDataUrlPromise;
  }

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const radius = outputSize * 0.22;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(outputSize - radius, 0);
        ctx.quadraticCurveTo(outputSize, 0, outputSize, radius);
        ctx.lineTo(outputSize, outputSize - radius);
        ctx.quadraticCurveTo(outputSize, outputSize, outputSize - radius, outputSize);
        ctx.lineTo(radius, outputSize);
        ctx.quadraticCurveTo(0, outputSize, 0, outputSize - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();

        // Trim ~10.5% outer checkerboard padding on all four sides
        const insetX = img.naturalWidth * 0.105;
        const insetY = img.naturalHeight * 0.105;
        const cropW = img.naturalWidth * 0.79;
        const cropH = img.naturalHeight * 0.79;

        ctx.drawImage(img, insetX, insetY, cropW, cropH, 0, 0, outputSize, outputSize);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = APP_ICON_SRC;
  });

  if (outputSize === 128) {
    cachedDataUrlPromise = promise;
  }

  return promise;
}

/**
 * Upgrades the browser tab favicon to a crisp, transparent-corner cropped PNG
 * derived directly from the app icon asset.
 */
export function installAppFavicon(): void {
  if (typeof document === 'undefined') return;
  loadCroppedAppIconDataUrl(128).then((dataUrl) => {
    if (!dataUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = dataUrl;
  });
}
