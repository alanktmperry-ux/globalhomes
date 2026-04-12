import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Twitter } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer style={{ background: '#020817' }} className="relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.5), transparent)' }} />

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white">L</div>
              <span className="text-[15px] font-semibold text-white tracking-tight">ListHQ</span>
            </div>
            <p className="text-[13px] leading-relaxed mb-5 max-w-[200px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              List once. Speak every language. Australia's AI-powered property platform.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Instagram, href: 'https://instagram.com/listhq', label: 'Instagram' },
                { icon: Linkedin, href: 'https://linkedin.com/company/listhq', label: 'LinkedIn' },
                { icon: Twitter, href: 'https://x.com/listhq', label: 'Twitter' },
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
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Platform</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Search Properties', to: '/' },
                { label: 'Stamp Duty Calculator', to: '/stamp-duty-calculator' },
                { label: 'Browse Properties', to: '/buy' },
                { label: 'Voice Search', to: '/' },
                { label: 'Agent Portal', to: '/agents/login' },
                { label: 'Partner Portal', to: '/partner/login' },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                    onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal col */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Legal</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Privacy Policy', to: '/privacy' },
                { label: 'Terms of Service', to: '/terms' },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                    onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support col */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Support</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Help Centre', to: '/help' },
                { label: 'Contact Us', to: 'mailto:support@listhq.com.au', external: true },
                { label: 'Agent Login', to: '/agents/login' },
              ].map(link => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-[13px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pt-6">
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            ListHQ © {new Date().getFullYear()} · ABN 65 608 526 781
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Licensed agents only · Trust account compliant · Australian property law
          </span>
        </div>

      </div>
    </footer>
  );
}
