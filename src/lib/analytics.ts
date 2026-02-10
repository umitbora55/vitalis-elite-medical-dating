import mixpanel from 'mixpanel-browser';
import posthog from 'posthog-js';
import { Profile } from '../../types';

let mixpanelInitialized = false;
let posthogInitialized = false;

export const initAnalytics = (profile?: Profile) => {
  const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
  if (mixpanelToken && !mixpanelInitialized) {
    mixpanel.init(mixpanelToken, { debug: false, ignore_dnt: true });
    mixpanelInitialized = true;
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
  if (posthogKey && !posthogInitialized) {
    posthog.init(posthogKey, {
      api_host: posthogHost || 'https://app.posthog.com',
      autocapture: false,
    });
    posthogInitialized = true;
  }

  if (profile?.id) {
    if (mixpanelInitialized) {
      mixpanel.identify(profile.id);
    }
    if (posthogInitialized) {
      posthog.identify(profile.id);
    }
  }
};

export const trackEvent = (name: string, props?: Record<string, unknown>) => {
  if (mixpanelInitialized) {
    mixpanel.track(name, props);
  }
  if (posthogInitialized) {
    posthog.capture(name, props);
  }
};
