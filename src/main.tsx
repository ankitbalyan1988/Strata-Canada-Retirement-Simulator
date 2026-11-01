import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign browser ResizeObserver notification loop warnings
if (typeof window !== 'undefined') {
  const origOnError = window.onerror;
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) {
      return true;
    }
    if (origOnError) {
      return origOnError.apply(this, [msg, url, lineNo, columnNo, error] as any);
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('ResizeObserver loop')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

// Initialize Strata theme from storage or preference
if (typeof document !== 'undefined') {
  try {
    const saved = localStorage.getItem('strata-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {
    // ignore
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
