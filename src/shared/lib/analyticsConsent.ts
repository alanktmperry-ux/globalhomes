import posthog from 'posthog-js';

const STORAGE_KEY = 'listhq-cookie-consent';

export type ConsentValue = 'accepted' | 'declined' | null;

export function getConsent(): ConsentValue {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'declined') return v;
    return null;
  } catch {
    return null;
  }
}

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  try {
    posthog.init('phc_t5GbsNYF3Qb7xPpxK8hMVKMv4GYvvrJwS5KNLKWBbvTk', {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
    });
    initialized = true;
  } catch {
    // Silently ignore — analytics should never break the app
  }
}
