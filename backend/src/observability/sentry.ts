import * as Sentry from '@sentry/node';

/**
 * M17: error tracking. Enabled ONLY when SENTRY_DSN is set — without it every helper is a no-op,
 * so dev/CI/tests never talk to Sentry and never fail because of it. `release` ties an event to
 * the deployed commit (Render exposes RENDER_GIT_COMMIT); `serverName` tells api and worker apart.
 */
let enabled = false;

export function initSentry(service: 'api' | 'worker'): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_SHA ?? 'dev',
    serverName: service,
    tracesSampleRate: 0, // errors only — tracing is out of scope for M17
  });
  enabled = true;
  process.on('unhandledRejection', (reason) => captureException(reason, { source: 'unhandledRejection' }));
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export function captureException(e: unknown, extra: Record<string, unknown> = {}): void {
  if (!enabled) return;
  Sentry.captureException(e instanceof Error ? e : new Error(String(e)), { extra });
}

export function captureMessage(
  message: string,
  level: 'error' | 'warning' | 'info' = 'error',
  extra: Record<string, unknown> = {},
): void {
  if (!enabled) return;
  Sentry.captureMessage(message, { level, extra });
}

/** Test support. */
export function _resetSentryForTest(): void {
  enabled = false;
}
