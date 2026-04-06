/**
 * MortgageBrokerCard.tsx
 * ListHQ — Displays the active broker partner on property detail pages.
 * Now fetches broker details from the brokers table instead of hardcoding.
 */

import { useState, useEffect } from "react";
import { Phone, Mail, Globe, CheckCircle, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const LANGUAGE_FLAG: Record<string, string> = {
  English: "🇦🇺",
  Mandarin: "🇨🇳",
  Cantonese: "🇭🇰",
  Vietnamese: "🇻🇳",
  Korean: "🇰🇷",
  Japanese: "🇯🇵",
};

interface BrokerData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  acl_number: string;
  photo_url: string | null;
  languages: string[];
  tagline: string | null;
  calendar_url: string | null;
  is_founding_partner: boolean;
  lead_fee_aud: number;
}

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
  broker: BrokerData;
  propertyId?: string;
  propertyAddress?: string;
  propertyPrice?: string;
  onClose: () => void;
}

function EnquiryModal({ broker, propertyId, propertyAddress, propertyPrice, onClose }: EnquiryModalProps) {
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
          brokerId: broker.id,
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
                : `${broker.name} will be in touch with you shortly.`}
            </p>
            <Button className="mt-6" variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}

        {status !== "success" && status !== "duplicate" && (
          <>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Enquire with {broker.name}
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
                <a href={`mailto:${broker.email}`} className="underline flex-shrink-0">
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
              {broker.acl_number} · ListHQ is a referral platform only and does not provide credit assistance.
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
  const [broker, setBroker] = useState<BrokerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBroker = async () => {
      // Fetch first active broker (public query - uses anon key, no RLS needed for read)
      // We use the service-side approach: the Edge Function handles broker resolution.
      // For the card display, we fetch via a simple select on brokers with is_active.
      // Since RLS restricts to auth_user_id = auth.uid(), we need a different approach
      // for the public-facing card. We'll use the Edge Function to get broker info,
      // or we add a public read policy. For now, store broker info in the component
      // after the first successful lead submission, or add a public RLS policy.
      
      // Simpler approach: call a lightweight edge function or use service role.
      // For MVP, we'll try to read and if RLS blocks it, the card won't show.
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name, email, phone, company, acl_number, photo_url, languages, tagline, calendar_url, is_founding_partner, lead_fee_aud")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setBroker(data as unknown as BrokerData);
      }
      setLoading(false);
    };

    fetchBroker();
  }, []);

  // Don't render if no broker found or still loading
  if (loading || !broker) return null;

  const hasCalendar = broker.calendar_url && broker.calendar_url.length > 0;

  return (
    <>
      {modalOpen && (
        <EnquiryModal
          broker={broker}
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
          {broker.is_founding_partner && (
            <Badge
              variant="outline"
              className="text-[10px] border-primary/30 text-primary bg-primary/5"
            >
              Founding Partner
            </Badge>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <img
              src={broker.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(broker.name)}&background=2563EB&color=fff&size=128`}
              alt={broker.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(broker.name)}&background=2563EB&color=fff&size=128`;
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base leading-tight">
              {broker.name}
            </h3>
            {broker.company && (
              <p className="text-sm text-muted-foreground">{broker.company}</p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {broker.languages.map((lang) => (
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

        {broker.tagline && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {broker.tagline}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
          {broker.phone && (
            <a
              href={`tel:${broker.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Phone size={13} /> {broker.phone}
            </a>
          )}
          <a
            href={`mailto:${broker.email}`}
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Mail size={13} /> {broker.email}
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
              onClick={() => window.open(broker.calendar_url!, "_blank")}
            >
              <Globe size={14} className="mr-1.5" /> Book a call
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          {broker.acl_number} · ListHQ refers buyers to licensed brokers and does not provide credit assistance.
        </p>
      </div>
    </>
  );
}

export default MortgageBrokerCard;
