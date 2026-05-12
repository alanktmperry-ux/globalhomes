import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageTitle } from '@/lib/usePageTitle';
import { useTranslation } from '@/shared/lib/i18n';

const NotFound = () => {
  const { t } = useTranslation();
  usePageTitle('Page Not Found');
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('errors.notFound.heading')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('errors.notFound.title')}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t('errors.notFound.goHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
