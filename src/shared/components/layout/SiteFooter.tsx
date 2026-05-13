import { Link } from 'react-router-dom';
import { Instagram, Youtube, Linkedin } from 'lucide-react';
import { useTranslation } from '@/shared/lib/i18n';

const GRAD = 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)';

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const COLUMNS: { titleKey: string; links: { labelKey: string; to: string; external?: boolean }[] }[] = [
    {
      titleKey: 'layout.footer.sections.platform',
      links: [
        { labelKey: 'layout.footer.links.search', to: '/' },
        { labelKey: 'layout.footer.links.translate', to: '/tools/translate' },
        { labelKey: 'layout.footer.links.findAgent', to: '/agents' },
        { labelKey: 'layout.footer.links.pricing', to: '/for-agents/pricing' },
      ],
    },
    {
      titleKey: 'layout.footer.sections.forAgents',
      links: [
        { labelKey: 'layout.footer.links.voiceListing', to: '/voice' },
        { labelKey: 'layout.footer.links.halo', to: '/halo' },
        { labelKey: 'layout.footer.links.trustAccounting', to: '/trust' },
        { labelKey: 'layout.footer.links.migrate', to: '/migrate' },
      ],
    },
    {
      titleKey: 'layout.footer.sections.company',
      links: [
        { labelKey: 'layout.footer.links.about', to: '/about' },
        { labelKey: 'layout.footer.links.careers', to: '/careers' },
        { labelKey: 'layout.footer.links.press', to: '/press' },
        { labelKey: 'layout.footer.links.contact', to: '/contact' },
      ],
    },
    {
      titleKey: 'layout.footer.sections.legal',
      links: [
        { labelKey: 'layout.footer.links.privacy', to: '/privacy' },
        { labelKey: 'layout.footer.links.terms', to: '/terms' },
        { labelKey: 'layout.footer.links.compliance', to: '/compliance' },
      ],
    },
  ];

  return (
    <footer className="bg-[#0a0f1e] text-white px-6 md:px-8 pt-[60px] pb-8 border-t border-white/10">
      <div className="max-w-[1480px] mx-auto">
        <div
          className="footer-top grid gap-10 pb-12 border-b border-white/10"
          style={{ gridTemplateColumns: '1.5fr repeat(4, 1fr)' }}
        >
          {/* Logo block */}
          <div>
            <Link
              to="/"
              className="inline-block text-[22px] font-extrabold uppercase tracking-[0.18em]"
              style={{
                background: GRAD,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              ListHQ
            </Link>
            <p className="text-[13px] text-white/55 max-w-[280px] leading-[1.55] mt-4">
              {t('layout.footer.tagline')}
            </p>
            <div className="flex gap-2 mt-5">
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/15 text-white/55 transition-colors hover:text-white hover:border-white/40"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.titleKey}>
              <h4 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 mb-4">
                {t(col.titleKey)}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.labelKey}>
                    <Link to={l.to} className="block text-[14px] text-white/80 no-underline hover:text-white transition-colors">
                      {t(l.labelKey)}
                    </Link>
                  </li>
                ))}
                {col.titleKey === 'layout.footer.sections.legal' && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        try { localStorage.removeItem('listhq-cookie-consent'); } catch { /* ignore */ }
                        window.location.reload();
                      }}
                      className="block text-[14px] text-white/80 hover:text-white transition-colors bg-transparent border-0 p-0 cursor-pointer text-left"
                    >
                      {t('layout.footer.links.cookiePreferences')}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 flex flex-col gap-3 text-[12px] text-white/40">
          <p className="text-white/50 leading-relaxed max-w-3xl">
            {t('layout.footer.legal.acknowledgement')}
          </p>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <span>{t('layout.footer.legal.copyright', { year })}</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .footer-top { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </footer>
  );
}
