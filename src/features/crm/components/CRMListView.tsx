import { useState } from 'react';
import { useCRMLeads } from '../hooks/useCRMLeads';
import { LeadDetailModal } from './LeadDetailModal';
import { AddLeadModal } from './AddLeadModal';
import type { CRMLead, LeadStage } from '../types';
import { Search, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const fmtLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const STAGE_BADGE: Record<string, string> = {
  new: 'bg-muted text-muted-foreground',
  contacted: 'bg-blue-500/10 text-blue-700',
  qualified: 'bg-indigo-500/10 text-indigo-700',
  offer_stage: 'bg-amber-500/10 text-amber-700',
  under_contract: 'bg-purple-500/10 text-purple-700',
  settled: 'bg-green-500/10 text-green-700',
  lost: 'bg-destructive/10 text-destructive',
};

export function CRMListView() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStage] = useState<LeadStage | 'all'>('all');
  const [selectedLead, setSelected] = useState<CRMLead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const { leads, loading, createLead } = useCRMLeads({ search, stage: stageFilter });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStage(e.target.value as any)}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
        >
          <option value="all">All Stages</option>
          {['new', 'contacted', 'qualified', 'offer_stage', 'under_contract', 'settled', 'lost'].map(s => (
            <option key={s} value={s}>{fmtLabel(s)}</option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => setShowAddLead(true)}
          className="gap-2"
        >
          <UserPlus size={14} /> Add Lead
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Contact', 'Property', 'Stage', 'Budget', 'Last Contact', 'Source'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && leads.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No leads found.</td></tr>
            )}
            {leads.map(lead => {
              const daysAgo = lead.last_contacted
                ? Math.floor((Date.now() - new Date(lead.last_contacted).getTime()) / 86400000)
                : null;
              return (
                <tr
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-0"
                >
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-foreground">{lead.first_name} {lead.last_name ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{lead.email ?? lead.phone ?? '—'}</p>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{lead.property?.address ?? '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_BADGE[lead.stage]}`}>
                      {fmtLabel(lead.stage)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {lead.budget_max ? `$${(lead.budget_max / 1000).toFixed(0)}k` : '—'}
                  </td>
                  <td className={`py-2.5 px-3 text-xs ${daysAgo !== null && daysAgo > 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {daysAgo === null ? 'Never' : `${daysAgo}d ago`}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">
                    {fmtLabel(lead.source)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelected(null)}
          onUpdate={() => setSelected(null)}
        />
      )}

      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onSave={async (data) => {
            await createLead(data);
            setShowAddLead(false);
          }}
        />
      )}
    </div>
  );
}
