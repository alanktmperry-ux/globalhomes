/**
 * Safe PostHog analytics wrapper.
 * Delegates to the posthog-js SDK initialised in src/main.tsx.
 * All calls are guarded so the app never breaks if PostHog fails to load.
 */
import posthog from 'posthog-js';

type PosthogProperties = Record<string, unknown>;

export function capture(event: string, properties?: PosthogProperties) {
  try {
    posthog.capture(event, properties);
  } catch {
    // Silently ignore — analytics should never break the app
  }
}

export function identify(userId: string, traits?: PosthogProperties) {
  try {
    posthog.identify(userId, traits);
  } catch {}
}
