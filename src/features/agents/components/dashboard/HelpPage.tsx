import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Search, ChevronRight } from 'lucide-react';

/* ─── HOW-TO GUIDES ─── */
interface Guide {
  emoji: string;
  title: string;
  description: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    emoji: '🚀', title: 'Setting Up Your Account',
    description: 'Get your agent profile live and ready to receive leads in minutes.',
    steps: [
      'Sign up using your email or Google account, then choose "I\'m an Agent" during onboarding.',
      'Complete your profile — add your headshot, license number, agency name, and a short bio that highlights your specialisation.',
      'Set your service areas on the Territory page so buyers searching those suburbs see your listings first.',
      'Connect your subscription under Billing to unlock unlimited listings and premium features.',
      'You\'re live! Head to the Dashboard to see your performance stats and start adding listings.',
    ],
  },
  {
    emoji: '🏠', title: 'Adding and Publishing a Listing',
    description: 'Walk through every step from address entry to going live on the marketplace.',
    steps: [
      'Click "New Listing" in the sidebar or the green + button on the Dashboard.',
      'Enter the property address — our system will auto-fill suburb, state and coordinates.',
      'Fill in the basics: price, bedrooms, bathrooms, parking, land size and property type.',
      'Upload high-quality photos. The first image becomes the hero — drag to reorder.',
      'Optionally record a 30-second voice note to give buyers a personal touch.',
      'Review the preview, choose visibility (public or GlobalHomes First network only), then hit Publish.',
    ],
  },
  {
    emoji: '🤫', title: 'Using GlobalHomes First — Pre-Market',
    description: 'Share off-market listings exclusively with trusted agents before going public.',
    steps: [
      'When publishing a listing, select "GlobalHomes First" as the visibility option.',
      'Your listing is shared only with verified agents in the Off-Market Network — not public buyers.',
      'Set a referral split percentage to incentivise cooperating agents to bring qualified buyers.',
      'Monitor interest and enquiries on the listing detail page under the Buyer Leads tab.',
      'When you\'re ready, flip the listing to public with one click — all lead history is preserved.',
    ],
  },
  {
    emoji: '👥', title: 'Managing Leads and CRM',
    description: 'Keep track of every buyer and seller with the built-in CRM and pipeline board.',
    steps: [
      'All voice leads and contact-form enquiries land automatically in your Contacts list.',
      'Tag contacts as Buyer, Seller, Landlord or Tenant and assign a ranking (Hot / Warm / Cold).',
      'Use the Pipeline board to drag contacts through stages: New → Qualified → Inspected → Offer → Exchanged → Settled.',
      'Log activities (calls, emails, inspections) against each contact to build a full history.',
      'Import existing contacts via CSV from the Contacts page — map columns and go.',
    ],
  },
  {
    emoji: '📅', title: 'Running an Open Home — Inspection Day Mode',
    description: 'Streamline your open-home workflow from QR sign-in to follow-up.',
    steps: [
      'Navigate to Inspection Day in the sidebar before your open home.',
      'Select the listing you\'re inspecting — the page shows the property details and a live attendee list.',
      'Visitors scan the QR code at the door or you add them manually — their details are captured instantly.',
      'After the inspection, all attendees appear in your CRM with the tag "Inspection Attendee".',
      'Use the one-click follow-up to send a thank-you message or request feedback.',
    ],
  },
  {
    emoji: '💰', title: 'Trust Accounting',
    description: 'Record deposits, track balances, and generate trust statements for compliance.',
    steps: [
      'Go to Financials in the sidebar to access the Trust Accounting module.',
      'Record incoming deposits (e.g. holding deposits, rental bonds) against a property or contact.',
      'Each transaction is logged with a receipt number, date, amount, and category.',
      'Use the Trust Ledger page to view a running balance and filter by property or date range.',
      'Generate and download trust statements for audits or end-of-month reconciliation.',
      'The Bank Reconciliation page lets you match bank entries against trust records.',
    ],
  },
  {
    emoji: '💸', title: 'Commission Calculator',
    description: 'Instantly calculate your take-home commission on any sale or lease.',
    steps: [
      'Open Commission Calculator from the sidebar under Business.',
      'Enter the sale price, your commission rate (%), and the agent/agency split.',
      'The calculator shows gross commission, your net share, and GST breakdown.',
      'Adjust the split slider to model different scenarios before negotiating with your principal.',
      'Results update in real time — no need to press a button.',
    ],
  },
  {
    emoji: '🏡', title: 'Settlement Concierge',
    description: 'Track every milestone between exchange and settlement so nothing slips.',
    steps: [
      'Navigate to Settlement Concierge in the sidebar once a property is under contract.',
      'The timeline shows key dates: exchange, finance approval, building inspection, and settlement.',
      'Check off each milestone as it\'s completed — your client and solicitor stay informed.',
      'Add custom tasks (e.g. "Organise pest report") with due dates and assign to team members.',
      'Receive reminders 48 hours before each upcoming deadline.',
    ],
  },
  {
    emoji: '📊', title: 'Understanding Your Dashboard Stats',
    description: 'Learn what each metric means and how to use data to win more listings.',
    steps: [
      'The Dashboard overview shows four key cards: Active Listings, Total Leads, Views, and Contact Clicks.',
      'Views count how many times buyers have seen your listing cards in search results.',
      'Contact Clicks track when a buyer taps "Contact Agent" or submits an enquiry form.',
      'The Analytics page provides deeper charts — views over time, lead sources, and conversion rates.',
      'Use the Reports page to export weekly or monthly performance summaries as PDF.',
    ],
  },
  {
    emoji: '🌟', title: 'Building Your Agent Reputation Score',
    description: 'Understand how the reputation algorithm works and how to improve your score.',
    steps: [
      'Your reputation score is visible on your public profile and is calculated from five factors.',
      'Response time — replying to leads within 1 hour boosts your score significantly.',
      'Review ratings — encourage happy clients to leave a review on your profile.',
      'Listing quality — complete listings with photos, descriptions, and floor plans score higher.',
      'Verification level — upload your license and complete identity checks for a verified badge.',
      'Activity — regular logins, updated listings, and CRM usage show you\'re an active agent.',
    ],
  },
  {
    emoji: '🔐', title: 'Account Security',
    description: 'Protect your account with strong passwords and recovery options.',
    steps: [
      'Use a unique, strong password — at least 12 characters with a mix of letters, numbers, and symbols.',
      'If you forget your password, use the "Forgot Password" link on the login page to receive a reset email.',
      'Keep your registered email address up to date under Settings so you always receive security alerts.',
      'Never share your login credentials with anyone — use the Team feature to grant access to staff.',
      'If you suspect unauthorised access, change your password immediately and contact support.',
    ],
  },
  {
    emoji: '💳', title: 'Managing Your Subscription',
    description: 'Upgrade, downgrade, or cancel your plan from the Billing page.',
    steps: [
      'Go to Billing in the sidebar to see your current plan, usage, and next billing date.',
      'Click "Change Plan" to compare available tiers — Starter, Professional, and Enterprise.',
      'Upgrades take effect immediately; downgrades apply at the end of your current billing cycle.',
      'Update your payment method by clicking the card icon — we accept Visa, Mastercard, and Amex.',
      'To cancel, scroll to the bottom of the Billing page and click "Cancel Subscription". Your data is retained for 90 days.',
    ],
  },
];

/* ─── FAQ ─── */
interface FaqCategory {
  emoji: string;
  title: string;
  items: { q: string; a: string }[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    emoji: '🚀', title: 'Getting Started',
    items: [
      { q: 'How do I create an agent account?', a: 'Click "Sign Up" on the Agent landing page and choose "I\'m an Agent". Complete your profile with your license number, agency, and service areas. You\'ll be ready to list properties within minutes.' },
      { q: 'Is there a free trial?', a: 'Yes — every new agent gets a 14-day free trial of the Professional plan. No credit card is required to start. You can downgrade to the Starter plan at any time.' },
      { q: 'Can I use GlobalHomes as a buyer too?', a: 'Absolutely. Your agent account gives you full access to the buyer search experience as well. You can save properties, set alerts, and browse the marketplace just like any buyer.' },
    ],
  },
  {
    emoji: '🏠', title: 'Listings',
    items: [
      { q: 'How many listings can I have?', a: 'The Starter plan includes up to 5 active listings. Professional and Enterprise plans offer unlimited listings. Check the Billing page for full plan details.' },
      { q: 'Can I edit a listing after publishing?', a: 'Yes. Open the listing from My Listings, make your changes, and hit Save. Updates go live immediately — there\'s no re-approval process for edits.' },
      { q: 'What image formats are supported?', a: 'We accept JPEG, PNG, and WebP images up to 10 MB each. For best results, upload landscape photos at least 1200 px wide. The system auto-optimises images for fast loading.' },
    ],
  },
  {
    emoji: '👥', title: 'Leads & CRM',
    items: [
      { q: 'Where do my leads come from?', a: 'Leads are generated when buyers submit an enquiry on your listing, use the voice search that matches your properties, or scan a QR code at an open home. All leads appear in your CRM automatically.' },
      { q: 'Can I import my existing contacts?', a: 'Yes. Go to Contacts and click "Import CSV". Map your spreadsheet columns to our fields (name, email, phone, type) and import in one click. Duplicates are detected by email address.' },
      { q: 'How does the pipeline board work?', a: 'The pipeline is a kanban-style board with customisable stages. Drag contacts between columns to track their journey from initial enquiry through to settlement. Each move is logged in the contact\'s activity history.' },
    ],
  },
  {
    emoji: '🤝', title: 'GlobalHomes First & Network',
    items: [
      { q: 'What is GlobalHomes First?', a: 'GlobalHomes First is our pre-market network. When you list a property as "GlobalHomes First", it\'s shared exclusively with verified agents before appearing on the public marketplace. This gives sellers a soft launch and agents early access to stock.' },
      { q: 'How do referral splits work?', a: 'When sharing an off-market listing, you set a referral split percentage (e.g. 20%). If a cooperating agent introduces the successful buyer, they receive that percentage of the selling agent\'s commission.' },
      { q: 'Who can see my off-market listings?', a: 'Only agents who are verified members of the GlobalHomes network can see GlobalHomes First listings. Public buyers and unverified agents cannot access them.' },
    ],
  },
  {
    emoji: '📅', title: 'Inspections',
    items: [
      { q: 'How does Inspection Day Mode work?', a: 'Inspection Day Mode is a streamlined interface for running open homes. Select your listing, display a QR code for visitor sign-in, and capture attendee details in real time. All visitors are added to your CRM after the event.' },
      { q: 'Can buyers book private inspections?', a: 'Yes. If you\'ve enabled inspection booking on a listing, buyers can request a time slot directly from the property page. You\'ll receive a notification and can confirm or suggest an alternative.' },
    ],
  },
  {
    emoji: '💰', title: 'Financials & Trust',
    items: [
      { q: 'Is the trust accounting module compliant?', a: 'The trust accounting tools are designed to help you record and track trust transactions. However, compliance requirements vary by state — we recommend using the module alongside your licensed accounting software and consulting your auditor.' },
      { q: 'Can I export trust statements?', a: 'Yes. From the Trust Ledger page, filter by date range or property, then click "Export". Statements are generated as PDF documents suitable for audit purposes.' },
      { q: 'How does bank reconciliation work?', a: 'The Bank Reconciliation page lets you enter or paste your bank statement entries and match them against recorded trust transactions. Matched items are marked green; unmatched items are flagged for review.' },
    ],
  },
  {
    emoji: '💳', title: 'Billing & Plans',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, and American Express. All payments are processed securely through Stripe. You can update your card at any time on the Billing page.' },
      { q: 'Can I cancel at any time?', a: 'Yes. There are no lock-in contracts. Cancel from the Billing page and your plan remains active until the end of the current billing period. Your data is retained for 90 days after cancellation.' },
      { q: 'Do you offer agency-wide plans?', a: 'Yes — the Enterprise plan supports multiple seats under one account with centralised billing. Contact us at sales@everythingeco.com.au for a custom quote tailored to your agency size.' },
    ],
  },
  {
    emoji: '⚙️', title: 'Profile & Settings',
    items: [
      { q: 'How do I update my public profile?', a: 'Go to Profile in the sidebar. You can edit your headshot, bio, specialisation, languages spoken, and social links. Changes are reflected on your public agent page immediately.' },
      { q: 'Can I change my registered email?', a: 'Currently, your login email is set during registration. If you need to change it, please contact support at sales@everythingeco.com.au and we\'ll assist you with the migration.' },
      { q: 'How do I add team members?', a: 'Navigate to Team in the sidebar. Click "Invite Member", enter their email, and choose a role (Agent or Admin). They\'ll receive an invitation email to join your agency workspace.' },
    ],
  },
  {
    emoji: '🏡', title: 'Settlement Concierge',
    items: [
      { q: 'What is the Settlement Concierge?', a: 'It\'s a milestone tracker for the period between exchange and settlement. It lists key dates (finance approval, inspections, settlement) and lets you check them off as they\'re completed, keeping all parties informed.' },
      { q: 'Can I customise the settlement milestones?', a: 'Yes. You can add, remove, or rename milestones to match your state\'s settlement process. Custom tasks can also be assigned to team members with due dates and reminders.' },
    ],
  },
  {
    emoji: '🔧', title: 'Technical & Troubleshooting',
    items: [
      { q: 'The page isn\'t loading properly — what should I do?', a: 'Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R). If the issue persists, clear your browser cache or try a different browser. Our platform works best on the latest versions of Chrome, Safari, Firefox, and Edge.' },
      { q: 'My listing photos aren\'t uploading — why?', a: 'Check that each image is under 10 MB and in JPEG, PNG, or WebP format. If your internet connection is slow, try uploading one image at a time. If the problem continues, email us at sales@everythingeco.com.au with a screenshot.' },
      { q: 'I\'m not receiving email notifications — what\'s wrong?', a: 'First, check your spam or junk folder. Add noreply@globalhomes.com to your contacts. If emails still aren\'t arriving, verify your email address is correct under Settings and ensure notifications are enabled.' },
    ],
  },
];

/* ─── COMPONENTS ─── */

const GuideCard = ({ guide }: { guide: Guide }) => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="bg-card border border-border">
      <CardHeader className="pb-2">
        <div className="text-3xl mb-1">{guide.emoji}</div>
        <CardTitle className="text-base">{guide.title}</CardTitle>
        <CardDescription className="text-xs">{guide.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="ghost" size="sm" className="px-0 text-xs text-primary gap-1" onClick={() => setOpen(!open)}>
          {open ? 'Hide Guide' : 'View Guide'} <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </Button>
        {open && (
          <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-muted-foreground">
            {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

const HelpPage = () => {
  const [faqSearch, setFaqSearch] = useState('');
  const q = faqSearch.toLowerCase();

  const filteredCategories = FAQ_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
  })).filter(cat => cat.items.length > 0);

  const footer = (
    <p className="text-center text-xs text-muted-foreground mt-8">
      Can't find your answer? Email us at{' '}
      <a href="mailto:sales@everythingeco.com.au" className="text-primary underline">sales@everythingeco.com.au</a>
    </p>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; FAQ</h1>
        <p className="text-sm text-muted-foreground">Guides, tips, and answers to common questions.</p>
      </div>

      <Tabs defaultValue="guides">
        <TabsList>
          <TabsTrigger value="guides">How-To Guides</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* ── Guides ── */}
        <TabsContent value="guides">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {GUIDES.map(g => <GuideCard key={g.title} guide={g} />)}
          </div>
          {footer}
        </TabsContent>

        {/* ── FAQ ── */}
        <TabsContent value="faq">
          <div className="relative mt-4 mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions…"
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No results found. Try a different search term.</p>
          )}

          <div className="space-y-6">
            {filteredCategories.map(cat => (
              <div key={cat.title} className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-sm font-semibold mb-3">{cat.emoji} {cat.title}</h2>
                <Accordion type="multiple">
                  {cat.items.map((item, i) => (
                    <AccordionItem key={i} value={`${cat.title}-${i}`}>
                      <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
          {footer}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HelpPage;
