import { BookOpen, ExternalLink } from 'lucide-react';

const links = [
  { label: 'ListHQ Help Centre', href: '/help', desc: 'Public knowledge base for agents & buyers.' },
  { label: 'Agent Help', href: '/help/agents', desc: 'Onboarding, listings, billing.' },
  { label: 'Property Manager Help', href: '/help/property-managers', desc: 'Rent roll, tenancies, trust accounting.' },
  { label: 'Vendor Help', href: '/help/vendors', desc: 'Vendor portal, reports, signing.' },
];

export default function AdminHelpPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <BookOpen size={20} className="text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Admin Help</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Quick references and links for platform operators.
      </p>
      <div className="grid gap-3">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-border bg-card p-4 hover:bg-accent/50 transition flex items-start justify-between gap-3"
          >
            <div>
              <p className="font-semibold text-foreground">{l.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
            </div>
            <ExternalLink size={16} className="text-muted-foreground shrink-0 mt-1" />
          </a>
        ))}
      </div>
    </div>
  );
}
