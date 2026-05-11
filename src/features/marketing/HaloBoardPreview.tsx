import { Network, Unlock } from "lucide-react";

const BRIEFS = [
  {
    initial: "W",
    flag: "🇨🇳",
    language: "Mandarin",
    intent: "Buy",
    property: "House · 4+ bed",
    budget: "$1.2M – $1.6M",
    suburbs: "Auburn, Strathfield",
    posted: "Posted 2 hours ago",
  },
  {
    initial: "M",
    flag: "🇻🇳",
    language: "Vietnamese",
    intent: "Buy",
    property: "Townhouse · 3 bed",
    budget: "$850K – $1.1M",
    suburbs: "Cabramatta, Bankstown",
    posted: "Posted yesterday",
  },
  {
    initial: "P",
    flag: "🇮🇳",
    language: "Hindi",
    intent: "Buy",
    property: "House · 3+ bed",
    budget: "$900K – $1.3M",
    suburbs: "Parramatta, Westmead",
    posted: "Posted 3 days ago",
  },
];

const GRAD = "linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)";

/**
 * "Buyers tell you what they want." — Halo Board preview.
 * Three buyer brief cards demonstrating the reverse marketplace.
 */
export default function HaloBoardPreview() {
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
          {BRIEFS.map((b) => (
            <div
              key={b.initial}
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
                <button
                  type="button"
                  className="px-4 py-2 text-white text-[12px] font-bold rounded-full flex items-center gap-1.5 cursor-pointer"
                  style={{ background: GRAD }}
                >
                  <Unlock size={12} strokeWidth={1.8} />
                  Unlock
                </button>
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
