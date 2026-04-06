import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAgentOpenHomes } from '../hooks/useOpenHomes';
import { Calendar, Plus, Users, QrCode } from 'lucide-react';
import { CreateOpenHomeModal } from './CreateOpenHomeModal';
import { OpenHomeRegistrantsList } from './OpenHomeRegistrantsList';
import type { OpenHomeWithCounts } from '../hooks/useOpenHomes';
import { Button } from '@/components/ui/button';
import DashboardHeader from '@/features/agents/components/dashboard/DashboardHeader';

export default function AgentOpenHomeManager() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const { sessions, loading } = useAgentOpenHomes(agentId ?? undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelected] = useState<OpenHomeWithCounts | null>(null);
  const [properties, setProperties] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setAgentId(data?.id ?? null); });
  }, [user]);

  useEffect(() => {
    if (!agentId) return;
    supabase.from('properties').select('id, address').eq('agent_id', agentId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach(p => { map[p.id] = p.address; });
        setProperties(map);
      });
  }, [agentId]);

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const live = sessions.filter(s => s.status === 'in_progress');
  const past = sessions.filter(s => s.status === 'completed').slice(0, 5);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const SessionRow = ({ session }: { session: OpenHomeWithCounts }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {properties[session.property_id] ?? 'Loading…'}
        </p>
        <p className="text-xs text-muted-foreground">{formatDateTime(session.starts_at)}</p>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Users size={12} />
        {session.attended_count > 0
          ? `${session.attended_count}/${session.registered_count} attended`
          : `${session.registered_count} registered`}
        {session.waitlist_count > 0 && (
          <span className="text-amber-600 ml-1">+{session.waitlist_count} waitlist</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-3 shrink-0">
        <Button variant="outline" size="sm" onClick={() => setSelected(session)} className="text-xs gap-1">
          <Users size={12} /> Attendees
        </Button>
        <a
          href={`/open-home/signin/${session.qr_token}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <QrCode size={12} /> Sign-in
          </Button>
        </a>
      </div>
    </div>
  );

  if (!agentId) return null;

  return (
    <div>
      <DashboardHeader
        title="Open Homes"
        subtitle="Schedule and manage open home inspections"
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5 text-xs">
            <Plus size={14} /> Schedule open home
          </Button>
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl space-y-6">
        {live.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">Live now</h3>
            </div>
            <div className="space-y-2">{live.map(s => <SessionRow key={s.id} session={s} />)}</div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
            <div className="space-y-2">{upcoming.map(s => <SessionRow key={s.id} session={s} />)}</div>
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Recent</h3>
            <div className="space-y-2">{past.map(s => <SessionRow key={s.id} session={s} />)}</div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-foreground">No open homes yet</p>
            <p className="text-sm text-muted-foreground mt-1">Schedule your first open home to start collecting registrations</p>
          </div>
        )}
      </div>

      {showCreate && agentId && (
        <CreateOpenHomeModal
          agentId={agentId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); window.location.reload(); }}
        />
      )}

      {selectedSession && (
        <OpenHomeRegistrantsList
          session={selectedSession}
          propertyAddress={properties[selectedSession.property_id] ?? ''}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
