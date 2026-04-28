/**
 * BrokerPortal.tsx
 * Two-panel broker dashboard: lead queue (left) + lead detail (right).
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  LogOut,
  Mail,
  Phone,
  Home as HomeIcon,
  Copy,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Languages,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  type BrokerRecord,
  type LeadStatus,
  initialsFromName,
  avatarColorForLanguage,
  timeAgo,
  formatAud,
  getLanguageMeta,
} from "./brokerPortalUtils";

const CALENDLY_URL = (import.meta.env.VITE_CALENDLY_URL as string) || "";

interface Lead {
  id: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_language: string | null;
  loan_type: string | null;
  estimated_loan_amount: number | null;
  message: string | null;
  status: LeadStatusExt;
  assigned_broker_id: string | null;
  property_id: string | null;
  property_url: string | null;
  fee_agreed: boolean | null;
  fee_agreed_at: string | null;
  settled_at: string | null;
  referral_fee_amount: number | null;
  notes: string | null;
}

interface PropertyMini {
  id: string;
  address: string | null;
  price: number | string | null;
}

const STATUS_OPTIONS: { value: LeadStatusExt; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "meeting_booked", label: "Meeting Booked" },
  { value: "pre_approval", label: "Pre-approval" },
  { value: "settled", label: "Settled" },
  { value: "lost", label: "Lost" },
];

function statusLabel(s: LeadStatusExt): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

function statusDot(s: LeadStatusExt): string {
  if (s === "new") return "bg-green-500";
  if (s === "settled") return "bg-slate-400";
  if (s === "lost") return "bg-red-400";
  return "bg-orange-500"; // active stages
}

function statusBucket(s: LeadStatusExt): "new" | "active" | "settled" {
  if (s === "new") return "new";
  if (s === "settled" || s === "lost") return "settled";
  return "active";
}

function loanTypeLabel(t: string | null | undefined): string {
  if (!t) return "Residential";
  const v = t.toLowerCase();
  if (v.includes("comm")) return "Commercial";
  return "Residential";
}

export default function BrokerPortal() {
  if (import.meta.env.DEV) console.log("BrokerPortal v2");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState<BrokerRecord | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadLeads = useCallback(async (b: BrokerRecord) => {
    // Principals see all leads assigned to anyone in their agency.
    // Associates see only their own leads. RLS enforces this too — this just
    // skips an unnecessary filter on the principal side.
    let q = supabase
      .from("referral_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (b.agency_role !== 'principal') {
      q = q.eq("assigned_broker_id", b.id);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[BrokerPortal] loadLeads error:", error);
      return;
    }
    setLeads((data ?? []) as unknown as Lead[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/broker/login");
        return;
      }

      // Accept invite token if present
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      if (inviteToken) {
        const { error: inviteError } = await supabase.rpc("accept_broker_invite" as never, { _token: inviteToken } as never);
        if (inviteError) {
          toast.error("Could not accept invite: " + inviteError.message);
        } else {
          toast.success("You've joined the team");
          // Strip the query param so it doesn't replay
          window.history.replaceState({}, "", "/broker/portal");
        }
      }

      const { data: brokerRow } = await supabase
        .from("brokers")
        .select("id, name, full_name, email, company, acl_number, loan_types, languages, is_exclusive, is_active, agency_id, agency_role")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!brokerRow) {
        toast.error("No broker profile found for this account.");
        await supabase.auth.signOut();
        navigate("/broker/login");
        return;
      }
      const b = brokerRow as BrokerRecord;
      setBroker(b);
      await loadLeads(b);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, loadLeads]);

  // Realtime subscription — principals listen agency-wide, associates only their own
  useEffect(() => {
    if (!broker) return;
    const channel = supabase
      .channel(`broker-leads-${broker.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referral_leads",
          ...(broker.agency_role !== 'principal'
            ? { filter: `assigned_broker_id=eq.${broker.id}` }
            : {}),
        },
        () => { loadLeads(broker); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [broker, loadLeads]);

  const stats = useMemo(() => {
    const counts = { new: 0, active: 0, settled: 0 };
    leads.forEach((l) => { counts[statusBucket(l.status)]++; });
    return counts;
  }, [leads]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId]
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/broker/login");
  };

  if (loading || !broker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">ListHQ</span>
          <span className="text-slate-300">—</span>
          <span className="text-sm text-slate-600">Broker Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900 leading-tight">
              {broker.full_name || broker.name}
            </p>
            <p className="text-xs text-slate-500 leading-tight">ACL {broker.acl_number}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600">
            <LogOut size={14} className="mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left panel */}
        <aside className="w-full lg:w-[320px] lg:shrink-0 lg:h-full flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-slate-200 max-h-[50vh] lg:max-h-none">
          <div className="px-5 py-4 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {broker.full_name || broker.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">ACL {broker.acl_number}</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <StatChip label="New" value={stats.new} tone="green" />
              <StatChip label="Active" value={stats.active} tone="orange" />
              <StatChip label="Settled" value={stats.settled} tone="slate" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {leads.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 p-8 text-center">
                No leads assigned yet
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    selected={selectedId === lead.id}
                    onSelect={() => setSelectedId(lead.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {selectedLead ? (
            <LeadDetail
              key={selectedLead.id}
              lead={selectedLead}
              broker={broker}
              onChanged={() => loadLeads(broker)}
            />
          ) : (
            <WelcomeCard broker={broker} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Sidebar pieces ---------- */

function StatChip({ label, value, tone }: { label: string; value: number; tone: "green" | "orange" | "slate" }) {
  const toneClass =
    tone === "green" ? "bg-green-50 text-green-700 border-green-200" :
    tone === "orange" ? "bg-orange-50 text-orange-700 border-orange-200" :
    "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <div className={`rounded-md border px-2 py-1.5 text-center ${toneClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-base font-bold leading-tight">{value}</p>
    </div>
  );
}

function LeadRow({ lead, selected, onSelect }: { lead: Lead; selected: boolean; onSelect: () => void }) {
  const langMeta = getLanguageMeta(lead.buyer_language);
  const isNonEnglish = !!langMeta && langMeta.label !== "English";
  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
          selected ? "bg-blue-50/60 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"
        }`}
      >
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColorForLanguage(lead.buyer_language)}`}>
          {initialsFromName(lead.buyer_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`shrink-0 w-2 h-2 rounded-full ${statusDot(lead.status)}`} aria-hidden />
            <p className="font-semibold text-sm text-slate-900 truncate flex-1">
              {lead.buyer_name || "Unnamed buyer"}
            </p>
            <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(lead.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {loanTypeLabel(lead.loan_type)}
            </Badge>
            {lead.estimated_loan_amount != null && (
              <span className="text-[11px] text-slate-600 font-medium">
                {formatAud(lead.estimated_loan_amount)}
              </span>
            )}
            {isNonEnglish && langMeta && (
              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${langMeta.color}`}>
                {langMeta.flag} {langMeta.label}
              </Badge>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

/* ---------- Right panel: welcome ---------- */

function WelcomeCard({ broker }: { broker: BrokerRecord }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <CheckCircle2 size={22} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Welcome, {broker.full_name || broker.name}
        </h2>
        <p className="text-sm text-slate-500 mt-1">ACL {broker.acl_number}</p>
        {broker.loan_types && broker.loan_types.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Loan types covered</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {broker.loan_types.map((t) => (
                <Badge key={t} variant="outline" className="capitalize">{t}</Badge>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-slate-600 mt-6 px-4 py-3 bg-blue-50/60 border border-blue-100 rounded-md">
          💡 New leads appear here in real time.
        </p>
      </div>
    </div>
  );
}

/* ---------- Right panel: lead detail ---------- */

function copyText(value: string | null | undefined, label: string) {
  if (!value) return;
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Could not copy")
  );
}

function LeadDetail({
  lead,
  broker,
  onChanged,
}: {
  lead: Lead;
  broker: BrokerRecord;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [feeAgreed, setFeeAgreed] = useState(!!lead.fee_agreed);
  const [showFeeBox, setShowFeeBox] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [property, setProperty] = useState<PropertyMini | null>(null);

  useEffect(() => {
    setFeeAgreed(!!lead.fee_agreed);
    setShowFeeBox(false);
    setNoteDraft("");
  }, [lead.id, lead.fee_agreed]);

  // Load linked property
  useEffect(() => {
    let cancelled = false;
    if (!lead.property_id) { setProperty(null); return; }
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, address, price")
        .eq("id", lead.property_id!)
        .maybeSingle();
      if (!cancelled) setProperty((data ?? null) as PropertyMini | null);
    })();
    return () => { cancelled = true; };
  }, [lead.property_id]);

  const langMeta = getLanguageMeta(lead.buyer_language);
  const isNonEnglish = !!langMeta && langMeta.label !== "English";
  const referralFee = lead.referral_fee_amount ? Number(lead.referral_fee_amount) : lead.estimated_loan_amount ? Math.round(Number(lead.estimated_loan_amount) * 0.0065 * 0.20) : 0;

  const updateStatus = async (next: LeadStatusExt) => {
    setBusy("status");
    const patch: Record<string, unknown> = { status: next };
    if (next === "settled") {
      patch.settled_at = new Date().toISOString();
    }
    const { error } = await supabase.from("referral_leads").update(patch).eq("id", lead.id);
    setBusy(null);
    if (error) toast.error("Could not update status: " + error.message);
    else { toast.success(`Status updated to ${statusLabel(next)}`); onChanged(); }
  };

  const handleMarkContacted = () => updateStatus("contacted");

  const handleBookAppointment = () => {
    if (!CALENDLY_URL) { toast.error("Calendly URL not configured"); return; }
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
    void updateStatus("meeting_booked");
  };

  const handleMarkSettledClick = () => {
    if (!feeAgreed) { setShowFeeBox(true); return; }
    void confirmSettled();
  };

  const confirmSettled = async () => {
    if (!feeAgreed) { toast.error("Please confirm the fee agreement first"); return; }
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

  const handleSaveNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    setBusy("note");
    const stamp = new Date().toISOString();
    const author = broker.full_name || broker.name;
    const newEntry = `[${stamp}] ${author}: ${text}`;
    const merged = lead.notes ? `${lead.notes}\n${newEntry}` : newEntry;
    const { error } = await supabase
      .from("referral_leads")
      .update({ notes: merged })
      .eq("id", lead.id);
    setBusy(null);
    if (error) toast.error("Could not save note: " + error.message);
    else { toast.success("Note added"); setNoteDraft(""); onChanged(); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900">
              {lead.buyer_name || "Unnamed buyer"}
            </h2>
            {isNonEnglish && langMeta && (
              <Badge variant="outline" className={langMeta.color}>
                {langMeta.flag} {langMeta.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Received {timeAgo(lead.created_at)}</p>
        </div>
        <div className="min-w-[200px]">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">
            Status
          </label>
          <Select
            value={lead.status}
            onValueChange={(v) => updateStatus(v as LeadStatusExt)}
            disabled={busy === "status"}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Buyer contact
        </h3>
        <div className="space-y-2.5">
          <ContactRow
            icon={<Mail size={14} />}
            value={lead.buyer_email}
            href={lead.buyer_email ? `mailto:${lead.buyer_email}` : undefined}
            onCopy={() => copyText(lead.buyer_email, "Email")}
          />
          <ContactRow
            icon={<Phone size={14} />}
            value={lead.buyer_phone}
            href={lead.buyer_phone ? `tel:${lead.buyer_phone}` : undefined}
            onCopy={() => copyText(lead.buyer_phone, "Phone")}
          />
          {isNonEnglish && langMeta && (
            <div className="flex items-center gap-2 text-sm text-slate-600 pt-1">
              <Languages size={14} className="text-slate-400" />
              <span>
                <strong>{langMeta.label}</strong> — consider communicating in their language.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Finance */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Finance details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-slate-200 rounded-md p-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Loan type</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{loanTypeLabel(lead.loan_type)}</p>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Estimated amount</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{formatAud(lead.estimated_loan_amount)}</p>
          </div>
        </div>
        {lead.message && (
          <div className="mt-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5">Message from buyer</p>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">
              {lead.message}
            </p>
          </div>
        )}
      </section>

      {/* Property */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Property enquired about
        </h3>
        {lead.property_id && property ? (
          <div className="flex items-start gap-3 border border-slate-200 rounded-md p-3">
            <HomeIcon size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{property.address || "Address unavailable"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{property.price != null ? (typeof property.price === "number" ? formatAud(property.price) : property.price) : "Price on application"}</p>
              <a
                href={`/property/${property.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1.5"
              >
                View listing <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : lead.property_url ? (
          <a
            href={lead.property_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            {lead.property_url} <ExternalLink size={11} />
          </a>
        ) : (
          <p className="text-sm text-slate-400">No property linked</p>
        )}
      </section>

      {/* Action buttons */}
      <section className="flex flex-wrap gap-2">
        <Button
          onClick={handleMarkContacted}
          disabled={busy === "status" || lead.status === "contacted"}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <CheckCircle2 size={14} className="mr-1.5" /> Mark as Contacted
        </Button>
        <Button
          onClick={handleBookAppointment}
          variant="outline"
          disabled={busy === "status"}
        >
          <Calendar size={14} className="mr-1.5" /> Book Appointment
        </Button>
        <Button
          onClick={handleMarkSettledClick}
          disabled={busy === "settle" || lead.status === "settled"}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {busy === "settle"
            ? <Loader2 className="animate-spin" size={14} />
            : <><CheckCircle2 size={14} className="mr-1.5" /> Mark Settled</>}
        </Button>
      </section>

      {/* Fee agreement */}
      {(showFeeBox || lead.status === "settled") && (
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle size={16} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900">
              Referral fee: <strong>{formatAud(referralFee)}</strong> (20% of broker upfront commission on estimated loan of {formatAud(lead.estimated_loan_amount)}). This arrangement will be disclosed to the client as required under NCCP.
            </p>
          </div>
          <label className="flex items-start gap-2 cursor-pointer text-sm text-amber-900">
            <Checkbox
              checked={feeAgreed}
              onCheckedChange={(c) => setFeeAgreed(c === true)}
              disabled={lead.fee_agreed === true}
              className="mt-0.5"
            />
            <span>I confirm this lead has settled and agree to the referral fee</span>
          </label>
          {lead.status !== "settled" && (
            <div className="mt-3">
              <Button
                onClick={confirmSettled}
                disabled={!feeAgreed || busy === "settle"}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {busy === "settle"
                  ? <Loader2 className="animate-spin" size={14} />
                  : "Confirm Settlement"}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Notes */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Notes
        </h3>
        {lead.notes && (
          <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap font-sans mb-3 max-h-48 overflow-y-auto">
            {lead.notes}
          </pre>
        )}
        <Textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Add a note about this lead..."
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={handleSaveNote}
            disabled={!noteDraft.trim() || busy === "note"}
            size="sm"
          >
            {busy === "note" ? <Loader2 className="animate-spin" size={14} /> : "Save note"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function ContactRow({
  icon, value, href, onCopy,
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
  href?: string;
  onCopy: () => void;
}) {
  if (!value) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="text-slate-400">{icon}</span>
        <span>—</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm group">
      <span className="text-slate-400">{icon}</span>
      {href ? (
        <a href={href} className="text-blue-600 hover:underline truncate">{value}</a>
      ) : (
        <span className="text-slate-700 truncate">{value}</span>
      )}
      <button
        onClick={onCopy}
        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-500"
        title="Copy"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}
