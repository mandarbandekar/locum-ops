import React from 'react';
import { reportError } from '@/lib/errorReporting';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Tag forwarded to the error reporter for filtering (e.g. "root", "route"). */
  scope?: string;
  /** Called after the error is captured. Useful for logging hooks. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions in its subtree. Async errors are not
 * caught here — those are surfaced via toasts and the errorReporting helper.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, {
      scope: this.props.scope ?? 'unknown',
      componentStack: info.componentStack,
    });
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-medium text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            We hit an unexpected error rendering this page. Your data is safe — try
            reloading. If the problem persists, sign out and back in.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()} size="sm">
              Reload page
            </Button>
            <Button onClick={this.reset} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
