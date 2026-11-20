import { createRoot } from 'react-dom/client';

import App from './App';
import { BrowserSurface } from '@/components/browser-app';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// Register the OS service worker on hosted origins. Local one-file exports intentionally
// skip service workers because browsers do not allow them from file:// URLs.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
    navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch((error) => {
      console.warn('McCrackOS PWA service worker registration failed:', error);
    });
  }, { once: true });
}

// The standalone HTML file opens this lightweight hosted route for its browser.
// It keeps the full Scramjet browser UI without nesting another copy of the desktop OS.
const browserOnly = new URLSearchParams(location.search).get('mccrack-browser') === '1';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    {browserOnly ? <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }}><BrowserSurface /></div> : <App />}
  </ErrorBoundary>,
);
