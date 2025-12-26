import { Buffer } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Polyfill Buffer for browser
window.Buffer = Buffer;

// Explicit service worker registration (reliable updates across PWA + webviews)
registerSW({
  immediate: true,
  onNeedRefresh() {
    // In a real app, you'd show a toast. For now, refresh to get the newest version.
    window.location.reload();
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

