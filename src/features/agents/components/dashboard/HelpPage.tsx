import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Rocket, CreditCard, Home, Users, Landmark, Shield, Wrench,
} from 'lucide-react';

interface FaqSection {
  icon: React.ElementType;
  title: string;
  items: { q: string; a: string }[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    icon: Rocket,
    title: 'Getting Started',
    items: [
      {
        q: 'How do I create my agent account?',
        a: 'Click "For Agents" on the homepage, then select your plan and complete registration. You\'ll need a valid email address and Australian real estate licence number. Once registered, your account enters a brief verification period before full activation.',
      },
      {
        q: 'How do I add my first property listing?',
        a: 'From your dashboard, go to Listings → New Listing. Fill in the property details, upload photos, and set your price. Listings go live immediately once saved.',
      },
      {
        q: 'How do I connect my agency?',
        a: 'Go to Dashboard → Agencies and either create a new agency or join an existing one using an invite code from your principal.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Subscriptions & Billing',
    items: [
      {
        q: 'What plans are available?',
        a: 'ListHQ offers Demo, Basic, and Pro plans. Demo gives you limited access to explore the platform. Basic and Pro unlock full listing and lead management features. Visit your Billing page for current pricing.',
      },
      {
        q: 'How do I upgrade or change my plan?',
        a: 'Go to Dashboard → Billing and select a new plan. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Dashboard → Billing → Cancel Subscription. You\'ll retain access until the end of your paid period. Your data is preserved for 30 days after cancellation.',
      },
      {
        q: 'Why was my payment declined?',
        a: 'Check that your card details are up to date in Billing settings. If the problem persists, contact your bank or reach out to support@listhq.com.au.',
      },
    ],
  },
  {
    icon: Home,
    title: 'Listings & Properties',
    items: [
      {
        q: 'How many listings can I have active at once?',
        a: 'This depends on your plan. Basic plans include up to 10 active listings. Pro plans have no listing limit. Your current allowance is shown at the top of your Listings page.',
      },
      {
        q: 'Can I mark a listing as off-market or pre-market?',
        a: 'Yes. When creating or editing a listing, toggle the "Pre-Market" option. Pre-market listings are visible only to registered buyers who have saved a matching search.',
      },
      {
        q: 'How do I deactivate a listing?',
        a: 'Open the listing from Dashboard → Listings and click "Deactivate". Note: listings with active tenancies cannot be deactivated until the tenancy is resolved.',
      },
      {
        q: 'Can I upload my own property photos?',
        a: 'Yes. You can upload multiple photos per listing. We recommend at least 8 photos in landscape orientation at 1600px wide or larger for best results.',
      },
    ],
  },
  {
    icon: Users,
    title: 'Leads & CRM',
    items: [
      {
        q: 'Where do my leads come from?',
        a: 'Leads are generated when buyers submit enquiries on your listings, use voice search that matches your properties, or contact you via your public agent profile.',
      },
      {
        q: 'How do I manage my lead pipeline?',
        a: 'Go to Dashboard → Pipeline to view all leads in a Kanban-style board. Drag leads between stages (New, Contacted, Qualified, Offer, Closed) to track progress.',
      },
      {
        q: 'Can I set reminders or tasks for leads?',
        a: 'Yes. Open any lead or contact and use the Tasks tab to add follow-up reminders with due dates and notes.',
      },
      {
        q: 'How do I export my contacts?',
        a: 'Go to Dashboard → Contacts and use the Export button to download a CSV of all your contacts.',
      },
    ],
  },
  {
    icon: Landmark,
    title: 'Trust Accounting',
    items: [
      {
        q: 'Does ListHQ manage trust funds?',
        a: 'No. ListHQ provides trust accounting record-keeping tools only. All trust funds are held and managed by you in accordance with the Estate Agents Act 1980 (Vic) and applicable regulations. ListHQ does not hold, process, or guarantee any trust money.',
      },
      {
        q: 'How do I record a trust receipt?',
        a: 'Go to Dashboard → Trust → Trust Ledger → New Receipt. Enter the amount, payer details, and property reference. All entries are timestamped and auditable.',
      },
      {
        q: 'Can I reconcile my trust account in ListHQ?',
        a: 'Yes. Dashboard → Trust → Reconciliation provides a monthly reconciliation workflow. You\'ll need to match entries against your bank statement.',
      },
    ],
  },
  {
    icon: Shield,
    title: 'Privacy & Data',
    items: [
      {
        q: 'Does ListHQ sell my data?',
        a: 'No. We do not sell personal information to third parties. See our Privacy Policy for full details.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Dashboard → Settings → Account and select "Delete Account". This permanently removes your data within 30 days. Active subscriptions must be cancelled first.',
      },
      {
        q: 'How do I manage cookie preferences?',
        a: 'Click "Without Maps" on the cookie banner to use the platform without Google Maps data collection, or visit Settings → Privacy to update your preference at any time.',
      },
    ],
  },
  {
    icon: Wrench,
    title: 'Technical Support',
    items: [
      {
        q: 'The platform isn\'t loading correctly. What should I do?',
        a: 'Try clearing your browser cache and reloading. ListHQ works best on the latest versions of Chrome, Safari, Firefox, and Edge. If the issue persists, email support@listhq.com.au with a description and screenshot.',
      },
      {
        q: 'How do I report a bug?',
        a: 'Email support@listhq.com.au with the subject line "Bug Report" and include what you were doing, what you expected to happen, and what actually happened. Screenshots are helpful.',
      },
      {
        q: 'Who do I contact for urgent support?',
        a: 'Email support@listhq.com.au. We aim to respond to all queries within one business day (AEST).',
      },
    ],
  },
];

const HelpPage = () => (
  <div className="space-y-8 max-w-3xl mx-auto py-8 px-4">
    <div>
      <h1 className="text-3xl font-bold text-foreground">Help & FAQ</h1>
      <p className="text-muted-foreground mt-1">
        Find answers to the most common questions about ListHQ.
      </p>
    </div>

    {FAQ_SECTIONS.map((section) => {
      const Icon = section.icon;
      return (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="h-5 w-5 text-primary" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {section.items.map((item, idx) => (
                <AccordionItem key={idx} value={`${section.title}-${idx}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      );
    })}

    <p className="text-center text-sm text-muted-foreground pb-4">
      Can't find what you're looking for? Email{' '}
      <a href="mailto:support@listhq.com.au" className="text-primary hover:underline">
        support@listhq.com.au
      </a>{' '}
      — we respond within one business day.
    </p>
  </div>
);

export default HelpPage;
