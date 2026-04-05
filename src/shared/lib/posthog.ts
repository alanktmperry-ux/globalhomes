/**
 * Safe PostHog analytics wrapper.
 * All calls are guarded so the app never breaks if PostHog fails to load.
 */

type PosthogProperties = Record<string, unknown>;

export function capture(event: string, properties?: PosthogProperties) {
  try {
    if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
      (window as any).posthog.capture(event, properties);
    }
  } catch {
    // Silently ignore — analytics should never break the app
  }
}

export function identify(userId: string, traits?: PosthogProperties) {
  try {
    if (typeof window !== 'undefined' && (window as any).posthog?.identify) {
      (window as any).posthog.identify(userId, traits);
    }
  } catch {}
}
