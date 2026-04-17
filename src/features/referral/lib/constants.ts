export const REFERRAL_COUNTRIES = [
  'China', 'Singapore', 'Malaysia', 'Hong Kong', 'Japan', 'South Korea',
  'USA', 'UK', 'India', 'Vietnam', 'Thailand', 'Indonesia', 'UAE', 'Other',
] as const;

export const REFERRAL_LANGUAGES: { code: string; label: string }[] = [
  { code: 'zh', label: 'Chinese (Simplified) — 简体中文' },
  { code: 'zh-TW', label: 'Chinese (Traditional) — 繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese — 日本語' },
  { code: 'ko', label: 'Korean — 한국어' },
  { code: 'ms', label: 'Malay — Bahasa Melayu' },
  { code: 'th', label: 'Thai — ไทย' },
  { code: 'vi', label: 'Vietnamese — Tiếng Việt' },
];

export type ReferralTier = 'standard' | 'silver' | 'gold' | 'platinum';

export const TIER_COMMISSION_AUD: Record<ReferralTier, number> = {
  standard: 500,
  silver: 750,
  gold: 1000,
  platinum: 2000,
};

export const TIER_THRESHOLDS: { tier: ReferralTier; minSettled: number }[] = [
  { tier: 'standard', minSettled: 0 },
  { tier: 'silver', minSettled: 3 },
  { tier: 'gold', minSettled: 10 },
  { tier: 'platinum', minSettled: 25 },
];

export const TIER_STYLES: Record<ReferralTier, { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-muted text-muted-foreground border-border' },
  silver: { label: 'Silver', className: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200' },
  gold: { label: 'Gold', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200' },
  platinum: { label: 'Platinum', className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200' },
};

export const LEAD_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new:       { label: 'New',       className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  contacted: { label: 'Contacted', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
  viewing:   { label: 'Viewing',   className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  offer:     { label: 'Offer',     className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' },
  settled:   { label: 'Settled',   className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' },
  lost:      { label: 'Lost',      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
};
