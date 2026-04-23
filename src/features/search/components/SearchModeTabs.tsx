import { NavLink } from 'react-router-dom';
import { Home, Key, Tag } from 'lucide-react';
import { useI18n } from '@/shared/lib/i18n';

/**
 * Top-of-page mode switcher for property search.
 * Lets buyers/renters jump between Buy, Rent, and Sold without going home first.
 */
export function SearchModeTabs() {
  const { t } = useI18n();

  const tabs = [
    { to: '/buy', label: t('Buy'), icon: Home },
    { to: '/rent', label: t('Rent'), icon: Key },
    { to: '/buy?sold=1', label: t('Sold'), icon: Tag, matchExact: true },
  ];

  return (
    <div
      role="tablist"
      aria-label={t('Search mode')}
      className="inline-flex rounded-full bg-muted p-1 shadow-sm border border-border"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          role="tab"
          className={({ isActive }) =>
            [
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')
          }
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
