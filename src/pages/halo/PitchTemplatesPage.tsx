import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Plus, Trash2, FlaskConical, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Template {
  id: string;
  label: string;
  body: string;
  is_active: boolean;
  sort_order: number;
}

export default function PitchTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('halo_pitch_templates')
      .select('id, label, body, is_active, sort_order')
      .eq('agent_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) toast.error(getErrorMessage(error));
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleCreate = async () => {
    if (!user || !newLabel.trim() || !newBody.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('halo_pitch_templates').insert({
      agent_id: user.id,
      label: newLabel.trim(),
      body: newBody.trim(),
      sort_order: templates.length,
    });
    setCreating(false);
    if (error) { toast.error(getErrorMessage(error)); return; }
    setNewLabel(''); setNewBody('');
    toast.success('Template saved');
    load();
  };

  const handleUpdate = async (t: Template, patch: Partial<Template>) => {
    setSaving(t.id);
    const { error } = await supabase.from('halo_pitch_templates').update(patch).eq('id', t.id);
    setSaving(null);
    if (error) { toast.error(getErrorMessage(error)); return; }
    setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, ...patch } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? Stats will be preserved on past pitches.')) return;
    const { error } = await supabase.from('halo_pitch_templates').delete().eq('id', id);
    if (error) { toast.error(getErrorMessage(error)); return; }
    setTemplates((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <Helmet>
        <title>Pitch Templates | ListHQ</title>
        <meta name="description" content="Create and A/B test pitch templates for your Halo Board responses." />
      </Helmet>

      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          Pitch Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save reusable pitches and compare which converts best. Track performance under <strong>My Analytics</strong>.
        </p>
      </header>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New template</h2>
          <Input
            placeholder='Label (e.g. "Friendly intro", "Direct value-prop")'
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={60}
          />
          <Textarea
            placeholder="Hi! I noticed your Halo for..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={5}
            maxLength={1500}
          />
          <Button onClick={handleCreate} disabled={creating || !newLabel.trim() || !newBody.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save template</>}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No templates yet. Create at least 2 to start A/B testing.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={t.label}
                    onChange={(e) => setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, label: e.target.value } : x))}
                    onBlur={() => handleUpdate(t, { label: t.label })}
                    className="font-semibold"
                    maxLength={60}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(v) => handleUpdate(t, { is_active: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={t.body}
                  onChange={(e) => setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, body: e.target.value } : x))}
                  onBlur={() => handleUpdate(t, { body: t.body })}
                  rows={4}
                  maxLength={1500}
                />
                {saving === t.id && <p className="text-xs text-muted-foreground">Saving…</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
