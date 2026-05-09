import { useEffect, useState } from 'react';

const STORAGE_KEY = 'listhq_beta_access';
const GRANTED_VALUE = 'granted';

export const BETA_PASSWORD = 'listhq2026beta';

export function useBetaAccess() {
  const isDev = import.meta.env.MODE === 'development';

  const [granted, setGranted] = useState<boolean>(() => {
    if (isDev) return true;
    try {
      return localStorage.getItem(STORAGE_KEY) === GRANTED_VALUE;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDev && !granted) setGranted(true);
  }, [isDev, granted]);

  const grant = () => {
    try {
      localStorage.setItem(STORAGE_KEY, GRANTED_VALUE);
    } catch {
      /* ignore */
    }
    setGranted(true);
  };

  return { granted, grant, isDev };
}
