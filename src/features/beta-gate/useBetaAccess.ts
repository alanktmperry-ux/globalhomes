import { useEffect, useState } from 'react';

const STORAGE_KEY = 'listhq_beta_access';
const GRANTED_VALUE = 'granted';

export const BETA_PASSWORD = 'listhq2026beta';

export function useBetaAccess() {
  const [granted, setGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === GRANTED_VALUE;
    } catch {
      return false;
    }
  });

  const grant = () => {
    try {
      localStorage.setItem(STORAGE_KEY, GRANTED_VALUE);
    } catch {
      /* ignore */
    }
    setGranted(true);
  };

  return { granted, grant, isDev: false };
}
