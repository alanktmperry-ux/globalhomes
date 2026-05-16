import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import SmokeAlarmPanel from './SmokeAlarmPanel';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  APlusPageHeader, APlusStatCard, APlusTable, APlusTHead, APlusTh, APlusTBody, APlusTr, APlusTd,
  APlusBadge, APlusDueSoonBanner, type APlusBadgeTone,
} from '@/components/ui/data-table-aplus';
import { EmptyState } from '@/components/ui/empty-state';

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

const STATUS_TONE: Record<string, APlusBadgeTone> = {
  compliant: 'green',
  non_compliant: 'red',
  requires_attention: 'amber',
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

  const dueSoonCount = useMemo(
    () => rows.filter(r => {
      if (!r.latest) return false;
      const d = differenceInDays(parseISO(r.latest.next_service_due), today);
      return d >= 0 && d <= 60;
    }).length,
    [rows]
  );

  return (
    <div className="p-4 sm:p-6 pb-20">
      <APlusPageHeader
        title="Compliance"
        subtitle="Smoke alarms, pool safety, gas/electrical, lease compliance — all tracked here"
      />

      {dueSoonCount > 0 && overdueCount === 0 && (
        <APlusDueSoonBanner
          title={`${dueSoonCount} compliance item${dueSoonCount === 1 ? '' : 's'} due in the next 60 days`}
          body="Schedule inspections to stay ahead of expiry."
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <APlusStatCard label="Compliant" value={rows.length - overdueCount - noRecordCount} />
        <APlusStatCard label="Due Soon" value={dueSoonCount} />
        <APlusStatCard label="Overdue" value={overdueCount} urgent={overdueCount > 0} icon={AlertTriangle} />
        <APlusStatCard label="No Record" value={noRecordCount} />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[12px] p-10" style={{ border: '1px solid #E5E7EB' }}>
          <EmptyState
            icon={ShieldCheck}
            title="No properties found"
            body="Add properties to your portfolio to track smoke alarm compliance."
            variant="compact"
          />
        </div>
      ) : (
        <APlusTable>
          <APlusTHead>
            <APlusTh>Property</APlusTh>
            <APlusTh>Last Service</APlusTh>
            <APlusTh>Next Due</APlusTh>
            <APlusTh>Status</APlusTh>
            <APlusTh>Certificate</APlusTh>
            <APlusTh align="right">Action</APlusTh>
          </APlusTHead>
          <APlusTBody>
            {rows.map(p => {
              const due = p.latest ? differenceInDays(parseISO(p.latest.next_service_due), today) : null;
              const overdue = due !== null && due < 0;
              const dueSoon = due !== null && due >= 0 && due <= 60;
              const nextColor = overdue ? 'text-[#991B1B] font-bold' : dueSoon ? 'text-[#92400E] font-semibold' : 'text-[#0a0f1e] font-semibold';
              return (
                <APlusTr key={p.id}>
                  <APlusTd>
                    <div className="font-semibold text-[#0a0f1e]">{p.address}</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{[p.suburb, p.state].filter(Boolean).join(', ')}</div>
                  </APlusTd>
                  <APlusTd>
                    {p.latest ? (
                      <span className="text-xs text-[#6B7280] tabular-nums whitespace-nowrap">
                        {format(parseISO(p.latest.service_date), 'dd MMM yyyy')}
                      </span>
                    ) : <span className="text-[#6B7280]">—</span>}
                  </APlusTd>
                  <APlusTd>
                    {p.latest ? (
                      <span className={cn('text-xs tabular-nums whitespace-nowrap', nextColor)}>
                        {format(parseISO(p.latest.next_service_due), 'dd MMM yyyy')}
                        {overdue && <span className="ml-1 text-[10px]">(overdue)</span>}
                      </span>
                    ) : <span className="text-[#6B7280]">—</span>}
                  </APlusTd>
                  <APlusTd>
                    {p.latest ? (
                      <APlusBadge
                        tone={STATUS_TONE[p.latest.compliance_status] || 'grey'}
                        label={STATUS_LABEL[p.latest.compliance_status] || p.latest.compliance_status}
                        icon={p.latest.compliance_status === 'non_compliant' ? AlertTriangle : undefined}
                      />
                    ) : (
                      <APlusBadge tone="amber" label="No Record" />
                    )}
                  </APlusTd>
                  <APlusTd>
                    <span className="text-xs text-[#374151] font-medium">{p.latest?.certificate_number || '—'}</span>
                  </APlusTd>
                  <APlusTd align="right">
                    <Button size="sm" variant="outline" onClick={() => setOpenProp(p)} className="h-8">
                      {p.latest ? 'Manage' : 'Add Record'}
                    </Button>
                  </APlusTd>
                </APlusTr>
              );
            })}
          </APlusTBody>
        </APlusTable>
      )}

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
