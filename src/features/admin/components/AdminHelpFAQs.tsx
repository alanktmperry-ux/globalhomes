import { useMemo, useState } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface FAQ {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  items: FAQ[];
}

const SECTIONS: FAQSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'How do I log in as admin?',
        a: 'Go to /admin/login, enter your admin email and password. Only authorised admin email addresses can access this panel.',
      },
      {
        q: 'Where is the admin panel?',
        a: 'Navigate directly to /admin after logging in. There is no link from the public homepage — this is intentional for security.',
      },
      {
        q: 'What is the difference between admin and support access?',
        a: 'Admin has full access including billing, user deletion, and impersonation. Support staff see a limited view without financial data.',
      },
    ],
  },
  {
    title: 'Command Centre metrics',
    items: [
      {
        q: 'What is MRR?',
        a: 'Monthly Recurring Revenue — the total subscription revenue collected each month from all paid agents.',
      },
      {
        q: 'What is ARR?',
        a: 'Annual Recurring Revenue — MRR multiplied by 12. Represents the annualised value of current subscriptions.',
      },
      {
        q: 'What is ARPU?',
        a: 'Average Revenue Per User — MRR divided by the number of paid agents. Shows the average value of each paying customer.',
      },
      {
        q: 'What is the churn rate?',
        a: 'The percentage of paid agents who cancelled or lapsed their subscription this month. A healthy churn rate is under 5%. Above 5% needs attention.',
      },
      {
        q: 'What is Revenue at Risk?',
        a: 'The estimated monthly revenue from agents whose payments have failed. These agents need to be contacted or their accounts will lock.',
      },
      {
        q: 'What are At-Risk Agents?',
        a: 'Agents who have not logged in for 14 or more days. These agents may be about to churn and should receive a personal outreach email.',
      },
      {
        q: 'What does LTV mean?',
        a: 'Lifetime Value — the estimated total revenue from an average agent before they churn. Calculated as ARPU divided by churn rate.',
      },
    ],
  },
  {
    title: 'Managing Users',
    items: [
      {
        q: 'How do I ban a user?',
        a: 'Go to the Users tab, find the user, and click the Ban button. Banned users cannot log in until unbanned.',
      },
      {
        q: 'How do I delete a user permanently?',
        a: 'Click the Delete (trash) icon on any user in the Users tab. Agent deletion removes all their data including listings, trust accounts, and contacts. This cannot be undone.',
      },
      {
        q: 'How do I impersonate an agent to see what they see?',
        a: 'Click the Impersonate button on any agent in the Users or Command Centre. An orange banner will appear — click Exit to return to your admin view.',
      },
      {
        q: "How do I change an agent's subscription plan?",
        a: 'In the Users tab, click the Settings icon next to any agent to adjust their plan, listing limit, and seat count.',
      },
    ],
  },
  {
    title: 'Partners & Brokers',
    items: [
      {
        q: 'What is the difference between a Partner and a Mortgage Broker?',
        a: 'Partners are trust accountants and service providers linked to agencies. Mortgage brokers operate independently via their own portal at /broker/portal.',
      },
      {
        q: 'How do I verify a partner?',
        a: 'In the Users tab, filter by Partners. Click the Shield icon next to an unverified partner to approve them. Verified partners can accept agency invitations.',
      },
      {
        q: 'How do I see how many partners and brokers have signed up?',
        a: 'The Command Centre shows live counts for Trust Accountants, Mortgage Brokers, and Pending Verification under the Partners & Brokers section.',
      },
    ],
  },
  {
    title: 'Maintenance Contractors',
    items: [
      {
        q: 'Do maintenance contractors need a login?',
        a: 'No. Each contractor gets a unique portal link (e.g. yourdomain.com/supplier/portal?token=...). You copy this link and send it to them via email or SMS — no account needed.',
      },
      {
        q: 'How do I add a new contractor?',
        a: 'Go to the Contractors tab in the admin panel. Click Add Contractor, fill in their details, and copy the generated portal link to send to them.',
      },
      {
        q: 'How do I deactivate a contractor?',
        a: 'In the Contractors tab, click the Deactivate button next to the contractor. Their portal link will stop working immediately.',
      },
    ],
  },
  {
    title: 'Common Tasks (step-by-step)',
    items: [
      {
        q: 'How do I approve a new agent application?',
        a: 'Admin panel → Agent Approval tab → review the application → click Approve or Reject.',
      },
      {
        q: 'How do I extend a grace period for an agent whose payment failed?',
        a: 'Users tab → find the agent (shown with Payment Failed badge) → click the Calendar icon → pick a date → Save.',
      },
      {
        q: 'How do I send a bulk email to all agents?',
        a: 'Go to the Communications tab → select your audience → choose a template or write a message → Send.',
      },
      {
        q: 'How do I check if the platform is healthy?',
        a: 'The Command Centre refreshes every 5 minutes. Check the Attention Required cards at the top — any red items need immediate action.',
      },
    ],
  },
];

function FAQItem({ item, defaultOpen = false }: { item: FAQ; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 py-3 text-left hover:text-primary transition-colors"
      >
        <span className="text-sm text-foreground">{item.q}</span>
        <ChevronDown
          size={16}
          className={cn(
            'mt-0.5 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100 pb-3' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminHelpFAQs() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [query]);

  const totalResults = filtered.reduce((sum, s) => sum + s.items.length, 0);
  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <HelpCircle size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Help &amp; FAQs</h2>
          <p className="text-xs text-muted-foreground">
            How to use the admin panel, what each metric means, and step-by-step guides.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions and answers…"
          className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {totalResults === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">No results found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term, or clear the search to browse all topics.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card">
              <header className="px-5 pt-4 pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
              </header>
              <div className="px-5">
                {section.items.map((item, idx) => (
                  <FAQItem
                    key={item.q}
                    item={item}
                    defaultOpen={isSearching || (filtered.length === 1 && idx === 0)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
