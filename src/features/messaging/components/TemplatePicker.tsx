/**
 * TemplatePicker — modal for choosing a message template, resolving merge tags
 * with live data, and sending via Copy / SMS / WhatsApp / Email mailto.
 *
 * Spec (Batch 6 Item 1):
 *   - Filter by channel + category
 *   - Auto-select language from contact.preferred_language (Cantonese → zh_traditional)
 *   - Render merge tags with contact / property / agent
 *   - Three send modes (Option 2): Copy, sms:, wa.me — deep links hidden on desktop
 *   - On confirm-sent: log to contact_activities with template_id, language_used,
 *     channel, rendered_body, sent_at, is_auto_generated=false (in metadata jsonb)
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Copy, MessageSquare, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMessageTemplates, type MessageTemplate } from '../hooks/useMessageTemplates';
import {
  resolveMergeTags,
  pickTemplateLanguage,
  TEMPLATE_CHANNELS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANGUAGES,
  type MergeContext,
  type TemplateChannel,
  type TemplateCategory,
} from '../lib/mergeTags';

export interface TemplatePickerContact {
  id?: string | null;            // contact.id when known (used for activity logging)
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  preferred_language?: string | null;
}

export interface TemplatePickerProperty {
  address?: string | null;
  suburb?: string | null;
  price?: number | string | null;
}

export interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  contact: TemplatePickerContact;
  property?: TemplatePickerProperty | null;
  /** Optional: lock the channel filter (e.g. 'sms' from a click-to-text action). */
  initialChannel?: TemplateChannel | null;
  /** Optional: pre-select category to scroll near it. */
  initialCategory?: TemplateCategory | null;
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;

function digitsOnly(phone: string | null | undefined): string {
  return (phone || '').replace(/[^\d+]/g, '');
}

export default function TemplatePicker({
  open,
  onClose,
  contact,
  property,
  initialChannel = null,
  initialCategory = null,
}: TemplatePickerProps) {
  const { user } = useAuth();
  const { templates, loading } = useMessageTemplates();

  const [channelFilter, setChannelFilter] = useState<TemplateChannel | 'all'>(initialChannel ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>(initialCategory ?? 'all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('en');
  const [editedBody, setEditedBody] = useState<string>('');
  const [editedSubject, setEditedSubject] = useState<string>('');
  const [logging, setLogging] = useState(false);
  const [agentCtx, setAgentCtx] = useState<MergeContext['agent']>({});
  const [mobile, setMobile] = useState(isMobileViewport());

  useEffect(() => {
    if (!open) return;
    setChannelFilter(initialChannel ?? 'all');
    setCategoryFilter(initialCategory ?? 'all');
    setSelectedId(null);
    setEditedBody('');
    setEditedSubject('');
  }, [open, initialChannel, initialCategory]);

  // Track viewport for hiding deep-link buttons on desktop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load agent profile (name/phone/email) for merge-tag resolution
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select('name, phone, email')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setAgentCtx({
        name: data?.name ?? null,
        phone: data?.phone ?? null,
        email: data?.email ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  const filtered = useMemo(() => {
    return templates.filter(t =>
      t.is_active &&
      (channelFilter === 'all' || t.channel === channelFilter) &&
      (categoryFilter === 'all' || t.category === categoryFilter),
    );
  }, [templates, channelFilter, categoryFilter]);

  const selected: MessageTemplate | null = useMemo(
    () => filtered.find(t => t.id === selectedId) || null,
    [filtered, selectedId],
  );

  // When template changes, auto-pick language and seed editor with rendered text
  useEffect(() => {
    if (!selected) return;
    const langs = Object.keys(selected.body_by_language || {}).filter(k => !!selected.body_by_language[k]);
    const lang = pickTemplateLanguage(langs, contact.preferred_language);
    setLanguage(lang);
  }, [selected, contact.preferred_language]);

  const ctx: MergeContext = useMemo(() => ({
    contact: {
      first_name: contact.first_name,
      last_name: contact.last_name,
      preferred_language: contact.preferred_language,
    },
    property: property ?? undefined,
    agent: agentCtx,
  }), [contact, property, agentCtx]);

  // Re-render preview when language / template / context change
  useEffect(() => {
    if (!selected) {
      setEditedBody('');
      setEditedSubject('');
      return;
    }
    const rawBody = selected.body_by_language[language] || selected.body_by_language.en || '';
    const rawSubj = selected.subject_by_language?.[language] || selected.subject_by_language?.en || '';
    setEditedBody(resolveMergeTags(rawBody, ctx));
    setEditedSubject(resolveMergeTags(rawSubj, ctx));
  }, [selected, language, ctx]);

  const phone = digitsOnly(contact.mobile || contact.phone);
  const hasPhone = phone.length > 0;
  const channel = selected?.channel;

  const logSend = async () => {
    if (!selected || !user) return;
    if (!contact.id) return; // Pure enquiry (no contact record) — skip activity log
    setLogging(true);
    try {
      const { error } = await supabase.from('contact_activities').insert({
        contact_id: contact.id,
        user_id: user.id,
        activity_type: selected.channel === 'in_app' ? 'note' : selected.channel,
        description: editedBody.slice(0, 500),
        metadata: {
          template_id: selected.id,
          template_name: selected.name,
          language_used: language,
          channel: selected.channel,
          rendered_subject: editedSubject || null,
          rendered_body: editedBody,
          sent_at: new Date().toISOString(),
          is_auto_generated: false,
        },
      } as any);
      if (error) throw error;
    } catch (e) {
      console.error('logSend error', e);
      toast.error('Sent, but failed to log activity');
    } finally {
      setLogging(false);
    }
  };

  const handleCopy = async () => {
    try {
      const text = channel === 'email' && editedSubject
        ? `Subject: ${editedSubject}\n\n${editedBody}`
        : editedBody;
      await navigator.clipboard.writeText(text);
      await logSend();
      toast.success('Copied — paste it into your message app');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Could not copy to clipboard');
    }
  };

  const handleSms = async () => {
    if (!hasPhone) return;
    const url = `sms:${phone}?body=${encodeURIComponent(editedBody)}`;
    window.location.href = url;
    await logSend();
    toast.success('Opened in SMS app');
    onClose();
  };

  const handleWhatsApp = async () => {
    if (!hasPhone) return;
    const url = `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(editedBody)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    await logSend();
    toast.success('Opened in WhatsApp');
    onClose();
  };

  const handleEmail = async () => {
    if (!contact.email) return;
    const subj = editedSubject ? `?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`
                                : `?body=${encodeURIComponent(editedBody)}`;
    window.location.href = `mailto:${contact.email}${subj}`;
    await logSend();
    toast.success('Opened in mail app');
    onClose();
  };

  const availableLangs = selected
    ? TEMPLATE_LANGUAGES.filter(l => selected.body_by_language[l.code])
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send template</DialogTitle>
          <DialogDescription>
            {contact.first_name ? `To ${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}` : 'Choose a template'} —
            language auto-selected from contact preference.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as TemplateChannel | 'all')}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {TEMPLATE_CHANNELS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TemplateCategory | 'all')}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {TEMPLATE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Template list */}
        <div className="border border-border rounded-md max-h-56 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading templates…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No templates match. Create one in Settings → Templates.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition flex items-center justify-between ${selectedId === t.id ? 'bg-muted/60' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{t.name}</span>
                      <span className="block text-[10px] text-muted-foreground uppercase">
                        {t.channel} · {t.category.replace(/_/g, ' ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor + preview */}
        {selected && (
          <div className="space-y-3 border-t border-border pt-3">
            {availableLangs.length > 1 && (
              <Tabs value={language} onValueChange={setLanguage}>
                <TabsList>
                  {availableLangs.map(l => (
                    <TabsTrigger key={l.code} value={l.code} className="text-xs">{l.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {selected.channel === 'email' && (
              <div>
                <Label className="text-xs">Subject</Label>
                <Input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={6}
                className="text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Edit before sending. Unresolved tags like <code>{'{{property.address}}'}</code> mean data is missing.
              </p>
            </div>

            {/* Send actions */}
            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={!editedBody.trim() || logging}
              >
                <Copy size={14} /> Copy
              </Button>

              {selected.channel === 'email' && contact.email && (
                <Button
                  type="button"
                  variant="default"
                  onClick={handleEmail}
                  disabled={!editedBody.trim() || logging}
                >
                  <Mail size={14} /> Open in mail
                </Button>
              )}

              {mobile && hasPhone && (selected.channel === 'sms' || selected.channel === 'whatsapp' || selected.channel === 'in_app') && (
                <>
                  {selected.channel !== 'whatsapp' && (
                    <Button type="button" variant="default" onClick={handleSms} disabled={!editedBody.trim() || logging}>
                      <MessageSquare size={14} /> Open in SMS
                    </Button>
                  )}
                  <Button type="button" variant="default" onClick={handleWhatsApp} disabled={!editedBody.trim() || logging}>
                    <Send size={14} /> Open in WhatsApp
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
