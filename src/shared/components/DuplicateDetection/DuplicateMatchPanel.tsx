/**
 * Inline panel that renders duplicate match cards underneath a contact form.
 * Filters out cards the user has explicitly dismissed for this session.
 */

import { useState, useMemo } from 'react';
import DuplicateMatchCard from './DuplicateMatchCard';
import type { DuplicateMatch } from './types';

interface Props {
  matches: DuplicateMatch[];
  loading?: boolean;
  onUseContact: (match: DuplicateMatch) => void;
  /** Notified when ALL matches are either used or dismissed */
  onAllResolved?: () => void;
  /** Notified when a single suggestion is dismissed (for telemetry) */
  onDismiss?: (match: DuplicateMatch) => void;
}

export default function DuplicateMatchPanel({
  matches,
  loading,
  onUseContact,
  onDismiss,
}: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => matches.filter(m => !dismissedIds.has(m.id)).slice(0, 3),
    [matches, dismissedIds],
  );

  if (loading && matches.length === 0) return null;
  if (visible.length === 0) return null;

  const handleDismiss = (match: DuplicateMatch) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(match.id);
      return next;
    });
    onDismiss?.(match);
  };

  return (
    <div className="space-y-2 -mt-1">
      {visible.map(m => (
        <DuplicateMatchCard
          key={m.id}
          match={m}
          onUse={onUseContact}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
