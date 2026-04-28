import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import DashboardHeader from '@/features/agents/components/dashboard/DashboardHeader';
import SmokeAlarmPanel from './SmokeAlarmPanel';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Loader2, ShieldAlert, Flame } from 'lucide-react';

interface PropertyRow {
  id: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  latest: {
    service_date: string;
    next_service_due: string;
    compliance_status: string;
    certificate_number: string | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  compliant: 'bg-emerald-500/15 text-emerald-700',
  non_compliant: 'bg-red-500/15 text-red-700',
  requires_attention: 'bg-amber-500/15 text-amber-700',
};
const STATUS_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-Compliant',
  requires_attention: 'Requires Attention',
};

const SmokeAlarmsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [openProp, setOpenProp] = useState<PropertyRow | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: agentRow } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (!agentRow) { setLoading(false); return; }
    setAgentId(agentRow.id);

    const { data: properties } = await supabase
      .from('properties')
      .select('id, address, suburb, state')
      .eq('agent_id', agentRow.id);

    const propIds = (properties || []).map(p => p.id);
    let recordsByProp: Record<string, PropertyRow['latest']> = {};
    if (propIds.length > 0) {
      const { data: recs } = await supabase
        .from('smoke_alarm_records')
        .select('property_id, service_date, next_service_due, compliance_status, certificate_number')
        .in('property_id', propIds)
        .order('service_date', { ascending: false });
      (recs || []).forEach(r => {
        if (!recordsByProp[r.property_id]) {
          recordsByProp[r.property_id] = {
            service_date: r.service_date,
            next_service_due: r.next_service_due,
            compliance_status: r.compliance_status,
            certificate_number: r.certificate_number,
          };
        }
      });
    }

    const enriched: PropertyRow[] = (properties || []).map(p => ({
      ...p,
      latest: recordsByProp[p.id] || null,
    }));

    // Sort: properties with overdue first, then by next_service_due ascending, no-record last
    enriched.sort((a, b) => {
      if (!a.latest && !b.latest) return 0;
      if (!a.latest) return 1;
      if (!b.latest) return -1;
      return a.latest.next_service_due.localeCompare(b.latest.next_service_due);
    });

    setRows(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const today = new Date();
  const overdueCount = useMemo(
    () => rows.filter(r => r.latest && differenceInDays(parseISO(r.latest.next_service_due), today) < 0).length,
    [rows]
  );
  const noRecordCount = useMemo(() => rows.filter(r => !r.latest).length, [rows]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  return (
    <div className="space-y-4 pb-20">
      <DashboardHeader title="Smoke Alarm Compliance" subtitle="Portfolio-wide smoke alarm servicing and compliance status" />

      <div className="px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Properties</p>
          <p className="text-2xl font-semibold">{rows.length}</p>
        </CardContent></Card>
        <Card className={cn(overdueCount > 0 && 'border-red-500/30')}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className={cn('text-2xl font-semibold', overdueCount > 0 && 'text-red-700')}>{overdueCount}</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">No Records</p>
          <p className="text-2xl font-semibold">{noRecordCount}</p>
        </CardContent></Card>
      </div>

      <div className="px-4 sm:px-6">
        {rows.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Flame className="mx-auto mb-2" size={28} />
            <p className="text-sm">No properties found.</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium py-3 px-3">Property</th>
                    <th className="text-left font-medium py-3 px-3">Last Service</th>
                    <th className="text-left font-medium py-3 px-3">Next Due</th>
                    <th className="text-left font-medium py-3 px-3">Status</th>
                    <th className="text-left font-medium py-3 px-3">Certificate</th>
                    <th className="text-left font-medium py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(p => {
                    const due = p.latest ? differenceInDays(parseISO(p.latest.next_service_due), today) : null;
                    const overdue = due !== null && due < 0;
                    const dueSoon = due !== null && due >= 0 && due <= 60;
                    return (
                      <tr key={p.id} className={cn('border-b border-border/50', overdue && 'bg-red-500/5')}>
                        <td className="py-3 px-3">
                          <p className="font-medium text-foreground">{p.address}</p>
                          <p className="text-muted-foreground">{[p.suburb, p.state].filter(Boolean).join(', ')}</p>
                        </td>
                        <td className="py-3 px-3">
                          {p.latest ? format(parseISO(p.latest.service_date), 'dd MMM yyyy') : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          {p.latest ? (
                            <span className={cn(overdue && 'text-red-700 font-medium', dueSoon && 'text-amber-700 font-medium')}>
                              {format(parseISO(p.latest.next_service_due), 'dd MMM yyyy')}
                              {overdue && <span className="ml-1 text-[10px]">(overdue)</span>}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          {p.latest ? (
                            <Badge className={cn('border-0', STATUS_COLORS[p.latest.compliance_status] || 'bg-muted')}>
                              {STATUS_LABEL[p.latest.compliance_status] || p.latest.compliance_status}
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-amber-500/15 text-amber-700">No Record</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">{p.latest?.certificate_number || '—'}</td>
                        <td className="py-3 px-3">
                          <Button size="sm" variant="outline" onClick={() => setOpenProp(p)}>
                            {p.latest ? 'Manage' : 'Add Record'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-property panel modal */}
      <Dialog open={!!openProp} onOpenChange={(o) => !o && setOpenProp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openProp ? `${openProp.address}, ${openProp.suburb || ''}` : ''}
            </DialogTitle>
          </DialogHeader>
          {openProp && agentId && (
            <SmokeAlarmPanel
              propertyId={openProp.id}
              propertyState={openProp.state}
              agentId={agentId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmokeAlarmsPage;
