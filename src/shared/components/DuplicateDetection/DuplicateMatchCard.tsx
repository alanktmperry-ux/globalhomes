/**
 * Inline match card. Renders a single suggested existing contact with
 * "Use this contact" / "Create new anyway" actions.
 */

import { Mail, Phone, User as UserIcon, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { DuplicateMatch } from './types';

interface Props {
  match: DuplicateMatch;
  onUse: (match: DuplicateMatch) => void;
  onDismiss: (match: DuplicateMatch) => void;
}

const METHOD_LABELS: Record<DuplicateMatch['match_method'], { label: string; tone: string }> = {
  email: { label: 'Matched on email', tone: 'bg-amber-100 text-amber-700 border-amber-200' },
  phone: { label: 'Matched on phone', tone: 'bg-amber-100 text-amber-700 border-amber-200' },
  name_fuzzy: { label: 'Similar name', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function DuplicateMatchCard({ match, onUse, onDismiss }: Props) {
  const fullName = `${match.first_name} ${match.last_name ?? ''}`.trim();
  const methodMeta = METHOD_LABELS[match.match_method];
  const lastContacted = match.updated_at
    ? formatDistanceToNow(new Date(match.updated_at), { addSuffix: true })
    : null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-900">
            We found a possible match
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border ${methodMeta.tone}`}
          >
            {methodMeta.label}
            {match.match_method === 'name_fuzzy' && (
              <span className="ml-1 opacity-70">
                ({Math.round(match.confidence * 100)}%)
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(match)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss suggestion"
        >
          <X size={14} />
        </button>
      </div>

      <div className="bg-card border border-border rounded-md p-2.5 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <UserIcon size={12} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate">{fullName}</span>
          {match.is_owned_by_other && (
            <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
              Owned by {match.owner_name ?? 'another agent'}
            </span>
          )}
        </div>

        {(match.email || match.mobile || match.phone) && (
          <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
            {match.email && (
              <div className="flex items-center gap-1.5">
                <Mail size={10} />
                <span className="truncate">{match.email}</span>
              </div>
            )}
            {(match.mobile || match.phone) && (
              <div className="flex items-center gap-1.5">
                <Phone size={10} />
                <span>{match.mobile || match.phone}</span>
              </div>
            )}
          </div>
        )}

        {match.tags && match.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {match.tags.slice(0, 5).map(t => (
              <span
                key={t}
                className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {lastContacted && (
          <p className="text-[10px] text-muted-foreground pt-0.5">
            Last updated {lastContacted}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-[11px]"
          onClick={() => onDismiss(match)}
        >
          Create new anyway
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-[11px] gap-1"
          onClick={() => onUse(match)}
        >
          <Check size={12} />
          Use this contact
        </Button>
      </div>
    </div>
  );
}
