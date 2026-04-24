import { Star, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChannelIcon } from './ChannelIcon';
import {
  COMM_CHANNELS,
  COMM_CHANNEL_META,
  MAX_COMM_PREFERENCES,
  isValidHandle,
  type CommChannel,
  type CommPreference,
} from './types';

interface Props {
  value: CommPreference[];
  onChange: (next: CommPreference[]) => void;
}

/**
 * Inline editor for a contact's communication preferences.
 * - Add up to MAX_COMM_PREFERENCES rows
 * - Star a single row as primary (auto-promotes a row if none selected)
 * - Live handle format hint
 */
export default function CommunicationPreferencesEditor({ value, onChange }: Props) {
  const items = value ?? [];

  const updateAt = (idx: number, patch: Partial<CommPreference>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    // If primary patch was set, ensure others become non-primary
    if (patch.is_primary === true) {
      next.forEach((it, i) => { if (i !== idx) it.is_primary = false; });
    }
    onChange(next);
  };

  const removeAt = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    // Re-elect primary if needed
    if (next.length > 0 && !next.some(n => n.is_primary)) next[0].is_primary = true;
    onChange(next);
  };

  const addRow = () => {
    if (items.length >= MAX_COMM_PREFERENCES) return;
    const next: CommPreference = {
      channel: 'whatsapp',
      handle: '',
      is_primary: items.length === 0,
    };
    onChange([...items, next]);
  };

  return (
    <div className="border-t border-border pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Preferred contact</p>
        <span className="text-[10px] text-muted-foreground">{items.length}/{MAX_COMM_PREFERENCES}</span>
      </div>

      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Add WhatsApp, WeChat, Line, or other channels. The primary one is used first by templates &amp; automations.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const meta = COMM_CHANNEL_META[item.channel];
          const valid = !item.handle || isValidHandle(item.channel, item.handle);
          return (
            <div key={idx} className="flex items-start gap-1.5">
              <Select
                value={item.channel}
                onValueChange={v => updateAt(idx, { channel: v as CommChannel })}
              >
                <SelectTrigger className="h-9 w-[130px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_CHANNELS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="inline-flex items-center gap-1.5">
                        <ChannelIcon channel={c.value} size={12} className="text-muted-foreground" />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1">
                <Input
                  value={item.handle}
                  onChange={e => updateAt(idx, { handle: e.target.value })}
                  placeholder={meta.placeholder}
                  className={`h-9 ${!valid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {!valid && (
                  <p className="text-[10px] text-destructive mt-0.5">Invalid format for {meta.label}</p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => updateAt(idx, { is_primary: true })}
                title={item.is_primary ? 'Primary channel' : 'Mark as primary'}
              >
                <Star
                  size={14}
                  className={item.is_primary ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}
                />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(idx)}
                title="Remove channel"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          );
        })}
      </div>

      {items.length < MAX_COMM_PREFERENCES && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={addRow}
        >
          <Plus size={12} />
          Add channel
        </Button>
      )}
    </div>
  );
}
