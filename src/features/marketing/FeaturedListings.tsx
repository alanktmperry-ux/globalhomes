import { Link } from "react-router-dom";
import { Bed, Bath, Car, Sparkles, ArrowRight } from "lucide-react";
import { FEATURED_LISTINGS } from "./featuredListingsData";
import { useGeoLocation } from "./useGeoLocation";

/**
 * "Featured in [Location]" — boosted-listing grid (3×2 on desktop).
 * Static placeholder data; swap `FEATURED_LISTINGS` for a Supabase query
 * when the featured_listings table + Halo Boost billing ship.
 */
export default function FeaturedListings() {
  const geo = useGeoLocation();

  return (
    <section className="bg-white px-6 md:px-8 py-20 md:py-24">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563EB] mb-3 inline-flex items-center gap-1.5">
              <Sparkles size={12} /> Boosted listings
            </div>
            <h2 className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-0.03em] leading-[1.1] text-black">
              Featured in <span
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >{geo.display}</span>
            </h2>
            <p className="text-[15px] text-[#6a6a6a] mt-2 max-w-[600px]">
              Hand-picked homes near you, presented by multilingual agents.
            </p>
          </div>
          <Link
            to="/buy"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1a1a1a] hover:text-[#2563EB] transition-colors"
          >
            View all listings <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_LISTINGS.map((l, i) => (
            <Link
              key={l.id}
              to={l.href}
              className="group block rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden hover:border-[#2563EB] hover:shadow-[0_12px_40px_rgba(37,99,235,0.12)] transition-all opacity-0 animate-fade-up"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div
                className="relative h-[200px] w-full"
                style={{ background: l.image ? `url(${l.image}) center/cover` : l.gradient }}
              >
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                  <Sparkles size={10} /> Boosted
                </span>
                <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold">
                  {l.propertyType}
                </span>
              </div>
              <div className="p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6a6a6a] mb-1.5">
                  {l.suburb}, {l.state}
                </div>
                <h3 className="text-[16px] font-bold text-[#0a0f1e] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors min-h-[44px]">
                  {l.title}
                </h3>
                <div className="text-[22px] font-extrabold text-[#0a0f1e] tabular-nums mt-2">
                  {l.price}
                </div>
                <div className="flex items-center gap-4 text-[12px] text-[#4a4a4a] font-medium mt-3">
                  <span className="inline-flex items-center gap-1"><Bed size={13} /> {l.beds}</span>
                  <span className="inline-flex items-center gap-1"><Bath size={13} /> {l.baths}</span>
                  <span className="inline-flex items-center gap-1"><Car size={13} /> {l.cars}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F0F0F0]">
                  <span className="text-[12px] text-[#4a4a4a] font-medium truncate">{l.agentName}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {l.agentLanguages.slice(0, 3).map((lang) => (
                      <span
                        key={lang}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
