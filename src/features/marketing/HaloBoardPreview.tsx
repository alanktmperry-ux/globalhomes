import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Network, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Brief = {
  id?: string;
  initial: string;
  flag: string;
  language: string;
  intent: string;
  property: string;
  budget: string;
  suburbs: string;
  posted: string;
};

type BriefWithMeta = Brief & { isFallback?: boolean };

// Fallback briefs — only rendered to fill grid slots when fewer than 3 real halos exist.
const FALLBACK_BRIEFS: BriefWithMeta[] = [
  { isFallback: true, initial: "W", flag: "🇨🇳", language: "Mandarin", intent: "Buy", property: "House · 4+ bed", budget: "$1.2M – $1.6M", suburbs: "Auburn, Strathfield", posted: "Posted 2 hours ago" },
  { isFallback: true, initial: "M", flag: "🇻🇳", language: "Vietnamese", intent: "Buy", property: "Townhouse · 3 bed", budget: "$850K – $1.1M", suburbs: "Cabramatta, Bankstown", posted: "Posted yesterday" },
  { isFallback: true, initial: "P", flag: "🇮🇳", language: "Hindi", intent: "Buy", property: "House · 3+ bed", budget: "$900K – $1.3M", suburbs: "Parramatta, Westmead", posted: "Posted 3 days ago" },
];

const LANG_MAP: Record<string, { flag: string; name: string }> = {
  en: { flag: "🇬🇧", name: "English" },
  zh_simplified: { flag: "🇨🇳", name: "Mandarin" },
  zh_traditional: { flag: "🇭🇰", name: "Cantonese" },
  yue: { flag: "🇭🇰", name: "Cantonese" },
  vi: { flag: "🇻🇳", name: "Vietnamese" },
  hi: { flag: "🇮🇳", name: "Hindi" },
  pa: { flag: "🇮🇳", name: "Punjabi" },
  ko: { flag: "🇰🇷", name: "Korean" },
  ja: { flag: "🇯🇵", name: "Japanese" },
  th: { flag: "🇹🇭", name: "Thai" },
  id: { flag: "🇮🇩", name: "Indonesian" },
  ms: { flag: "🇲🇾", name: "Malay" },
  ar: { flag: "🇸🇦", name: "Arabic" },
  it: { flag: "🇮🇹", name: "Italian" },
  pt: { flag: "🇵🇹", name: "Portuguese" },
  ru: { flag: "🇷🇺", name: "Russian" },
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function fmtBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Budget flexible";
  if (min != null && max != null) return `${fmtMoney(min)} – ${fmtMoney(max)}`;
  if (max != null) return `Up to ${fmtMoney(max)}`;
  return `From ${fmtMoney(min)}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `Posted ${Math.max(1, mins)} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Posted ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Posted ${months} month${months === 1 ? "" : "s"} ago`;
}

function mapRow(
  row: {
    id: string;
    intent: string | null;
    property_types: string[] | null;
    bedrooms_min: number | null;
    bedrooms_max: number | null;
    suburbs: string[] | null;
    budget_min: number | null;
    budget_max: number | null;
    preferred_language: string | null;
    created_at: string;
  },
  seekerName?: string | null,
): BriefWithMeta {
  const lang = LANG_MAP[row.preferred_language ?? "en"] ?? { flag: "🌐", name: row.preferred_language ?? "English" };
  const propType = (row.property_types?.[0] ?? "Property").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  const beds =
    row.bedrooms_min != null && row.bedrooms_max != null && row.bedrooms_min !== row.bedrooms_max
      ? `${row.bedrooms_min}-${row.bedrooms_max} bed`
      : row.bedrooms_min != null
      ? `${row.bedrooms_min}+ bed`
      : null;
  const property = beds ? `${propType} · ${beds}` : propType;
  const suburbsArr = row.suburbs ?? [];
  const suburbs =
    suburbsArr.length === 0
      ? "Any suburb"
      : suburbsArr.length <= 2
      ? suburbsArr.join(", ")
      : `${suburbsArr.slice(0, 2).join(", ")} and ${suburbsArr.length - 2} more`;
  const intent = row.intent ? row.intent.charAt(0).toUpperCase() + row.intent.slice(1) : "Buy";
  const initial = seekerName && seekerName.trim() ? seekerName.trim().charAt(0).toUpperCase() : "?";
  return {
    id: row.id,
    initial,
    flag: lang.flag,
    language: lang.name,
    intent,
    property,
    budget: fmtBudget(row.budget_min, row.budget_max),
    suburbs,
    posted: relativeTime(row.created_at),
  };
}

const GRAD = "linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)";

/**
 * "Buyers tell you what they want." — Halo Board preview.
 * Three buyer brief cards demonstrating the reverse marketplace.
 */
export default function HaloBoardPreview() {
  const [briefs, setBriefs] = useState<BriefWithMeta[]>(FALLBACK_BRIEFS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("halos")
        .select("id, intent, property_types, bedrooms_min, bedrooms_max, suburbs, budget_min, budget_max, preferred_language, created_at, seeker_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (cancelled || error || !data || data.length === 0) return;

      const seekerIds = Array.from(new Set(data.map((d) => d.seeker_id).filter(Boolean))) as string[];
      const nameMap: Record<string, string> = {};
      if (seekerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, full_name")
          .in("id", seekerIds);
        (profiles ?? []).forEach((p: any) => {
          nameMap[p.id] = p.display_name || p.full_name || "";
        });
      }
      if (cancelled) return;

      const real: BriefWithMeta[] = data.map((row) => mapRow(row, nameMap[row.seeker_id as string]));
      const filled: BriefWithMeta[] = [...real, ...FALLBACK_BRIEFS.slice(real.length, 3)];
      setBriefs(filled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white">
      <div className="max-w-[1480px] mx-auto px-6 md:px-8 py-[100px] md:py-[140px]">
        <div className="max-w-[760px] mx-auto mb-[60px] text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
            <Network size={13} strokeWidth={1.6} />
            REVERSE MARKETPLACE
          </div>
          <h2 className="text-[clamp(40px,6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
            Buyers tell you
            <br />
            <span
              style={{
                background: GRAD,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              what they want.
            </span>
          </h2>
          <p className="text-[16px] md:text-[18px] font-normal text-[#4a4a4a] mt-5 leading-[1.55]">
            Halo briefs let active buyers post their criteria in their own language. You
            unlock the ones that match your listings. No cold calling. Just intent.
          </p>
        </div>

        <div className="halo-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {briefs.map((b, i) => (
            <div
              key={b.id ?? `fallback-${i}`}
              className="halo-card relative overflow-hidden bg-white border-2 border-[#E5E5E5] rounded-3xl p-7 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-[0_20px_50px_rgba(37,99,235,0.15)]"
            >
              <span
                aria-hidden
                className="halo-card-top absolute top-0 left-0 w-full h-1"
                style={{ background: GRAD, transform: "scaleX(0)", transformOrigin: "left", transition: "transform 400ms ease" }}
              />

              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white text-[16px] font-extrabold"
                  style={{ background: GRAD }}
                >
                  {b.initial}
                </div>
                <div className="bg-[#EFF6FF] border border-[#2563EB]/15 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#1E40AF] flex items-center gap-1.5">
                  <span>{b.flag}</span>
                  <span>{b.language}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  ["Intent", b.intent],
                  ["Property", b.property],
                  ["Budget", b.budget],
                  ["Suburbs", b.suburbs],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center gap-3">
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#6a6a6a]">
                      {label}
                    </span>
                    <span className="text-[14px] font-bold text-[#1a1a1a] text-right truncate">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-[11px] text-[#6a6a6a] font-semibold">{b.posted}</span>
                <Link
                  to={b.isFallback ? "/halo/about" : b.id ? `/halo/${b.id}` : "/dashboard/halo-board"}
                  className="px-4 py-2 text-white text-[12px] font-bold rounded-full flex items-center gap-1.5 cursor-pointer"
                  style={{ background: GRAD }}
                >
                  <Unlock size={12} strokeWidth={1.8} />
                  Unlock
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .halo-card:hover .halo-card-top { transform: scaleX(1) !important; }
      `}</style>
    </section>
  );
}
