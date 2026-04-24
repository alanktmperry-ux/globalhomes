import { useState } from 'react';
import { GitBranch, GripVertical, Plus, Trash2, Loader2, Save, BookTemplate } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  usePipelineStages,
  STAGE_TEMPLATES,
  type PipelineStage,
} from '@/features/agents/hooks/usePipelineStages';

/**
 * Agency Pipeline Stages CRUD: drag to reorder, inline edit, soft-delete,
 * load templates. Visible to all agency members; mutations gated to admins.
 */
export default function PipelineStagesSettings() {
  const { stages, agencyId, canEdit, loading, refresh } = usePipelineStages();
  const [draft, setDraft] = useState<PipelineStage[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const working = draft ?? stages;
  const isDirty = !!draft;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (!agencyId) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-2">
        <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
          <GitBranch size={14} /> Pipeline Stages
        </h3>
        <p className="text-xs text-muted-foreground">
          Custom pipeline stages are an agency feature. Solo agents use the default
          5 stages: <strong>Prospecting → Appraisal → Listed → Under Offer → Settled</strong>.
          Join or create an agency to customise your pipeline.
        </p>
      </div>
    );
  }

  // --- mutations on the local draft ---
  const updateStage = (idx: number, patch: Partial<PipelineStage>) => {
    setDraft(prev => {
      const base = prev ?? [...stages];
      const next = [...base];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };
  const addStage = () => {
    if (working.length >= 10) {
      toast.error('Pipeline limit reached (max 10 stages per agency)');
      return;
    }
    setDraft(prev => {
      const base = prev ?? [...stages];
      return [
        ...base,
        {
          id: `new-${crypto.randomUUID()}`,
          agency_id: agencyId,
          label: 'New Stage',
          color: '#3b82f6',
          probability: 50,
          display_order: base.length,
          is_active: true,
        },
      ];
    });
  };
  const removeStage = (idx: number) => {
    setDraft(prev => {
      const base = prev ?? [...stages];
      const next = [...base];
      next.splice(idx, 1);
      return next.map((s, i) => ({ ...s, display_order: i }));
    });
  };

  // --- drag reorder ---
  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    setDraft(prev => {
      const base = prev ?? [...stages];
      const next = [...base];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next.map((s, i) => ({ ...s, display_order: i }));
    });
    setDragIdx(null);
  };

  // --- template loader ---
  const loadTemplate = (templateName: string) => {
    const tpl = STAGE_TEMPLATES[templateName];
    if (!tpl) return;
    setDraft(tpl.map((s, i) => ({
      id: `new-${crypto.randomUUID()}`,
      agency_id: agencyId,
      ...s,
      display_order: i,
    })));
    setTemplateOpen(false);
    toast.success(`Loaded "${templateName}" template — review and save`);
  };

  // --- save: diff working set against db ---
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const existingIds = new Set(stages.map(s => s.id));
      const draftIds = new Set(draft.map(s => s.id));

      // Soft-delete removed
      const removed = stages.filter(s => !draftIds.has(s.id));
      if (removed.length > 0) {
        const { error } = await supabase
          .from('pipeline_stages' as any)
          .update({ deleted_at: new Date().toISOString(), is_active: false })
          .in('id', removed.map(s => s.id));
        if (error) throw error;
      }

      // Insert new (id starts with new-)
      const inserts = draft
        .filter(s => s.id.startsWith('new-'))
        .map(({ id: _id, ...row }) => ({ ...row, agency_id: agencyId }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('pipeline_stages' as any).insert(inserts);
        if (error) throw error;
      }

      // Update existing (id present in both, may have changed)
      const updates = draft.filter(s => existingIds.has(s.id));
      for (const u of updates) {
        const original = stages.find(s => s.id === u.id);
        if (!original) continue;
        const changed = ['label', 'color', 'probability', 'display_order', 'is_active']
          .some(k => (original as any)[k] !== (u as any)[k]);
        if (!changed) continue;
        const { error } = await supabase
          .from('pipeline_stages' as any)
          .update({
            label: u.label,
            color: u.color,
            probability: u.probability,
            display_order: u.display_order,
            is_active: u.is_active,
          })
          .eq('id', u.id);
        if (error) throw error;
      }

      await refresh();
      setDraft(null);
      toast.success('Pipeline stages saved');
    } catch (e: any) {
      toast.error('Failed to save: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <GitBranch size={14} /> Pipeline Stages
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Drag to reorder. Up to 10 stages per agency. Changes apply to the entire team's pipeline.
          </p>
        </div>
        {canEdit && (
          <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <BookTemplate size={13} className="mr-1.5" /> Load template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Load stage template</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                Replaces your current draft with the selected preset. Existing listings keep
                their stage assignments where possible until you save.
              </p>
              <div className="space-y-2 pt-2">
                {Object.entries(STAGE_TEMPLATES).map(([name, tpl]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => loadTemplate(name)}
                    className="w-full text-left border border-border rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition"
                  >
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {tpl.map(s => s.label).join(' → ')}
                    </p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {working.map((s, idx) => (
          <div
            key={s.id}
            draggable={canEdit}
            onDragStart={() => onDragStart(idx)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(idx)}
            className={`flex items-center gap-2 p-2 rounded-lg border bg-background ${
              canEdit ? 'cursor-grab active:cursor-grabbing border-border' : 'border-border'
            }`}
          >
            <GripVertical size={14} className="text-muted-foreground/60 shrink-0" />
            <input
              type="color"
              value={s.color}
              onChange={(e) => updateStage(idx, { color: e.target.value })}
              disabled={!canEdit}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
              aria-label="Stage color"
            />
            <Input
              value={s.label}
              onChange={(e) => updateStage(idx, { label: e.target.value })}
              disabled={!canEdit}
              className="bg-secondary border-border h-8 text-sm flex-1 min-w-0"
              placeholder="Stage name"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="number"
                min={0}
                max={100}
                value={s.probability}
                onChange={(e) => updateStage(idx, { probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                disabled={!canEdit}
                className="bg-secondary border-border h-8 text-sm w-16"
                aria-label="Win probability"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => removeStage(idx)}
                className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addStage}
            disabled={working.length >= 10}
          >
            <Plus size={13} className="mr-1.5" /> Add stage
          </Button>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!isDirty || saving}>
              {saving
                ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving…</>
                : <><Save size={13} className="mr-1.5" /> Save changes</>}
            </Button>
          </div>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-muted-foreground italic">
          Only agency principals and admins can change pipeline stages.
        </p>
      )}
    </div>
  );
}
