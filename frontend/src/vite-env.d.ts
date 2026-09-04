/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  /** §30 — Sentry DSN. Empty => Sentry SDK is a no-op. */
  readonly VITE_SENTRY_DSN?: string;
  /** §31 — Google Analytics 4 measurement id. Empty => no tracking. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
