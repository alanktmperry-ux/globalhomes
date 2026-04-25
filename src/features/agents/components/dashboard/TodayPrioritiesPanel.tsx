import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronUp, X, Flame, Snowflake, Clock, Mail, CalendarClock, Loader2, PartyPopper, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTodayPriorities, type PriorityItem, type PrioritySourceKey } from '@/features/agents/hooks/useTodayPriorities';
import TemplatePicker, { type TemplatePickerContact, type TemplatePickerProperty } from '@/features/messaging/components/TemplatePicker';

const SOURCE_META: Record<PrioritySourceKey, { icon: React.ReactNode; tone: string }> = {
  hot_lead:       { icon: <Flame size={14} />,        tone: 'text-destructive bg-destructive/10' },
  going_cold:     { icon: <Snowflake size={14} />,    tone: 'text-blue-600 bg-blue-500/10' },
  overdue_action: { icon: <Clock size={14} />,        tone: 'text-amber-600 bg-amber-500/10' },
  unresponded:    { icon: <Mail size={14} />,         tone: 'text-purple-600 bg-purple-500/10' },
  due_soon:       { icon: <CalendarClock size={14} />, tone: 'text-foreground bg-muted' },
};

const COLLAPSE_KEY = 'gh-today-priorities-collapsed';

/**
 * "Today's Priorities" — top-of-dashboard panel showing the 5 most urgent
 * actions for the agent. Deterministic ranking, 4-hour dismissal snooze.
 */
export default function TodayPrioritiesPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, loading, dismiss } = useTodayPriorities(5);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  });
  const [pickerCtx, setPickerCtx] = useState<{ contact: TemplatePickerContact; property: TemplatePickerProperty | null } | null>(null);

  const openPickerFor = async (item: PriorityItem) => {
    if (item.sourceKey === 'going_cold') {
      // sourceId = crm_lead.id → join contact
      const { data } = await supabase
        .from('crm_leads')
        .select('contact_id, contacts:contact_id(id, first_name, last_name, email, phone, mobile, preferred_language)')
        .eq('id', item.sourceId)
        .maybeSingle();
      const c = (data as any)?.contacts;
      if (!c) return;
      setPickerCtx({ contact: c as TemplatePickerContact, property: null });
    } else if (item.sourceKey === 'unresponded') {
      // sourceId = leads.id (public enquiry)
      const { data } = await supabase
        .from('leads')
        .select('user_name, user_email, user_phone, properties:property_id(address, suburb)')
        .eq('id', item.sourceId)
        .maybeSingle();
      if (!data) return;
      const [first, ...rest] = ((data as any).user_name || '').trim().split(' ');
      setPickerCtx({
        contact: {
          id: null, // no contact record yet; activity log skipped
          first_name: first || null,
          last_name: rest.join(' ') || null,
          email: (data as any).user_email,
          phone: (data as any).user_phone,
          mobile: (data as any).user_phone,
          preferred_language: null,
        },
        property: (data as any).properties
          ? { address: (data as any).properties.address, suburb: (data as any).properties.suburb, price: null }
          : null,
      });
    }
  };

  // Hydrate collapse from server prefs (overrides local on first load if set)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agent) return;
      const { data } = await supabase
        .from('agent_dashboard_prefs' as any)
        .select('prefs')
        .eq('agent_id', agent.id)
        .maybeSingle();
      const pref = (data as any)?.prefs?.priorities_collapsed;
      if (typeof pref === 'boolean') {
        setCollapsed(pref);
        localStorage.setItem(COLLAPSE_KEY, pref ? '1' : '0');
      }
    })();
  }, [user]);

  const toggleCollapsed = async () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    if (!user) return;
    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (!agent) return;
    const { data: existing } = await supabase
      .from('agent_dashboard_prefs' as any)
      .select('prefs')
      .eq('agent_id', agent.id)
      .maybeSingle();
    const newPrefs = { ...(((existing as any)?.prefs) || {}), priorities_collapsed: next };
    await supabase
      .from('agent_dashboard_prefs' as any)
      .upsert({ agent_id: agent.id, prefs: newPrefs, updated_at: new Date().toISOString() }, { onConflict: 'agent_id' });
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="font-display text-sm font-bold">Today's Priorities</h2>
          {!loading && items.length > 0 && (
            <span className="text-xs text-muted-foreground">· {items.length} action{items.length === 1 ? '' : 's'}</span>
          )}
        </div>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <div className="border-t border-border">
          {loading ? (
            <div className="px-5 py-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading priorities…
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <PartyPopper size={28} className="mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">You're all caught up 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">No urgent actions right now. Good work.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(item => (
                <PriorityRow
                  key={item.id}
                  item={item}
                  onAction={() => navigate(item.actionHref)}
                  onDismiss={() => dismiss(item)}
                  onTemplate={
                    item.sourceKey === 'going_cold' || item.sourceKey === 'unresponded'
                      ? () => openPickerFor(item)
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
      {pickerCtx && (
        <TemplatePicker
          open={!!pickerCtx}
          onClose={() => setPickerCtx(null)}
          contact={pickerCtx.contact}
          property={pickerCtx.property}
        />
      )}
    </div>
  );
}

function PriorityRow({ item, onAction, onDismiss, onTemplate }: {
  item: PriorityItem;
  onAction: () => void;
  onDismiss: () => void;
  onTemplate?: () => void;
}) {
  const meta = SOURCE_META[item.sourceKey];
  return (
    <li className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition">
      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${meta.tone}`}>
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.context}</p>
      </div>
      {onTemplate && (
        <Button
          size="sm"
          variant="outline"
          onClick={onTemplate}
          className="shrink-0 h-9 px-2"
          title="Send template"
          aria-label="Send template"
        >
          <Send size={14} />
        </Button>
      )}
      <Button size="sm" variant="default" onClick={onAction} className="shrink-0">
        {item.actionLabel}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition"
        title="Snooze for 4 hours"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </li>
  );
}
