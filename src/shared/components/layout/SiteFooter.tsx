import { Link } from 'react-router-dom';
import { Instagram, Youtube, Linkedin, Globe } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n';

export function SiteFooter() {
  const { t } = useTranslation();

  const platformLinks = [
    { key: 'footer.link.searchProperties', to: '/' },
    { key: 'footer.link.findAgent', to: '/agents' },
    { key: 'footer.link.stampDuty', to: '/stamp-duty-calculator' },
    { key: 'footer.link.browseProperties', to: '/buy' },
    { key: 'footer.link.voiceSearch', to: '/' },
    { key: 'footer.link.agentPortal', to: '/agents/login' },
    { key: 'footer.link.partnerPortal', to: '/partner/login' },
    { key: 'footer.link.brokerPortal', to: '/broker/login' },
  ];

  const legalLinks = [
    { key: 'footer.link.terms', to: '/terms' },
    { key: 'footer.link.privacy', to: '/privacy' },
  ];

  const supportLinks = [
    { key: 'footer.link.helpCentre', to: '/help', external: false },
    { key: 'footer.link.contact', to: 'mailto:support@listhq.com.au', external: true },
    { key: 'footer.link.agentLogin', to: '/agents/login', external: false },
    { key: 'footer.link.brokerLogin', to: '/broker/login', external: false },
  ];

  return (
    <footer style={{ background: '#020817' }} className="relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.5), transparent)' }} />

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center shrink-0">
                <Globe size={18} className="text-primary-foreground" />
              </div>
              <span className="text-[15px] font-semibold text-white tracking-tight">ListHQ</span>
            </div>
            <p className="text-[13px] leading-relaxed mb-5 max-w-[200px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('footer.tagline')}
            </p>
            <div className="flex gap-2">
              {[
                { icon: Instagram, href: 'https://www.instagram.com/list_hq', label: 'Instagram' },
                { icon: Linkedin, href: 'https://www.linkedin.com/company/listhq', label: 'LinkedIn' },
                { icon: Youtube, href: 'https://www.youtube.com/@ListHQ-u8w', label: 'YouTube' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#3b82f6'; (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Platform col */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{t('footer.col.platform')}</p>
            <ul className="space-y-2.5">
              {platformLinks.map(link => (
                <li key={link.key}>
                  <Link to={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                    onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal col */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{t('footer.col.legal')}</p>
            <ul className="space-y-2.5">
              {legalLinks.map(link => (
                <li key={link.key}>
                  <Link to={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                    onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.removeItem('listhq-cookie-consent'); } catch { /* ignore */ }
                    window.location.reload();
                  }}
                  className="text-[13px] transition-colors text-start"
                  style={{ color: 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                >
                  {t('footer.link.cookiePrefs')}
                </button>
              </li>
            </ul>
          </div>

          {/* Support col */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{t('footer.col.support')}</p>
            <ul className="space-y-2.5">
              {supportLinks.map(link => (
                <li key={link.key}>
                  {link.external ? (
                    <a href={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                    >
                      {t(link.key)}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                    >
                      {t(link.key)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </span>
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {t('footer.licence')}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('footer.disclaimer')}
          </p>
        </div>

      </div>
    </footer>
  );
}
