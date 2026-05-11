import { useNavigate } from "react-router-dom";
import { Tag, CheckCircle2 } from "lucide-react";

const GRAD = "linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Solo",
    price: "$799",
    description: "For independent agents managing their own portfolio.",
    features: [
      "Unlimited multilingual listings",
      "50 Halo credits per month",
      "Voice listing creation",
      "Basic CRM, 500 contacts",
    ],
  },
  {
    name: "Agency",
    price: "$1,999",
    description: "For agencies up to 5 agents. Full PM + trust accounting.",
    features: [
      "Everything in Solo, plus:",
      "Up to 5 agent seats",
      "Trust accounting + reconciliation",
      "Property management suite",
      "200 Halo credits per month",
    ],
    featured: true,
  },
  {
    name: "Agency Pro",
    price: "$3,499",
    description: "For franchises and large agencies. Up to 15 seats.",
    features: [
      "Everything in Agency, plus:",
      "Up to 15 agent seats",
      "Unlimited Halo credits",
      "Commission calculator",
      "Dedicated account manager",
    ],
  },
];

export default function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="bg-[#F9FAFB] px-6 md:px-8 py-[100px] md:py-[140px]">
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-[720px] mx-auto mb-16 md:mb-20 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-[#1E40AF]">
            <Tag size={13} strokeWidth={1.6} />
            PRICING
          </div>
          <h2 className="text-[clamp(40px,6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-black mt-5">
            Pick your
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
              plan.
            </span>
          </h2>
          <p className="text-[16px] md:text-[18px] font-normal text-[#4a4a4a] mt-5 leading-[1.55] max-w-[640px] mx-auto">
            Founding members lock in lower pricing for twelve months. Sixty days free. Cancel anytime.
          </p>
        </div>

        <div className="pricing-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                p.featured
                  ? "relative rounded-3xl p-8 md:p-10 transition-all duration-300 bg-gradient-to-b from-white to-[#EFF6FF] border-2 border-[#2563EB] shadow-[0_24px_60px_rgba(37,99,235,0.15)]"
                  : "relative rounded-3xl p-8 md:p-10 bg-white border border-[#E5E5E5] transition-all duration-300 hover:border-[#2563EB] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(37,99,235,0.10)]"
              }
            >
              {p.featured && (
                <span
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-white text-[10px] font-extrabold tracking-[0.14em] uppercase whitespace-nowrap shadow-[0_4px_14px_rgba(37,99,235,0.40)]"
                  style={{ background: GRAD }}
                >
                  Most Popular
                </span>
              )}

              <div className="text-[12px] font-bold tracking-[0.16em] uppercase text-[#6a6a6a]">
                {p.name}
              </div>
              <div className="text-[56px] md:text-[64px] font-extrabold tracking-[-0.04em] text-black mt-4 leading-none tabular-nums">
                {p.price}
                <span className="text-[16px] md:text-[18px] font-bold text-[#6a6a6a] ml-1">/mo</span>
              </div>
              <p className="text-[14px] text-[#4a4a4a] mt-3.5 leading-[1.55]">{p.description}</p>

              <div className="mt-8 pt-6 border-t border-[#E5E5E5] flex flex-col gap-3">
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-[14px] text-[#4a4a4a]">
                    <CheckCircle2 size={18} className="text-[#2563EB] mt-0.5 flex-shrink-0" strokeWidth={2.2} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate("/agents/register")}
                className={
                  p.featured
                    ? "w-full mt-7 py-3.5 text-white rounded-xl text-[14px] font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.40)]"
                    : "w-full mt-7 py-3.5 bg-white text-black border border-black rounded-xl text-[14px] font-bold cursor-pointer transition-all hover:bg-black hover:text-white"
                }
                style={p.featured ? { background: GRAD } : undefined}
              >
                Start free trial
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
