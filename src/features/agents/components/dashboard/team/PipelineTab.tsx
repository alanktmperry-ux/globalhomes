import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useContacts } from '@/features/agents/hooks/useContacts';
import { useTeamAgents } from '@/features/agents/hooks/useTeamAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const STAGES = ['enquiry', 'viewing', 'offer', 'contracts', 'settled'];
const STAGE_COLORS: Record<string, string> = {
  enquiry: 'border-blue-400',
  viewing: 'border-amber-400',
  offer: 'border-orange-500',
  contracts: 'border-emerald-500',
  settled: 'border-green-700',
};

export default function PipelineTab() {
  const { agencyId } = useAuth();
  const { contacts, loading, updateContact } = useContacts();
  const { agents } = useTeamAgents();
  const [agentFilter, setAgentFilter] = useState('all');

  const filtered = agentFilter === 'all'
    ? contacts
    : contacts.filter(c => c.assigned_agent_id === agentFilter);

  const byStage = STAGES.map(stage => ({
    stage,
    contacts: filtered.filter(c => (c.buyer_pipeline_stage || 'enquiry') === stage),
  }));

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} contacts</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {byStage.map(({ stage, contacts: stageContacts }) => (
          <div key={stage} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{stage}</h3>
              <Badge variant="secondary" className="text-[10px]">{stageContacts.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {stageContacts.map(contact => (
                <Card key={contact.id} className={`border-l-4 ${STAGE_COLORS[stage] || 'border-border'}`}>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-sm font-medium truncate">
                      {contact.first_name} {contact.last_name || ''}
                    </p>
                    {contact.assigned_agent && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {contact.assigned_agent.name}
                      </p>
                    )}
                    {(contact.budget_min || contact.budget_max) && (
                      <p className="text-[11px] text-muted-foreground">
                        {contact.budget_min ? `$${(contact.budget_min/1000).toFixed(0)}k` : ''}
                        {contact.budget_min && contact.budget_max ? ' – ' : ''}
                        {contact.budget_max ? `$${(contact.budget_max/1000).toFixed(0)}k` : ''}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(contact.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {stageContacts.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-4">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
