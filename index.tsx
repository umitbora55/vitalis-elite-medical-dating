import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import App from './App';
import './index.css';
import { initSentry } from './src/lib/sentry';
import { getSession, onAuthStateChange } from './services/authService';
import { useAuthStore } from './stores/authStore';

// AUDIT-FIX: [FE-002] - Improved error boundary fallback UI with retry and support options
interface ErrorFallbackProps {
  error: unknown;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ resetError }) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
      <AlertTriangle size={40} className="text-red-500" />
    </div>
    <h1 className="text-2xl font-serif text-white mb-3">Something went wrong</h1>
    <p className="text-slate-400 mb-6 max-w-sm">
      An unexpected error occurred. Please try again or contact support if the problem persists.
    </p>
    <button
      onClick={resetError}
      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold shadow-lg hover:scale-[1.02] transition-transform"
    >
      <RefreshCw size={18} />
      Try Again
    </button>
    <a
      href="mailto:support@vitalis.com"
      className="text-gold-400 mt-4 text-sm hover:underline"
    >
      Contact Support
    </a>
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

initSentry();

window.addEventListener('error', (event) => {
  const capturedError =
    event.error instanceof Error ? event.error : new Error(event.message || 'Window error event');
  Sentry.captureException(capturedError);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const capturedError =
    reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Unhandled rejection');
  Sentry.captureException(capturedError);
});

const setAuthedStep = (): void => {
  const hasSeenOnboarding = localStorage.getItem('vitalis_onboarding_seen');
  useAuthStore.getState().setAuthStep(hasSeenOnboarding ? 'APP' : 'ONBOARDING');
};

const bootstrapAuth = async (): Promise<void> => {
  const { data } = await getSession();
  if (data.session) {
    setAuthedStep();
  }

  onAuthStateChange((_event, session) => {
    if (!session) {
      useAuthStore.getState().setAuthStep('LANDING');
      return Promise.resolve();
    }

    // Avoid overriding in-progress auth flows (LOGIN/REGISTRATION) on sign-in.
    if (useAuthStore.getState().authStep === 'LANDING') {
      setAuthedStep();
    }

    return Promise.resolve();
  });
};

void bootstrapAuth();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* AUDIT-FIX: [FE-002] - Using custom ErrorFallback component */}
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
