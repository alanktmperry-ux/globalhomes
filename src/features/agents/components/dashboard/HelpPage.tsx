import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, ChevronRight, BookOpen, MessageCircle, ExternalLink,
  Home, DollarSign, Users, BarChart3, Shield, Landmark, Calculator,
  PartyPopper, Mic, MapPin, Kanban, FileText, Settings, Star,
  Building2, AlertTriangle, CheckCircle2, Wrench, Key, Globe, Handshake, Zap,
} from 'lucide-react';

/* ─── TYPES ─── */
interface Guide {
  emoji: string;
  title: string;
  description: string;
  steps: string[];
}

interface FaqCategory {
  emoji: string;
  title: string;
  items: { q: string; a: string }[];
}

interface ChecklistItem {
  icon: React.ElementType;
  title: string;
  description: string;
  route: string;
}

/* ─── CHECKLIST DATA ─── */
const CHECKLIST: ChecklistItem[] = [
  { icon: Users, title: 'Complete your profile', description: 'Add your photo, licence number, bio, and service areas so buyers trust you.', route: '/dashboard/profile' },
  { icon: MapPin, title: 'Set your territory', description: 'Add the suburbs you operate in so your listings appear in local searches.', route: '/dashboard/territory' },
  { icon: Home, title: 'Add your first listing', description: 'Use the 6-step listing wizard to add a property in under 3 minutes.', route: '/pocket-listing' },
  { icon: Zap, title: 'Boost a listing to Featured', description: 'Get your listing into the homepage featured grid for $49 (Featured) or $99 (Premier) for 30 days. Go to My Listings, open a listing, and click the Marketing tab.', route: '/dashboard/listings' },
  { icon: Landmark, title: 'Set up trust accounting', description: 'Create your trust account or import your opening balance. Download the Pre-Import Checklist first if you are migrating from another system.', route: '/dashboard/trust' },
  { icon: Users, title: 'Import your contacts', description: 'Bring your existing client database in via CSV — takes under 2 minutes.', route: '/dashboard/contacts' },
  { icon: DollarSign, title: 'Choose your plan', description: 'You have 60 days free — lock in the founding price before it increases. Starter $99/mo, Pro $199/mo, Agency $399/mo.', route: '/dashboard/billing' },
  { icon: Globe, title: 'Explore the Off-Market Network', description: 'Share listings exclusively with verified agents before going public.', route: '/dashboard/network' },
  { icon: Key, title: 'Invite your team', description: 'Add agents and admins to your agency workspace.', route: '/dashboard/team' },
  { icon: Handshake, title: 'Invite a trust accounting partner', description: 'Give your outsourced trust accountant their own partner login to manage your rent roll and trust account.', route: '/dashboard/partner-access' },
  { icon: Key, title: 'Run your first open home', description: 'Use Inspection Day Mode to capture visitor details with a QR code.', route: '/dashboard/inspection-mode' },
  { icon: Shield, title: 'Note your Support PIN', description: 'Your unique 6-digit Support PIN is in your Profile. Keep a note of it — you will need it if you ever contact ListHQ support to verify your identity.', route: '/dashboard/profile' },
];

const QUICK_REF: { feature: string; route: string; what: string }[] = [
  { feature: 'Dashboard', route: '/dashboard', what: 'Overview stats, trust balance, today\'s tasks, leads' },
  { feature: 'Profile', route: '/dashboard/profile', what: 'Your public agent profile, bio, photo, verification' },
  { feature: 'Territory', route: '/dashboard/territory', what: 'Service area locations shown on buyer map' },
  { feature: 'Contacts', route: '/dashboard/contacts', what: 'Full CRM — add, tag, import, view activity history' },
  { feature: 'Pipeline', route: '/dashboard/pipeline', what: 'Kanban board from Prospecting to Settled' },
  { feature: 'My Listings', route: '/dashboard/listings', what: 'All your active and archived listings' },
  { feature: 'Voice Leads', route: '/dashboard/leads', what: 'AI-scored buyer leads from voice searches' },
  { feature: 'Inspection Day', route: '/dashboard/inspection-mode', what: 'Live open home visitor sign-in and tracking' },
  { feature: 'Off-Market Network', route: '/dashboard/network', what: 'Share and receive off-market listings with other agents' },
  { feature: 'Investments', route: '/dashboard/investments', what: 'Investment-grade property analysis and yield scoring' },
  { feature: 'Financials', route: '/dashboard/trust', what: 'Trust account receipts, payments, and reconciliation' },
  { feature: 'Trust Ledger', route: '/dashboard/trust-ledger', what: 'Monthly trust ledger, receipt PDFs, audit PDF, 7-year CSV export' },
  { feature: 'Bank Reconciliation', route: '/dashboard/reconciliation', what: 'Three-way bank reconciliation — match bank statement to trust records monthly' },
  { feature: 'Rent Roll', route: '/dashboard/rent-roll', what: 'All managed tenancies, rent due dates, and arrears at a glance' },
  { feature: 'Commission Calc', route: '/dashboard/commission', what: 'Calculate take-home commission and annual GCI' },
  { feature: 'Settlement', route: '/dashboard/settlements', what: 'Milestone tracker from exchange to settlement' },
  { feature: 'Analytics', route: '/dashboard/analytics', what: 'Charts and trends — views, leads, conversion' },
  { feature: 'Reports', route: '/dashboard/reports', what: 'Export CSV/PDF for listings, leads, trust, contacts' },
  { feature: 'Documents', route: '/dashboard/documents', what: 'Store and manage transaction documents' },
  { feature: 'Team', route: '/dashboard/team', what: 'Invite agents and manage roles' },
  { feature: 'Partner Access', route: '/dashboard/partner-access', what: 'Invite trust accounting firms and give them access to your rent roll and trust account' },
  { feature: 'My Agencies', route: '/dashboard/agencies', what: 'Agency profile and branding' },
  { feature: 'Billing', route: '/dashboard/billing', what: 'Subscription plans, payment, usage' },
  { feature: 'Reviews', route: '/dashboard/reviews', what: 'Client reviews and reputation score' },
  { feature: 'Settings', route: '/dashboard/settings', what: 'Notifications, preferences, account' },
  { feature: 'Help & FAQ', route: '/dashboard/help', what: 'This page' },
];

/* ─── GUIDES DATA ─── */
const GUIDES: Guide[] = [
  {
    emoji: '👤', title: 'Setting Up Your Profile',
    description: 'Build a trusted public profile that attracts buyer enquiries.',
    steps: [
      'Go to Profile in the sidebar. Add your headshot (square image works best), full name, and a short bio that describes your specialisation and local knowledge.',
      'Enter your real estate licence number — this appears on your public profile and is required for the verified badge.',
      'Add languages spoken if you work with international buyers. This increases your visibility in multilingual searches.',
      'Set your service areas on the Territory page — add each suburb you operate in with a Google Maps search. These locations appear on the buyer-facing map.',
      'Your Support PIN is a unique 6-digit code shown in your Profile page under the Support PIN section. Keep a note of it — you will need it when contacting ListHQ support. Find it at Dashboard → Profile → Support PIN.',
      'Your reputation score (0–100) is shown on your public profile. It is calculated from response time, review rating, listing quality, profile completeness, and activity. Aim for 80+.',
    ],
  },
  {
    emoji: '🏠', title: 'Creating and Publishing a Listing',
    description: 'Walk through the 6-step listing wizard from address to publish.',
    steps: [
      'Click "New Listing" (the green + button in the sidebar) or navigate to /pocket-listing.',
      'Step 1 — Address: Type the property address. Suburb, state, and coordinates are auto-filled.',
      'Step 2 — Basics: Choose Sale or Rent. Select property type (House, Apartment, Townhouse, Land, Commercial). For sale: enter price, select display mode (Exact, Range, EOI, or Contact Agent). Range mode shows a Price To field — auto-filled at +10% but fully editable. Add bedrooms, bathrooms, ensuites, study/home office, car spaces, garage type, floor area, and land size. Outdoor features: pool, outdoor entertainment, alfresco/deck. Climate: air conditioning type, heating type, solar panels. Financial details (optional): year built, council rates, water rates, strata fees for apartments and townhouses. If EOI is selected, enter the auction date and time. For rentals: enter weekly rent and bond weeks (default 4). Rental-specific fields include parking type, inclusions (water/electricity/internet), appliances (dishwasher, washing machine, internal laundry), building facilities (pool access, gym), and tenancy rules (smoking permitted, max occupants).',
      'Step 3 — Photos: Upload your property photos. Drag to reorder. The first photo is the hero image shown in search results. Accepted formats: JPEG, PNG, WebP.',
      'Step 4 — Voice AI Writer: Record a 30-second voice note or type notes about the property. Choose a tone (Standard, Luxury, Family, Investment). Hit Generate — the AI writes a professional listing description in seconds. Edit the result before continuing.',
      'Step 5 — Settings (sale listings): Choose visibility — Whisper (invite-only), Coming Soon (registered buyers), or Public (full marketplace). Set an exclusive window (7, 14, or 30 days), buyer requirements, and whether to allow co-broke with other agents. Settings (rental listings): Set available-from date, lease term, furnished toggle, pets allowed toggle, and application screening level.',
      'Step 6 — Preview: Review the full listing. Click Publish to save. New listings are saved as pending until you publish from your Listings page.',
    ],
  },
  {
    emoji: '⚡', title: 'Boosting a Listing to Featured',
    description: 'Get your property into the featured grid shown to buyers searching near your suburb.',
    steps: [
      'Go to My Listings in the sidebar and click on the listing you want to boost. This opens the listing detail page.',
      'Click the Marketing tab at the top of the listing detail page. This is where all boost options live.',
      'You will see a Boost this listing section at the top with two options — Featured ($49) and Premier ($99), both for 30 days as a one-off payment.',
      'Featured — $49 for 30 days: Your listing appears in the homepage featured grid, shown to buyers searching near your suburb. Includes a Featured badge and higher search placement in results.',
      'Premier — $99 for 30 days: Everything in Featured, plus top of all search results in your suburb, hero image slot on the homepage, and an email alert to buyers with saved searches matching your property.',
      'Click Select Featured or Select Premier. A confirmation step appears showing exactly what you are getting and the one-off price. Review it and click Confirm to submit.',
      'Your boost request is submitted. You will see the status change to Pending on the Marketing tab. You will receive a bell notification the moment your boost goes live on the featured grid.',
      'Once active, the Marketing tab shows your boost status, the expiry date, and everything that is included. Your listing is live in the featured grid shown to buyers searching near your suburb.',
      'You will receive a bell notification 5 days before your boost expires, with a direct link back to the Marketing tab to renew. After 30 days the boost ends automatically and your listing returns to standard placement.',
      'There are no automatic renewals and no subscriptions. Each boost is a one-off payment. Renew only when you want to, directly from the Marketing tab on your listing.',
    ],
  },
  {
    emoji: '🔑', title: 'Managing Rental Listings',
    description: 'List properties for rent and manage tenant applications.',
    steps: [
      'When creating a listing, select "For Rent" on the Basics step. The form switches to rental mode — price becomes weekly rent, and rental-specific fields appear.',
      'Set the weekly rent and bond weeks (default 4 weeks — the maximum in most Australian states). Then set parking type, and use the Inclusions section to toggle water, electricity, and internet if included in rent.',
      'On the Settings step, set the available-from date, preferred lease term (6 months, 12 months, 18 months, or month-to-month), and whether pets are considered.',
      'Published rental listings appear on the public marketplace with a "For Rent" badge. Buyers can submit a 5-step rental application (personal details, employment, rental history, identity, submit) directly from the listing page.',
      'Rental applications are reviewed in the Rental Applications section (coming soon to your dashboard). Approved applications create a tenancy record in the Rent Roll.',
    ],
  },
  {
    emoji: '🤫', title: 'Off-Market Network (ListHQ First)',
    description: 'Share listings with verified agents before going public.',
    steps: [
      'When publishing a listing, set visibility to "Whisper" or "Coming Soon" on the Settings step. Whisper listings are invite-only; Coming Soon listings are visible to registered buyers but not public portals.',
      'To share a listing with the off-market network, go to the Off-Market Network page in the sidebar.',
      'Find your listing under "My Off-Market Listings", toggle "Share with Network" to on, and set a referral split percentage (e.g. 20%). This percentage of your commission goes to any agent who introduces the successful buyer.',
      'Verified network agents can see your listing, view the price and details, and submit a buyer enquiry on behalf of their client.',
      'Post a Buyer Brief to tell the network what your buyer client is looking for — property type, suburb, price range, and urgency. Other agents with matching stock will reach out directly.',
      'When ready to go public, navigate to your listing on the Listings page and change visibility to Public. All enquiry history and lead data is preserved.',
    ],
  },
  {
    emoji: '👥', title: 'Using the CRM and Contacts',
    description: 'Manage leads, tag contacts, and track your pipeline.',
    steps: [
      'Every lead — from listing enquiries, voice searches, open home sign-ins, and rental applications — automatically appears in your Contacts list.',
      'Open any contact to see their full activity history: enquiries, listings viewed, inspection attendance, and any notes you have added.',
      'Tag contacts by type (Buyer, Seller, Landlord, Tenant) and set a temperature (Hot, Warm, Cold) to prioritise your follow-up list.',
      'To import existing contacts: go to Contacts, click "Import CSV". Map your spreadsheet columns to the required fields (name, email, phone, type). Duplicate detection is by email address.',
      'Use the Pipeline board to track where each contact sits in your sales process. The five stages are: Prospecting → Appraisal → Listed → Under Offer → Settled. Drag cards between columns to update status. Time spent in each stage is shown on the card.',
    ],
  },
  {
    emoji: '📅', title: 'Running an Open Home — Inspection Day Mode',
    description: 'Capture visitor details and send follow-ups in one tap.',
    steps: [
      'Before your open home, go to Inspection Day in the sidebar. Your scheduled inspections appear as cards.',
      'Tap "Start Inspection" on the relevant property. The screen switches to a live sign-in interface.',
      'Add visitors manually: enter first name, last name, phone, and email. Set their interest level — Hot (strong buyer signal), Warm (interested but not urgent), or Cold (browsing).',
      'After the inspection, tap "End Inspection" to see a summary: total visitors, breakdown by interest level, and a one-click option to send a follow-up message to all attendees.',
      'All visitors are automatically added to your CRM with the tag "Inspection Attendee" and linked to the property they attended.',
    ],
  },
  {
    emoji: '🎤', title: 'Understanding Voice Leads',
    description: 'AI-scored buyer leads from spoken search queries.',
    steps: [
      'Voice Leads are buyer enquiries generated when a buyer uses the voice search on the public marketplace. The buyer speaks a query (e.g. "3 bed house in Berwick with a pool under $900k") and the AI matches it to your listings.',
      'Each voice lead shows a transcript of what the buyer said, their intent score (0–100), urgency rating (Hot/Warm/Cold), search history, pre-approval status, and preferred contact method (call, email, WhatsApp).',
      'A high intent score means the buyer is ready to act — they have pre-approval, specified urgency, and left a detailed query. Respond to Hot leads within the hour for best conversion.',
      'The matched property is shown on each lead card so you know exactly which listing triggered the enquiry.',
      'Tap a lead to see the full detail panel. Use the contact buttons to call, email, or message the buyer directly from the lead view.',
    ],
  },
  {
    emoji: '📋', title: 'Pipeline — Tracking Your Deals',
    description: 'Kanban board from prospecting through to settlement.',
    steps: [
      'The Pipeline page is a kanban board with five stages: Prospecting, Appraisal, Listed, Under Offer, Settled.',
      'Each card shows the property address, contact name, estimated value, and how many days the deal has been in the current stage. Long-running cards are highlighted.',
      'Drag a card from one column to the next as the deal progresses. The move is logged automatically.',
      'New leads from your CRM can be added to the pipeline — they start in Prospecting.',
      'Settled cards represent completed deals. The total pipeline value is shown in the header for each column.',
    ],
  },
  {
    emoji: '🏦', title: 'Trust Accounting — Recording Transactions',
    description: 'Record receipts, payments, and keep your trust balance accurate.',
    steps: [
      'Go to Financials in the sidebar to access the Trust Accounting dashboard. If you have no trust account yet, you will be prompted to create one or import from your existing system.',
      'The dashboard has three panels: Receipts (money in), Payments (money out), and Reconciliation.',
      'To record a new receipt: click "New Trust Receipt" in the Receipts panel or Quick Actions sidebar. Fill in: client name, property address, amount, payment method (Cash/Cheque/EFT), purpose (Deposit/Rent/Bond/Holding Fee/Commission), date received, date deposited, and ledger account (Sales Trust or Rental Trust). A sequentially numbered receipt is generated and a PDF is produced automatically.',
      'To record a deposit or rent payment via the transaction form: use Quick Actions → "New Deposit" or "New Rent Payment". Link it to a contact and property from the dropdown selectors.',
      'Pending transactions show as "Pending" status. Click the green tick on any row to mark it as Cleared. Use "Mark All Pending as Cleared" for bulk processing.',
      'The running balance column shows the cumulative trust account balance after each transaction. Monitor this to ensure it always matches your bank balance.',
    ],
  },
  {
    emoji: '📒', title: 'Trust Accounting — Ledger and Statements',
    description: 'Monthly ledgers, audit PDFs, and 5-year CSV exports.',
    steps: [
      'Go to Trust Ledger in the sidebar (under the Financials section). This shows all receipts and payments for the selected month.',
      'Use the month navigator (← →) to move between months. The header shows total in, total out, and closing balance for the selected period.',
      'Filter by All, Receipts only, or Payments only using the tabs. Search by client name, property, or reference number using the search bar.',
      'To download an individual receipt PDF: click the download icon on any receipt row. The PDF is formatted to the Agents Financial Administration Act 2014 standard with signature lines.',
      'To generate a full monthly audit PDF: click "Download Audit PDF" in the header. This produces an A4 landscape document with the transaction ledger, client ledger breakdown, reconciliation summary, and a statutory declaration section for the principal to sign.',
      'To export a 7-year compliant CSV: click "Export CSV 7yr". The file includes the statutory retention notice and closing balance total. Retain this export for a minimum of 7 years as required by Australian trust accounting legislation.',
      'To generate a monthly trust statement (for your records or auditor): click "Monthly Statement" at the bottom of the ledger. Select the month and year and click "Generate & Print Statement". The PDF includes GST summary and signature lines.',
    ],
  },
  {
    emoji: '⚖️', title: 'Trust Accounting — Bank Reconciliation',
    description: 'Match bank statement entries to trust records.',
    steps: [
      'Australian trust accounting law requires a three-way reconciliation each month — your bank statement, trust cashbook, and trust ledger must all agree. Go to Bank Reconciliation in the sidebar to complete this process and match your bank statement entries against your trust records.',
      'Upload your bank statement CSV or paste entries manually. Each bank entry shows as "Unmatched" until you pair it with a trust receipt or payment.',
      'Click "Match" on a bank entry and select the corresponding trust receipt or payment from the dropdown. Matched items turn green.',
      'If a bank entry has no matching trust record (e.g. bank fees), use "Manual" to record it as a non-trust item with a note.',
      'When all entries are matched, the reconciliation is complete. The Financials dashboard will show the last reconciled date and zero unmatched items.',
      'Run reconciliation at least monthly — more frequently if you have high transaction volumes.',
    ],
  },
  {
    emoji: '⚖️', title: 'Trust Accounting — Corrections and Adjustments',
    description: 'How to correct errors, handle dishonoured payments, and manage unidentified receipts.',
    steps: [
      'Trust records in Australia can never be deleted — every correction must preserve the original entry and the correction in the audit trail. Your auditor will see both entries.',
      'The golden rule: void the incorrect entry first, then raise the correct one. Go to Trust Ledger, find the incorrect transaction, click the void icon. The entry stays marked Voided. Then raise a new correct entry.',
      'Journal Adjustment Entry — for balance corrections that need a formal debit/credit entry (e.g. opening balance differences, suspense matches, fee corrections). Go to Trust Ledger → Journal Adjustment. Fill in: entry date, debit ledger, credit ledger, amount, reason code, and a mandatory explanation your auditor will read. The entry is permanent and immediately visible in the audit trail.',
      'Reason codes for journal adjustments: Balance Correction, Wrong Client Ledger, Opening Balance Adjustment, Dishonoured Payment Reversal, Bank Error Correction, Suspense Account Match, Management Fee Correction, Other. Always choose the most specific code and explain fully.',
      'Dishonoured payment — when a payment bounces, void the original receipt, then use Journal Adjustment with reason "Dishonoured Payment Reversal" to debit the client ledger. Notify the payer immediately. Do not disburse funds that have not cleared.',
      'Suspense Account — when money arrives in your trust bank account but you cannot identify the client, go to Trust Ledger → Suspense. Enter the amount, bank reference, and date. It sits in suspense until identified — the amber Suspense button shows a badge count of outstanding items. Once identified, use Journal Adjustment with reason "Suspense Account Match" to move it to the correct client ledger.',
      'Overdrawn client ledger — if any client ledger goes negative, a red alert banner appears on the Trust Financials dashboard. This is a serious breach. Immediately transfer funds from your trading account to remedy the shortfall, notify your state regulator in writing, and use Journal Adjustment to record the correction.',
      'All corrections are timestamped, attributed to the user who made them, and cannot be deleted. The reason you enter at the time of the correction is what your auditor will see.',
    ],
  },
  {
    emoji: '📥', title: 'Importing Opening Balances (Migration)',
    description: 'Move from PropertyMe, Reapit, or TrustSoft to ListHQ.',
    steps: [
      'If you are migrating from PropertyMe, Console Cloud, Reapit, or TrustSoft, go to Financials and click "Import Existing Account".',
      'Before starting the import wizard, download and complete the Trust Migration Pre-Import Checklist. This is available on the Agency Setup onboarding page (step 4 — Cut-over date) under "Download import checklist". The checklist covers all 7 compliance sections required for a valid migration: three-way reconciliation, client ledger records, receipt register, rental bonds, trust account interest, auditor certification, and source system cut-over. Complete it, print it, sign it, and retain it with your audit records for a minimum of 7 years.',
      'Step 1 — Certify Balance: Enter your trust account bank details (BSB, account number), the current balance from your old system, and the date of last reconciliation. Optionally upload your auditor certification PDF.',
      'Step 2 — Upload Ledger CSV: Export your trust ledger from your current system as a CSV. The wizard auto-detects PropertyMe, Reapit, and TrustSoft formats. If your format is not recognised, download the Generic template, paste your data in, and re-upload.',
      'Step 3 — Active Matters: Upload your active matters list — clients who currently have funds held in trust. Format: Client Name, Property, Deposit Held, Status.',
      'Step 4 — Confirm: Review the import summary. The wizard checks that the sum of imported transactions matches your opening balance. A mismatch is flagged in red — resolve it in your old system first.',
      'On completion, download the Opening Balance Declaration PDF and Migration Checklist PDF. Print, sign, and retain these for your auditor — they form part of the statutory audit trail.',
    ],
  },
  {
    emoji: '💸', title: 'Commission Calculator',
    description: 'Model your take-home commission and annual GCI.',
    steps: [
      'Open Commission Calculator from the Business section of the sidebar.',
      'Enter the sale price and your commission rate (%). The default rate is 2.5% — adjust for your agreement.',
      'Use the Agency Split slider to set the agent/agency split. For example, a 30% agency split means the agency keeps 30% and you take 70%.',
      'Toggle GST Included if your rate is GST-inclusive. The calculator shows the 1/11th GST component separately.',
      'Enter a referral fee percentage if a referring agent is entitled to a share of your commission.',
      'Set settlement days and deals per month to see your projected monthly and annual GCI (Gross Commission Income).',
      'Your last scenario is saved automatically and restored next time you open the calculator.',
    ],
  },
  {
    emoji: '🎉', title: 'Settlement Concierge',
    description: 'Track milestones from exchange to keys handover.',
    steps: [
      'Open Settlement Concierge from the Business section. Upcoming settlements are listed with a countdown in days. Cards turn amber at 7 days and red at 3 days.',
      'Click a settlement card to expand it and see the checklist: Final inspection booked, Keys handover arranged, Trust funds cleared, Buyer notified, Google review requested.',
      'Tick off each item as it is completed. Progress is saved automatically in your browser.',
      'Use the Utility Partners section to quickly send your buyer links to set up electricity (AGL, Origin), internet (Telstra, NBN Co), and other services. Click "Copy link" to get a personalised referral URL.',
      'Post-settlement properties move to the lower section after their settlement date passes. Use this section to follow up on reviews and referrals.',
    ],
  },
  {
    emoji: '📊', title: 'Analytics and Reports',
    description: 'Charts, trends, and CSV exports for every metric.',
    steps: [
      'The Analytics page shows charts for your listings performance over time — views, contact clicks, leads, and pipeline movement.',
      'The Reports page has four tabs: Listings, Leads, Financials, and Contacts. Each tab has a date range picker (30 days, 90 days, 6 months, 12 months, or custom).',
      'On the Listings tab: see a bar chart of views and leads by month, a pie chart of property types, and a table of your top-performing listings.',
      'On the Leads tab: see lead volume over time, source breakdown, and conversion rate from enquiry to offer.',
      'On the Financials tab: see total trust receipts, payments, and closing balance trend by month, pulling live from your trust account data.',
      'On the Contacts tab: see contact growth and activity breakdown.',
      'Every tab has an "Export CSV" button that downloads the filtered data for use in Excel or your accountant\'s reporting tools.',
    ],
  },
  {
    emoji: '🤝', title: 'Managing Your Team',
    description: 'Invite agents, assign roles, and manage your agency.',
    steps: [
      'Go to Team in the sidebar (under Account). Click "Invite Member" and enter the email address of the agent you want to add.',
      'Choose their role: Agent (can add listings and manage their own contacts) or Admin (full access including billing and team management).',
      'The invited agent receives an email with a unique invite link. They sign up using that link and are automatically linked to your agency.',
      'Team members appear in the Team list with their status (Active, Pending) and role badge.',
      'To remove a team member, click the three-dot menu on their row and select "Remove from Agency". Their individual listings and contacts are retained but they lose dashboard access immediately.',
      'For outsourced trust accounting staff, use Partner Access instead of Team — partners get a separate portal designed specifically for trust accounting work, and each of their staff members gets their own individual login.',
    ],
  },
  {
    emoji: '🤝', title: 'Partner Portal — Trust Accounting Firms',
    description: 'Give your outsourced trust accountant their own secure login to manage your accounts.',
    steps: [
      'ListHQ has a dedicated Partner Portal for outsourced trust accounting firms — businesses like Balance R&R, End of Month Angels, and hastings + co who manage trust accounts on behalf of multiple agencies.',
      'To invite a partner firm: go to Partner Access in the sidebar (under Account). Enter the partner\'s email address and choose their access level: Trust Only (trust account read/write), Trust & PM (trust plus rent roll and tenancies), or Full PM (complete property management access including maintenance).',
      'The partner receives a branded invitation email with a unique token link. They click the link, create their account, and land directly in the Partner Portal showing your agency.',
      'Once accepted, your partner can log in at any time via /partner/login. They see a dedicated portal — separate from the agent dashboard — with your trust account, rent roll, and arrears all in one place.',
      'Partner firms can manage multiple agencies from one login. A dropdown switcher at the top of their portal lets them move between all the agencies that have invited them.',
      'Partner firms can invite their own team members from within the Partner Portal. Each staff member gets their own individual login — no shared passwords. The firm owner manages who has access and can remove team members at any time.',
      'To revoke a partner\'s access: go to Partner Access in your sidebar, find the partner in the active partners table, and click Revoke. Their access is removed immediately.',
      'All partner activity is logged — every transaction viewed, receipt recorded, or payment processed by a partner is timestamped and attributed to their account.',
    ],
  },
  {
    emoji: '⭐', title: 'Reputation Score',
    description: 'How your agent score is calculated and how to improve it.',
    steps: [
      'Your reputation score (0–100) appears on your public agent profile and in the Verified Agent badge section.',
      'The score is calculated from five factors: Response time (0–25 pts) — replying to leads within 5 minutes scores 25, within 1 hour scores 20. Reviews (0–25 pts) — based on your average star rating weighted by review count. Listing performance (0–25 pts) — ratio of sold/leased listings to total listings. Days on market (0–15 pts) — lower average days on market scores higher. Profile completeness (0–10 pts) — photo, bio, phone, specialisation, and service areas each add 2 points.',
      'To improve your score: respond to leads faster, ask satisfied clients for reviews, maintain an up-to-date profile, and keep listings active and well-presented.',
      'Clients can leave reviews from your public profile page. A direct link to your review page is available under the Reviews section of the sidebar.',
    ],
  },
  {
    emoji: '🔐', title: 'Account Security and Settings',
    description: 'Passwords, notifications, and keeping your account safe.',
    steps: [
      'Go to Settings in the sidebar to manage notifications, display preferences, and account details.',
      'Change your password from Settings → Security. Use a password at least 12 characters long. If you forget your password, use the "Forgot Password" link on the login page to receive a reset email.',
      'Keep your registered email address current — all security alerts, lead notifications, and billing receipts go to this address.',
      'Never share your login credentials. Use the Team feature to give colleagues access — they get their own login, and their activity is tracked separately.',
      'If you suspect unauthorised access, go to Settings immediately, change your password, and contact support at support@listhq.com.au.',
    ],
  },
  {
    emoji: '👫',
    title: 'Collab Search — Browsing Together',
    description: 'Share a live search session with a partner, client, or co-buyer.',
    steps: [
      'Collab Search lets two people browse the same properties in real time from different devices. Both people see the same results, can react to properties, and can see what the other has already viewed. Perfect for couples searching together, buyers with a partner overseas, or agents browsing with a client.',
      'To start a session: search for a property or suburb on the homepage. Once results appear, tap the Together button in the results toolbar (next to the Save and Filter buttons). A shareable link is automatically copied to your clipboard.',
      'Share the link with your partner via WhatsApp, SMS, or email. When they open the link on their device, you are both instantly in the same live Collab session. A "Searching together" badge appears in the toolbar on both screens.',
      'While in a Collab session, tap any property card to react — use thumbs up (👍), thumbs down (👎), or fire (🔥) to signal your interest. Your partner sees your reactions in real time on their screen.',
      'Properties your partner has already viewed are marked with a small indicator on the card so you know what they have seen.',
      'The session stays active as long as both people have the link. If your partner closes the browser, they can re-open the same link to rejoin the session. The session preserves the original search query and filters.',
      'To end the session, simply close the tab or navigate away. Collab sessions do not expire — the link remains valid.',
      'Note: you need to be signed in to start a Collab session. Your partner does not need an account to join — they just open the link.',
    ],
  },
  {
    emoji: '📱',
    title: 'Using ListHQ on Mobile',
    description: 'Getting the best experience on iPhone and Android.',
    steps: [
      'ListHQ is fully optimised for mobile. The buyer-facing search, map, property cards, and agent contact forms all work on iPhone and Android browsers — no app download required.',
      'Add to Home Screen for the best experience: on iPhone, open listhq.com.au in Safari, tap the Share button (the box with an arrow), and tap "Add to Home Screen". On Android, open in Chrome, tap the three-dot menu, and tap "Add to Home Screen". ListHQ will appear as an icon on your home screen and open full-screen like a native app.',
      'Buyer navigation: the bottom bar has five tabs — Search (home), Saved (your saved properties), Agents (find an agent), Messages (your conversations), and Profile (settings and preferences).',
      'Agent dashboard on mobile: tap the hamburger menu (☰) in the top left corner to open the full navigation sidebar. Tap any menu item to navigate — the sidebar closes automatically. The notification bell is in the top right corner.',
      'Voice search on mobile: tap the microphone icon on the homepage and speak your search. Allow microphone access when prompted. Voice search works in 24 languages — speak in your preferred language and the AI understands.',
      'Map search on mobile: the homepage shows a full-screen map with a draggable bottom sheet showing property results. Drag the sheet up to see more results, drag down to see more of the map. Tap any price marker on the map to see the property.',
      'If you experience issues on mobile, ensure you are using a recent version of Safari (iPhone) or Chrome (Android). Voice search is not supported in third-party in-app browsers (e.g. Instagram or Facebook browser).',
    ],
  },
];

/* ─── FAQ DATA ─── */
const FAQ_CATEGORIES: FaqCategory[] = [
  {
    emoji: '🚀', title: 'Getting Started',
    items: [
      { q: 'How do I create an agent account?', a: 'Go to the Agents page and click "Join the Network". Complete the registration form with your full name, email, phone, licence number, and agency name. You will receive a confirmation email. Once verified, complete your profile and you are ready to list.' },
      { q: 'Is there a free trial?', a: 'Yes — every new agent gets a 60-day free trial. No credit card required to start. During your trial you have full access to all features on your selected plan.' },
      { q: 'What is the founding price?', a: 'Founding prices are available for a limited time: Starter at $99/mo (full price $199), Pro at $199/mo (full price $349), Agency at $399/mo (full price $699). Annual billing saves an additional 15%.' },
      { q: 'Can I use ListHQ as a buyer as well?', a: 'Yes. Your agent login gives you full access to the buyer marketplace — saved searches, property alerts, the AI voice search, and map search.' },
      { q: 'What is the partner portal and do I need it?', a: 'The partner portal is for agents who use an outsourced trust accounting firm. Instead of sharing your login with your trust accountant, you invite them via Partner Access and they get their own dedicated portal. If you manage your own trust accounting, you do not need it. If you use a firm like Balance R&R or End of Month Angels, set it up in the first week.' },
      { q: 'Is ListHQ available outside Australia?', a: 'Yes. The platform supports agents in any country. The agency setup form detects your country and adapts the compliance fields accordingly — Australian agents see ABN and state-specific fields, international agents see generic business registration and region fields. Voice search, property search, and all core features work globally.' },
    ],
  },
  {
    emoji: '🏠', title: 'Listings',
    items: [
      { q: 'How many listings can I have active at once?', a: 'Starter: 10 active listings. Pro and Agency: unlimited listings. See Billing for full details.' },
      { q: 'Can I edit a listing after publishing?', a: 'Yes. Open the listing from My Listings, make your changes, and click Save. Updates go live immediately.' },
      { q: 'What image formats and sizes are supported?', a: 'JPEG, PNG, and WebP up to 10 MB per image. For best results, upload landscape images at least 1200px wide.' },
      { q: 'What is the difference between Whisper, Coming Soon, and Public visibility?', a: 'Whisper = invite-only, not visible to buyers. Coming Soon = visible to registered buyers on the platform but not on external portals. Public = visible to all buyers on the full marketplace.' },
      { q: 'Can I duplicate a listing?', a: 'Yes. On the listing detail page in your dashboard, there is a "Duplicate" option. This creates a copy with all the same details — useful for similar properties at the same address.' },
      { q: 'What is the AI listing writer?', a: 'On Step 4 of the listing wizard, you can record a voice note or type notes about the property. The AI generates a professional listing description in four tones: Standard, Luxury, Family, or Investment. You can edit the output before publishing.' },
      { q: 'How do I get my listing into the featured grid on the homepage?', a: 'Go to My Listings, open the listing, and click the Marketing tab. Choose Featured ($49) or Premier ($99) — both are one-off payments for 30 days. Confirm your selection and your listing goes live on the featured grid. You get a bell notification the moment it is active.' },
    ],
  },
  {
    emoji: '⚡', title: 'Featured Listing Boosts',
    items: [
      { q: 'What is a featured listing boost?', a: 'A boost puts your listing into the featured grid on the ListHQ homepage, shown to buyers searching near your suburb. Featured costs $49 and Premier costs $99 — both are one-off payments for 30 days. No subscription, no automatic renewals.' },
      { q: 'How is a boosted listing different from a standard listing?', a: 'A standard listing appears in search results based on relevance and recency. A Featured boost places your listing in the homepage featured grid with a Featured badge and higher search placement, targeted to buyers searching near your suburb. Premier adds top position in all search results in your suburb, the hero image slot on the homepage, and an email to buyers with matching saved searches.' },
      { q: 'Who sees my featured listing?', a: 'Buyers who visit the ListHQ homepage near your suburb — detected via GPS, IP address, or their search query. If a buyer searches for a property in Doncaster they see featured listings from Doncaster. The targeting is automatic — you do not need to configure anything.' },
      { q: 'How much does a boost cost?', a: 'Featured is $49 for 30 days. Premier is $99 for 30 days. Both are one-off payments — no subscription, no recurring charge, no lock-in.' },
      { q: 'How do I request a boost?', a: 'Go to My Listings, open the listing, click the Marketing tab, choose Featured or Premier, and click Confirm. You will receive a bell notification the moment your boost goes live.' },
      { q: 'How does payment work?', a: 'Payment is arranged on confirmation of your boost request. Your listing goes live promptly once payment is confirmed. Stripe online card payment is coming very soon — once live, your boost will activate instantly on payment. You are never charged automatically — each boost is a separate one-off payment.' },
      { q: 'How long does a boost last?', a: 'Exactly 30 days from when your boost goes live. The Marketing tab shows the exact expiry date at all times. You will receive a bell notification 5 days before it ends. When the 30 days is up your listing returns to standard placement automatically.' },
      { q: 'What happens when my boost expires?', a: 'Five days before expiry you receive a bell notification with a link to renew. When the 30 days ends your listing is automatically removed from the featured grid and returns to standard placement. Renew anytime from the Marketing tab — it takes under a minute.' },
      { q: 'How do I know when my boost expires?', a: 'The Marketing tab on your listing shows the expiry date at all times while your boost is active. You will also receive a bell notification 5 days before expiry as a reminder.' },
      { q: 'Can I renew my boost?', a: 'Yes — anytime, directly from the Marketing tab. Once your current boost ends just select a tier and confirm again. Each renewal is a fresh one-off payment.' },
      { q: 'Can I cancel a boost early?', a: 'Yes. Go to the Marketing tab on your listing and click Cancel boost. Your listing will be removed from the featured grid immediately.' },
      { q: 'What is the difference between Featured and Premier?', a: 'Featured ($49 for 30 days): Homepage featured grid, Featured badge, higher search placement, targeted to buyers near your suburb. Premier ($99 for 30 days): Everything in Featured, plus top position in all search results in your suburb, rotation in the homepage hero image slot, and an email notification to registered buyers with saved searches matching your property.' },
      { q: 'Can I boost a rental listing?', a: 'Yes. Both sale and rental listings can be boosted. A boosted rental appears in the featured grid to buyers searching for rentals near your suburb.' },
      { q: 'Can I have more than one listing boosted at the same time?', a: 'Yes — no limit. Each listing is boosted independently with its own 30-day period.' },
      { q: 'My boost shows Pending — what does that mean?', a: 'Pending means your request has been submitted and is being processed. Your listing will go live on the featured grid shortly. You will get a bell notification the moment it is active. Check the Marketing tab anytime to see the current status.' },
      { q: 'Where do I manage my active boosts?', a: 'Everything is on the Marketing tab of each listing. It shows your live boost status, expiry date, what is included, and options to cancel or renew. You never need to contact anyone — it is fully self-serve.' },
    ],
  },
  {
    emoji: '🔑', title: 'Rental Management',
    items: [
      { q: 'How do I list a property for rent?', a: 'Create a new listing and choose "For Rent" on the Basics step. The form switches to rental mode with fields for weekly rent, bond weeks, parking type, and inclusions (water/electricity/internet). Toggle appliances (dishwasher, washing machine, internal laundry), building facilities (pool access, gym), and tenancy rules (smoking permitted, max occupants). On the Settings step, set available-from date, lease term, furnished toggle, pets allowed toggle, and screening level.' },
      { q: 'Can tenants apply online?', a: 'Yes. A 5-step rental application form is available on every rental listing page. It collects personal details, employment history, rental history, and identity documents.' },
      { q: 'What is the Rent Roll?', a: 'The Rent Roll (coming to your dashboard) is a summary of all your managed tenancies showing each tenant, their rent, next due date, and arrears status at a glance.' },
      { q: 'How does the system handle bond?', a: 'When creating a tenancy, you record the bond amount and bond lodgement number. Bond held in your trust account is recorded as a trust receipt with purpose set to "Bond".' },
    ],
  },
  {
    emoji: '🏦', title: 'Trust Accounting',
    items: [
      { q: 'Is the trust accounting module legally compliant?', a: 'The module is designed to meet trust accounting requirements across all Australian states and territories: Estate Agents Act 1980 (VIC), Property and Stock Agents Act 2002 (NSW), Agents Financial Administration Act 2014 (QLD), Land Agents Act 1994 (SA), Real Estate and Business Agents Act 1978 (WA), Property Agents and Land Transactions Act 2016 (TAS), Agents Act 2003 (ACT), and Agents Licensing Act 1979 (NT). It produces sequentially numbered receipts, running balance ledgers, monthly statements with GST breakdowns, and 7-year compliant CSV exports. Compliance requirements vary by state — always confirm with your registered auditor before your annual audit.' },
      { q: 'Can I import my trust history from PropertyMe?', a: 'Yes. Go to Financials → Import Existing Account. The wizard auto-detects PropertyMe, Reapit, and TrustSoft CSV formats. It walks you through certifying your opening balance, uploading your ledger history, and importing active client matters. You receive a signed declaration PDF and migration checklist for your auditor.' },
      { q: 'How do I generate a monthly trust statement?', a: 'From the Trust Ledger page, click "Monthly Statement" at the bottom, select your month and year, and click "Generate & Print Statement". The PDF includes all receipts and payments, GST summary (1/11th method), and signature lines for the principal.' },
      { q: 'How does bank reconciliation work?', a: 'Go to Bank Reconciliation. Upload or paste your bank statement entries. Match each bank line to the corresponding trust receipt or payment. Unmatched items are flagged red. When all items are matched, the reconciliation is complete and the date is recorded on your Financials dashboard.' },
      { q: 'What is an ABA file?', a: 'An ABA file (Australian Banking Association format) is a bulk payment file you upload to your bank\'s internet banking to process multiple owner disbursements in a single transaction. Generate it from the Financials dashboard under Bulk Payments when you have pending payment records ready to clear.' },
      { q: 'Can I void a transaction instead of deleting it?', a: 'Yes — you can never hard-delete a trust transaction. Click the delete icon on any transaction row to \"void\" it. The transaction remains in the ledger marked as Voided and is excluded from the running balance. This preserves the audit trail as required by Australian trust accounting law.' },
      { q: 'What record retention period applies to my trust records?', a: 'Retention requirements vary by state: NSW requires 3 years minimum, QLD 5 years, WA 6 years, and VIC, SA, TAS, ACT and NT all require 7 years. To be safe across all jurisdictions, ListHQ recommends retaining all trust records — bank statements, receipts, ledgers, reconciliations, and audit reports — for a minimum of 7 years from the date of the last entry. Electronic storage is acceptable provided records remain accessible and reproducible.' },
      { q: 'Do I need to comply with AML/CTF requirements?', a: 'Yes. From 1 July 2026, all Australian real estate agents must enrol with AUSTRAC under the Anti-Money Laundering and Counter-Terrorism Financing Act. Enrolment must be completed by 29 July 2026 and applies to every agent who sells or manages property. Failure to enrol carries significant penalties including fines and licence suspension. ListHQ is building AML compliance tools into the platform ahead of the deadline. In the meantime, enrol directly at austrac.gov.au. A direct enrolment link is available in the Contact & Support tab.' },
      { q: 'How do I correct an error in a trust transaction?', a: 'You can never delete a trust transaction — Australian law requires the full history to be preserved. The correct process is: (1) Void the incorrect entry by clicking the void icon on the transaction — it stays in the ledger marked Voided. (2) Raise a new correct entry with the right details. For complex corrections such as opening balance differences or suspense account matches, use the Journal Adjustment feature in the Trust Ledger.' },
      { q: 'What is a Journal Adjustment Entry?', a: 'A Journal Adjustment is a formal accounting correction that transfers a balance between two ledgers. Use it for: wrong client ledger, opening balance correction after migration, dishonoured payment reversal, suspense account match, or overcharged management fee. Go to Trust Ledger → Journal Adjustment. You must enter the debit ledger, credit ledger, amount, reason code, and a mandatory explanation that your auditor will see permanently. The entry cannot be deleted.' },
      { q: 'What is the Suspense Account?', a: 'The Suspense Account holds unidentified receipts — money in your trust bank account that you cannot yet match to a client. Never leave unidentified money unrecorded. Go to Trust Ledger → Suspense and enter the amount, bank reference, and date. The amber Suspense button shows a badge count of outstanding items. Once you identify the client, use Journal Adjustment with reason "Suspense Account Match" to transfer it to the correct ledger.' },
      { q: 'What happens if a client ledger goes overdrawn?', a: 'A trust client ledger must never show a negative balance — this is a serious breach in all Australian states. If it occurs, a red alert banner appears on your Trust Financials dashboard. You must immediately transfer funds from your trading account to remedy the shortfall, notify your state regulator in writing (date, amount, reason, corrective action), and use Journal Adjustment to record the correction.' },
      { q: 'What do I do when a tenant payment is dishonoured?', a: 'When a payment bounces: (1) void the original receipt in the Trust Ledger, (2) use Journal Adjustment with reason "Dishonoured Payment Reversal" to debit the client ledger, (3) notify the payer immediately and do not disburse any funds from that ledger until resolved. Always wait for cleared funds before processing disbursements.' },
    ],
  },
  {
    emoji: '🤫', title: 'Off-Market Network',
    items: [
      { q: 'What is the Off-Market Network?', a: 'The Off-Market Network lets you share listings privately with other verified agents before they go public. This gives sellers a discreet soft launch and gives agents early access to stock.' },
      { q: 'How do referral splits work?', a: 'When sharing an off-market listing, you set a referral split percentage. If a network agent introduces the successful buyer, they receive that percentage of your commission at settlement.' },
      { q: 'Who can see my off-market listings?', a: 'Only verified agents on the ListHQ network. Public buyers and unverified agents cannot see them.' },
      { q: 'What is a Buyer Brief?', a: 'A Buyer Brief is a request you post to the network describing what your buyer client is looking for (property type, suburb, price range, urgency). Other agents with matching off-market stock will contact you directly.' },
    ],
  },
  {
    emoji: '🤝', title: 'Partner Portal',
    items: [
      { q: 'What is the Partner Portal?', a: 'The Partner Portal is a dedicated login for outsourced trust accounting firms — businesses that manage trust accounts on behalf of multiple real estate agencies. Instead of sharing your agent login, your trust accountant gets their own secure portal showing only what they need: your trust account, rent roll, tenancies, and arrears. It is completely separate from your agent dashboard.' },
      { q: 'How do I give my trust accountant access?', a: 'Go to Partner Access in the sidebar under Account. Enter your trust accountant\'s email address and choose their access level (Trust Only, Trust & PM, or Full PM). They receive a branded invitation email with a secure link. Once they accept, they can log in immediately at /partner/login.' },
      { q: 'What can a partner see and do?', a: 'Depends on the access level you grant. Trust Only: view and record trust receipts, payments, and reconciliation for your agency. Trust & PM: everything in Trust Only plus rent roll, tenancy records, and rent payments. Full PM: complete access including maintenance jobs, bank reconciliation, and arrears management.' },
      { q: 'Can my trust accounting firm manage multiple agencies from one login?', a: 'Yes — this is the core purpose of the Partner Portal. A firm like Balance R&R can be invited by 20 different agencies. When they log in they see all their active agencies in a dropdown switcher and can move between them instantly. Each agency\'s data is kept completely separate.' },
      { q: 'Can the partner firm have multiple staff members with individual logins?', a: 'Yes. The firm owner registers first and becomes the account owner. From within the Partner Portal, they can go to Team and invite each of their staff members by email. Each person gets their own individual login and password — no shared credentials. The owner can revoke any team member\'s access at any time.' },
      { q: 'Is the partner portal free for my trust accountant to use?', a: 'Yes. There is no charge to partner firms for using the portal. The partner portal is included with your Pro and Agency plan subscription.' },
      { q: 'How do I revoke a partner\'s access?', a: 'Go to Partner Access in your sidebar. Find the partner in the active partners table and click Revoke. Their access is removed immediately and they are notified by email.' },
      { q: 'Can I see what my partner has done in my account?', a: 'Yes. All partner activity is logged with a timestamp and attributed to the individual team member. You can see who recorded which transaction, when, and from which IP address.' },
    ],
  },
  {
    emoji: '📅', title: 'Inspections',
    items: [
      { q: 'How does Inspection Day Mode work?', a: 'Select your listing from the scheduled inspections list. During the inspection, add visitor details manually — first name, last name, phone, email, and interest level (Hot/Warm/Cold). After the inspection, send a one-click follow-up and all visitors are added to your CRM.' },
      { q: 'Can buyers book private inspections?', a: 'Yes. If inspection booking is enabled on a listing, buyers can request a time slot from the listing page. You will receive a notification to confirm.' },
    ],
  },
  {
    emoji: '💸', title: 'Commission and Financials',
    items: [
      { q: 'How do I calculate my commission?', a: 'Open Commission Calculator from the sidebar. Enter the sale price, commission rate, agency split, and GST preference. The calculator shows gross commission, your net share, GST component, and projected annual GCI. Your last scenario is saved automatically.' },
      { q: 'What is GCI?', a: 'GCI stands for Gross Commission Income — the total commission you earn before expenses. The Commission Calculator shows your projected monthly and annual GCI based on your deals-per-month setting.' },
    ],
  },
  {
    emoji: '💳', title: 'Plans and Billing',
    items: [
      { q: 'What plans are available?', a: 'Starter ($99/mo founding, $199 full): 1 seat, 10 listings, CRM, AI listing writer, voice leads, standard analytics. Pro ($199/mo founding, $349 full): 1 seat, unlimited listings, trust accounting, partner portal access, Whisper Market, Inspection Day, Settlement Concierge, commission calculator, GCI reports, verified badge. Agency ($399/mo founding, $699 full): up to 8 seats, everything in Pro plus team analytics, agency branding, lead routing, partner portal access, and API access. Annual billing saves 15% on all plans.' },
      { q: 'Can I cancel at any time?', a: 'Yes. No lock-in contracts. Cancel from the Billing page and your plan remains active until the end of the billing period. Data is retained for 90 days.' },
      { q: 'What payment methods are accepted?', a: 'Visa, Mastercard, and American Express via Stripe. Update your card at any time on the Billing page.' },
      { q: 'Is there a per-listing boost fee?', a: 'Yes, optional. You can boost any listing to the homepage featured grid for a one-off fee — Featured is $49 for 30 days and Premier is $99 for 30 days. There is no mandatory per-listing fee. Standard listings are included in your subscription at no extra cost.' },
    ],
  },
  {
    emoji: '⚙️', title: 'Profile and Team',
    items: [
      { q: 'How do I add team members?', a: 'Go to Team → Invite Member. Enter their email and choose a role (Agent or Admin). They receive an invitation email with a unique code to join your agency workspace.' },
      { q: 'How do I update my public agent profile?', a: 'Go to Profile in the sidebar. Edit your headshot, bio, specialisation, years of experience, languages spoken, and social links. Changes appear on your public page immediately.' },
      { q: 'How do I change my email address?', a: 'Email changes require account verification. Contact support at support@listhq.com.au and we will assist.' },
      { q: 'How is Partner Access different from Team?', a: 'Team is for agents and admins inside your own agency — people who work for you and need full dashboard access. Partner Access is for external service providers like outsourced trust accountants who need access to specific parts of your account (trust accounting, rent roll) but should not see your CRM, pipeline, analytics, or billing. Always use Partner Access for your trust accountant — never share your agent login.' },
      { q: 'What is my Support PIN and where do I find it?', a: 'Your Support PIN is a unique 6-digit number assigned to your account when you register. It appears in your Profile page under the Support PIN section — shown as two groups of 3 digits (e.g. 412 893). When you contact ListHQ support by phone or email, we will ask you to quote this PIN to instantly verify your identity. Your PIN is permanent and unique to your account — it cannot be changed. Do not share it publicly. Find it at Dashboard → Profile → scroll to Support PIN.' },
    ],
  },
  {
    emoji: '🔧', title: 'Technical Troubleshooting',
    items: [
      { q: 'The page is not loading properly — what should I do?', a: 'Try a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac). If the issue persists, clear your browser cache or try Chrome, Safari, Firefox, or Edge. If the problem continues, email us with a screenshot.' },
      { q: 'My listing photos are not uploading — why?', a: 'Each image must be under 10 MB and in JPEG, PNG, or WebP format. Try uploading one photo at a time on a faster connection. If the issue continues, contact support with the browser and error message.' },
      { q: 'I am not receiving email notifications.', a: 'Check your spam folder and add our sending address to your contacts. Verify your email is correct under Settings and that notifications are enabled.' },
      { q: 'The voice search is not working on my device.', a: 'Voice search requires microphone permission in your browser. On Chrome: click the padlock in the address bar → Site settings → Microphone → Allow. On Safari: go to Settings → Safari → Microphone → Allow. Voice search is not supported in Internet Explorer.' },
      { q: 'The map is not showing my territory locations.', a: 'The map uses Google Maps and requires a working internet connection. Try refreshing the Territory page. If your locations are saved but not displaying, try a different browser.' },
    ],
  },
  {
    emoji: '🔒', title: 'Data and Privacy',
    items: [
      { q: 'Where is my data stored?', a: 'All data is stored in Australia on secure cloud infrastructure (AWS ap-southeast-2 — Sydney region). We do not store data offshore.' },
      { q: 'Can I export my data?', a: 'Yes. Contacts can be exported from the Contacts page. Trust transactions can be exported as CSV from the Trust Ledger. Listings can be exported from Reports. Contact support for a full account data export.' },
      { q: 'What happens to my data if I cancel?', a: 'Your data is retained for 90 days after cancellation. During this window you can export everything. After 90 days, data is permanently deleted per our Privacy Policy.' },
    ],
  },
  {
    emoji: '🏠', title: 'For Buyers',
    items: [
      { q: 'How do I find an agent who speaks my language?', a: 'Go to the Agents tab in the bottom navigation (or visit /agents). Use the language filter dropdown to select your preferred language — only agents who speak that language will appear. You can also filter by name, suburb, or agency name using the search bar. Tap View Profile to see the agent\'s full profile, listings, and contact details.' },
      { q: 'How does the voice search work?', a: 'Tap the microphone icon on the homepage and speak your search naturally — for example "3 bedroom house in Richmond under $900k with a garage". The AI understands 24 languages. Your results update automatically. You can also type your search in the search bar.' },
      { q: 'How do I save a property?', a: 'Tap the heart icon on any property card or listing page. Saved properties appear in the Saved tab in the bottom navigation. You need to be signed in to save properties.' },
      { q: 'How do I save a search so I get alerts for new listings?', a: 'After searching, tap the Save button in the results toolbar. Give your search a name. When new listings are published that match your saved search, you will receive an email alert. You can manage your saved searches from the homepage search bar.' },
      { q: 'What is Collab Search — searching together?', a: 'Collab Search lets two people browse the same properties at the same time from different devices — useful for couples searching together or buyers working with a partner who is interstate or overseas. After searching, tap the Together button in the toolbar. A link is copied to your clipboard. Share it with your partner — when they open it, you are both in the same live session. You can each react to properties with thumbs up, thumbs down, or fire emoji. You can see which properties your partner has already viewed.' },
      { q: 'How do I contact an agent about a property?', a: 'Open any property listing and tap Contact Agent or Enquire / Apply. A form appears where you can send a message, request a call, or submit a rental application. Your message goes directly to the agent and starts a conversation in the Messages tab.' },
      { q: 'How do I apply for a rental property?', a: 'Open the rental listing and tap Enquire / Apply. A 5-step application form appears — personal details, employment, rental history, identity documents, and submit. Your application goes directly to the managing agent.' },
      { q: 'Is ListHQ free for buyers?', a: 'Yes — completely free. Create an account, search properties, save listings, contact agents, apply for rentals, and use voice search at no cost. ListHQ is paid for by the agents on the platform.' },
      { q: 'How do I update my property preferences?', a: 'Go to Profile in the bottom navigation, then tap Settings. You can update your budget, preferred suburbs, and property type preferences here at any time.' },
    ],
  },
];

/* ─── SUB-COMPONENTS ─── */

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

const ChecklistCard = ({ item, index }: { item: ChecklistItem; index: number }) => {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className="text-muted-foreground flex-shrink-0" />
            <h3 className="text-sm font-medium truncate">{item.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate(item.route)}>
            Go there <ChevronRight size={12} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── MAIN ─── */

const HelpPage = () => {
  const navigate = useNavigate();
  const [faqSearch, setFaqSearch] = useState('');
  const q = faqSearch.toLowerCase();

  const filteredCategories = FAQ_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
  })).filter(cat => cat.items.length > 0);

  const supportFooter = (
    <p className="text-center text-xs text-muted-foreground mt-8">
      Can't find your answer? Email us at{' '}
      <a href="mailto:support@listhq.com.au" className="text-primary underline">support@listhq.com.au</a>
    </p>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; FAQ</h1>
        <p className="text-sm text-muted-foreground">Guides, tips, and answers to common questions.</p>
      </div>

      <Tabs defaultValue="getting-started">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="guides">How-To Guides</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="support">Contact &amp; Support</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Getting Started ── */}
        <TabsContent value="getting-started" className="space-y-8 mt-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Setup Checklist</h2>
            <p className="text-sm text-muted-foreground mb-4">Complete these steps to get your agency live on ListHQ.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHECKLIST.map((item, i) => (
                <ChecklistCard key={item.title} item={item} index={i} />
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Reference</h2>
            <ScrollArea className="rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Feature</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Where to find it</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">What it does</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUICK_REF.map((row) => (
                      <tr key={row.route} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium whitespace-nowrap">
                          <button
                            className="text-primary hover:underline text-left"
                            onClick={() => navigate(row.route)}
                          >
                            {row.feature}
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-xs whitespace-nowrap">{row.route}</td>
                        <td className="p-3 text-muted-foreground">{row.what}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ── TAB 2: How-To Guides ── */}
        <TabsContent value="guides">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {GUIDES.map(g => <GuideCard key={g.title} guide={g} />)}
          </div>
          {supportFooter}
        </TabsContent>

        {/* ── TAB 3: FAQ ── */}
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
          {supportFooter}
        </TabsContent>

        {/* ── TAB 4: Contact & Support ── */}
        <TabsContent value="support" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border border-border">
              <CardContent className="p-5 text-center space-y-2">
                <MessageCircle size={28} className="mx-auto text-primary" />
                <h3 className="text-sm font-semibold">Email Support</h3>
                <p className="text-xs text-muted-foreground">For billing, account, and technical questions.</p>
                <a href="mailto:support@listhq.com.au" className="text-xs text-primary underline">support@listhq.com.au</a>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border">
              <CardContent className="p-5 text-center space-y-2">
                <Building2 size={28} className="mx-auto text-primary" />
                <h3 className="text-sm font-semibold">Agency Sales</h3>
                <p className="text-xs text-muted-foreground">Interested in an agency plan or white-label?</p>
                <a href="mailto:sales@listhq.com.au" className="text-xs text-primary underline">sales@listhq.com.au</a>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border">
              <CardContent className="p-5 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-primary" />
                <h3 className="text-sm font-semibold">Response Time</h3>
                <p className="text-xs text-muted-foreground">We aim to respond to all enquiries within 1 business day (AEST, Mon–Fri).</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              ListHQ is updated regularly with new features. If a feature described here is not yet visible in your dashboard, it will appear in an upcoming update. Check your billing plan to confirm which features are included in your subscription.
            </p>
          </div>

          <Card className="bg-card border border-amber-500/30">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-amber-600 flex-shrink-0" />
                <h3 className="text-sm font-semibold">AML/CTF Compliance — Action required by 1 July 2026</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                From 1 July 2026, all Australian real estate agents must enrol with AUSTRAC under the Anti-Money Laundering and Counter-Terrorism Financing Act. Enrolment must be completed by 29 July 2026. This applies to every agent selling or managing property — failure to enrol carries significant penalties.
              </p>
              <p className="text-xs text-muted-foreground">
                ListHQ is building AML compliance tools into the platform ahead of the deadline. In the meantime, enrol directly at AUSTRAC using the link below.
              </p>
              <a
                href="https://www.austrac.gov.au/business/how-comply-guidance-and-resources/enrolment-and-registration/how-enrol-austrac-online"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                Enrol with AUSTRAC
                <ExternalLink size={11} />
              </a>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold">Help us improve</h3>
              <p className="text-xs text-muted-foreground">
                Found a bug? Have a feature request? Use the thumbs-down button below any AI response, or email us directly. Every piece of feedback is read by the team.
              </p>
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <a href="mailto:feedback@listhq.com.au">Send feedback</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HelpPage;
