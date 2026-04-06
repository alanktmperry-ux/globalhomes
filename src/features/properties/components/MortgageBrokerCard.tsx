/**
 * MortgageBrokerCard.tsx
 * ListHQ — Founding Partner mortgage broker placement
 */

import { useState } from "react";
import { Phone, Mail, Globe, CheckCircle, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ─── BROKER DETAILS — fill in before deploying ───────────────────────────────
const BROKER = {
  name: "[FILL IN: Broker Full Name]",
  title: "[FILL IN: e.g. Senior Mortgage Broker]",
  company: "[FILL IN: Company / Brokerage Name]",
  photo: "[FILL IN: URL to broker headshot]",
  phone: "[FILL IN: 04XX XXX XXX]",
  email: "[FILL IN: broker@example.com.au]",
  acl: "[FILL IN: ACL No. XXXXXX]",
  languages: ["English", "Mandarin", "Cantonese"] as string[],
  tagline: "Finance specialist for international buyers in Sydney & Melbourne.",
  calendarUrl: "",
} as const;

const LANGUAGE_FLAG: Record<string, string> = {
  English: "🇦🇺",
  Mandarin: "🇨🇳",
  Cantonese: "🇭🇰",
  Vietnamese: "🇻🇳",
  Korean: "🇰🇷",
  Japanese: "🇯🇵",
};

interface MortgageBrokerCardProps {
  propertyId?: string;
  propertyAddress?: string;
  propertyPrice?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "duplicate" | "error";

interface EnquiryModalProps {
  propertyId?: string;
  propertyAddress?: string;
  propertyPrice?: string;
  onClose: () => void;
}

function EnquiryModal({ propertyId, propertyAddress, propertyPrice, onClose }: EnquiryModalProps) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValid = form.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  const handleSubmit = async () => {
    if (!isValid || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("send-broker-lead", {
        body: {
          buyerName: form.name.trim(),
          buyerEmail: form.email.trim(),
          buyerPhone: form.phone.trim() || undefined,
          buyerMessage: form.message.trim() || undefined,
          propertyId,
          propertyAddress,
          propertyPrice,
        },
      });

      if (error) throw error;
      setStatus(data?.isDuplicate ? "duplicate" : "success");
    } catch (err) {
      console.error("Broker lead submission failed:", err);
      setErrorMsg("Something went wrong — please try emailing the broker directly.");
      setStatus("error");
    }
  };

  const field = (
    key: keyof FormState,
    placeholder: string,
    type = "text",
    multiline = false
  ) => {
    const baseClass =
      "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground " +
      "focus:outline-none focus:ring-2 focus:ring-primary transition-shadow";

    return multiline ? (
      <textarea
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        rows={3}
        className={`${baseClass} resize-none`}
      />
    ) : (
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={baseClass}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        {(status === "success" || status === "duplicate") && (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {status === "duplicate" ? "Already received" : "Enquiry sent"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {status === "duplicate"
                ? "We already have an enquiry from you for this property. The broker will be in touch."
                : `${BROKER.name} will be in touch with you shortly.`}
            </p>
            <Button className="mt-6" variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}

        {status !== "success" && status !== "duplicate" && (
          <>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Enquire with {BROKER.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {propertyAddress
                ? `Get pre-approval advice for ${propertyAddress}.`
                : "Get pre-approval advice for this property."}
            </p>

            <div className="space-y-3">
              {field("name", "Your name *")}
              {field("email", "Email address *", "email")}
              {field("phone", "Phone (optional)", "tel")}
              {field("message", "Any questions about financing this property?", "text", true)}
            </div>

            {status === "error" && (
              <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
                <span>{errorMsg}</span>
                <a href={`mailto:${BROKER.email}`} className="underline flex-shrink-0">
                  Email broker
                </a>
              </div>
            )}

            <Button
              className="w-full mt-4 h-10"
              onClick={handleSubmit}
              disabled={!isValid || status === "loading"}
            >
              {status === "loading" ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Sending…</>
              ) : (
                "Send enquiry"
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground mt-3 text-center leading-relaxed">
              {BROKER.acl} · ListHQ is a referral platform only and does not provide credit assistance.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function MortgageBrokerCard({
  propertyId,
  propertyAddress,
  propertyPrice,
}: MortgageBrokerCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasCalendar = BROKER.calendarUrl.length > 0 && !BROKER.calendarUrl.startsWith("[FILL");

  return (
    <>
      {modalOpen && (
        <EnquiryModal
          propertyId={propertyId}
          propertyAddress={propertyAddress}
          propertyPrice={propertyPrice}
          onClose={() => setModalOpen(false)}
        />
      )}

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Finance this property
          </span>
          <Badge
            variant="outline"
            className="text-[10px] border-primary/30 text-primary bg-primary/5"
          >
            Founding Partner
          </Badge>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <img
              src={BROKER.photo}
              alt={BROKER.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(BROKER.name)}&background=2563EB&color=fff&size=128`;
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base leading-tight">
              {BROKER.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{BROKER.title}</p>
            <p className="text-sm text-muted-foreground">{BROKER.company}</p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {BROKER.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-background border border-border rounded-full px-2 py-0.5 text-muted-foreground"
                >
                  {LANGUAGE_FLAG[lang] ?? "🌐"} {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {BROKER.tagline}
        </p>

        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
          <a
            href={`tel:${BROKER.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Phone size={13} /> {BROKER.phone}
          </a>
          <a
            href={`mailto:${BROKER.email}`}
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Mail size={13} /> {BROKER.email}
          </a>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 text-sm h-9"
            onClick={() => setModalOpen(true)}
          >
            Get pre-approval advice
          </Button>
          {hasCalendar && (
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => window.open(BROKER.calendarUrl, "_blank")}
            >
              <Globe size={14} className="mr-1.5" /> Book a call
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          {BROKER.acl} · ListHQ refers buyers to licensed brokers and does not provide credit assistance.
        </p>
      </div>
    </>
  );
}

export default MortgageBrokerCard;
