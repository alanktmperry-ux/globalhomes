import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Home, Printer, CheckCircle2, AlertTriangle, Droplets, Key,
  Radio, FileText, Wrench, Camera, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface RoomPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
}

interface MaintenanceItem {
  id: string;
  description: string;
  priority: string;
  status: string;
  room_id: string | null;
}

interface Room {
  id: string;
  room_name: string;
  condition: string | null;
  notes: string | null;
  display_order: number;
  photos: RoomPhoto[];
}

interface InspectionData {
  id: string;
  inspection_type: string;
  scheduled_date: string;
  conducted_date: string | null;
  status: string;
  water_meter_reading: string | null;
  keys_count: number | null;
  remotes_count: number | null;
  bond_lodgment_number: string | null;
  owner_name: string | null;
  overall_notes: string | null;
  finalised_at: string | null;
  tenant_dispute_deadline: string | null;
  rooms: Room[];
  maintenance_items: MaintenanceItem[];
}

const conditionColor: Record<string, string> = {
  excellent: "bg-green-100 text-green-800 border-green-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  fair: "bg-amber-100 text-amber-800 border-amber-200",
  poor: "bg-orange-100 text-orange-800 border-orange-200",
  damaged: "bg-red-100 text-red-800 border-red-200",
  na: "bg-muted text-muted-foreground border-border",
};

const priorityColor: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  normal: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-muted text-muted-foreground border-border",
};

const typeLabel: Record<string, string> = {
  entry: "Entry",
  routine: "Routine",
  exit: "Exit",
};

export default function InspectionReportPublic() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<InspectionData | null>(null);
  const [property, setProperty] = useState<{ address: string; suburb: string; state: string } | null>(null);
  const [agent, setAgent] = useState<{ name: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [tenantAccepted, setTenantAccepted] = useState(false);
  const [tenantDisputed, setTenantDisputed] = useState(false);
  const [tenantAcceptedAt, setTenantAcceptedAt] = useState<string | null>(null);
  const [tenantDisputedAt, setTenantDisputedAt] = useState<string | null>(null);
  const [tenantDisputeNotes, setTenantDisputeNotes] = useState<string | null>(null);
  const [showConcernForm, setShowConcernForm] = useState(false);
  const [concernsText, setConcernsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data: result, error } = await supabase.rpc("get_inspection_by_token", { p_token: token });
        if (error || !result || (result as any).error) {
          setNotFound(true);
          return;
        }
        const inspection = result as unknown as InspectionData;
        setData(inspection);

        // Fetch tenant response state from the actual row
        const { data: inspRow } = await supabase
          .from("property_inspections")
          .select("tenant_accepted_at, tenant_disputed_at, tenant_dispute_notes, property_id, agent_id")
          .eq("report_token", token)
          .maybeSingle();

        if (inspRow) {
          if (inspRow.tenant_accepted_at) {
            setTenantAccepted(true);
            setTenantAcceptedAt(inspRow.tenant_accepted_at);
          }
          if (inspRow.tenant_disputed_at) {
            setTenantDisputed(true);
            setTenantDisputedAt(inspRow.tenant_disputed_at);
            setTenantDisputeNotes(inspRow.tenant_dispute_notes);
          }

          // Fetch property details
          if (inspRow.property_id) {
            const { data: prop } = await supabase
              .from("properties")
              .select("address, suburb, state")
              .eq("id", inspRow.property_id)
              .maybeSingle();
            if (prop) setProperty(prop);
          }

          // Fetch agent details
          if (inspRow.agent_id) {
            const { data: ag } = await supabase
              .from("agents")
              .select("name, phone")
              .eq("id", inspRow.agent_id)
              .maybeSingle();
            if (ag) setAgent(ag);
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("property_inspections")
      .update({ tenant_accepted_at: new Date().toISOString() })
      .eq("report_token", token!);
    if (error) {
      toast.error("Failed to record acceptance. Please try again.");
    } else {
      setTenantAccepted(true);
      setTenantAcceptedAt(new Date().toISOString());
      toast.success("Thank you — your acceptance has been recorded.");
    }
    setSubmitting(false);
  };

  const handleSubmitConcerns = async () => {
    if (!concernsText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("property_inspections")
      .update({
        tenant_disputed_at: new Date().toISOString(),
        tenant_dispute_notes: concernsText.trim(),
      })
      .eq("report_token", token!);
    if (error) {
      toast.error("Failed to submit concerns. Please try again.");
    } else {
      setTenantDisputed(true);
      setTenantDisputedAt(new Date().toISOString());
      setTenantDisputeNotes(concernsText.trim());
      toast.success("Your concerns have been submitted. The agent will be in touch.");

      // Notify the PM by email
      const { data: inspRow } = await supabase
        .from('property_inspections')
        .select('agent_id, inspection_type')
        .eq('report_token', token!)
        .maybeSingle();
      if (inspRow?.agent_id) {
        const { data: agentRow } = await supabase
          .from('agents')
          .select('email')
          .eq('id', inspRow.agent_id)
          .maybeSingle();
        if (agentRow?.email) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'tenant_dispute',
              recipient_email: agentRow.email,
              recipient_name: 'Property Manager',
              property_address: property ? `${property.address}, ${property.suburb}` : 'your managed property',
              inspection_type: inspRow.inspection_type || 'entry',
              dispute_notes: concernsText.trim(),
              report_link: `${window.location.origin}/inspection-report/${token}`,
            },
          }).catch(() => {});
        }
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <Helmet><title>Report Not Found | ListHQ</title></Helmet>
        <div className="text-2xl font-bold text-foreground">ListHQ</div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Report not found or link has expired</h1>
          <p className="text-muted-foreground text-sm">This inspection report may have been removed or the link is no longer valid.</p>
        </div>
        <Link to="/">
          <Button variant="outline"><Home className="mr-2 h-4 w-4" /> Go to ListHQ</Button>
        </Link>
      </div>
    );
  }

  const address = property ? `${property.address}, ${property.suburb} ${property.state}` : "Property Inspection";
  const poorOrDamaged = data.rooms.filter(r => r.condition === "poor" || r.condition === "damaged").length;
  const maintenanceCount = data.maintenance_items.length;
  const roomsInspected = data.rooms.filter(r => r.condition && r.condition !== "na").length;

  const maintenanceByRoom = (roomId: string) =>
    data.maintenance_items.filter(m => m.room_id === roomId);

  const urgentItems = data.maintenance_items.filter(m => m.priority === "urgent");
  const normalItems = data.maintenance_items.filter(m => m.priority === "normal");
  const lowItems = data.maintenance_items.filter(m => m.priority === "low");

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return "General";
    return data.rooms.find(r => r.id === roomId)?.room_name ?? "Unknown";
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Condition Report — {address} | ListHQ</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card print:border-none">
        <div className="h-1 bg-primary" />
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold text-foreground">ListHQ</Link>
          <span className="text-sm font-medium text-muted-foreground">Condition Report</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{address}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {typeLabel[data.inspection_type] || data.inspection_type} Inspection
            </Badge>
            {data.conducted_date && (
              <Badge variant="outline">
                {format(new Date(data.conducted_date), "d MMM yyyy")}
              </Badge>
            )}
            {agent && <Badge variant="outline">{agent.name}</Badge>}
          </div>
          {!data.finalised_at && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              <AlertTriangle className="mr-2 inline h-4 w-4" /> Draft — not yet finalised
            </div>
          )}
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{roomsInspected}</div>
              <div className="text-xs text-muted-foreground">Rooms Inspected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${poorOrDamaged > 0 ? "text-red-600" : "text-foreground"}`}>
                {poorOrDamaged}
              </div>
              <div className="text-xs text-muted-foreground">Poor / Damaged</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${maintenanceCount > 0 ? "text-amber-600" : "text-foreground"}`}>
                {maintenanceCount}
              </div>
              <div className="text-xs text-muted-foreground">Maintenance Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {data.water_meter_reading || "—"}
              </div>
              <div className="text-xs text-muted-foreground">Water Meter</div>
            </CardContent>
          </Card>
        </div>

        {/* Room-by-room */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Room-by-Room Report</h2>
          {data.rooms
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map(room => {
              const roomMaintenance = maintenanceByRoom(room.id);
              return (
                <Card key={room.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{room.room_name}</CardTitle>
                      {room.condition && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${conditionColor[room.condition] || conditionColor.na}`}>
                          {room.condition === "na" ? "N/A" : room.condition}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {room.notes && (
                      <p className="text-sm text-muted-foreground">{room.notes}</p>
                    )}
                    {room.photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {room.photos.map(photo => (
                          <button
                            key={photo.id}
                            className="relative overflow-hidden rounded-lg border aspect-square"
                            onClick={() => setLightbox(photo.photo_url)}
                          >
                            <img
                              src={photo.photo_url}
                              alt="Inspection photo"
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white truncate">
                                {photo.caption}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {roomMaintenance.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {roomMaintenance.map(m => (
                          <span
                            key={m.id}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityColor[m.priority] || priorityColor.low}`}
                          >
                            <Wrench className="h-3 w-3" />
                            {m.description}
                            <span className="opacity-60">({m.priority})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </section>

        {/* Maintenance Summary */}
        {data.maintenance_items.length > 0 && (
          <section>
            <button
              className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3"
              onClick={() => setMaintenanceOpen(!maintenanceOpen)}
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Maintenance Items ({data.maintenance_items.length})
              </h2>
              {maintenanceOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>
            {maintenanceOpen && (
              <div className="mt-2 space-y-2">
                {[...urgentItems, ...normalItems, ...lowItems].map(item => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
                    <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${priorityColor[item.priority]}`}>
                      {item.priority}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{getRoomName(item.room_id)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Property details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Keys:</span> <span className="font-medium text-foreground">{data.keys_count ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Remotes:</span> <span className="font-medium text-foreground">{data.remotes_count ?? "—"}</span></div>
            </div>
            {data.bond_lodgment_number && (
              <div className="text-sm">
                <span className="text-muted-foreground">Bond lodgment number:</span>{" "}
                <span className="font-medium text-foreground">{data.bond_lodgment_number}</span>
              </div>
            )}
            {data.overall_notes && (
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-1">Overall Notes</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{data.overall_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Response Section — hidden on print */}
        <div className="print:hidden">
          {data.finalised_at && tenantAccepted && tenantAcceptedAt && (
            <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tenant accepted this report on {format(new Date(tenantAcceptedAt), "d MMMM yyyy")}
            </div>
          )}

          {data.finalised_at && tenantDisputed && tenantDisputedAt && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
              <div className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Tenant raised concerns on {format(new Date(tenantDisputedAt), "d MMMM yyyy")}
              </div>
              {tenantDisputeNotes && <p className="text-xs">{tenantDisputeNotes}</p>}
            </div>
          )}

          {data.finalised_at && !tenantAccepted && !tenantDisputed && (() => {
            const deadlineStr = data.tenant_dispute_deadline;
            const deadlineDate = deadlineStr ? new Date(deadlineStr + 'T23:59:59') : null;
            const isClosed = !!deadlineDate && new Date() > deadlineDate;
            const formattedDeadline = deadlineDate ? format(deadlineDate, "EEEE, d MMM yyyy") : null;

            if (isClosed) {
              return (
                <Card className="border-amber-500/40 bg-amber-500/5">
                  <CardContent className="p-4 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800">
                      The dispute period for this report closed on {formattedDeadline}.
                      Please contact your property manager if you have concerns.
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card className="border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Tenant Acknowledgement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showConcernForm ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={handleAccept} disabled={submitting} className="flex-1">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> I Accept This Report
                      </Button>
                      <Button variant="outline" onClick={() => setShowConcernForm(true)} disabled={submitting} className="flex-1">
                        <AlertTriangle className="mr-2 h-4 w-4" /> I Have Concerns
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Describe your concerns about this report…"
                        value={concernsText}
                        onChange={e => setConcernsText(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSubmitConcerns} disabled={submitting || !concernsText.trim()}>
                          Submit Concerns
                        </Button>
                        <Button variant="ghost" onClick={() => setShowConcernForm(false)} disabled={submitting}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {formattedDeadline && (
                    <p className="text-xs text-muted-foreground">
                      You have until <span className="font-medium text-foreground">{formattedDeadline}</span> to accept or dispute this report.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Footer */}
        <footer className="border-t pt-6 pb-8 text-center space-y-2">
          {agent && (
            <p className="text-sm text-foreground font-medium">
              {agent.name}{agent.phone ? ` · ${agent.phone}` : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Report generated by <span className="font-medium">ListHQ</span> · listhq.com.au
          </p>
          <Button variant="ghost" size="sm" className="print:hidden" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </footer>
      </main>
    </div>
  );
}
