import { useTeamOverview, TeamMember } from '@/features/agents/hooks/useTeamOverview';
import { useAuth } from '@/features/auth/AuthProvider';
import { useContacts } from '@/features/agents/hooks/useContacts';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Contact, List, DollarSign, ArrowRight, Loader2 } from 'lucide-react';

const PIPELINE_COLORS: Record<string, string> = {
  enquiry: 'bg-blue-400',
  viewing: 'bg-amber-400',
  offer: 'bg-orange-500',
  contract: 'bg-emerald-500',
  settled: 'bg-green-700',
};

const TeamOverviewPage = () => {
  const { agencyId } = useAuth();
  const { agents, loading, error } = useTeamOverview();
  const { contacts } = useContacts();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  const totalContacts = agents.reduce((sum, a) => sum + a.contact_count, 0);
  const totalListings = agents.reduce((sum, a) => sum + a.active_listings, 0);
  const teamCount = agents.length;
  const pipelineValue = contacts.reduce((sum, c) => sum + (c.budget_max || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agency-wide performance at a glance
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Contact} label="Total Contacts" value={totalContacts} />
        <StatCard icon={List} label="Active Listings" value={totalListings} />
        <StatCard icon={Users} label="Team Members" value={teamCount} />
        <StatCard
          icon={DollarSign}
          label="Pipeline Value"
          value={pipelineValue > 0 ? `$${(pipelineValue / 1_000_000).toFixed(1)}M` : '$0'}
        />
      </div>

      {/* Agent Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent Roster</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Agent</th>
                  <th className="text-center py-3 px-4 font-medium">Contacts</th>
                  <th className="text-center py-3 px-4 font-medium">Listings</th>
                  <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Pipeline</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} navigate={navigate} />
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No team members found in this agency.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* All Agency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Agency Contacts</CardTitle>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contacts across the agency
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Type</th>
                  <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Pipeline</th>
                  <th className="text-left py-3 px-4 font-medium">Source</th>
                  <th className="text-right py-3 px-4 font-medium">Budget</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 50).map((contact) => (
                  <tr key={contact.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-4">
                      <div className="font-medium">
                        {contact.first_name} {contact.last_name || ''}
                      </div>
                      {contact.email && (
                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">
                        {contact.contact_type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {contact.buyer_pipeline_stage || 'new'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      {contact.source || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {contact.budget_max
                        ? `$${contact.budget_max.toLocaleString()}`
                        : '—'}
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No contacts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentRow({
  agent,
  navigate,
}: {
  agent: TeamMember;
  navigate: (path: string) => void;
}) {
  const totalPipeline = agent.pipeline_breakdown.reduce((s, p) => s + p.count, 0);

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={agent.avatar_url} />
            <AvatarFallback className="text-xs">
              {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{agent.name}</div>
            <div className="flex items-center gap-1.5">
              {agent.email && (
                <span className="text-xs text-muted-foreground">{agent.email}</span>
              )}
              {agent.agency_role === 'principal' && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                  Principal
                </Badge>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center font-medium">{agent.contact_count}</td>
      <td className="py-3 px-4 text-center font-medium">{agent.active_listings}</td>
      <td className="py-3 px-4 hidden md:table-cell">
        {totalPipeline > 0 ? (
          <div className="flex items-center gap-0.5 h-4">
            {agent.pipeline_breakdown.map((p) => (
              <div
                key={p.stage}
                className={`h-full rounded-sm ${PIPELINE_COLORS[p.stage] || 'bg-muted'}`}
                style={{ width: `${Math.max((p.count / totalPipeline) * 100, 8)}%`, minWidth: 6 }}
                title={`${p.stage}: ${p.count}`}
              />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1"
          onClick={() => navigate(`/dashboard/crm?agent_id=${agent.id}`)}
        >
          View contacts <ArrowRight size={12} />
        </Button>
      </td>
    </tr>
  );
}

export default TeamOverviewPage;
