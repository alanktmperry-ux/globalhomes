import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeamAgents, TeamAgent } from '@/features/agents/hooks/useTeamAgents';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Loader2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

function getComplianceStatus(agent: TeamAgent) {
  const now = new Date();
  const issues: string[] = [];

  if (agent.licence_expiry_date) {
    const expiry = new Date(agent.licence_expiry_date);
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
    if (daysUntil < 0) issues.push('Licence expired');
    else if (daysUntil < 30) issues.push('Licence expiring < 30 days');
    else if (daysUntil < 90) issues.push('Licence expiring < 90 days');
  } else {
    issues.push('No licence expiry set');
  }

  if (agent.cpd_hours_completed < agent.cpd_hours_required) {
    issues.push(`CPD: ${agent.cpd_hours_completed}/${agent.cpd_hours_required}h`);
  }

  if (agent.professional_indemnity_expiry) {
    const piExpiry = new Date(agent.professional_indemnity_expiry);
    const daysUntil = Math.ceil((piExpiry.getTime() - now.getTime()) / 86400000);
    if (daysUntil < 0) issues.push('PI insurance expired');
    else if (daysUntil < 30) issues.push('PI expiring soon');
  }

  return issues;
}

function getLicenceColor(dateStr: string | null) {
  if (!dateStr) return 'text-muted-foreground';
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-destructive';
  if (days < 30) return 'text-destructive';
  if (days < 90) return 'text-amber-600';
  return 'text-emerald-600';
}

export default function ComplianceTab() {
  const { agents, loading, refetch } = useTeamAgents();
  const [editAgent, setEditAgent] = useState<TeamAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    license_number: '',
    licence_expiry_date: '',
    cpd_hours_completed: 0,
    cpd_hours_required: 12,
    professional_indemnity_expiry: '',
  });

  const compliantCount = agents.filter(a => getComplianceStatus(a).length === 0).length;

  const openEdit = (agent: TeamAgent) => {
    setEditAgent(agent);
    setForm({
      license_number: agent.license_number || '',
      licence_expiry_date: agent.licence_expiry_date || '',
      cpd_hours_completed: agent.cpd_hours_completed,
      cpd_hours_required: agent.cpd_hours_required,
      professional_indemnity_expiry: agent.professional_indemnity_expiry || '',
    });
  };

  const handleSave = async () => {
    if (!editAgent) return;
    setSaving(true);
    const { error } = await supabase
      .from('agents')
      .update({
        license_number: form.license_number || null,
        licence_expiry_date: form.licence_expiry_date || null,
        cpd_hours_completed: form.cpd_hours_completed,
        cpd_hours_required: form.cpd_hours_required,
        professional_indemnity_expiry: form.professional_indemnity_expiry || null,
      } as any)
      .eq('id', editAgent.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update compliance data');
      return;
    }
    toast.success('Compliance data updated');
    setEditAgent(null);
    refetch();
  };

  const exportCsv = () => {
    const headers = ['Agent', 'Licence #', 'Licence Expiry', 'CPD Completed', 'CPD Required', 'PI Expiry', 'Status'];
    const rows = agents.map(a => {
      const issues = getComplianceStatus(a);
      return [
        a.name,
        a.license_number || '',
        a.licence_expiry_date || '',
        a.cpd_hours_completed,
        a.cpd_hours_required,
        a.professional_indemnity_expiry || '',
        issues.length === 0 ? 'Compliant' : issues.join('; '),
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Card className="flex-1 mr-3">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield size={20} className="text-primary" />
            <div>
              <p className="text-sm font-medium">{compliantCount} of {agents.length} agents compliant</p>
              <p className="text-xs text-muted-foreground">All licence, CPD, and insurance checks passed</p>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 shrink-0">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-3 font-medium">Agent</th>
              <th className="text-left py-3 px-3 font-medium">Licence #</th>
              <th className="text-left py-3 px-3 font-medium">Licence Expiry</th>
              <th className="text-center py-3 px-3 font-medium">CPD Hours</th>
              <th className="text-left py-3 px-3 font-medium">PI Expiry</th>
              <th className="text-center py-3 px-3 font-medium">Status</th>
              <th className="text-right py-3 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              const issues = getComplianceStatus(agent);
              return (
                <tr key={agent.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-3 font-medium">{agent.name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{agent.license_number || '—'}</td>
                  <td className={`py-3 px-3 font-medium ${getLicenceColor(agent.licence_expiry_date)}`}>
                    {agent.licence_expiry_date
                      ? new Date(agent.licence_expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={agent.cpd_hours_completed >= agent.cpd_hours_required ? 'text-emerald-600' : 'text-amber-600'}>
                      {agent.cpd_hours_completed}/{agent.cpd_hours_required}
                    </span>
                  </td>
                  <td className={`py-3 px-3 font-medium ${getLicenceColor(agent.professional_indemnity_expiry)}`}>
                    {agent.professional_indemnity_expiry
                      ? new Date(agent.professional_indemnity_expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {issues.length === 0 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        <CheckCircle2 size={10} className="mr-1" /> Compliant
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                        <AlertTriangle size={10} className="mr-1" /> Action Required
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(agent)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editAgent} onOpenChange={() => setEditAgent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Compliance — {editAgent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Licence Number</Label>
              <Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Licence Expiry Date</Label>
              <Input type="date" value={form.licence_expiry_date} onChange={e => setForm(f => ({ ...f, licence_expiry_date: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CPD Hours Completed</Label>
                <Input type="number" value={form.cpd_hours_completed} onChange={e => setForm(f => ({ ...f, cpd_hours_completed: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">CPD Hours Required</Label>
                <Input type="number" value={form.cpd_hours_required} onChange={e => setForm(f => ({ ...f, cpd_hours_required: parseInt(e.target.value) || 12 }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">PI Insurance Expiry</Label>
              <Input type="date" value={form.professional_indemnity_expiry} onChange={e => setForm(f => ({ ...f, professional_indemnity_expiry: e.target.value }))} className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
