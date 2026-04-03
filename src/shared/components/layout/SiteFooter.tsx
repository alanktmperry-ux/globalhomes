import { Globe, Instagram, Linkedin, Twitter, ShieldCheck, Scale, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DarkModeToggle } from './DarkModeToggle';
import { useConsent } from '@/shared/components/CookieConsent';

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Search', to: '/' },
  { label: 'Saved', to: '/saved' },
  { label: 'Stamp Duty Calculator', to: '/stamp-duty-calculator' },
  { label: 'Profile', to: '/profile' },
];

const legalLinks = [
  { label: 'About', to: '/for-agents' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Agent Login', to: '/agents/login' },
  { label: 'Partner Portal', to: '/partner/login' },
  { label: 'Contact', to: 'mailto:support@listhq.com.au' },
];

const supportLinks = [
  { label: 'Help Centre', to: '/help' },
  { label: 'FAQ', to: '/help/faq' },
  { label: 'Contact Us', to: '/help/contact' },
];

const socialLinks = [
  { icon: Instagram, href: 'https://instagram.com/listhq', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/listhq', label: 'LinkedIn' },
  { icon: Twitter, href: 'https://x.com/listhq', label: 'Twitter' },
];

const complianceBadges = [
  {
    icon: ShieldCheck,
    title: 'Trust Account Compliant',
    description: 'All deposits held in auditable trust accounts per state regulations.',
  },
  {
    icon: Scale,
    title: 'Licensed Agents Only',
    description: 'Every agent is licence-verified before listing on the platform.',
  },
  {
    icon: FileCheck,
    title: 'Digital Audit Trail',
    description: 'Full compliance trail from lead capture through to settlement.',
  },
];

export function SiteFooter() {
  const { resetConsent } = useConsent();
  return (
    <footer className="bg-card border-t border-border pb-20 md:pb-0">
      {/* Compliance banner */}
      <div className="border-b border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {complianceBadges.map((badge) => (
              <div key={badge.title} className="flex items-start gap-3">
                <div className="mt-0.5 w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <badge.icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{badge.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
              <Globe size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground tracking-tight">
              ListHQ
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <DarkModeToggle />
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Navigate</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Legal &amp; Compliance</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  {link.to.startsWith('mailto:') ? (
                    <a href={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Popular Suburbs</h4>
            <ul className="space-y-2">
              {[
                { name: 'Surry Hills', state: 'nsw', slug: 'surry-hills' },
                { name: 'St Kilda', state: 'vic', slug: 'st-kilda' },
                { name: 'New Farm', state: 'qld', slug: 'new-farm' },
                { name: 'Cottesloe', state: 'wa', slug: 'cottesloe' },
                { name: 'Bondi', state: 'nsw', slug: 'bondi' },
                { name: 'Fitzroy', state: 'vic', slug: 'fitzroy' },
              ].map((s) => (
                <li key={s.slug}>
                  <Link to={`/suburb/${s.state}/${s.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Connect</h4>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider + compliance fine print */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            ListHQ © {new Date().getFullYear()} · ABN 00 000 000 000
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground text-center md:text-right max-w-md leading-relaxed">
              ListHQ operates under Australian property law. All trust funds are held in compliance with state fair trading regulations.
            </p>
            <button
              onClick={resetConsent}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 whitespace-nowrap transition-colors"
            >
              Reset cookie preferences
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
