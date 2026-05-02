/**
 * BrokerLeadDetailPage.tsx
 * Full-page view of a single referral lead — reuses portal styling.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import BrokerPortalLayout from "./BrokerPortalLayout";
import { type BrokerRecord, type ReferralLead } from "./brokerPortalUtils";

// Re-export the detail panel from BrokerPortal isn't ideal; we'll inline a simpler version that uses shared utils.
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, Phone, Home as HomeIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  initialsFromName,
  avatarColorForLanguage,
  maskPhone,
  timeAgo,
  formatAud,
  statusBadge,
  getLanguageMeta,
} from "./brokerPortalUtils";

export default function BrokerLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState<BrokerRecord | null>(null);
  const [lead, setLead] = useState<ReferralLead | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/broker/login"); return; }

    const [{ data: brokerRow }, { data: leadRow }] = await Promise.all([
      supabase.from("brokers")
        .select("id, name, full_name, email, company, acl_number, loan_types, languages, is_exclusive, is_active")
        .eq("auth_user_id", session.user.id).maybeSingle(),
      supabase.from("referral_leads").select("*").eq("id", id).maybeSingle(),
    ]);

    if (!brokerRow) { navigate("/broker/login"); return; }
    setBroker(brokerRow as BrokerRecord);
    setLead(leadRow as ReferralLead | null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handleClaim = async () => {
    if (!lead || !broker) return;
    setBusy("claim");
    const responseHours = (Date.now() - new Date(lead.created_at).getTime()) / 3600000;
    const { error, count } = await supabase.from("referral_leads").update({
      assigned_broker_id: broker.id,
      claimed_at: new Date().toISOString(),
      response_time_hours: Number(responseHours.toFixed(2)),
      status: "claimed",
    }, { count: 'exact' }).eq("id", lead.id).is("assigned_broker_id", null);
    // If count is 0, someone else claimed it first
    if (!error && count === 0) {
      toast.error("This lead was already claimed by another broker.");
      load();
      setBusy(null);
      return;
    }
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Lead claimed"); load(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }
  if (!broker) return null;
  if (!lead) {
    return (
      <BrokerPortalLayout broker={broker} active="new" onTabChange={(t) => navigate(`/broker/portal?tab=${t}`)}>
        <div className="p-8">
          <Link to="/broker/portal" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to portal
          </Link>
          <p className="mt-6 text-slate-600">Lead not found.</p>
        </div>
      </BrokerPortalLayout>
    );
  }

  const sb = statusBadge(lead.status);
  const langMeta = getLanguageMeta(lead.buyer_language);
  const isOwnedByMe = lead.assigned_broker_id === broker.id;
  const refFee = Number(lead.referral_fee_amount || 0);
  const platFee = Number(lead.platform_fee_amount || refFee * 0.125);
  const netToBroker = Math.max(0, refFee - platFee);

  return (
    <BrokerPortalLayout broker={broker} active="new" onTabChange={() => navigate(`/broker/portal`)}>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Link to="/broker/portal" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back to portal
        </Link>

        <header className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold ${avatarColorForLanguage(lead.buyer_language)}`}>
            {initialsFromName(lead.buyer_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{isOwnedByMe ? (lead.buyer_name || "Unnamed buyer") : "Buyer (claim to see details)"}</h1>
                <p className="text-sm text-slate-500">Created {timeAgo(lead.created_at)}</p>
              </div>
              <Badge variant="outline" className={sb.className}>{sb.label}</Badge>
            </div>
          </div>
        </header>

        {langMeta && langMeta.label !== "English" && (
          <div className={`px-3 py-2 rounded-md border text-sm ${langMeta.color}`}>
            {langMeta.flag} This buyer may prefer communication in <strong>{langMeta.label}</strong>.
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          <div className="px-4 py-3 flex items-center gap-2 text-sm">
            <Mail size={14} className="text-slate-400" />
            {isOwnedByMe ? (
              <a className="text-blue-600 hover:underline" href={`mailto:${lead.buyer_email}`}>{lead.buyer_email}</a>
            ) : <span className="text-slate-400">•••• masked ••••</span>}
          </div>
          <div className="px-4 py-3 flex items-center gap-2 text-sm">
            <Phone size={14} className="text-slate-400" />
            {isOwnedByMe ? (
              <a className="text-blue-600 hover:underline" href={`tel:${lead.buyer_phone}`}>{lead.buyer_phone}</a>
            ) : <span className="text-slate-400">{maskPhone(lead.buyer_phone)}</span>}
          </div>
        </section>

        {lead.message && isOwnedByMe && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Message from buyer</h3>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">{lead.message}</p>
          </section>
        )}

        {(lead.property_url || lead.property_id) && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Property</h3>
            <div className="border border-slate-200 rounded-md p-3 flex items-start gap-3 bg-white">
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
          <div className="border border-slate-200 rounded-md p-3 bg-white">
            <p className="text-xs text-slate-500">Loan type</p>
            <p className="text-sm font-medium text-slate-900 capitalize mt-0.5">{lead.loan_type || "—"}</p>
          </div>
          <div className="border border-slate-200 rounded-md p-3 bg-white">
            <p className="text-xs text-slate-500">Estimated loan</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">{formatAud(lead.estimated_loan_amount)}</p>
          </div>
        </section>

        {refFee > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Referral fee</h3>
            <div className="border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
              <div className="flex justify-between px-3 py-2 text-sm"><span className="text-slate-600">Agreed fee</span><span className="font-medium">{formatAud(refFee)}</span></div>
              <div className="flex justify-between px-3 py-2 text-sm"><span className="text-slate-600">Platform fee (12.5%)</span><span>−{formatAud(platFee)}</span></div>
              <div className="flex justify-between px-3 py-2 text-sm bg-slate-50"><span className="font-medium">Net to broker</span><span className="font-semibold">{formatAud(netToBroker)}</span></div>
            </div>
          </section>
        )}

        <div className="px-3 py-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>Referral fee disclosure required under NCCP. Client will be informed of this arrangement.</p>
        </div>

        {lead.status === "new" && !lead.assigned_broker_id && (
          <Button onClick={handleClaim} disabled={busy === "claim"} className="bg-blue-600 hover:bg-blue-700">
            {busy === "claim" ? <Loader2 className="animate-spin" size={16} /> : "Claim Lead"}
          </Button>
        )}
      </div>
    </BrokerPortalLayout>
  );
}
