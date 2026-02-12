import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';
import { initSentry } from './src/lib/sentry';
import { getSession, onAuthStateChange } from './services/authService';
import { useAuthStore } from './stores/authStore';

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
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
