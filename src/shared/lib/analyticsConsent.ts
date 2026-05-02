import posthog from 'posthog-js';

export const CONSENT_KEY = 'listhq-cookie-consent';
let posthogInitialised = false;

export function getConsent(): 'accepted' | 'declined' | null {
  try { return localStorage.getItem(CONSENT_KEY) as 'accepted' | 'declined' | null; } catch { return null; }
}

export function initPostHog() {
  if (posthogInitialised) return;
  posthogInitialised = true;
  posthog.init('phc_t5GbsNYF3Qb7xPpxK8hMVKMv4GYvvrJwS5KNLKWBbvTk', {
    api_host: 'https://eu.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  });
}
