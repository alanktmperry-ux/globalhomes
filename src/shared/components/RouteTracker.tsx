import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { capture } from '@/shared/lib/posthog';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function RouteTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const path = pathname + search;
    try { capture('$pageview', { path }); } catch { /* ignore */ }
    try { window.gtag?.('event', 'page_view', { page_path: path }); } catch { /* ignore */ }
  }, [pathname, search]);
  return null;
}
