import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Final closing CTA — dark ink full-bleed with subtle blue radial glow.
 */
export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-[#0a0f1e] text-white px-6 md:px-8 py-[120px] md:py-[180px]">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(37,99,235,0.30) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(79,136,255,0.20) 0%, transparent 40%)",
        }}
      />

      <div className="max-w-[1200px] mx-auto text-center relative z-10">
        <h2 className="text-[clamp(48px,9vw,140px)] font-extrabold leading-[0.90] tracking-[-0.05em] text-white">
          The language barrier
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #93C5FD 0%, #4F88FF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            ends here.
          </span>
        </h2>
        <p className="text-[17px] md:text-[19px] text-white/70 mt-8 max-w-[580px] mx-auto leading-[1.55]">
          Join the founding 100 agents. 60 days free. Locked pricing for 12 months.
        </p>

        <div className="flex gap-3.5 justify-center mt-12 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/agents/register")}
            className="px-7 md:px-9 py-4 bg-white text-[#2563EB] rounded-full text-[15px] md:text-[16px] font-extrabold cursor-pointer inline-flex items-center gap-2.5 transition-all hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_16px_50px_rgba(255,255,255,0.20)]"
          >
            Start free trial
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="px-7 md:px-9 py-4 bg-transparent text-white border-2 border-white/30 rounded-full text-[15px] md:text-[16px] font-bold cursor-pointer transition-all hover:bg-white/10 hover:border-white/60"
          >
            Book a demo
          </button>
        </div>
      </div>
    </section>
  );
}
