import { useEffect } from 'react';

/**
 * Sets document.title for internal/dashboard pages.
 * For public/SEO pages prefer react-helmet-async.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ListHQ` : 'ListHQ';
    return () => {
      document.title = 'ListHQ';
    };
  }, [title]);
}
