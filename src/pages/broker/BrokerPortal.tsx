/**
 * BrokerPortal.tsx
 * Broker dashboard — leads, stats, CSV export.
 * Scoped via RLS: each broker sees only their own data.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Download, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, Users, AlertCircle, Loader2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Broker {
  id: string;
  name: string;
  email: string;
  company: string | null;
  acl_number: string;
  lead_fee_aud: number;
  monthly_cap_aud: number | null;
  cap_expires_at: string | null;
  is_founding_partner: boolean;
}

interface Lead {
  id: string;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  property_address: string | null;
  property_price: string | null;
  is_qualified: boolean;
  is_duplicate: boolean;
  invoice_month: string;
  invoiced_at: string | null;
  lead_fee_aud: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function offsetMonth(ym: string, n: number): string {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BrokerPortal() {
  const navigate = useNavigate();

  const [broker, setBroker] = useState<Broker | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // ── Link broker on first login & load broker record ────────────────────────
  useEffect(() => {
    const loadBroker = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/broker/login");
        return;
      }

      // Attempt to link this auth user to their broker record (idempotent)
      await supabase.rpc("link_broker_auth_user", {
        p_user_id: user.id,
        p_email: user.email ?? "",
      });

      const { data, error } = await supabase
        .from("brokers")
        .select("id, name, email, company, acl_number, lead_fee_aud, monthly_cap_aud, cap_expires_at, is_founding_partner")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setBroker(data as Broker);
    };

    loadBroker();
  }, [navigate]);

  // ── Load leads for selected month ──────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    if (!broker) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("broker_leads_view" as any)
      .select("*")
      .eq("broker_id", broker.id)
      .eq("invoice_month", selectedMonth)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeads(data as unknown as Lead[]);
    }
    setLoading(false);
  }, [broker, selectedMonth]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const qualifiedLeads = leads.filter((l) => l.is_qualified);
  const rawAmount = qualifiedLeads.length * (broker?.lead_fee_aud ?? 75);
  const cap = broker?.monthly_cap_aud ?? null;
  const capActive =
    cap !== null &&
    broker?.cap_expires_at !== null &&
    new Date(broker?.cap_expires_at ?? 0) >= new Date();
  const invoiceAmount = capActive ? Math.min(rawAmount, cap!) : rawAmount;

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["Date", "Buyer Name", "Buyer Email", "Buyer Phone", "Property", "Price", "Status", "Fee (AUD)"];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleDateString("en-AU"),
      l.buyer_name,
      l.buyer_email,
      l.buyer_phone ?? "",
      l.property_address ?? "",
      l.property_price ?? "",
      l.is_qualified ? "Qualified" : "Duplicate",
      l.is_qualified ? broker?.lead_fee_aud.toFixed(2) ?? "75.00" : "0.00",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ListHQ_Leads_${selectedMonth}_${broker?.name.replace(/\s/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/broker/login");
  };

  // ── Access denied state ────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto mb-3 text-destructive" size={48} />
          <h1 className="text-xl font-semibold text-foreground mb-2">Access denied</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This email is not registered as a ListHQ broker partner.{" "}
            <a href="mailto:alanperry@gmail.com" className="text-primary underline">Contact ListHQ</a> if you
            believe this is an error.
          </p>
          <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  if (!broker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">ListHQ</span>
            <span className="text-xs text-muted-foreground">Broker Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{broker.name}</p>
              <p className="text-xs text-muted-foreground">{broker.acl_number}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut size={16} className="mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Month selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">{formatMonth(selectedMonth)}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedMonth((m) => offsetMonth(m, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth((m) => offsetMonth(m, 1))}
              disabled={selectedMonth >= currentYearMonth()}
            >
              <ChevronRight size={16} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={leads.length === 0}>
              <Download size={14} className="mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Total enquiries", value: leads.length, sub: `${qualifiedLeads.length} qualified`, color: "text-primary" },
            { icon: TrendingUp, label: "Qualified leads", value: qualifiedLeads.length, sub: `at $${broker.lead_fee_aud}/lead`, color: "text-green-600" },
            { icon: DollarSign, label: "Invoice amount", value: `$${invoiceAmount.toFixed(2)}`, sub: capActive ? `Cap: $${cap!.toFixed(2)}/mo applies` : "excl. GST", color: "text-violet-600" },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className={color} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Founding partner cap notice */}
        {capActive && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
            Founding Partner cap of ${cap!.toFixed(2)}/month applies until{" "}
            {new Date(broker.cap_expires_at!).toLocaleDateString("en-AU", { month: "long", day: "numeric", year: "numeric" })}.
            After that, the standard ${broker.lead_fee_aud}/lead rate applies uncapped.
          </div>
        )}

        {/* Leads table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Lead register</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto mb-2 text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">No leads recorded for {formatMonth(selectedMonth)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Date", "Buyer", "Contact", "Property", "Status", "Fee"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{lead.buyer_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${lead.buyer_email}`} className="text-primary hover:underline text-xs block">{lead.buyer_email}</a>
                        {lead.buyer_phone && (
                          <a href={`tel:${lead.buyer_phone}`} className="text-muted-foreground text-xs block">{lead.buyer_phone}</a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground text-xs">{lead.property_address ?? "—"}</p>
                        {lead.property_price && <p className="text-muted-foreground text-xs">{lead.property_price}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={lead.is_qualified ? "default" : "secondary"}>
                          {lead.is_qualified ? "Qualified" : "Duplicate"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {lead.is_qualified ? `$${lead.lead_fee_aud.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-right text-foreground">
                      {capActive ? "Invoice total (cap applied)" : "Invoice total"}
                    </td>
                    <td className="px-4 py-3 text-foreground">${invoiceAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center py-4">
          All amounts shown are exclusive of GST. Invoices are issued monthly in arrears by ListHQ.
          Lead fee: ${broker.lead_fee_aud.toFixed(2)} AUD per qualified lead. {broker.acl_number}.
        </p>
      </main>
    </div>
  );
}
