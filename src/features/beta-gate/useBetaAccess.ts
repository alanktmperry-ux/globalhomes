import { useEffect, useState } from 'react';

const STORAGE_KEY = 'listhq_beta_access_v2';
const LEGACY_STORAGE_KEYS = ['listhq_beta_access'];
const GRANTED_VALUE = 'granted';

export const BETA_PASSWORD = 'listhq2026beta100%';

export function useBetaAccess() {
  const [granted, setGranted] = useState<boolean>(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      return localStorage.getItem(STORAGE_KEY) === GRANTED_VALUE;
    } catch {
      return false;
    }
  });

  const grant = () => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(STORAGE_KEY, GRANTED_VALUE);
    } catch {
      /* ignore */
    }
    setGranted(true);
  };

  return { granted, grant, isDev: false };
}
