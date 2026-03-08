import { Globe, Instagram, Linkedin, Twitter, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DarkModeToggle } from './DarkModeToggle';

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Search', to: '/' },
  { label: 'Saved', to: '/saved' },
  { label: 'Profile', to: '/profile' },
];

const legalLinks = [
  { label: 'About', to: '#' },
  { label: 'Privacy', to: '#' },
  { label: 'Terms', to: '#' },
  { label: 'Agent Login', to: '/agents/login' },
  { label: 'Contact', to: '#' },
];

const socialLinks = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Twitter, href: '#', label: 'Twitter' },
];

export function SiteFooter() {
  return (
    <footer className="bg-card border-t border-border pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
              <Globe size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground tracking-tight">
              World Property Pulse
            </span>
          </div>

          {/* Dark mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <DarkModeToggle />
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {/* Navigation */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Navigate</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="col-span-2 md:col-span-1">
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

        {/* Divider */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            World Property Pulse © {new Date().getFullYear()}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart size={12} className="text-destructive fill-destructive" /> for global property seekers
          </p>
        </div>
      </div>
    </footer>
  );
}
