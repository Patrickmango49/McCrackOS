import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';


function StartupCurtainRelease() {
  useEffect(() => {
    const curtain = document.getElementById('startup-curtain');
    if (!curtain) return;
    curtain.classList.add('ready');
    const removeTimer = window.setTimeout(() => curtain.remove(), 240);
    return () => window.clearTimeout(removeTimer);
  }, []);
  return null;
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <>
    <StartupCurtainRelease />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </>,
);
