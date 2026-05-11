import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bed, Bath, Car, Sparkles, ArrowRight, MapPin } from "lucide-react";
import { resolveFeaturedListings } from "./featuredListingsData";
import { useGeoLocation } from "./useGeoLocation";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedRow {
  id: string;
  display_image_url: string | null;
  display_address: string;
  display_suburb: string;
  display_state: string;
  display_price: string;
  display_beds: number | null;
  display_baths: number | null;
  display_cars: number | null;
  display_languages: string[] | null;
  agent_name: string | null;
  agent_initials: string | null;
  agent_agency: string | null;
}

interface DisplayListing {
  id: string;
  imageUrl: string;
  address: string;
  suburb: string;
  state: string;
  price: string;
  beds: number;
  baths: number;
  cars: number;
  buyerLanguages: string[];
  agentName: string;
  agentInitials: string;
  agency: string;
}

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=85&w=900";

export default function FeaturedListings() {
  const geo = useGeoLocation();
  const fallback = resolveFeaturedListings(geo.suburb);
  const [listings, setListings] = useState<DisplayListing[]>(fallback);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Fetch live featured listings for the visitor's region with a graceful
  // fallback so the section is never empty. Order: region → state → any.
  useEffect(() => {
    let cancelled = false;

    const map = (rows: FeaturedRow[]): DisplayListing[] =>
      rows.map((r) => ({
        id: r.id,
        imageUrl: r.display_image_url || PLACEHOLDER_IMG,
        address: r.display_address,
        suburb: r.display_suburb,
        state: r.display_state,
        price: r.display_price,
        beds: r.display_beds || 0,
        baths: r.display_baths || 0,
        cars: r.display_cars || 0,
        buyerLanguages: r.display_languages || [],
        agentName: r.agent_name || "",
        agentInitials: r.agent_initials || "",
        agency: r.agent_agency || "",
      }));

    (async () => {
      try {
        // 1. Match by region
        let { data } = await supabase
          .from("featured_listings")
          .select(
            "id, display_image_url, display_address, display_suburb, display_state, display_price, display_beds, display_baths, display_cars, display_languages, agent_name, agent_initials, agent_agency"
          )
          .eq("status", "active")
          .eq("region", geo.region)
          .order("display_priority", { ascending: false })
          .limit(6);

        // 2. Fall back to same state
        if (!data || data.length < 3) {
          const { data: stateData } = await supabase
            .from("featured_listings")
            .select(
              "id, display_image_url, display_address, display_suburb, display_state, display_price, display_beds, display_baths, display_cars, display_languages, agent_name, agent_initials, agent_agency"
            )
            .eq("status", "active")
            .eq("state", geo.state)
            .order("display_priority", { ascending: false })
            .limit(6);
          if (stateData && stateData.length > (data?.length || 0)) data = stateData;
        }

        // 3. Final fallback: any active listing
        if (!data || data.length < 3) {
          const { data: anyData } = await supabase
            .from("featured_listings")
            .select(
              "id, display_image_url, display_address, display_suburb, display_state, display_price, display_beds, display_baths, display_cars, display_languages, agent_name, agent_initials, agent_agency"
            )
            .eq("status", "active")
            .order("display_priority", { ascending: false })
            .limit(6);
          if (anyData && anyData.length > (data?.length || 0)) data = anyData;
        }

        if (!cancelled && data && data.length > 0) {
          setListings(map(data as FeaturedRow[]));
        }
      } catch {
        /* keep fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geo.region, geo.state]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);


  return (
    <section ref={sectionRef} className="bg-white px-6 md:px-8 py-20 md:py-24">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-12 flex-wrap gap-6">
          <div>
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#2563EB] flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] relative inline-block">
                <span className="absolute inset-0 rounded-full bg-[#2563EB] animate-ping" />
              </span>
              BOOSTED LISTINGS · NEAR YOU
            </div>
            <h2 className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-0.03em] leading-[1.1] text-black">
              Featured in{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                {geo.display}
              </span>
            </h2>
            <p className="text-[15px] text-[#6a6a6a] mt-2 max-w-[600px]">
              Hand-picked homes near you, presented by multilingual agents.
            </p>
          </div>
          <button
            type="button"
            className="text-[13px] font-semibold text-[#4a4a4a] inline-flex items-center gap-1.5 border border-[#E5E5E5] px-4 py-2.5 rounded-full bg-white hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer"
          >
            <MapPin size={14} />
            Change location
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l, i) => (
            <Link
              key={l.id}
              to="/buy"
              className={`group block rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden hover:border-[#2563EB] hover:shadow-[0_12px_40px_rgba(37,99,235,0.12)] transition-all ${
                visible ? "animate-fade-up-stagger" : ""
              }`}
              style={{
                animationDelay: `${i * 100}ms`,
                opacity: visible ? undefined : 0,
              }}
            >
              <div className="relative h-[220px] w-full overflow-hidden bg-[#F3F4F6]">
                <img
                  src={l.imageUrl}
                  alt={`${l.address}, ${l.suburb}`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                  <Sparkles size={10} /> Boosted
                </span>
                {l.buyerLanguages.length > 0 && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[12px]">
                    {l.buyerLanguages.slice(0, 4).map((f, idx) => (
                      <span key={idx}>{f}</span>
                    ))}
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6a6a6a] mb-1.5">
                  {l.suburb}, {l.state}
                </div>
                <h3 className="text-[16px] font-bold text-[#0a0f1e] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors min-h-[44px]">
                  {l.address}
                </h3>
                <div className="text-[22px] font-extrabold text-[#0a0f1e] tabular-nums mt-2">
                  {l.price}
                </div>
                <div className="flex items-center gap-4 text-[12px] text-[#4a4a4a] font-medium mt-3">
                  <span className="inline-flex items-center gap-1"><Bed size={13} /> {l.beds}</span>
                  <span className="inline-flex items-center gap-1"><Bath size={13} /> {l.baths}</span>
                  <span className="inline-flex items-center gap-1"><Car size={13} /> {l.cars}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F0F0F0] gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {l.agentInitials}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#0a0f1e] truncate">{l.agentName}</div>
                      <div className="text-[11px] text-[#6a6a6a] truncate">{l.agency}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E5E5] flex justify-between items-center flex-wrap gap-4">
          <p className="text-xs text-[#6a6a6a] font-medium max-w-[540px] leading-relaxed">
            <strong>Boosted listings</strong> are paid placements by agents in your area, ranked by recency and relevance. Want your listing here?{" "}
            <Link to="/dashboard/listings" className="text-[#2563EB] font-bold hover:underline">
              Boost a listing →
            </Link>
          </p>
          <Link
            to="/buy"
            className="text-[13px] font-bold text-[#2563EB] inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
          >
            See all {geo.display} listings <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
