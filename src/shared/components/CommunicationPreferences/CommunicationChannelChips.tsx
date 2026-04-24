import { ChannelIcon } from './ChannelIcon';
import type { CommPreference } from './types';

interface Props {
  prefs: CommPreference[] | null | undefined;
  max?: number;
}

/**
 * Compact, inline row of channel icons for the contacts list.
 * Primary channel rendered first.
 */
export default function CommunicationChannelChips({ prefs, max = 4 }: Props) {
  if (!prefs || prefs.length === 0) return null;
  const ordered = [...prefs].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const visible = ordered.slice(0, max);
  const overflow = ordered.length - visible.length;

  return (
    <span className="inline-flex items-center gap-1">
      {visible.map((p, i) => (
        <ChannelIcon
          key={`${p.channel}-${i}`}
          channel={p.channel}
          size={12}
          className={p.is_primary ? 'text-primary' : 'text-muted-foreground'}
          title={`${p.channel}${p.is_primary ? ' (primary)' : ''}: ${p.handle}`}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground">+{overflow}</span>
      )}
    </span>
  );
}
