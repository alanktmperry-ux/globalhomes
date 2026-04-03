import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  agentId: string;
  onClose: () => void;
  onCreated: () => void;
  defaultPropertyId?: string;
}

export function CreateOpenHomeModal({ agentId, onClose, onCreated, defaultPropertyId }: Props) {
  const [properties, setProperties] = useState<{ id: string; address: string }[]>([]);
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [maxAttendees, setMaxAttendees] = useState('30');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('properties')
      .select('id, address')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProperties(data ?? []));
  }, [agentId]);

  const handleSave = async () => {
    if (!propertyId || !date || !startTime || !endTime) return;
    setSaving(true);

    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
    const endsAt = new Date(`${date}T${endTime}:00`).toISOString();

    await supabase.from('open_homes').insert({
      property_id: propertyId,
      agent_id: agentId,
      starts_at: startsAt,
      ends_at: endsAt,
      max_attendees: parseInt(maxAttendees, 10) || 0,
      notes: notes || null,
    } as any);

    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="font-display text-lg font-bold text-foreground">Schedule open home</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Property *</label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date *</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Start *</label>
              <Input type="time" value={startTime} onChange={e => {
                setStartTime(e.target.value);
                const [h, m] = e.target.value.split(':').map(Number);
                setEndTime(`${String(h + (m >= 30 ? 1 : 0)).padStart(2, '0')}:${m >= 30 ? '00' : '30'}`);
              }} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">End *</label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Max attendees (0 = unlimited)</label>
            <Input type="number" min="0" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Entry via side gate" />
          </div>
        </div>

        <div className="px-6 pb-6">
          <Button onClick={handleSave} disabled={saving || !propertyId || !date} className="w-full">
            {saving ? 'Scheduling…' : 'Schedule open home'}
          </Button>
        </div>
      </div>
    </div>
  );
}
