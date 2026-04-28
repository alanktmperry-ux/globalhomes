import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import DashboardHeader from '@/features/agents/components/dashboard/DashboardHeader';
import { format, parseISO } from 'date-fns';
import {
  Loader2, Camera, Plus, ChevronDown, AlertTriangle, Wrench, CheckCircle2, X, ArrowLeft,
  ArrowDown, ArrowUp, Minus, Scale, FileWarning,
} from 'lucide-react';

const CONDITION_RANK: Record<string, number> = {
  excellent: 5, good: 4, fair: 3, poor: 2, damaged: 1, na: 0,
};

interface EntryReportData {
  inspection: { id: string; conducted_date: string | null; finalised_at: string | null };
  rooms: { id: string; room_name: string; condition: string | null; notes: string | null }[];
  photos: { id: string; room_id: string; photo_url: string; caption: string | null }[];
}

const DEFAULT_ROOMS = [
  'Entry/Front Door', 'Living Room', 'Dining Room', 'Kitchen',
  'Bathroom 1', 'Bathroom 2', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Laundry', 'Garage/Carport', 'Outdoor/Garden', 'Smoke Alarms', 'General',
];

const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged', 'na'] as const;
type Condition = typeof CONDITIONS[number];

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  good: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  fair: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  poor: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  damaged: 'bg-red-500/15 text-red-700 border-red-500/30',
  na: 'bg-muted text-muted-foreground border-border',
};

interface Room {
  id: string;
  room_name: string;
  condition: Condition | null;
  notes: string | null;
  display_order: number;
  photos: { id: string; photo_url: string; caption: string | null }[];
  maintenance: { id: string; description: string; priority: string; status: string }[];
}

interface InspectionData {
  id: string;
  tenancy_id: string;
  property_id: string;
  agent_id: string;
  inspection_type: string;
  scheduled_date: string;
  conducted_date: string | null;
  status: string;
  water_meter_reading: string | null;
  keys_count: number | null;
  remotes_count: number | null;
  bond_lodgment_number: string | null;
  owner_name: string | null;
  owner_email: string | null;
  overall_notes: string | null;
  report_token: string | null;
  finalised_at: string | null;
}

const InspectionReportPage = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [keysCount, setKeysCount] = useState(0);
  const [remotesCount, setRemotesCount] = useState(0);
  const [waterMeter, setWaterMeter] = useState('');
  const [overallNotes, setOverallNotes] = useState('');
  const [showFinalise, setShowFinalise] = useState(false);
  const [finaliseEmail, setFinaliseEmail] = useState('');
  const [finaliseTenantEmail, setFinaliseTenantEmail] = useState('');
  const [finalising, setFinalising] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<{ roomId: string; description: string; priority: string } | null>(null);
  const [entryReport, setEntryReport] = useState<EntryReportData | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isReadOnly = inspection?.status === 'completed';

  const fetchAll = useCallback(async () => {
    if (!inspectionId) return;
    setLoading(true);

    const { data: insp } = await supabase
      .from('property_inspections')
      .select('*')
      .eq('id', inspectionId)
      .maybeSingle();

    if (!insp) { setLoading(false); return; }
    const inspData = insp as unknown as InspectionData;
    setInspection(inspData);
    setKeysCount(inspData.keys_count || 0);
    setRemotesCount(inspData.remotes_count || 0);
    setWaterMeter(inspData.water_meter_reading || '');
    setOverallNotes(inspData.overall_notes || '');
    setFinaliseEmail(inspData.owner_email || '');

    // Fetch property address and agent info
    const [propRes, agentRes, tenancyRes] = await Promise.all([
      supabase.from('properties').select('address, suburb, state').eq('id', inspData.property_id).maybeSingle(),
      supabase.from('agents').select('name, phone').eq('id', inspData.agent_id).maybeSingle(),
      supabase.from('tenancies').select('tenant_email').eq('id', inspData.tenancy_id).maybeSingle(),
    ]);
    if (propRes.data) setPropertyAddress(`${propRes.data.address}, ${propRes.data.suburb} ${propRes.data.state || ''}`);
    if (agentRes.data) { setAgentName(agentRes.data.name); setAgentPhone(agentRes.data.phone || ''); }
    if (tenancyRes.data) { setTenantEmail(tenancyRes.data.tenant_email || ''); setFinaliseTenantEmail(tenancyRes.data.tenant_email || ''); }

    // Auto-create rooms if status is 'scheduled'
    if (inspData.status === 'scheduled') {
      const roomInserts = DEFAULT_ROOMS.map((name, i) => ({
        inspection_id: inspectionId,
        room_name: name,
        display_order: i,
      }));
      await supabase.from('inspection_rooms').insert(roomInserts as any);
      await supabase.from('property_inspections').update({ status: 'in_progress' } as any).eq('id', inspectionId);
      setInspection(prev => prev ? { ...prev, status: 'in_progress' } : prev);
    }

    // Fetch rooms with photos and maintenance
    const { data: roomData } = await supabase
      .from('inspection_rooms')
      .select('id, room_name, condition, notes, display_order')
      .eq('inspection_id', inspectionId)
      .order('display_order');

    const roomIds = (roomData || []).map(r => r.id);

    const [photosRes, maintRes] = await Promise.all([
      roomIds.length > 0
        ? supabase.from('inspection_room_photos').select('id, room_id, photo_url, caption').eq('inspection_id', inspectionId)
        : Promise.resolve({ data: [] }),
      supabase.from('inspection_maintenance_items').select('id, room_id, description, priority, status').eq('inspection_id', inspectionId),
    ]);

    const photos = (photosRes.data || []) as { id: string; room_id: string; photo_url: string; caption: string | null }[];
    const maint = (maintRes.data || []) as { id: string; room_id: string; description: string; priority: string; status: string }[];

    const enrichedRooms: Room[] = (roomData || []).map(r => ({
      ...r,
      condition: r.condition as Condition | null,
      photos: photos.filter(p => p.room_id === r.id),
      maintenance: maint.filter(m => m.room_id === r.id),
    }));

    setRooms(enrichedRooms);
    setLoading(false);
  }, [inspectionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateCondition = async (roomId: string, condition: Condition) => {
    if (isReadOnly) return;
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, condition } : r));
    await supabase.from('inspection_rooms').update({ condition } as any).eq('id', roomId);
  };

  const updateRoomNotes = async (roomId: string, notes: string) => {
    if (isReadOnly) return;
    await supabase.from('inspection_rooms').update({ notes } as any).eq('id', roomId);
  };

  const handlePhotoUpload = async (roomId: string, file: File) => {
    if (!inspection) return;
    const ext = file.name.split('.').pop();
    const path = `${inspection.agent_id}/${inspection.id}/${roomId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file);
    if (upErr) { toast.error('Upload failed'); return; }
    const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path);
    const photo_url = urlData.publicUrl;
    const { data: photoRow } = await supabase.from('inspection_room_photos').insert({
      room_id: roomId,
      inspection_id: inspection.id,
      photo_url,
    } as any).select('id, photo_url, caption').maybeSingle();
    if (photoRow) {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, photos: [...r.photos, photoRow as any] } : r));
    }
  };

  const addMaintenanceItem = async () => {
    if (!maintenanceForm || !inspection) return;
    const { data, error } = await supabase.from('inspection_maintenance_items').insert({
      inspection_id: inspection.id,
      room_id: maintenanceForm.roomId,
      description: maintenanceForm.description,
      priority: maintenanceForm.priority,
    } as any).select('id, room_id, description, priority, status').maybeSingle();
    if (error) { toast.error('Failed to add'); return; }
    if (data) {
      setRooms(prev => prev.map(r => r.id === maintenanceForm.roomId ? { ...r, maintenance: [...r.maintenance, data as any] } : r));
      // Auto-create a maintenance job
      const room = rooms.find(r => r.id === maintenanceForm.roomId);
      const roomLabel = room ? ` (${room.room_name})` : '';
      const inspType = inspection.inspection_type.charAt(0).toUpperCase() + inspection.inspection_type.slice(1);
      await supabase.from('maintenance_jobs').insert({
        agent_id: inspection.agent_id,
        property_id: inspection.property_id,
        tenancy_id: inspection.tenancy_id,
        title: `${maintenanceForm.description}${roomLabel}`,
        description: `Flagged during ${inspType} condition report on ${format(new Date(), 'dd MMM yyyy')}`,
        category: 'general',
        priority: maintenanceForm.priority === 'urgent' ? 'urgent' :
                  maintenanceForm.priority === 'normal' ? 'routine' : 'low',
        status: 'new',
      } as any);
    }
    setMaintenanceForm(null);
    toast.success('Maintenance item flagged and job created');
  };

  const allRoomsRated = rooms.length > 0 && rooms.every(r => r.condition !== null);

  const handleFinalise = async (sendTo: 'owner' | 'tenant' | 'skip') => {
    if (!inspection) return;
    setFinalising(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    await supabase.from('property_inspections').update({
      conducted_date: today,
      finalised_at: new Date().toISOString(),
      status: 'completed',
      keys_count: keysCount,
      remotes_count: remotesCount,
      water_meter_reading: waterMeter || null,
      overall_notes: overallNotes || null,
    } as any).eq('id', inspection.id);

    const reportLink = `https://listhq.com.au/inspection-report/${inspection.report_token}`;

    if (sendTo === 'owner' && finaliseEmail) {
      supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'inspection_report',
          recipient_email: finaliseEmail,
          recipient_name: inspection.owner_name || 'Owner',
          property_address: propertyAddress,
          inspection_type: inspection.inspection_type,
          conducted_date: today,
          report_link: reportLink,
          agent_name: agentName,
          agent_phone: agentPhone,
        },
      }).catch(() => {});
    }

    if (sendTo === 'tenant' && finaliseTenantEmail) {
      supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'inspection_report',
          recipient_email: finaliseTenantEmail,
          recipient_name: 'Tenant',
          property_address: propertyAddress,
          inspection_type: inspection.inspection_type,
          conducted_date: today,
          report_link: reportLink,
          agent_name: agentName,
          agent_phone: agentPhone,
        },
      }).catch(() => {});
    }

    setFinalising(false);
    toast.success('Report finalised');
    navigate('/dashboard/pm-inspections');
  };

  const allMaintenance = rooms.flatMap(r => r.maintenance.map(m => ({ ...m, roomName: r.room_name })));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Inspection not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/rent-roll')}>
          <ArrowLeft size={14} className="mr-1" /> Back to Rent Roll
        </Button>
      </div>
    );
  }

  const typeBadgeColor: Record<string, string> = {
    entry: 'bg-blue-500/15 text-blue-700',
    routine: 'bg-violet-500/15 text-violet-700',
    exit: 'bg-orange-500/15 text-orange-700',
  };

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-500/15 text-blue-700',
    in_progress: 'bg-amber-500/15 text-amber-700',
    completed: 'bg-emerald-500/15 text-emerald-700',
    cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-4 pb-20">
      <DashboardHeader
        title="Condition Report"
        subtitle={propertyAddress}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/rent-roll')}>
              <ArrowLeft size={14} className="mr-1" /> Back
            </Button>
            {!isReadOnly && (
              <Button
                size="sm"
                disabled={!allRoomsRated}
                onClick={() => setShowFinalise(true)}
              >
                <CheckCircle2 size={14} className="mr-1" /> Finalise Report
              </Button>
            )}
          </div>
        }
      />

      {/* Header info */}
      <div className="px-4 sm:px-6 flex flex-wrap items-center gap-2">
        <Badge className={cn('border-0 capitalize', typeBadgeColor[inspection.inspection_type] || 'bg-muted')}>{inspection.inspection_type}</Badge>
        <Badge className={cn('border-0 capitalize', statusColor[inspection.status] || 'bg-muted')}>{inspection.status.replace('_', ' ')}</Badge>
        <span className="text-sm text-muted-foreground">Scheduled: {format(parseISO(inspection.scheduled_date), 'dd MMM yyyy')}</span>
        {inspection.conducted_date && <span className="text-sm text-muted-foreground">Conducted: {format(parseISO(inspection.conducted_date), 'dd MMM yyyy')}</span>}
      </div>

      {!allRoomsRated && !isReadOnly && (
        <div className="mx-4 sm:mx-6 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Rate all rooms before finalising the report.</p>
        </div>
      )}

      {/* Section 1 — Property Details */}
      <Card className="mx-4 sm:mx-6">
        <CardContent className="p-4 grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Keys Count</Label>
            <Input type="number" min={0} value={keysCount} onChange={e => setKeysCount(parseInt(e.target.value) || 0)} disabled={isReadOnly} />
          </div>
          <div>
            <Label className="text-xs">Remotes / Fobs</Label>
            <Input type="number" min={0} value={remotesCount} onChange={e => setRemotesCount(parseInt(e.target.value) || 0)} disabled={isReadOnly} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Water Meter Reading</Label>
            <Input value={waterMeter} onChange={e => setWaterMeter(e.target.value)} placeholder="e.g. 12345" disabled={isReadOnly} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Overall Notes</Label>
            <Textarea value={overallNotes} onChange={e => setOverallNotes(e.target.value)} rows={3} disabled={isReadOnly} />
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Rooms */}
      <div className="px-4 sm:px-6 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Rooms</h2>
        {rooms.map(room => {
          const isSmokeAlarms = room.room_name === 'Smoke Alarms';
          return (
            <Card key={room.id}>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{room.room_name}</h3>

                {/* Condition selector */}
                {isSmokeAlarms ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">All smoke alarms tested and functioning?</p>
                    <div className="flex gap-2 flex-wrap">
                      {(['excellent', 'fair', 'poor'] as Condition[]).map(c => {
                        const label = c === 'excellent' ? 'Yes' : c === 'fair' ? 'Partial' : 'No';
                        return (
                          <button
                            key={c}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-medium border transition-all min-h-[44px]',
                              room.condition === c ? CONDITION_COLORS[c] : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                            )}
                            onClick={() => updateCondition(room.id, c)}
                            disabled={isReadOnly}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {CONDITIONS.map(c => (
                      <button
                        key={c}
                        className={cn(
                          'px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all min-h-[44px] capitalize',
                          room.condition === c ? CONDITION_COLORS[c] : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                        )}
                        onClick={() => updateCondition(room.id, c)}
                        disabled={isReadOnly}
                      >
                        {c === 'na' ? 'N/A' : c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <Textarea
                  placeholder="Room notes..."
                  defaultValue={room.notes || ''}
                  onBlur={e => updateRoomNotes(room.id, e.target.value)}
                  rows={2}
                  className="text-sm"
                  disabled={isReadOnly}
                />

                {/* Photos */}
                <div className="flex flex-wrap gap-2">
                  {room.photos.map(p => (
                    <img key={p.id} src={p.photo_url} alt={p.caption || room.room_name} className="w-16 h-16 rounded-md object-cover border" />
                  ))}
                  {!isReadOnly && (
                    <>
                      <button
                        className="w-16 h-16 rounded-md border border-dashed border-border flex items-center justify-center hover:bg-accent/50 transition-colors min-h-[44px]"
                        onClick={() => fileInputRefs.current[room.id]?.click()}
                      >
                        <Camera size={16} className="text-muted-foreground" />
                      </button>
                      <input
                        ref={el => { fileInputRefs.current[room.id] = el; }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(room.id, file);
                          e.target.value = '';
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Maintenance items */}
                {room.maintenance.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.maintenance.map(m => (
                      <Badge
                        key={m.id}
                        className={cn('border-0 text-xs', m.priority === 'urgent' ? 'bg-red-500/15 text-red-700' : m.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-amber-500/15 text-amber-700')}
                      >
                        <Wrench size={10} className="mr-1" /> {m.description}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Flag maintenance inline form */}
                {!isReadOnly && (
                  maintenanceForm?.roomId === room.id ? (
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          placeholder="Describe issue..."
                          value={maintenanceForm.description}
                          onChange={e => setMaintenanceForm(f => f ? { ...f, description: e.target.value } : f)}
                          className="text-sm"
                        />
                      </div>
                      <Select value={maintenanceForm.priority} onValueChange={v => setMaintenanceForm(f => f ? { ...f, priority: v } : f)}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={addMaintenanceItem} disabled={!maintenanceForm.description}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setMaintenanceForm(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setMaintenanceForm({ roomId: room.id, description: '', priority: 'normal' })}
                    >
                      <AlertTriangle size={12} className="mr-1" /> Flag Maintenance
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section 3 — Maintenance Summary */}
      {allMaintenance.length > 0 && (
        <div className="px-4 sm:px-6">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Wrench size={14} /> Maintenance Summary ({allMaintenance.length})
                </span>
                <ChevronDown size={14} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="p-4 space-y-2">
                  {allMaintenance.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="text-sm font-medium">{m.description}</span>
                        <span className="text-xs text-muted-foreground ml-2">{m.roomName}</span>
                      </div>
                      <Badge className={cn('border-0 text-xs capitalize', m.priority === 'urgent' ? 'bg-red-500/15 text-red-700' : m.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-amber-500/15 text-amber-700')}>
                        {m.priority}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Finalise Dialog */}
      <Dialog open={showFinalise} onOpenChange={setShowFinalise}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalise Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This will mark the inspection as completed with today's date.</p>

            <div>
              <Label className="text-xs">Send report to owner?</Label>
              <Input value={finaliseEmail} onChange={e => setFinaliseEmail(e.target.value)} placeholder="Owner email" />
            </div>

            <div>
              <Label className="text-xs">Send report to tenant?</Label>
              <Input value={finaliseTenantEmail} onChange={e => setFinaliseTenantEmail(e.target.value)} placeholder="Tenant email" />
            </div>

            <div className="flex flex-col gap-2">
              {finaliseEmail && (
                <Button onClick={() => handleFinalise('owner')} disabled={finalising}>
                  {finalising ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                  Finalise & Send to Owner
                </Button>
              )}
              {finaliseTenantEmail && (
                <Button variant="outline" onClick={() => handleFinalise('tenant')} disabled={finalising}>
                  {finalising ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                  Finalise & Send to Tenant
                </Button>
              )}
              <Button variant="ghost" onClick={() => handleFinalise('skip')} disabled={finalising}>
                Finalise without sending
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspectionReportPage;
