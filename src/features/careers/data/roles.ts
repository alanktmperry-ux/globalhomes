export type CareersRole = {
  id: 'founding-engineer' | 'founding-designer' | 'head-of-growth' | 'agency-sales-lead' | 'customer-success-lead' | 'general';
  title: string;
  location: string;
  type: string;
  compensation: string;
  pitch: string;
  workOn: string[];
  fit: string[];
  bonus: string[];
};

export const CAREERS_ROLES: CareersRole[] = [
  {
    id: 'founding-engineer',
    title: 'Founding Engineer',
    location: 'Melbourne HQ or AU remote',
    type: 'Full-time',
    compensation: 'Competitive base + meaningful founding equity',
    pitch: 'Help us scale a multilingual real-estate platform that already replaces 5+ tools agencies use.',
    workOn: [
      'Shipping the next phase of trust accounting, Halo marketplace, voice listing AI, and multilingual real-time messaging',
      'Code review and architectural decisions across React + Vite + Supabase + Stripe',
      'Bringing the engineering quality bar up to Stripe / Linear standards — type safety, test coverage, performance',
    ],
    fit: [
      '5+ years building production SaaS, ideally in fintech, real estate, or marketplaces',
      'Deep React + TypeScript + PostgreSQL experience',
      "You've worked at a startup that scaled from <10 customers to >1000",
      "You care about quality (you don't ship `as any` because the deadline's tight)",
    ],
    bonus: [
      'Experience with Stripe billing, Supabase Edge Functions, AI/LLM integration',
      'Background in property tech or trust accounting domain',
    ],
  },
  {
    id: 'founding-designer',
    title: 'Founding Designer',
    location: 'Melbourne HQ or AU remote',
    type: 'Full-time',
    compensation: 'Competitive base + meaningful founding equity',
    pitch: 'Help ListHQ feel like Apple — premium, restrained, multicultural-respectful.',
    workOn: [
      'Design system: tokens, components, patterns across agent dashboard, seeker journey, and marketing site',
      'Pixel-level polish on every screen — we hold a Stripe / Linear quality bar',
      'Multilingual UX: ensure the experience in Mandarin or Vietnamese feels native, not translated',
    ],
    fit: [
      '5+ years in product design at a SaaS company that took craft seriously',
      'You think in systems AND pixels',
      "You've shipped a design system from scratch or owned a major one",
      'You care about typography, motion, and the small details that compound',
    ],
    bonus: [
      'Experience with multicultural / multilingual UX',
      'Background in real estate, fintech, or property tech',
    ],
  },
  {
    id: 'head-of-growth',
    title: 'Head of Growth',
    location: 'Melbourne HQ or AU remote',
    type: 'Full-time',
    compensation: 'Competitive base + meaningful founding equity',
    pitch: 'Own multicultural acquisition end-to-end — WeChat, Vietnamese media, Indian property networks, plus global referral.',
    workOn: [
      'End-to-end growth: performance marketing, content, SEO, GEO (AI search optimisation)',
      'Multicultural channels: WeChat, Vietnamese community media, Indian property networks',
      'Halo + agent acquisition funnels',
      'Global referral program — partners earning AUD $5–15k per settled deal',
    ],
    fit: [
      '5+ years growth marketing at a startup that scaled from PMF to scale',
      'Track record running paid acquisition + content + community',
      'You think in unit economics (CAC / LTV) and ship experiments weekly',
    ],
    bonus: [
      'You speak Mandarin, Vietnamese, Korean, Punjabi, or another community language',
    ],
  },
  {
    id: 'agency-sales-lead',
    title: 'Agency Sales Lead (BDM)',
    location: 'Melbourne-based, field role',
    type: 'Full-time',
    compensation: 'Base + commission + founding equity',
    pitch: 'Get ListHQ from 0 to 100 paying agencies in 12 months. You already know the Buxton / Marshall White / Belle Property world from the inside.',
    workOn: [
      'Direct sales to mid-market real estate agencies in Melbourne and Sydney',
      'Build relationships with principal agents and operations managers',
      'Demo the platform, run pilots, close annual contracts',
      'Build the agency-sales playbook from scratch — you set the standard',
    ],
    fit: [
      '5+ years SaaS or real-estate-tech sales (PropertyMe, Console Cloud, AgentBox, REA all count)',
      'You can name 50 principals in Melbourne agencies by first name',
      "You've closed $1M+ ARR in a quota year",
      "You're more excited about \"$22B from scratch\" than working at the incumbent",
    ],
    bonus: [],
  },
  {
    id: 'customer-success-lead',
    title: 'Customer Success Lead',
    location: 'Melbourne HQ or AU remote',
    type: 'Full-time',
    compensation: 'Competitive base + meaningful founding equity',
    pitch: "Make sure agencies don't just sign up — they activate trust accounting, migrate from PropertyMe, and get their first listing live.",
    workOn: [
      'Onboard every new agency end-to-end: trust accounting setup, data migration, training',
      'Build the onboarding playbook + success metrics',
      'Reduce time-to-first-listing from weeks to days',
      'Turn agencies into advocates who refer other agencies',
    ],
    fit: [
      '3+ years customer success at a complex B2B SaaS (especially fintech, accounting, real estate)',
      "You understand AFA 2014 trust accounting OR you're hungry to learn it fast",
      "You've run migrations or onboarding for 50+ enterprise customers",
      'Property management background is a major plus',
    ],
    bonus: [],
  },
  {
    id: 'general',
    title: 'General — Exceptional People Welcome',
    location: 'Melbourne HQ or AU remote',
    type: 'Full-time',
    compensation: 'Competitive base + meaningful founding equity',
    pitch: "Don't see your role? Tell us your story anyway.",
    workOn: [
      "We hire exceptional people whenever we find them — regardless of whether there's an open requisition",
    ],
    fit: [
      "You're a senior operator who's done something hard before",
      "You see the mission and pattern-match to a role we haven't named yet",
    ],
    bonus: [],
  },
];
