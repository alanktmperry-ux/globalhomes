import { useState } from 'react';
import { Pause, Play, Trash2, Pencil, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import HaloQualityBadge from '@/components/halo/HaloQualityBadge';
import HaloFulfilmentDialog from '@/components/halo/HaloFulfilmentDialog';
import type { Halo, HaloStatus } from '@/types/halo';

interface Props {
  halo: Halo;
  onStatusChange: (id: string, status: HaloStatus) => Promise<void> | void;
  onFulfil?: (id: string) => Promise<void> | void;
}

const STATUS_STYLES: Record<HaloStatus, string> = {
  active: 'bg-green-100 text-green-800 hover:bg-green-100',
  paused: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  expired: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  fulfilled: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  deleted: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
};

const fmtMoney = (n: number) => `$${n.toLocaleString('en-AU')}`;

const formatBudget = (min: number | null | undefined, max: number | null | undefined) => {
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  if (hasMin && hasMax) return `${fmtMoney(min!)} – ${fmtMoney(max!)}`;
  if (hasMax) return `Up to ${fmtMoney(max!)}`;
  if (hasMin) return `From ${fmtMoney(min!)}`;
  return 'Any budget';
};

export function HaloCard({ halo, onStatusChange, onFulfil }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fulfilOpen, setFulfilOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(halo.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
  const suburbsLabel = halo.suburbs.join(', ') || '—';
  const budgetLabel = `AUD ${fmt(halo.budget_min)}–${fmt(halo.budget_max)}`;

  const handleToggle = async () => {
    setBusy(true);
    try {
      await onStatusChange(halo.id, halo.status === 'active' ? 'paused' : 'active');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onStatusChange(halo.id, 'deleted');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleFulfil = async () => {
    if (!onFulfil) return;
    setBusy(true);
    try {
      await onFulfil(halo.id);
      setFulfilOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const lowScore = halo.quality_score != null && halo.quality_score < 50;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={STATUS_STYLES[halo.status]} variant="secondary">
                {halo.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {halo.status === 'expired' ? 'Expired' : `Expires in ${daysLeft} days`}
              </span>
              <HaloQualityBadge score={halo.quality_score} variant="seeker" />
            </div>
            <p className="font-semibold text-base break-words">
              {intentLabel} · {suburbsLabel} · {budgetLabel}
            </p>
            {halo.property_types.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {halo.property_types.join(', ')}
              </p>
            )}
            {lowScore && (halo.status === 'active' || halo.status === 'paused') && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                Tip: Add more detail to attract more agents.{' '}
                <button
                  type="button"
                  onClick={() => toast('Edit coming soon')}
                  className="underline font-medium"
                >
                  Edit Halo
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast('Edit coming soon')}
          >
            <Pencil size={14} /> Edit
          </Button>
          {halo.status === 'active' || halo.status === 'paused' ? (
            <Button size="sm" variant="outline" onClick={handleToggle} disabled={busy}>
              {halo.status === 'active' ? (
                <>
                  <Pause size={14} /> Pause
                </>
              ) : (
                <>
                  <Play size={14} /> Resume
                </>
              )}
            </Button>
          ) : null}
          {onFulfil && (halo.status === 'active' || halo.status === 'paused') && (
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 hover:text-green-800"
              onClick={() => setFulfilOpen(true)}
              disabled={busy}
            >
              <CheckCircle2 size={14} /> Mark as fulfilled
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Halo?</AlertDialogTitle>
            <AlertDialogDescription>
              Agents will no longer be able to find you with this Halo. You can create a new one any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HaloFulfilmentDialog
        open={fulfilOpen}
        busy={busy}
        onOpenChange={setFulfilOpen}
        onConfirm={handleFulfil}
      />
    </Card>
  );
}
