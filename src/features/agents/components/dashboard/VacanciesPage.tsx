import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Home, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import DashboardHeader from './DashboardHeader';

interface T {
  id: string;
  property_id: string;
  tenant_name: string;
  status: string;
  lease_end: string;
  rent_amount: number;
  rent_frequency: string;
  vacancy_status: string | null;
  vacate_date: string | null;
  renewal_status: string | null;
  property_address?: string;
}

const vacancyBadge = (s: string | null) => {
  const v = s || 'occupied';
  const map: Record<string,string> = {
    occupied: 'bg-emerald-500/15 text-emerald-700',
    notice_given: 'bg-blue-500/15 text-blue-700',
    vacating: 'bg-amber-500/15 text-amber-700',
    vacant: 'bg-red-500/15 text-red-700',
    re_listed: 'bg-blue-500/15 text-blue-700',
    re_let: 'bg-emerald-500/15 text-emerald-700',
  };
  return <Badge className={`border-0 ${map[v] || ''}`}>{v.replace('_',' ')}</Badge>;
};

const renewalBadge = (s: string | null) => {
  if (!s || s === 'none') return null;
  const map: Record<string,string> = {
    offered: 'bg-blue-500/15 text-blue-700',
    accepted: 'bg-emerald-500/15 text-emerald-700',
    declined: 'bg-red-500/15 text-red-700',
  };
  return <Badge className={`border-0 text-[10px] ${map[s] || ''}`}>renewal: {s}</Badge>;
};

export default function VacanciesPage() {
  const agentId = useAgentId();
  const navigate = useNavigate();
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // notice dialog
  const [noticeFor, setNoticeFor] = useState<T | null>(null);
  const [vacateDate, setVacateDate] = useState('');

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tenancies')
      .select('id, property_id, tenant_name, status, lease_end, rent_amount, rent_frequency, vacancy_status, vacate_date, renewal_status, properties:property_id(address, suburb)')
      .eq('agent_id', agentId);
    const today = Date.now();
    const filtered = (data || [])
      .map((t: any) => ({
        ...t,
        property_address: t.properties ? `${t.properties.address}, ${t.properties.suburb}` : '—',
      }))
      .filter((t: T) => {
        const v = t.vacancy_status;
        if (v && v !== 'occupied') return true;
        if (t.lease_end) {
          const days = (parseISO(t.lease_end).getTime() - today) / 86400000;
          return days <= 60;
        }
        return false;
      });
    setList(filtered);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agentId]);

  const setVacancyStatus = async (t: T, vacancy_status: string, extra: any = {}) => {
    const { error } = await supabase.from('tenancies').update({ vacancy_status, ...extra } as any).eq('id', t.id);
    if (error) { toast.error('Could not update'); return; }
    toast.success('Status updated');
    load();
  };

  const submitNotice = async () => {
    if (!noticeFor) return;
    await setVacancyStatus(noticeFor, 'notice_given', { vacate_date: vacateDate || null });
    setNoticeFor(null); setVacateDate('');
  };

  const summary = useMemo(() => {
    const today = new Date();
    return {
      vacant: list.filter(t => t.vacancy_status === 'vacant').length,
      vacatingThisMonth: list.filter(t => t.vacate_date && parseISO(t.vacate_date).getMonth() === today.getMonth() && parseISO(t.vacate_date).getFullYear() === today.getFullYear()).length,
      noticeGiven: list.filter(t => t.vacancy_status === 'notice_given').length,
    };
  }, [list]);

  if (!agentId || loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary"/></div>;

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted-foreground mb-2">
        <span>Dashboard</span>
        <span className="mx-2">→</span>
        <span className="font-medium text-foreground">Vacancies</span>
      </nav>
      <DashboardHeader title="Vacancies" subtitle="Properties with notices, vacating soon or vacant." />

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Currently Vacant</p><p className={`text-2xl font-bold ${summary.vacant > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{summary.vacant}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vacating This Month</p><p className="text-2xl font-bold text-amber-600">{summary.vacatingThisMonth}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Notices Given</p><p className="text-2xl font-bold text-blue-600">{summary.noticeGiven}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Lease End</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Vacancy</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead className="w-64">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Home size={20} className="mx-auto mb-2 opacity-40"/>No vacancies or upcoming lease ends.</TableCell></TableRow>
                ) : list.map(t => {
                  const days = t.lease_end ? differenceInDays(parseISO(t.lease_end), new Date()) : null;
                  const v = t.vacancy_status || 'occupied';
                  const firstName = (t.tenant_name || '').split(' ')[0];
                  return (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-accent/30" onClick={() => navigate(`/dashboard/tenancies/${t.id}`)}>
                      <TableCell className="text-sm font-medium">{t.property_address}</TableCell>
                      <TableCell className="text-sm">{firstName || '—'}</TableCell>
                      <TableCell className="text-xs">{t.lease_end ? format(parseISO(t.lease_end), 'd MMM yyyy') : '—'}</TableCell>
                      <TableCell className={`text-xs font-medium ${days != null && days < 14 ? 'text-red-600' : days != null && days < 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {days != null ? `${days}d` : '—'}
                      </TableCell>
                      <TableCell>{vacancyBadge(t.vacancy_status)}</TableCell>
                      <TableCell>{renewalBadge(t.renewal_status) || <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          {(v === 'occupied' && (t.renewal_status === 'declined' || !t.renewal_status || t.renewal_status === 'none') && days != null && days < 60) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setNoticeFor(t); setVacateDate(t.lease_end || ''); }}>Mark notice given</Button>
                          )}
                          {v === 'notice_given' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVacancyStatus(t, 'vacating')}>Confirm vacating</Button>
                          )}
                          {(v === 'vacating' || v === 'vacant') && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/pocket-listing?type=rent&prefill=${t.property_id}`)}>
                                <Plus size={11} className="mr-1"/>Create listing
                              </Button>
                              {v === 'vacating' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVacancyStatus(t, 'vacant', { actual_vacate_date: new Date().toISOString().slice(0,10) })}>Mark vacant</Button>
                              )}
                            </>
                          )}
                          {v === 're_listed' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVacancyStatus(t, 're_let', { re_let_date: new Date().toISOString().slice(0,10) })}>Mark re-let</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!noticeFor} onOpenChange={o => !o && setNoticeFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tenant gave notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Vacate date</Label>
              <Input type="date" value={vacateDate} onChange={e => setVacateDate(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 text-amber-600"/>This sets vacancy status to <strong>notice given</strong>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoticeFor(null)}>Cancel</Button>
            <Button onClick={submitNotice}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
