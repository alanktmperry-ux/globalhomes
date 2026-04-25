import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, Moon, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type Frequency = 'realtime' | 'hourly_digest' | 'daily_digest' | 'off';
type Channels = { in_app: boolean; email: boolean; push: boolean };

interface Pref {
  user_id: string;
  event_key: string;
  channels: Channels;
  frequency: Frequency;
}

interface Settings {
  user_id: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string | null;
  mute_until: string | null;
  push_enabled: boolean;
}

const CATEGORIES: { name: string; events: { key: string; label: string }[] }[] = [
  {
    name: 'Leads',
    events: [
      { key: 'new_hot_lead', label: 'New hot lead' },
      { key: 'lead_going_cold', label: 'Lead going cold' },
      { key: 'buyer_match', label: 'Buyer match found' },
      { key: 'co_broke_request', label: 'Co-broke request' },
    ],
  },
  {
    name: 'Listings',
    events: [
      { key: 'listing_approved', label: 'Listing approved' },
      { key: 'listing_rejected', label: 'Listing rejected' },
    ],
  },
  {
    name: 'Comms',
    events: [
      { key: 'inbound_message', label: 'Inbound message' },
      { key: 'template_suggested', label: 'Template suggested' },
      { key: 'mention', label: 'You were @mentioned' },
    ],
  },
  {
    name: 'Team',
    events: [
      { key: 'agent_approved', label: 'Agent approved' },
      { key: 'cross_agent_dup_match', label: 'Duplicate buyer match across agents' },
    ],
  },
  {
    name: 'Reports',
    events: [
      { key: 'reports_weekly_digest', label: 'Weekly performance digest' },
      { key: 'reputation_change', label: 'Reputation score change' },
    ],
  },
  {
    name: 'Automations',
    events: [
      { key: 'automation_hot_lead_new', label: 'Automation: hot lead arrives' },
      { key: 'automation_lead_going_cold', label: 'Automation: lead going cold' },
      { key: 'automation_under_offer_stale', label: 'Automation: under offer stale' },
      { key: 'automation_inspection_followup', label: 'Automation: inspection follow-up' },
    ],
  },
];

const PUSH_AVAILABLE = false; // no push infra yet

export default function NotificationPreferencesSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('notification_preferences').select('*').eq('user_id', user.id),
        supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      setPrefs((p ?? []) as any);
      setSettings((s ?? null) as any);
      setLoading(false);
    })();
  }, [user]);

  const prefMap = useMemo(() => {
    const m = new Map<string, Pref>();
    for (const p of prefs) m.set(p.event_key, p);
    return m;
  }, [prefs]);

  const upsertPref = async (event_key: string, patch: Partial<Pref>) => {
    if (!user) return;
    const existing = prefMap.get(event_key) ?? {
      user_id: user.id, event_key,
      channels: { in_app: true, email: false, push: false },
      frequency: 'realtime' as Frequency,
    };
    const next: Pref = {
      ...existing,
      ...patch,
      channels: { ...existing.channels, ...(patch.channels ?? {}) },
    };
    setPrefs((prev) => {
      const idx = prev.findIndex((x) => x.event_key === event_key);
      if (idx === -1) return [...prev, next];
      const copy = [...prev]; copy[idx] = next; return copy;
    });
    const { error } = await supabase.from('notification_preferences')
      .upsert(next, { onConflict: 'user_id,event_key' });
    if (error) toast.error('Failed to save');
  };

  const upsertSettings = async (patch: Partial<Settings>) => {
    if (!user) return;
    const next = { user_id: user.id, ...settings, ...patch } as Settings;
    setSettings(next);
    const { error } = await supabase.from('notification_settings')
      .upsert(next, { onConflict: 'user_id' });
    if (error) toast.error('Failed to save');
  };

  const muteFor = async (hours: number | 'monday') => {
    let until: Date;
    if (hours === 'monday') {
      until = new Date();
      const day = until.getDay();
      const daysUntilMonday = (8 - day) % 7 || 7;
      until.setDate(until.getDate() + daysUntilMonday);
      until.setHours(8, 0, 0, 0);
    } else {
      until = new Date(Date.now() + hours * 3600 * 1000);
    }
    await upsertSettings({ mute_until: until.toISOString() });
    toast.success(`Muted until ${until.toLocaleString()}`);
  };

  const unmute = async () => {
    await upsertSettings({ mute_until: null });
    toast.success('Unmuted');
  };

  if (loading) {
    return <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>;
  }

  const muteActive = settings?.mute_until && new Date(settings.mute_until) > new Date();

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
        <Bell size={14} /> Notifications
      </h3>

      {/* Quiet hours + mute */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Moon size={14} /> Quiet hours <span className="text-xs text-muted-foreground font-normal">(suppresses email; defers in-app)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Start</Label>
            <Input type="time"
              value={settings?.quiet_hours_start ?? ''}
              onChange={(e) => upsertSettings({ quiet_hours_start: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <Input type="time"
              value={settings?.quiet_hours_end ?? ''}
              onChange={(e) => upsertSettings({ quiet_hours_end: e.target.value || null })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium pt-2 border-t border-border">
          <BellOff size={14} /> Mute all
          {muteActive && (
            <span className="text-xs text-amber-600">
              · until {new Date(settings!.mute_until!).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => muteFor(1)}>1 hour</Button>
          <Button size="sm" variant="outline" onClick={() => muteFor(4)}>4 hours</Button>
          <Button size="sm" variant="outline" onClick={() => muteFor(24)}>24 hours</Button>
          <Button size="sm" variant="outline" onClick={() => muteFor('monday')}>Until Monday</Button>
          {muteActive && <Button size="sm" variant="ghost" onClick={unmute}>Unmute</Button>}
        </div>
      </div>

      {/* Per-event matrix */}
      {CATEGORIES.map((cat) => (
        <div key={cat.name} className="space-y-2">
          <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{cat.name}</h4>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Event</th>
                  <th className="px-2 py-2 font-medium w-16">In-app</th>
                  <th className="px-2 py-2 font-medium w-16">Email</th>
                  <th className="px-2 py-2 font-medium w-16" title="Push notifications coming soon">Push</th>
                  <th className="px-2 py-2 font-medium w-32">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {cat.events.map((ev) => {
                  const p = prefMap.get(ev.key) ?? {
                    user_id: user!.id, event_key: ev.key,
                    channels: { in_app: true, email: false, push: false },
                    frequency: 'realtime' as Frequency,
                  };
                  return (
                    <tr key={ev.key} className="border-t border-border">
                      <td className="px-3 py-2">{ev.label}</td>
                      <td className="px-2 py-2 text-center">
                        <Switch
                          checked={p.channels.in_app}
                          onCheckedChange={(v) => upsertPref(ev.key, { channels: { ...p.channels, in_app: v } })}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Switch
                          checked={p.channels.email}
                          onCheckedChange={(v) => upsertPref(ev.key, { channels: { ...p.channels, email: v } })}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Switch checked={false} disabled />
                      </td>
                      <td className="px-2 py-2">
                        <Select
                          value={p.frequency}
                          onValueChange={(v) => upsertPref(ev.key, { frequency: v as Frequency })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Realtime</SelectItem>
                            <SelectItem value="hourly_digest">Hourly digest</SelectItem>
                            <SelectItem value="daily_digest">Daily digest</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!PUSH_AVAILABLE && (
        <p className="text-xs text-muted-foreground">Push notifications are not yet available — coming soon.</p>
      )}
    </div>
  );
}
