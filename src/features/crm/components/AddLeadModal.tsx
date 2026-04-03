import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CRMLead, LeadPriority, LeadSource } from '../types';

interface Props {
  onClose: () => void;
  onSave: (data: Partial<CRMLead>) => Promise<void>;
}

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'manual', label: 'Manual entry' },
  { value: 'enquiry_form', label: 'Enquiry form' },
  { value: 'open_home', label: 'Open home' },
  { value: 'referral', label: 'Referral' },
  { value: 'portal', label: 'Portal' },
];

const PRIORITIES: { value: LeadPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Cold', color: 'border-blue-400 text-blue-500' },
  { value: 'medium', label: 'Warm', color: 'border-amber-400 text-amber-500' },
  { value: 'high', label: 'Hot 🔥', color: 'border-red-400 text-red-500' },
];

export function AddLeadModal({ onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    budget_min: '',
    budget_max: '',
    notes: '',
    source: 'manual' as LeadSource,
    priority: 'medium' as LeadPriority,
    pre_approved: false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);
    await onSave({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      notes: form.notes.trim() || undefined,
      source: form.source,
      priority: form.priority,
      pre_approved: form.pre_approved,
      tags: [],
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border mb-12">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Add Lead</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manually add a buyer lead to your pipeline</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">First name *</Label>
              <Input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Sarah"
                className="bg-background"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Last name</Label>
              <Input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Johnson"
                className="bg-background"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="sarah@email.com"
                className="bg-background"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="04xx xxx xxx"
                className="bg-background"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Budget min ($)</Label>
              <Input
                type="number"
                value={form.budget_min}
                onChange={e => set('budget_min', e.target.value)}
                placeholder="500000"
                className="bg-background"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Budget max ($)</Label>
              <Input
                type="number"
                value={form.budget_max}
                onChange={e => set('budget_max', e.target.value)}
                placeholder="800000"
                className="bg-background"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-xs mb-2 block">Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('priority', p.value)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    form.priority === p.value
                      ? `${p.color} bg-muted`
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <Label className="text-xs mb-1 block">Source</Label>
            <select
              value={form.source}
              onChange={e => set('source', e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Pre-approved */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pre_approved}
              onChange={e => set('pre_approved', e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Finance pre-approved</span>
          </label>

          {/* Notes */}
          <div>
            <Label className="text-xs mb-1 block">Notes</Label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any initial notes about this lead…"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.first_name.trim()}>
            {saving ? 'Saving…' : 'Add Lead'}
          </Button>
        </div>
      </div>
    </div>
  );
}
