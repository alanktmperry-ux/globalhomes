import { Settings2, Eye, EyeOff, GripVertical, ArrowUp, ArrowDown, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardLayoutEntry, CardKey, CARD_LABELS, DEFAULT_LAYOUT } from '@/features/agents/hooks/useDashboardLayout';

interface ToolbarProps {
  editMode: boolean;
  onEnterEdit: () => void;
  onDone: () => void;
  onReset: () => void;
}

export function CustomiseToolbar({ editMode, onEnterEdit, onDone, onReset }: ToolbarProps) {
  if (!editMode) {
    return (
      <Button variant="outline" size="sm" onClick={onEnterEdit} className="gap-1.5">
        <Settings2 size={14} /> Customise
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-muted-foreground">
        <RotateCcw size={14} /> Reset
      </Button>
      <Button size="sm" onClick={onDone} className="gap-1.5">
        <Check size={14} /> Done
      </Button>
    </div>
  );
}

interface CardEditChromeProps {
  cardKey: CardKey;
  layout: CardLayoutEntry[];
  onUpdate: (next: CardLayoutEntry[]) => void;
  isMobile: boolean;
  children: React.ReactNode;
}

/** Wraps a card in edit mode with show/hide toggle + drag/arrow controls. */
export function CardEditChrome({ cardKey, layout, onUpdate, isMobile, children }: CardEditChromeProps) {
  const entry = layout.find(e => e.card_key === cardKey);
  if (!entry) return <>{children}</>;
  const idx = layout.findIndex(e => e.card_key === cardKey);

  const toggleVisible = () => {
    const next = layout.map(e =>
      e.card_key === cardKey ? { ...e, is_visible: !e.is_visible } : e
    );
    onUpdate(next);
  };
  const move = (dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= layout.length) return;
    const next = [...layout];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    onUpdate(next.map((e, i) => ({ ...e, display_order: i })));
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', cardKey);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/plain') as CardKey;
    if (!sourceKey || sourceKey === cardKey) return;
    const sourceIdx = layout.findIndex(en => en.card_key === sourceKey);
    if (sourceIdx === -1) return;
    const next = [...layout];
    const [moved] = next.splice(sourceIdx, 1);
    const targetIdx = next.findIndex(en => en.card_key === cardKey);
    next.splice(targetIdx, 0, moved);
    onUpdate(next.map((en, i) => ({ ...en, display_order: i })));
  };

  return (
    <div
      draggable={!isMobile}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative ring-2 rounded-xl ${entry.is_visible ? 'ring-primary/40' : 'ring-muted opacity-50'}`}
    >
      <div className="absolute -top-3 left-3 z-10 flex items-center gap-1 bg-card border border-border rounded-md shadow-sm px-1.5 py-0.5">
        {!isMobile && <GripVertical size={12} className="text-muted-foreground cursor-grab" />}
        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[140px]">
          {CARD_LABELS[cardKey]}
        </span>
      </div>
      <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 bg-card border border-border rounded-md shadow-sm">
        {isMobile && (
          <>
            <button
              onClick={() => move(-1)}
              disabled={idx === 0}
              className="p-1 hover:bg-muted rounded-l-md disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={() => move(1)}
              disabled={idx === layout.length - 1}
              className="p-1 hover:bg-muted disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown size={12} />
            </button>
          </>
        )}
        <button
          onClick={toggleVisible}
          className="p-1 hover:bg-muted rounded-r-md"
          aria-label={entry.is_visible ? 'Hide card' : 'Show card'}
        >
          {entry.is_visible ? <Eye size={12} /> : <EyeOff size={12} className="text-muted-foreground" />}
        </button>
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}
