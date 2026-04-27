/**
 * Lightweight runtime error reporter.
 *
 * - Logs to console with a consistent prefix for grep-ability.
 * - Forwards to PostHog when available (loaded async on the client).
 * - Never throws; reporting failures must not break the app.
 */

type ErrorContext = Record<string, unknown>;

function getPostHog(): any | null {
  if (typeof window === 'undefined') return null;
  // posthog-js attaches itself to window when initialized
  return (window as any).posthog ?? null;
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    // eslint-disable-next-line no-console
    console.error('[locumops:error]', err.message, { ...context, stack: err.stack });

    const ph = getPostHog();
    if (ph?.captureException) {
      ph.captureException(err, context);
    } else if (ph?.capture) {
      ph.capture('client_error', {
        message: err.message,
        stack: err.stack,
        ...context,
      });
    }
  } catch {
    // Reporting must never throw.
  }
}

/**
 * Detect Supabase/PostgREST auth errors so React Query can avoid
 * pointless retries on 401/403 responses.
 */
export function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const status = typeof e.status === 'number' ? e.status : undefined;
  const code = typeof e.code === 'string' ? e.code : undefined;
  const message = typeof e.message === 'string' ? e.message : '';

  if (status === 401 || status === 403) return true;
  if (code === 'PGRST301' || code === 'PGRST302') return true;
  if (/jwt|unauthor|forbidden/i.test(message)) return true;
  return false;
}
