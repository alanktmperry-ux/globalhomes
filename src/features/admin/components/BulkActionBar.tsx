import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface BulkAction {
  label: string;
  onClick: () => void | Promise<void>;
  tone?: 'default' | 'destructive';
  disabled?: boolean;
}

interface Props {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  noun?: string; // e.g. "agents", "listings"
}

export default function BulkActionBar({ selectedCount, onClear, actions, noun = 'items' }: Props) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky top-2 z-30 flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl shadow-md">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} {noun} selected
      </span>
      <div className="flex items-center gap-2 ml-2 flex-wrap">
        {actions.map((a, i) => (
          <Button
            key={i}
            size="sm"
            variant={a.tone === 'destructive' ? 'destructive' : 'secondary'}
            onClick={a.onClick}
            disabled={a.disabled}
          >
            {a.label}
          </Button>
        ))}
      </div>
      <button
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" /> Clear
      </button>
    </div>
  );
}
