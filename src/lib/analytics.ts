import { Profile } from '../../types';

type AnalyticsEvent = { name: string; props?: Record<string, unknown> };
export type AnalyticsConsent = 'granted' | 'denied';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const CONSENT_STORAGE_KEY = 'vitalis_analytics_consent';

const analyticsEnabled = Boolean(MIXPANEL_TOKEN || POSTHOG_KEY);

let mixpanelInitialized = false;
let posthogInitialized = false;
let mixpanelClient: (typeof import('mixpanel-browser'))['default'] | null = null;
let posthogClient: (typeof import('posthog-js'))['default'] | null = null;

let initPromise: Promise<void> | null = null;
let pendingIdentifyId: string | null = null;
const queuedEvents: AnalyticsEvent[] = [];
const MAX_QUEUE = 50;

export const getAnalyticsConsent = (): AnalyticsConsent | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (value === 'granted' || value === 'denied') return value;
  return null;
};

export const setAnalyticsConsent = (consent: AnalyticsConsent): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
};

const hasAnalyticsConsent = (): boolean => getAnalyticsConsent() === 'granted';

export const initAnalytics = (profile?: Profile) => {
  if (!hasAnalyticsConsent()) return;
  if (!analyticsEnabled) return;

  if (profile?.id) {
    pendingIdentifyId = profile.id;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const [mixpanelMod, posthogMod] = await Promise.all([
        MIXPANEL_TOKEN ? import('mixpanel-browser') : Promise.resolve(null),
        POSTHOG_KEY ? import('posthog-js') : Promise.resolve(null),
      ]);

      mixpanelClient = mixpanelMod?.default ?? null;
      posthogClient = posthogMod?.default ?? null;

      if (MIXPANEL_TOKEN && mixpanelClient && !mixpanelInitialized) {
        mixpanelClient.init(MIXPANEL_TOKEN, { debug: false });
        mixpanelInitialized = true;
      }

      if (POSTHOG_KEY && posthogClient && !posthogInitialized) {
        posthogClient.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST || 'https://app.posthog.com',
          autocapture: false,
        });
        posthogInitialized = true;
      }

      if (pendingIdentifyId) {
        if (mixpanelInitialized && mixpanelClient) mixpanelClient.identify(pendingIdentifyId);
        if (posthogInitialized && posthogClient) posthogClient.identify(pendingIdentifyId);
      }

      while (queuedEvents.length > 0) {
        const evt = queuedEvents.shift();
        if (!evt) continue;
        if (mixpanelInitialized && mixpanelClient) mixpanelClient.track(evt.name, evt.props);
        if (posthogInitialized && posthogClient) posthogClient.capture(evt.name, evt.props);
      }
    })().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('Analytics init failed', err);
    });
  } else if (pendingIdentifyId) {
    // If already initialized, keep identity in sync.
    if (mixpanelInitialized && mixpanelClient) mixpanelClient.identify(pendingIdentifyId);
    if (posthogInitialized && posthogClient) posthogClient.identify(pendingIdentifyId);
  }
};

export const trackEvent = (name: string, props?: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  if (!analyticsEnabled) return;

  if (mixpanelInitialized && mixpanelClient) {
    mixpanelClient.track(name, props);
  }
  if (posthogInitialized && posthogClient) {
    posthogClient.capture(name, props);
  }

  if (!mixpanelInitialized && !posthogInitialized) {
    queuedEvents.push({ name, props });
    if (queuedEvents.length > MAX_QUEUE) queuedEvents.shift();
    // Best-effort lazy init in case trackEvent fires before initAnalytics.
    if (!initPromise) initAnalytics();
  }
};
