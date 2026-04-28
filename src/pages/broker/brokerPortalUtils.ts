/**
 * Shared utilities for the broker portal.
 */

export type LeadStatus = "new" | "contacted" | "meeting_booked" | "pre_approval" | "settled" | "lost";

export interface BrokerRecord {
  id: string;
  name: string;
  full_name: string | null;
  email: string;
  company: string | null;
  acl_number: string;
  loan_types: string[] | null;
  languages: string[] | null;
  is_exclusive: boolean | null;
  is_active: boolean;
  agency_id: string | null;
  agency_role: 'principal' | 'associate';
}

export interface ReferralLead {
  id: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_language: string | null;
  loan_type: string | null;
  estimated_loan_amount: number | null;
  message: string | null;
  status: LeadStatus;
  assigned_broker_id: string | null;
  claimed_at: string | null;
  response_time_hours: number | null;
  referral_fee_type: string | null;
  referral_fee_amount: number | null;
  platform_fee_amount: number | null;
  fee_agreed: boolean | null;
  fee_agreed_at: string | null;
  calendly_booking_url: string | null;
  ghl_contact_id: string | null;
  property_id: string | null;
  property_url: string | null;
  agent_id: string | null;
  settled_at: string | null;
}

export const LANGUAGE_FLAGS: Record<string, { flag: string; label: string; color: string }> = {
  en: { flag: "🇬🇧", label: "English", color: "bg-blue-100 text-blue-800 border-blue-200" },
  english: { flag: "🇬🇧", label: "English", color: "bg-blue-100 text-blue-800 border-blue-200" },
  zh: { flag: "🇨🇳", label: "Mandarin", color: "bg-teal-100 text-teal-800 border-teal-200" },
  mandarin: { flag: "🇨🇳", label: "Mandarin", color: "bg-teal-100 text-teal-800 border-teal-200" },
  zh_simplified: { flag: "🇨🇳", label: "Mandarin", color: "bg-teal-100 text-teal-800 border-teal-200" },
  vi: { flag: "🇻🇳", label: "Vietnamese", color: "bg-amber-100 text-amber-800 border-amber-200" },
  vietnamese: { flag: "🇻🇳", label: "Vietnamese", color: "bg-amber-100 text-amber-800 border-amber-200" },
};

export function getLanguageMeta(lang: string | null | undefined) {
  if (!lang) return null;
  const key = lang.toLowerCase();
  return LANGUAGE_FLAGS[key] ?? { flag: "🌐", label: lang, color: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function initialsFromName(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColorForLanguage(lang: string | null | undefined): string {
  const meta = getLanguageMeta(lang);
  if (!meta) return "bg-slate-200 text-slate-700";
  if (meta.label === "Mandarin") return "bg-teal-500 text-white";
  if (meta.label === "Vietnamese") return "bg-amber-500 text-white";
  return "bg-blue-500 text-white";
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  const last3 = digits.slice(-3);
  return `${digits.slice(0, 2)}** *** ${last3}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function hoursUntilExpiry(createdIso: string): number {
  const elapsedMs = Date.now() - new Date(createdIso).getTime();
  return Math.max(0, 24 - elapsedMs / 3600000);
}

export function formatCountdown(hoursLeft: number): string {
  if (hoursLeft <= 0) return "Expired";
  const h = Math.floor(hoursLeft);
  const m = Math.floor((hoursLeft - h) * 60);
  return `${h}h ${m}m left to claim`;
}

export function formatAud(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export function statusBadge(status: LeadStatus): { label: string; className: string } {
  switch (status) {
    case "new": return { label: "New", className: "bg-blue-100 text-blue-800 border-blue-200" };
    case "contacted": return { label: "Contacted", className: "bg-violet-100 text-violet-800 border-violet-200" };
    case "meeting_booked": return { label: "Meeting Booked", className: "bg-amber-100 text-amber-800 border-amber-200" };
    case "pre_approval": return { label: "Pre-approval", className: "bg-orange-100 text-orange-800 border-orange-200" };
    case "settled": return { label: "Settled", className: "bg-green-100 text-green-800 border-green-200" };
    case "lost": return { label: "Lost", className: "bg-slate-100 text-slate-600 border-slate-200" };
  }
}
