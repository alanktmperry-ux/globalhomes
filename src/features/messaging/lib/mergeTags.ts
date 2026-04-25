// Merge-tag library + resolver for message templates.
// Tags are written as {{namespace.field}}. Unknown tags are left as-is so the
// agent can spot them in preview before sending.

export type MergeTag = {
  tag: string;          // canonical "{{contact.first_name}}"
  label: string;        // human label for picker
  group: 'Contact' | 'Property' | 'Agent' | 'Inspection';
};

export const MERGE_TAGS: MergeTag[] = [
  // Contact
  { tag: '{{contact.first_name}}', label: 'First name', group: 'Contact' },
  { tag: '{{contact.last_name}}', label: 'Last name', group: 'Contact' },
  { tag: '{{contact.preferred_language}}', label: 'Preferred language', group: 'Contact' },
  // Property
  { tag: '{{property.address}}', label: 'Address', group: 'Property' },
  { tag: '{{property.suburb}}', label: 'Suburb', group: 'Property' },
  { tag: '{{property.price}}', label: 'Price', group: 'Property' },
  // Agent
  { tag: '{{agent.name}}', label: 'Agent name', group: 'Agent' },
  { tag: '{{agent.phone}}', label: 'Agent phone', group: 'Agent' },
  { tag: '{{agent.email}}', label: 'Agent email', group: 'Agent' },
  // Inspection (optional context)
  { tag: '{{inspection.date}}', label: 'Inspection date', group: 'Inspection' },
  { tag: '{{inspection.time}}', label: 'Inspection time', group: 'Inspection' },
];

export const ALL_TAG_STRINGS = MERGE_TAGS.map((t) => t.tag);

export interface MergeContext {
  contact?: {
    first_name?: string | null;
    last_name?: string | null;
    preferred_language?: string | null;
  };
  property?: {
    address?: string | null;
    suburb?: string | null;
    price?: number | string | null;
  };
  agent?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  inspection?: {
    date?: string | null;
    time?: string | null;
  };
}

const formatPrice = (p: number | string | null | undefined): string => {
  if (p == null || p === '') return '';
  const n = typeof p === 'string' ? Number(p) : p;
  if (!Number.isFinite(n)) return String(p);
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Resolve all known merge tags. Unknown tags are preserved verbatim so the
 * sender notices them and can fix the data or pick another template.
 */
export function resolveMergeTags(text: string, ctx: MergeContext): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-z_]+)\.([a-z_]+)\s*\}\}/gi, (match, ns, field) => {
    const namespace = String(ns).toLowerCase();
    const key = String(field).toLowerCase();
    switch (namespace) {
      case 'contact': {
        const v = ctx.contact?.[key as keyof MergeContext['contact'] & string];
        return v != null && v !== '' ? String(v) : match;
      }
      case 'property': {
        if (key === 'price') return formatPrice(ctx.property?.price) || match;
        const v = ctx.property?.[key as keyof MergeContext['property'] & string];
        return v != null && v !== '' ? String(v) : match;
      }
      case 'agent': {
        const v = ctx.agent?.[key as keyof MergeContext['agent'] & string];
        return v != null && v !== '' ? String(v) : match;
      }
      case 'inspection': {
        if (key === 'date') return formatDate(ctx.inspection?.date) || match;
        const v = ctx.inspection?.[key as keyof MergeContext['inspection'] & string];
        return v != null && v !== '' ? String(v) : match;
      }
      default:
        return match;
    }
  });
}

/** Extract the set of merge-tag strings actually present in a text body. */
export function extractMergeTags(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const re = /\{\{\s*[a-z_]+\.[a-z_]+\s*\}\}/gi;
  for (const m of text.matchAll(re)) {
    found.add(m[0].replace(/\s+/g, ''));
  }
  return Array.from(found);
}

/** Map a contact's preferred_language code to a template language key. */
export function pickTemplateLanguage(
  available: string[],
  preferred: string | null | undefined,
): string {
  if (!preferred) return 'en';
  const p = preferred.toLowerCase();
  // Cantonese → Traditional Chinese (per project memory: features/contact-languages)
  if (p === 'yue' || p === 'zh-hk' || p === 'zh_traditional' || p === 'zh-tw') {
    if (available.includes('zh_traditional')) return 'zh_traditional';
    if (available.includes('zh_simplified')) return 'zh_simplified';
  }
  if (p === 'zh' || p === 'zh-cn' || p === 'zh_simplified') {
    if (available.includes('zh_simplified')) return 'zh_simplified';
  }
  if (p === 'vi' || p === 'vie') {
    if (available.includes('vi')) return 'vi';
  }
  if (available.includes(p)) return p;
  return 'en';
}

export const TEMPLATE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh_simplified', label: '简体中文' },
  { code: 'zh_traditional', label: '繁體中文' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const;

export const TEMPLATE_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'in_app', label: 'In-app' },
] as const;

export const TEMPLATE_CATEGORIES = [
  { value: 'lead_followup', label: 'Lead follow-up' },
  { value: 'open_home', label: 'Open home' },
  { value: 'under_offer', label: 'Under offer' },
  { value: 'settled', label: 'Settled' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'custom', label: 'Custom' },
] as const;

export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number]['value'];
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]['value'];
export type TemplateLanguage = (typeof TEMPLATE_LANGUAGES)[number]['code'];
