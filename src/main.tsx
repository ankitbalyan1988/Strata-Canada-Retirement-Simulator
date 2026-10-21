import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure clean light-mode theme state
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
  try {
    localStorage.removeItem('mapleretire_theme');
  } catch (e) {
    // ignore
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
