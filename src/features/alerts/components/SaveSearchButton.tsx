import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useSavedSearchesDB } from '../hooks/useSavedSearchesDB';
import type { SavedSearchRecord, AlertFrequency } from '../types';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface Props {
  criteria: Partial<SavedSearchRecord>;
  onSaved?: () => void;
}

const FREQ_OPTIONS: { value: AlertFrequency; label: string; desc: string }[] = [
  { value: 'instant', label: '⚡ Instant', desc: 'Email as soon as a match is listed' },
  { value: 'daily', label: '📅 Daily', desc: 'Morning digest of new matches' },
  { value: 'weekly', label: '📆 Weekly', desc: 'Monday morning roundup' },
  { value: 'off', label: '🔕 Save only', desc: "No email — I'll check manually" },
];

export function SaveSearchButton({ criteria, onSaved }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { saveSearch } = useSavedSearchesDB();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('My Search');
  const [freq, setFreq] = useState<AlertFrequency>('instant');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    setSaving(true);
    await saveSearch(name, criteria, freq);
    setSaved(true);
    setSaving(false);
    setTimeout(() => { setOpen(false); setSaved(false); onSaved?.(); }, 1200);
  };

  if (saved) return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
      <Check className="w-4 h-4" /> Saved!
    </span>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-card border border-border text-foreground
                   text-sm font-semibold px-4 py-2 rounded-xl hover:border-primary/50 transition"
      >
        <Bell className="w-4 h-4" /> Save Search
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 bg-card border border-border rounded-2xl
                        shadow-elevated p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <p className="font-display font-semibold text-foreground">Save this search</p>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Search name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 3-bed houses in Newtown"
              className="w-full border border-border bg-background rounded-xl px-3 py-2 text-sm
                         text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Alert frequency</label>
            <div className="space-y-2">
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFreq(opt.value)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition
                    ${freq === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                    }`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {freq === opt.value && (
                    <div className="ml-auto">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5
                         rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & Alert Me'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-sm text-muted-foreground border border-border
                         rounded-xl hover:border-primary/30 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
