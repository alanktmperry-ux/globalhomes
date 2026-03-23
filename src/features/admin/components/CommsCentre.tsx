import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Send, Mail, Bell, Users, Clock, CheckCircle2, Plus, Trash2, Edit2,
  RefreshCw, ChevronDown, ChevronUp, FileText, Megaphone, Loader2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';

type Audience = 'all' | 'trial' | 'expiring' | 'paid' | 'never_listed' | 'at_risk';
type SendMethod = 'in_app' | 'email' | 'both';
type TemplateCategory = 'general' | 'trial_conversion' | 'activation' | 'retention' | 'announcement';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  audience: string | null;
  category: TemplateCategory;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  body: string;
  audience: Audience;
  send_method: SendMethod;
  recipient_count: number;
  sent_count: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
}

interface AgentRecipient {
  id: string;
  name: string;
  email: string;
  agency: string | null;
}

const AUDIENCE_CONFIG: Record<Audience, { label: string; desc: string; color: string }> = {
  all: { label: 'All agents', desc: 'Every agent on the platform', color: 'bg-primary/10 text-primary' },
  trial: { label: 'Trial agents', desc: 'Agents currently on free trial', color: 'bg-amber-500/10 text-amber-700' },
  expiring: { label: 'Expiring trials', desc: 'Trials ending within 7 days', color: 'bg-red-500/10 text-red-700' },
  paid: { label: 'Paid agents', desc: 'Active subscribers only', color: 'bg-emerald-500/10 text-emerald-700' },
  never_listed: { label: 'Never listed', desc: 'Signed up but no active listing', color: 'bg-orange-500/10 text-orange-700' },
  at_risk: { label: 'At risk', desc: 'No login in 14+ days', color: 'bg-destructive/10 text-destructive' },
};

const METHOD_CONFIG: Record<SendMethod, { label: string; icon: any }> = {
  in_app: { label: 'In-app only', icon: Bell },
  email: { label: 'Email only', icon: Mail },
  both: { label: 'In-app + Email', icon: Send },
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  trial_conversion: 'Trial Conversion',
  activation: 'Activation',
  retention: 'Retention',
  announcement: 'Announcement',
};

function buildEmailHtml(subject: string, body: string, agentName: string): string {
  const escaped = body.replace(/{{name}}/g, agentName).replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6"><p style="font-size:15px">${escaped}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px"><p style="font-size:11px;color:#9ca3af">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p></body></html>`;
}

function ComposePanel({ templates, onSent }: { templates: Template[]; onSent: () => void }) {
  const { user } = useAuth();
  const [audience, setAudience] = useState<Audience>('all');
  const [method, setMethod] = useState<SendMethod>('both');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<AgentRecipient[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const loadPreview = useCallback(async (aud: Audience) => {
    setPreviewLoading(true);
    try {
      const now = new Date();
      const { data: allAgents } = await supabase.from('agents').select('id, name, email, agency, is_subscribed, created_at');
      if (!allAgents) return;

      const signInMap = new Map<string, string | null>();
      if (aud === 'at_risk') {
        try {
          const { data: s } = await supabase.auth.getSession();
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list_users`,
            { headers: { Authorization: `Bearer ${s.session?.access_token}`, 'Content-Type': 'application/json' } }
          );
          const j = await res.json();
          (j.users || []).forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
        } catch {}
      }

      let agentsWithListings = new Set<string>();
      if (aud === 'never_listed') {
        const { data: props } = await supabase.from('properties').select('agent_id').eq('is_active', true);
        agentsWithListings = new Set((props || []).map((p: any) => p.agent_id).filter(Boolean));
      }

      const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();

      const filtered = allAgents.filter((a: any) => {
        if (aud === 'all') return true;
        if (aud === 'trial') return !a.is_subscribed;
        if (aud === 'paid') return a.is_subscribed;
        if (aud === 'expiring') {
          if (a.is_subscribed) return false;
          const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
          return trialEnd > now && trialEnd <= new Date(now.getTime() + 7 * 86400000);
        }
        if (aud === 'never_listed') return !agentsWithListings.has(a.id);
        if (aud === 'at_risk') {
          const lastLogin = signInMap.get(a.id);
          return !lastLogin || new Date(lastLogin) < new Date(d14);
        }
        return true;
      });

      setPreview(filtered.map((a: any) => ({ id: a.id, name: a.name, email: a.email, agency: a.agency })));
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => { loadPreview(audience); }, [audience, loadPreview]);

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setTitle(tmpl.name);
    if (tmpl.audience) setAudience(tmpl.audience as Audience);
    setSelectedTemplate(templateId);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast.error('Subject and message are required'); return; }
    if (preview.length === 0) { toast.error('No recipients in this audience'); return; }
    if (!confirm(`Send to ${preview.length} agent${preview.length > 1 ? 's' : ''}? This cannot be undone.`)) return;

    setSending(true);

    const { data: campaign, error: campErr } = await supabase
      .from('broadcast_campaigns')
      .insert({
        title: title || subject,
        subject,
        body,
        audience,
        send_method: method,
        recipient_count: preview.length,
        status: 'sending',
        created_by: user?.id,
      } as any)
      .select()
      .single();

    if (campErr) { toast.error('Failed to create campaign record'); setSending(false); return; }

    let sentCount = 0;

    for (const agent of preview) {
      const personalBody = body.replace(/{{name}}/g, agent.name.split(' ')[0]);
      try {
        if (method === 'in_app' || method === 'both') {
          await supabase.from('notifications').insert({
            agent_id: agent.id,
            type: 'broadcast',
            title: subject,
            message: personalBody.slice(0, 300),
          } as any);
        }
        if (method === 'email' || method === 'both') {
          await supabase.functions.invoke('send-notification-email', {
            body: { to: agent.email, subject, html: buildEmailHtml(subject, personalBody, agent.name) },
          });
        }
        sentCount++;
      } catch {}
    }

    await supabase.from('broadcast_campaigns').update({
      status: 'sent',
      sent_count: sentCount,
      sent_at: new Date().toISOString(),
    } as any).eq('id', (campaign as any).id);

    toast.success(`Sent to ${sentCount} of ${preview.length} agents`);
    setSending(false);
    setSubject('');
    setBody('');
    setTitle('');
    setSelectedTemplate('');
    onSent();
  };

  return (
    <div className="space-y-5">
      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Start from a template</Label>
          <select
            value={selectedTemplate}
            onChange={e => applyTemplate(e.target.value)}
            className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Choose a template —</option>
            {(['trial_conversion', 'activation', 'retention', 'announcement', 'general'] as TemplateCategory[]).map(cat => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {templates.filter(t => t.category === cat).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Campaign name <span className="text-muted-foreground">(internal)</span></Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Trial expiry push — March 2026" className="text-sm" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Audience</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(AUDIENCE_CONFIG) as Audience[]).map(aud => {
            const c = AUDIENCE_CONFIG[aud];
            return (
              <button key={aud} onClick={() => setAudience(aud)} className={`text-left p-3 rounded-xl border text-xs transition-colors ${audience === aud ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
                <p className="font-semibold text-foreground">{c.label}</p>
                <p className="text-muted-foreground mt-0.5">{c.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
            <span>{previewLoading ? 'Counting recipients…' : `${preview.length} recipient${preview.length !== 1 ? 's' : ''}`}</span>
          </div>
          {preview.length > 0 && (
            <button onClick={() => setShowPreview(p => !p)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
              {showPreview ? 'Hide' : 'Preview list'}
              {showPreview ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>

        {showPreview && preview.length > 0 && (
          <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
            {preview.slice(0, 20).map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-foreground">{a.name}</p>
                  <p className="text-muted-foreground">{a.email}</p>
                </div>
                {a.agency && <p className="text-muted-foreground text-[10px]">{a.agency}</p>}
              </div>
            ))}
            {preview.length > 20 && <p className="text-[10px] text-muted-foreground text-center pt-1">+{preview.length - 20} more</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Send via</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(METHOD_CONFIG) as SendMethod[]).map(m => {
            const Icon = METHOD_CONFIG[m].icon;
            return (
              <button key={m} onClick={() => setMethod(m)} className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors ${method === m ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                <Icon size={14} />
                {METHOD_CONFIG[m].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Subject line</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject / notification title" className="text-sm" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Message</Label>
          <span className="text-[10px] text-muted-foreground">Use {'{{name}}'} for agent first name</span>
        </div>
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here..." className="min-h-[160px] text-sm resize-none" />
      </div>

      <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim() || preview.length === 0} className="w-full gap-2 font-semibold" size="lg">
        {sending ? (
          <><Loader2 size={16} className="animate-spin" /> Sending to {preview.length} agents…</>
        ) : (
          <><Send size={15} /> Send to {preview.length} agent{preview.length !== 1 ? 's' : ''}</>
        )}
      </Button>
    </div>
  );
}

function TemplatesPanel({ templates, onRefresh }: { templates: Template[]; onRefresh: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', audience: '', category: 'general' as TemplateCategory });
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const startNew = () => { setForm({ name: '', subject: '', body: '', audience: '', category: 'general' }); setEditId(null); setShowNew(true); };
  const startEdit = (t: Template) => { setForm({ name: t.name, subject: t.subject, body: t.body, audience: t.audience || '', category: t.category }); setEditId(t.id); setShowNew(true); };

  const save = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) { toast.error('Name, subject, and body are required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, subject: form.subject, body: form.body, audience: form.audience || null, category: form.category };
      if (editId) {
        await supabase.from('message_templates').update(payload as any).eq('id', editId);
        toast.success('Template updated');
      } else {
        await supabase.from('message_templates').insert(payload as any);
        toast.success('Template created');
      }
      setShowNew(false);
      setEditId(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('message_templates').delete().eq('id', id);
    toast.success('Template deleted');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={startNew} className="gap-1.5 text-xs"><Plus size={13} /> New template</Button>
      </div>

      {showNew && (
        <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editId ? 'Edit template' : 'New template'}</p>
            <button onClick={() => setShowNew(false)}><X size={14} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Template name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Trial expiry warning" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TemplateCategory }))} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject line" className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Body</Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Message body — use {{name}} for first name" className="text-sm min-h-[120px] resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving} className="text-xs gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {editId ? 'Save changes' : 'Create template'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{CATEGORY_LABELS[t.category]}</span>
                  {t.audience && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${AUDIENCE_CONFIG[t.audience as Audience]?.color || 'bg-secondary text-muted-foreground'}`}>
                      {AUDIENCE_CONFIG[t.audience as Audience]?.label || t.audience}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{t.body.slice(0, 120)}…</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg bg-secondary hover:bg-accent transition-colors"><Edit2 size={12} className="text-muted-foreground" /></button>
                <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-lg bg-secondary hover:bg-red-500/10 transition-colors"><Trash2 size={12} className="text-muted-foreground" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignHistory({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Megaphone size={32} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.2} />
        <p className="text-sm text-muted-foreground">No campaigns sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map(c => (
        <div key={c.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  c.status === 'sent' ? 'bg-emerald-500/10 text-emerald-600'
                  : c.status === 'sending' ? 'bg-amber-500/10 text-amber-700'
                  : c.status === 'failed' ? 'bg-destructive/10 text-destructive'
                  : 'bg-secondary text-muted-foreground'
                }`}>
                  {c.status === 'sending' && <Loader2 size={8} className="inline animate-spin mr-0.5" />}
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{c.subject}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className={`px-2 py-0.5 rounded-full ${AUDIENCE_CONFIG[c.audience]?.color || 'bg-secondary text-muted-foreground'}`}>
                  {AUDIENCE_CONFIG[c.audience]?.label}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-foreground">{c.sent_count}/{c.recipient_count}</p>
              <p className="text-[10px] text-muted-foreground">delivered</p>
              {c.sent_at && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.sent_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommsCentre() {
  const [tab, setTab] = useState<'compose' | 'templates' | 'history'>('compose');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tmplRes, campRes] = await Promise.all([
        supabase.from('message_templates').select('*').order('category').order('name'),
        supabase.from('broadcast_campaigns').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setTemplates((tmplRes.data || []) as any);
      setCampaigns((campRes.data || []) as any);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabs = [
    { id: 'compose' as const, label: 'Compose', icon: Send },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
    { id: 'history' as const, label: 'History', icon: Clock, badge: campaigns.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Communications Centre</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Broadcast to agents by segment — in-app notifications and email</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{campaigns.filter(c => c.status === 'sent').length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Campaigns sent</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + c.sent_count, 0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Messages delivered</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{templates.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Saved templates</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon size={14} />
            {t.label}
            {t.badge ? <span className="ml-1 text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'compose' && <ComposePanel templates={templates} onSent={fetchData} />}
      {tab === 'templates' && <TemplatesPanel templates={templates} onRefresh={fetchData} />}
      {tab === 'history' && <CampaignHistory campaigns={campaigns} />}
    </div>
  );
}