import { PlayCircle, Mic, CheckCircle2 } from "lucide-react";

const TRANSLATIONS = [
  { flag: "🇨🇳", name: "Mandarin", delay: 300 },
  { flag: "🇻🇳", name: "Vietnamese", delay: 500 },
  { flag: "🇰🇷", name: "Korean", delay: 700 },
  { flag: "🇸🇦", name: "Arabic", delay: 900 },
];

/**
 * "Speak it once. Reach everyone." — full-bleed blue gradient stage
 * with a glass demo card. Pure presentation, no functional logic.
 */
export default function VoiceListingShowcase() {
  return (
    <section
      className="relative overflow-hidden px-6 md:px-8 py-[100px] md:py-[140px]"
      style={{ background: "linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.10) 0%, transparent 50%)",
        }}
      />

      <div className="voice-grid max-w-[1480px] mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center relative z-10">
        {/* LEFT — copy */}
        <div>
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/15 border border-white/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-white backdrop-blur">
            <Mic size={13} strokeWidth={1.6} />
            FOR AGENTS
          </div>
          <h2 className="text-[clamp(40px,6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white mt-6">
            Speak it once.
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #ffffff, rgba(255,255,255,0.65))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Reach everyone.
            </span>
          </h2>
          <p className="text-[16px] md:text-[18px] font-normal text-white/85 mt-5 leading-[1.55] max-w-[480px]">
            Describe a property in your own voice. AI writes the listing copy in four tones,
            then translates it into six languages with Australian real-estate context.
            Forty-seven minutes back on every listing.
          </p>
          <button
            type="button"
            className="mt-9 inline-flex items-center gap-3 px-7 py-4 bg-white text-[#2563EB] rounded-full text-[15px] font-bold cursor-pointer transition-transform hover:scale-[1.03] hover:-translate-y-0.5"
          >
            Watch a 90-second demo
            <PlayCircle size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* RIGHT — glass demo card */}
        <div
          className="rounded-[28px] p-6 md:p-9 border border-white/20"
          style={{
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.20)",
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/55">
              Step 02 · Listening
            </span>
            <span className="flex items-center gap-2 text-[12px] font-semibold text-white">
              <span className="w-2 h-2 bg-[#F87171] rounded-full animate-pulse-rec" />
              Recording
            </span>
          </div>

          {/* Waveform */}
          <div className="flex items-end gap-[3px] h-[70px] mb-6">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 bg-white rounded-full animate-wave-bar"
                style={{
                  height: "100%",
                  transformOrigin: "center",
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            ))}
          </div>

          <div className="pt-5 border-t border-white/10">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/55">
              AI generated · Standard tone
            </div>
            <h3 className="text-[20px] md:text-[22px] font-extrabold text-white mt-2 leading-[1.2] tracking-[-0.02em]">
              Renovated North-Facing Family Home — Walk to Schools &amp; Station
            </h3>

            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/55 mt-6">
              Translations ready
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {TRANSLATIONS.map((tr) => (
                <div
                  key={tr.name}
                  className="bg-white/10 border border-white/15 rounded-xl px-3.5 py-3 flex items-center gap-2.5 text-[13px] font-semibold text-white animate-slide-r"
                  style={{ opacity: 0, animationDelay: `${tr.delay}ms` }}
                >
                  <span className="text-[16px] leading-none">{tr.flag}</span>
                  <span>{tr.name}</span>
                  <CheckCircle2 size={16} className="ml-auto text-[#34D399]" strokeWidth={2.2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wave-bar {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        .animate-wave-bar { animation: wave-bar 1.4s ease-in-out infinite; }
        @keyframes pulse-rec {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-pulse-rec { animation: pulse-rec 1.5s infinite; }
        @keyframes slide-r {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-r { animation: slide-r 0.6s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .animate-wave-bar, .animate-pulse-rec, .animate-slide-r {
            animation: none !important; opacity: 1 !important; transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
