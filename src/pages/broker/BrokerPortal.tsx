/**
 * BrokerPortal.tsx
 * Broker portal dashboard — sidebar nav, stats, lead queue, detail panel.
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Calendar, Webhook, CheckCircle2, AlertCircle, Mail, Phone, Home as HomeIcon } from "lucide-react";
import { toast } from "sonner";
import BrokerPortalLayout, { type PortalTab } from "./BrokerPortalLayout";
import {
  type BrokerRecord,
  type ReferralLead,
  initialsFromName,
  avatarColorForLanguage,
  maskPhone,
  timeAgo,
  hoursUntilExpiry,
  formatCountdown,
  formatAud,
  statusBadge,
  getLanguageMeta,
} from "./brokerPortalUtils";

const GHL_WEBHOOK_URL = (import.meta.env.VITE_GHL_WEBHOOK_URL as string) || "";
const CALENDLY_URL = (import.meta.env.VITE_CALENDLY_URL as string) || "";

export default function BrokerPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState<BrokerRecord | null>(null);
  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [tab, setTab] = useState<PortalTab>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("referral_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[BrokerPortal] loadLeads error:", error);
      return;
    }
    setLeads((data ?? []) as ReferralLead[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/broker/login");
        return;
      }
      const { data: brokerRow } = await supabase
        .from("brokers")
        .select("id, name, full_name, email, company, acl_number, loan_types, languages, is_exclusive, is_active")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!brokerRow) {
        toast.error("No broker profile found for this account.");
        await supabase.auth.signOut();
        navigate("/broker/login");
        return;
      }
      setBroker(brokerRow as BrokerRecord);
      await loadLeads();
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, loadLeads]);

  useEffect(() => {
    if (!broker) return;
    const channel = supabase
      .channel("broker-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_leads" }, () => {
        loadLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [broker, loadLeads]);

  const filteredLeads = useMemo(() => {
    if (!broker) return [];
    return leads.filter((l) => {
      if (tab === "new") return l.status === "new" && !l.assigned_broker_id;
      if (tab === "pipeline") return (l.status === "claimed" || l.status === "in_progress") && l.assigned_broker_id === broker.id;
      if (tab === "settled") return l.status === "settled" && l.assigned_broker_id === broker.id;
      return false;
    });
  }, [leads, tab, broker]);

  const stats = useMemo(() => {
    if (!broker) return { newWeek: 0, avgResponse: 0, inProgress: 0, settledMonth: 0 };
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newWeek = leads.filter((l) => l.status === "new" && new Date(l.created_at).getTime() > weekAgo).length;
    const myClaimed = leads.filter((l) => l.assigned_broker_id === broker.id && l.response_time_hours != null);
    const avgResponse = myClaimed.length
      ? myClaimed.reduce((s, l) => s + (l.response_time_hours || 0), 0) / myClaimed.length
      : 0;
    const inProgress = leads.filter((l) => l.assigned_broker_id === broker.id && (l.status === "claimed" || l.status === "in_progress")).length;
    const settledMonth = leads.filter((l) =>
      l.assigned_broker_id === broker.id &&
      l.status === "settled" &&
      l.settled_at && new Date(l.settled_at).getTime() >= monthStart.getTime()
    ).length;
    return { newWeek, avgResponse, inProgress, settledMonth };
  }, [leads, broker]);

  const selectedLead = useMemo(
    () => filteredLeads.find((l) => l.id === selectedId) ?? null,
    [filteredLeads, selectedId]
  );

  useEffect(() => {
    if (filteredLeads.length && !filteredLeads.find((l) => l.id === selectedId)) {
      setSelectedId(filteredLeads[0].id);
    } else if (!filteredLeads.length) {
      setSelectedId(null);
    }
  }, [filteredLeads, selectedId]);

  if (loading || !broker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <BrokerPortalLayout broker={broker} active={tab} onTabChange={(t) => { setTab(t); setSelectedId(null); }}>
      {tab === "settings" ? (
        <SettingsView broker={broker} />
      ) : (
        <div className="h-screen flex flex-col">
          <div className="px-6 pt-6 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="New this week" value={String(stats.newWeek)} />
            <StatCard label="Avg response time" value={stats.avgResponse ? `${stats.avgResponse.toFixed(1)}h` : "—"} />
            <StatCard label="In progress" value={String(stats.inProgress)} />
            <StatCard label="Settled this month" value={String(stats.settledMonth)} />
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_minmax(380px,_440px)] gap-0 border-t border-slate-200">
            <LeadQueue leads={filteredLeads} selectedId={selectedId} onSelect={setSelectedId} tab={tab} />
            <div className="hidden lg:block border-l border-slate-200 bg-white overflow-y-auto">
              {selectedLead ? (
                <LeadDetailPanel key={selectedLead.id} lead={selectedLead} broker={broker} onChanged={loadLeads} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400 p-8 text-center">
                  Select a lead to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BrokerPortalLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function LeadQueue({
  leads, selectedId, onSelect, tab,
}: {
  leads: ReferralLead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tab: PortalTab;
}) {
  if (!leads.length) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400 p-12 bg-white">
        No {tab === "new" ? "new" : tab} leads.
      </div>
    );
  }
  return (
    <div className="bg-white overflow-y-auto">
      <ul className="divide-y divide-slate-100">
        {leads.map((lead) => {
          const langMeta = getLanguageMeta(lead.buyer_language);
          const sb = statusBadge(lead.status);
          const isSelected = selectedId === lead.id;
          return (
            <li key={lead.id}>
              <button
                onClick={() => onSelect(lead.id)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                  isSelected ? "bg-blue-50/50 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"
                }`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColorForLanguage(lead.buyer_language)}`}>
                  {initialsFromName(lead.buyer_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 truncate">{lead.buyer_name || "Unnamed buyer"}</p>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(lead.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lead.status === "new" ? maskPhone(lead.buyer_phone) : (lead.buyer_phone || "—")}
                  </p>
                  {lead.property_url && (
                    <p className="text-xs text-slate-600 truncate mt-1">{lead.property_url}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {lead.loan_type && (
                      <Badge variant="outline" className="text-[10px] capitalize">{lead.loan_type}</Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${sb.className}`}>{sb.label}</Badge>
                    {langMeta && langMeta.label !== "English" && (
                      <Badge variant="outline" className={`text-[10px] ${langMeta.color}`}>
                        {langMeta.flag} {langMeta.label}
                      </Badge>
                    )}
                    {lead.estimated_loan_amount != null && (
                      <span className="text-[10px] text-slate-500 ml-auto">{formatAud(lead.estimated_loan_amount)}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LeadDetailPanel({
  lead, broker, onChanged,
}: {
  lead: ReferralLead;
  broker: BrokerRecord;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [feeAgreed, setFeeAgreed] = useState(!!lead.fee_agreed);
  const [countdown, setCountdown] = useState(hoursUntilExpiry(lead.created_at));

  useEffect(() => {
    setFeeAgreed(!!lead.fee_agreed);
  }, [lead.id, lead.fee_agreed]);

  useEffect(() => {
    if (lead.status !== "new") return;
    const t = setInterval(() => setCountdown(hoursUntilExpiry(lead.created_at)), 60000);
    return () => clearInterval(t);
  }, [lead.id, lead.status, lead.created_at]);

  const isOwnedByMe = lead.assigned_broker_id === broker.id;
  const sb = statusBadge(lead.status);
  const langMeta = getLanguageMeta(lead.buyer_language);
  const refFee = Number(lead.referral_fee_amount || 0);
  const platFee = Number(lead.platform_fee_amount || refFee * 0.125);
  const netToBroker = Math.max(0, refFee - platFee);

  const handleClaim = async () => {
    setBusy("claim");
    const responseHours = (Date.now() - new Date(lead.created_at).getTime()) / 3600000;
    const { error } = await supabase
      .from("referral_leads")
      .update({
        assigned_broker_id: broker.id,
        claimed_at: new Date().toISOString(),
        response_time_hours: Number(responseHours.toFixed(2)),
        status: "claimed",
      })
      .eq("id", lead.id);
    setBusy(null);
    if (error) toast.error("Could not claim lead: " + error.message);
    else { toast.success("Lead claimed"); onChanged(); }
  };

  const handleBookAppointment = () => {
    const url = lead.calendly_booking_url || CALENDLY_URL;
    if (!url) { toast.error("No Calendly URL configured"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddToGHL = async () => {
    if (!GHL_WEBHOOK_URL) { toast.error("GHL webhook URL not configured"); return; }
    setBusy("ghl");
    try {
      await fetch(GHL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          buyer_name: lead.buyer_name,
          buyer_email: lead.buyer_email,
          buyer_phone: lead.buyer_phone,
          property_url: lead.property_url,
          loan_type: lead.loan_type,
          loan_amount: lead.estimated_loan_amount,
          broker_id: broker.id,
        }),
      });
      await supabase.from("referral_leads").update({ ghl_contact_id: `ghl_${Date.now()}` }).eq("id", lead.id);
      toast.success("Sent to GHL");
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error("GHL webhook failed");
    } finally { setBusy(null); }
  };

  const handleMarkSettled = async () => {
    if (!feeAgreed) { toast.error("You must agree to the referral fee structure first"); return; }
    setBusy("settle");
    const { error } = await supabase.from("referral_leads").update({
      status: "settled",
      settled_at: new Date().toISOString(),
      fee_agreed: true,
      fee_agreed_at: lead.fee_agreed_at || new Date().toISOString(),
    }).eq("id", lead.id);
    setBusy(null);
    if (error) toast.error("Could not mark settled: " + error.message);
    else { toast.success("Lead marked as settled"); onChanged(); }
  };

  const toggleFeeAgreed = async (checked: boolean) => {
    setFeeAgreed(checked);
    if (checked && !lead.fee_agreed) {
      await supabase.from("referral_leads")
        .update({ fee_agreed: true, fee_agreed_at: new Date().toISOString() })
        .eq("id", lead.id);
      onChanged();
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{lead.buyer_name || "Unnamed buyer"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Lead created {timeAgo(lead.created_at)}</p>
          </div>
          <Badge variant="outline" className={sb.className}>{sb.label}</Badge>
        </div>
        {lead.status === "new" && (
          <div className="mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle size={14} /> {formatCountdown(countdown)}
          </div>
        )}
      </div>

      {langMeta && langMeta.label !== "English" && (
        <div className={`px-3 py-2 rounded-md border text-xs ${langMeta.color}`}>
          {langMeta.flag} This buyer may prefer communication in <strong>{langMeta.label}</strong>. ListHQ listings are available in their language.
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Mail size={14} className="text-slate-400" />
            {isOwnedByMe ? (
              <a href={`mailto:${lead.buyer_email}`} className="text-blue-600 hover:underline">{lead.buyer_email || "—"}</a>
            ) : (
              <span className="text-slate-400">{lead.buyer_email ? "•••• masked ••••" : "—"}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Phone size={14} className="text-slate-400" />
            {isOwnedByMe ? (
              <a href={`tel:${lead.buyer_phone}`} className="text-blue-600 hover:underline">{lead.buyer_phone || "—"}</a>
            ) : (
              <span className="text-slate-400">{maskPhone(lead.buyer_phone)}</span>
            )}
          </div>
        </div>
      </section>

      {lead.message && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Message from buyer</h3>
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">{lead.message}</p>
        </section>
      )}

      {(lead.property_url || lead.property_id) && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Property</h3>
          <div className="border border-slate-200 rounded-md p-3 flex items-start gap-3">
            <HomeIcon size={16} className="text-slate-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">{lead.property_url || lead.property_id}</p>
              {lead.property_id && (
                <a href={`/property/${lead.property_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1">
                  View listing <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-500">Loan type</p>
          <p className="text-sm font-medium text-slate-900 capitalize mt-0.5">{lead.loan_type || "—"}</p>
        </div>
        <div className="border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-500">Estimated loan</p>
          <p className="text-sm font-medium text-slate-900 mt-0.5">{formatAud(lead.estimated_loan_amount)}</p>
        </div>
      </section>

      {refFee > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Referral fee</h3>
          <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
            <div className="flex justify-between px-3 py-2 text-sm">
              <span className="text-slate-600">Agreed fee</span>
              <span className="font-medium text-slate-900">{formatAud(refFee)}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-sm">
              <span className="text-slate-600">Platform fee (12.5%)</span>
              <span className="text-slate-700">−{formatAud(platFee)}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-sm bg-slate-50">
              <span className="font-medium text-slate-700">Net to broker</span>
              <span className="font-semibold text-slate-900">{formatAud(netToBroker)}</span>
            </div>
          </div>
        </section>
      )}

      <div className="px-3 py-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <div className="flex items-start gap-2 mb-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>Referral fee disclosure required under NCCP. Client will be informed of this arrangement.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={feeAgreed}
            onChange={(e) => toggleFeeAgreed(e.target.checked)}
            className="rounded border-amber-300"
          />
          <span>I agree to the referral fee structure</span>
        </label>
      </div>

      <div className="space-y-2 pt-2">
        {lead.status === "new" && !lead.assigned_broker_id && (
          <Button onClick={handleClaim} disabled={busy === "claim"} className="w-full bg-blue-600 hover:bg-blue-700">
            {busy === "claim" ? <Loader2 className="animate-spin" size={16} /> : "Claim Lead"}
          </Button>
        )}
        {isOwnedByMe && (
          <>
            <Button onClick={handleBookAppointment} variant="outline" className="w-full">
              <Calendar size={14} className="mr-2" /> Book Appointment
            </Button>
            <Button onClick={handleAddToGHL} variant="outline" className="w-full" disabled={busy === "ghl"}>
              {busy === "ghl" ? <Loader2 className="animate-spin" size={14} /> : <><Webhook size={14} className="mr-2" /> Add to GHL</>}
              {lead.ghl_contact_id && <CheckCircle2 size={14} className="ml-2 text-green-600" />}
            </Button>
            {lead.status !== "settled" && (
              <Button
                onClick={handleMarkSettled}
                disabled={busy === "settle" || !feeAgreed}
                variant="outline"
                className="w-full border-green-300 text-green-700 hover:bg-green-50"
              >
                {busy === "settle" ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={14} className="mr-2" /> Mark Settled</>}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SettingsView({ broker }: { broker: BrokerRecord }) {
  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        <Row label="Name" value={broker.full_name || broker.name} />
        <Row label="Email" value={broker.email} />
        <Row label="Company" value={broker.company || "—"} />
        <Row label="ACL Number" value={broker.acl_number} />
        <Row label="Loan types" value={(broker.loan_types || []).join(", ") || "—"} />
        <Row label="Languages" value={(broker.languages || []).join(", ") || "—"} />
        <Row label="Exclusivity" value={broker.is_exclusive ? "Exclusive partner" : "Standard"} />
      </div>
      <p className="text-xs text-slate-500 mt-4">
        To update your profile, contact ListHQ at <a href="mailto:partners@listhq.com.au" className="text-blue-600 hover:underline">partners@listhq.com.au</a>.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
