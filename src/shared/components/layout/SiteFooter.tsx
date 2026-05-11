import { Link } from 'react-router-dom';
import { Instagram, Youtube, Linkedin } from 'lucide-react';

const GRAD = 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)';

const COLUMNS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Search', to: '/' },
      { label: 'Translate', to: '/tools/translate' },
      { label: 'Find an Agent', to: '/agents' },
      { label: 'Pricing', to: '/#pricing' },
    ],
  },
  {
    title: 'For Agents',
    links: [
      { label: 'Voice listing', to: '/voice' },
      { label: 'Halo Board', to: '/halo' },
      { label: 'Trust accounting', to: '/trust' },
      { label: 'Migrate', to: '/migrate' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Press', to: '/press' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'Trust compliance', to: '/compliance' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

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
              Australia's multilingual property platform. Listings in 20 languages. AI
              translation. Built for the way Australia actually looks.
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
            <div key={col.title}>
              <h4 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.to} className="block text-[14px] text-white/80 no-underline hover:text-white transition-colors">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className="block text-[14px] text-white/80 no-underline hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
                {col.title === 'Legal' && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        try { localStorage.removeItem('listhq-cookie-consent'); } catch { /* ignore */ }
                        window.location.reload();
                      }}
                      className="block text-[14px] text-white/80 hover:text-white transition-colors bg-transparent border-0 p-0 cursor-pointer text-left"
                    >
                      Cookie preferences
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 flex justify-between items-center text-[12px] text-white/40 flex-wrap gap-3">
          <span>© {year} ListHQ · All rights reserved.</span>
          <span>ABN 12 345 678 901</span>
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
