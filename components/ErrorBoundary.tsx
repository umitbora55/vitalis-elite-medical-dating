import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * P0 Critical Fix: Catches JavaScript errors anywhere in child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 *
 * Mobile Audit Fix: Agent 12 Finding - No Error Boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleReportBug = (): void => {
    const subject = encodeURIComponent('Bug Report: App Crash');
    const body = encodeURIComponent(
      `Error: ${this.state.error?.message || 'Unknown error'}\n\n` +
      `Stack: ${this.state.error?.stack || 'No stack trace'}\n\n` +
      `Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}`
    );
    window.open(`mailto:support@vitalis.app?subject=${subject}&body=${body}`);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="max-w-sm w-full">
            {/* Error Icon */}
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertTriangle size={40} className="text-red-500" />
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-serif text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe.
              Please try again or return to the home screen.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl text-left overflow-auto max-h-32">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-4 rounded-xl bg-gold-500 text-slate-950 font-bold tracking-wide shadow-lg hover:bg-gold-400 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full py-3.5 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Go to Home
              </button>

              <button
                onClick={this.handleReportBug}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5 mt-2"
              >
                <Bug size={14} />
                Report this issue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary HOC
 * Wraps a component with ErrorBoundary for easy use
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
