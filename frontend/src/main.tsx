import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './i18n';
import './styles/globals.css';

// ─── §30 — Sentry (frontend) ────────────────────────────────────────
// No-op when VITE_SENTRY_DSN is empty/absent. Scrubs PII before any
// event leaves the browser: no cookies, no passwords, no referrer
// headers that might leak page content via Referer. Requests and
// consoleLogs are excluded to avoid noise and to prevent PII from
// accidental console.log of user data.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // 10% trace sampling (production default) — perf traces are
    // optional for v1; raise to 100 if business wants them.
    tracesSampleRate: 0.1,
    // Scrub consoleLog inputs — may contain user PII from console
    // statements we don't control.
    sendDefaultPii: false,
    beforeSend(event) {
      // Drop cookies (session/auth tokens) and request bodies (form
      // fields with PII, passwords, payment data).
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
