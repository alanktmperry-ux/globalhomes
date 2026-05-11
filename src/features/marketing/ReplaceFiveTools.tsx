import { useEffect, useRef, useState } from "react";
import { Layers } from "lucide-react";

/**
 * "Replace five tools with one." — Bose-signature visual moment.
 * Large property hero with three thin-line callouts. Pure presentation.
 */
export default function ReplaceFiveTools() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = stageRef.current;
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
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const GRAD = "linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)";

  return (
    <section className="bg-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-[100px] md:py-[140px] overflow-visible">
        {/* Header */}
        <div className="max-w-[760px] mx-auto mb-16 md:mb-20 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
            <Layers size={13} strokeWidth={1.6} />
            ONE PLATFORM
          </div>
          <h2 className="text-[clamp(40px,6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
            Replace five tools
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
              with one.
            </span>
          </h2>
          <p className="text-[16px] md:text-[18px] font-normal text-[#4a4a4a] mt-5 leading-[1.55]">
            Listings, multilingual translation, Halo, CRM, trust accounting, property
            management. One subscription. One login. One source of truth.
          </p>
        </div>

        {/* Image stage with callouts */}
        <div ref={stageRef} className="relative max-w-[1200px] mx-auto">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=85&w=1800"
            alt="Modern Australian home"
            loading="lazy"
            className="w-full aspect-[16/9] object-cover rounded-3xl bg-[#FAFAFA]"
          />

          {/* Callout 1 — top-left, line points right into image */}
          <div
            className="replace-callout absolute flex items-center gap-3.5"
            style={{
              top: "14%",
              left: "-40px",
              opacity: visible ? undefined : 0,
              animation: visible ? "callout-in 0.8s ease forwards" : undefined,
              animationDelay: "0ms",
            }}
          >
            <CalloutCard number="Any" label="Language, auto-translated" />
            <CalloutLine direction="horizontal" dotSide="right" />
          </div>

          {/* Callout 2 — right-mid, line points left into image */}
          <div
            className="replace-callout absolute flex flex-row-reverse items-center gap-3.5"
            style={{
              top: "40%",
              right: "-60px",
              opacity: visible ? undefined : 0,
              animation: visible ? "callout-in 0.8s ease forwards" : undefined,
              animationDelay: "300ms",
            }}
          >
            <CalloutCard number="AI" label="Voice listing creation" />
            <CalloutLine direction="horizontal" dotSide="left" />
          </div>

          {/* Callout 3 — bottom-left, vertical line points up into image */}
          <div
            className="replace-callout absolute flex flex-col items-center gap-3.5"
            style={{
              bottom: "16%",
              left: "10%",
              opacity: visible ? undefined : 0,
              animation: visible ? "callout-in-up 0.8s ease forwards" : undefined,
              animationDelay: "600ms",
            }}
          >
            <CalloutLine direction="vertical" dotSide="top" />
            <CalloutCard number="7" suffix="M+" label="Multilingual buyers reached" />
          </div>
        </div>

        {/* Mobile simplified stat row (visible <1024px) */}
        <div className="replace-mobile-stats hidden grid-cols-3 gap-3 max-w-[640px] mx-auto mt-8">
          <MobileStat number="20" label="Languages" />
          <MobileStat number="AI" label="Voice listing" />
          <MobileStat number="7M+" label="Buyers reached" />
        </div>

        {/* The 5 tools being replaced */}
        <div className="mt-16 md:mt-20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 max-w-[1100px] mx-auto">
          {["REA & Domain", "PropertyMe", "Console Cloud", "AgentBox / Rex", "Lead-gen services"].map(
            (name) => (
              <div
                key={name}
                className="text-center py-5 px-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl"
              >
                <div className="text-[14px] md:text-[15px] font-bold text-[#6a6a6a] line-through decoration-[1.5px]">
                  {name}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes callout-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes callout-in-up {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1024px) {
          .replace-callout { display: none !important; }
          .replace-mobile-stats { display: grid !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .replace-callout { opacity: 1 !important; animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}

function CalloutCard({ number, suffix, label }: { number: string; suffix?: string; label: string }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl px-5 py-3.5 min-w-[200px] text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="text-[32px] font-extrabold tracking-[-0.03em] text-black tabular-nums leading-none">
        {number}
        {suffix && <span className="text-[18px] font-extrabold align-baseline">{suffix}</span>}
      </div>
      <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6a6a6a] mt-1.5">
        {label}
      </div>
    </div>
  );
}

function CalloutLine({
  direction,
  dotSide,
}: {
  direction: "horizontal" | "vertical";
  dotSide: "left" | "right" | "top" | "bottom";
}) {
  if (direction === "horizontal") {
    return (
      <div className="relative flex items-center" style={{ width: 80, height: 10 }}>
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2" style={{ height: 1.5, background: "#000" }} />
        <span
          className="absolute w-[10px] h-[10px] rounded-full bg-black top-1/2 -translate-y-1/2"
          style={dotSide === "right" ? { right: 0 } : { left: 0 }}
        />
      </div>
    );
  }
  return (
    <div className="relative flex justify-center" style={{ width: 10, height: 64 }}>
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2" style={{ width: 1.5, background: "#000" }} />
      <span
        className="absolute w-[10px] h-[10px] rounded-full bg-black left-1/2 -translate-x-1/2"
        style={dotSide === "top" ? { top: 0 } : { bottom: 0 }}
      />
    </div>
  );
}

function MobileStat({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center py-4 px-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl">
      <div className="text-[24px] font-extrabold tabular-nums text-black leading-none">{number}</div>
      <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#6a6a6a] mt-1.5">{label}</div>
    </div>
  );
}
