import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Mail, MessageSquare, Smartphone, Bell, Loader2, Languages, Eye, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  TEMPLATE_CATEGORIES, TEMPLATE_CHANNELS, TEMPLATE_LANGUAGES, MERGE_TAGS,
  resolveMergeTags, type TemplateChannel, type TemplateCategory,
} from '../../../../messaging/lib/mergeTags';
import {
  useMessageTemplates, autoTranslateTemplate, type MessageTemplate, type TemplateInput,
} from '../../../../messaging/hooks/useMessageTemplates';

const CHANNEL_ICONS: Record<TemplateChannel, JSX.Element> = {
  email: <Mail size={12} />,
  sms: <Smartphone size={12} />,
  whatsapp: <MessageSquare size={12} />,
  in_app: <Bell size={12} />,
};

const SAMPLE_CTX = {
  contact: { first_name: 'Sarah', last_name: 'Nguyen', preferred_language: 'vi' },
  property: { address: '12 Acacia St', suburb: 'Berwick', price: 920000 },
  agent: { name: 'Alan Walker', phone: '0400 000 000', email: 'alan@example.com' },
  inspection: { date: new Date().toISOString(), time: '11:00 AM' },
};

const emptyInput = (): TemplateInput => ({
  name: '',
  channel: 'email',
  category: 'lead_followup',
  body_by_language: { en: '' },
  subject_by_language: { en: '' },
  is_active: true,
});

export default function MessageTemplatesSettings() {
  const { templates, loading, agencyId, create, update, remove } = useMessageTemplates();
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<TemplateCategory, MessageTemplate[]>();
    for (const t of templates) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return map;
  }, [templates]);

  if (!agencyId && !loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display text-sm font-bold mb-1">Message templates</h3>
        <p className="text-xs text-muted-foreground">
          You need to be linked to an agency to manage templates. Ask your principal to add you, or create your agency first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <Languages size={14} /> Message templates
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multilingual email/SMS/WhatsApp templates shared across your agency.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="text-xs gap-1.5">
          <Plus size={14} /> New template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={20} />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground">
          No templates yet. Create one to start sending consistent messages.
        </div>
      ) : (
        TEMPLATE_CATEGORIES.map(({ value, label }) => {
          const list = grouped.get(value) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={value} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
              <div className="space-y-1.5">
                {list.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                        {CHANNEL_ICONS[t.channel]} {t.channel}
                      </Badge>
                      <span className="text-sm font-medium truncate">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {Object.keys(t.body_by_language).length} {Object.keys(t.body_by_language).length === 1 ? 'lang' : 'langs'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(t)} className="h-7 w-7">
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm(`Delete template "${t.name}"?`)) return;
                          try { await remove(t.id); toast.success('Template deleted'); }
                          catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete'); }
                        }}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {(creating || editing) && (
        <TemplateEditorDialog
          template={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (input) => {
            try {
              if (editing) {
                await update(editing.id, input);
                toast.success('Template updated');
              } else {
                await create(input);
                toast.success('Template created');
              }
              setEditing(null); setCreating(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to save');
            }
          }}
        />
      )}
    </div>
  );
}

interface EditorProps {
  template: MessageTemplate | null;
  onClose: () => void;
  onSave: (input: TemplateInput) => Promise<void>;
}

function TemplateEditorDialog({ template, onClose, onSave }: EditorProps) {
  const [input, setInput] = useState<TemplateInput>(() => template ? {
    name: template.name,
    channel: template.channel,
    category: template.category,
    body_by_language: { ...template.body_by_language },
    subject_by_language: template.subject_by_language ? { ...template.subject_by_language } : { en: '' },
    is_active: template.is_active,
  } : emptyInput());
  const [activeLang, setActiveLang] = useState<string>('en');
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const isEmail = input.channel === 'email';

  const handleAutoTranslate = async () => {
    if (!input.body_by_language.en?.trim()) {
      toast.error('Write the English version first');
      return;
    }
    setTranslating(true);
    try {
      const targets = TEMPLATE_LANGUAGES.filter((l) => l.code !== 'en' && (!input.body_by_language[l.code] || activeLang === l.code)).map((l) => l.code);
      const onlyMissing = TEMPLATE_LANGUAGES.filter((l) => l.code !== 'en' && !input.body_by_language[l.code]).map((l) => l.code);
      const useTargets = activeLang !== 'en' ? [activeLang] : (onlyMissing.length > 0 ? onlyMissing : targets);
      const result = await autoTranslateTemplate({
        body_en: input.body_by_language.en,
        subject_en: isEmail ? input.subject_by_language?.en : null,
        target_languages: useTargets,
      });
      setInput((prev) => ({
        ...prev,
        body_by_language: { ...prev.body_by_language, ...result.bodies },
        subject_by_language: isEmail ? { ...(prev.subject_by_language ?? {}), ...(result.subjects ?? {}) } : prev.subject_by_language,
      }));
      toast.success(`Translated to ${useTargets.join(', ')}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const insertTag = (tag: string) => {
    setInput((prev) => ({
      ...prev,
      body_by_language: {
        ...prev.body_by_language,
        [activeLang]: (prev.body_by_language[activeLang] ?? '') + tag,
      },
    }));
  };

  const handleSave = async () => {
    if (!input.name.trim()) { toast.error('Template needs a name'); return; }
    if (!input.body_by_language.en?.trim()) { toast.error('English body is required'); return; }
    if (isEmail && !input.subject_by_language?.en?.trim()) { toast.error('Email subject is required'); return; }
    setSaving(true);
    try { await onSave(input); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription className="text-xs">
            English version is required. Other languages fall back to English when missing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Name</Label>
              <Input value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} placeholder="e.g. Open home reminder" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={input.category} onValueChange={(v) => setInput({ ...input, category: v as TemplateCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={input.channel} onValueChange={(v) => setInput({ ...input, channel: v as TemplateChannel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeLang} onValueChange={setActiveLang}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TabsList className="bg-secondary gap-1 p-1">
                {TEMPLATE_LANGUAGES.map((l) => {
                  const filled = !!input.body_by_language[l.code]?.trim();
                  return (
                    <TabsTrigger key={l.code} value={l.code} className="text-xs gap-1.5">
                      {l.label}
                      {l.code === 'en' && <span className="text-destructive">*</span>}
                      {filled && l.code !== 'en' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleAutoTranslate} disabled={translating} className="text-xs gap-1.5">
                  {translating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  Auto-translate {activeLang === 'en' ? 'all' : activeLang}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewing(true)} className="text-xs gap-1.5">
                  <Eye size={12} /> Preview
                </Button>
              </div>
            </div>

            {TEMPLATE_LANGUAGES.map((l) => (
              <TabsContent key={l.code} value={l.code} className="space-y-3 mt-3">
                {isEmail && (
                  <div>
                    <Label className="text-xs">Subject {l.code === 'en' && <span className="text-destructive">*</span>}</Label>
                    <Input
                      value={input.subject_by_language?.[l.code] ?? ''}
                      onChange={(e) => setInput({
                        ...input,
                        subject_by_language: { ...(input.subject_by_language ?? {}), [l.code]: e.target.value },
                      })}
                      placeholder={l.code === 'en' ? 'Subject line' : 'Optional — falls back to English'}
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Body {l.code === 'en' && <span className="text-destructive">*</span>}</Label>
                  <Textarea
                    rows={8}
                    value={input.body_by_language[l.code] ?? ''}
                    onChange={(e) => setInput({
                      ...input,
                      body_by_language: { ...input.body_by_language, [l.code]: e.target.value },
                    })}
                    placeholder={l.code === 'en' ? 'Write your message. Use {{merge.tags}} for personalisation.' : 'Optional — falls back to English'}
                    className="font-mono text-xs"
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold mb-2">Insert merge tag</p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => insertTag(t.tag)}
                  className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border font-mono"
                  title={`${t.group} · ${t.label}`}
                >
                  {t.tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving...</> : 'Save template'}
          </Button>
        </DialogFooter>

        {previewing && (
          <Dialog open onOpenChange={(o) => { if (!o) setPreviewing(false); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Preview · {TEMPLATE_LANGUAGES.find((l) => l.code === activeLang)?.label}</DialogTitle>
                <DialogDescription className="text-xs">Resolved with sample contact + property data.</DialogDescription>
              </DialogHeader>
              {isEmail && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Subject: </span>
                  <span className="font-medium">{resolveMergeTags(input.subject_by_language?.[activeLang] ?? input.subject_by_language?.en ?? '', SAMPLE_CTX)}</span>
                </div>
              )}
              <div className="bg-secondary border border-border rounded-md p-3 text-sm whitespace-pre-wrap">
                {resolveMergeTags(input.body_by_language[activeLang] ?? input.body_by_language.en ?? '', SAMPLE_CTX) || <span className="text-muted-foreground italic">Empty</span>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewing(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
