import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

export interface BulkAction<T> {
  label: string;
  onClick: (rows: T[]) => Promise<void>;
  variant?: 'default' | 'destructive';
}

interface BulkActionBarProps<T> {
  selected: T[];
  onClearSelection: () => void;
  actions: BulkAction<T>[];
  noun?: string; // e.g. "agents", "listings"
}

export default function BulkActionBar<T>({
  selected,
  onClearSelection,
  actions,
  noun = 'items',
}: BulkActionBarProps<T>) {
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  if (selected.length === 0) return null;

  const run = async (idx: number, fn: (rows: T[]) => Promise<void>) => {
    if (busyIdx !== null) return;
    setBusyIdx(idx);
    try {
      await fn(selected);
    } finally {
      setBusyIdx(null);
    }
  };

  return (
    <div className="sticky top-2 z-30 flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl shadow-md">
      <span className="text-sm font-medium text-foreground">
        {selected.length} {noun} selected
      </span>
      <div className="flex items-center gap-2 ml-2 flex-wrap">
        {actions.map((a, i) => (
          <Button
            key={i}
            size="sm"
            variant={a.variant === 'destructive' ? 'destructive' : 'secondary'}
            onClick={() => run(i, a.onClick)}
            disabled={busyIdx !== null}
            className="gap-1.5"
          >
            {busyIdx === i && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {a.label}
          </Button>
        ))}
      </div>
      <button
        onClick={onClearSelection}
        className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" /> Clear
      </button>
    </div>
  );
}
