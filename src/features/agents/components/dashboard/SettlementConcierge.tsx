import { useState, useEffect, useMemo } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PartyPopper, MapPin, Clock, ChevronDown, ChevronUp, Copy, Star, ExternalLink, Gift } from 'lucide-react';

import { toast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { differenceInDays, format, isPast, addDays } from 'date-fns';

interface Settlement {
  id: string;
  address: string;
  buyerName: string;
  settlementDate: Date;
  propertyId: string;
}

const CHECKLIST_ITEMS = [
  'Confirm final inspection booked',
  'Keys handover arranged',
  'Trust funds cleared',
  'Buyer notified of settlement time',
  'Google review requested',
];

const UTILITY_PARTNERS = [
  { name: 'AGL', url: 'https://www.agl.com.au', color: 'bg-blue-600' },
  { name: 'Origin Energy', url: 'https://www.originenergy.com.au', color: 'bg-orange-500' },
  { name: 'Telstra', url: 'https://www.telstra.com.au', color: 'bg-blue-500' },
  { name: 'NBN Co', url: 'https://www.nbnco.com.au', color: 'bg-purple-600' },
];

const now = new Date();

const DEMO_SETTLEMENTS: Settlement[] = [
  { id: 'demo-s1', address: '8 Ocean View Rd, Brighton', buyerName: 'Sarah Chen', settlementDate: addDays(now, 3), propertyId: 'demo-p1' },
  { id: 'demo-s2', address: '15 Station St, Richmond', buyerName: 'James Nguyen', settlementDate: addDays(now, 9), propertyId: 'demo-p2' },
];

const DEMO_POST: Settlement[] = [
  { id: 'demo-s3', address: '42 Panorama Drive, Berwick', buyerName: 'Emma Wilson', settlementDate: addDays(now, -5), propertyId: 'demo-p3' },
];

const SettlementConcierge = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkStates, setCheckStates] = useState<Record<string, boolean[]>>({});
  const [utilityModal, setUtilityModal] = useState<Settlement | null>(null);

  const allSettlements = useMemo(() => [...DEMO_SETTLEMENTS, ...DEMO_POST], []);

  const upcoming = useMemo(() => allSettlements.filter(s => !isPast(s.settlementDate)).sort((a, b) => a.settlementDate.getTime() - b.settlementDate.getTime()), [allSettlements]);
  const postSettlement = useMemo(() => allSettlements.filter(s => isPast(s.settlementDate)), [allSettlements]);

  // Load checklist state from localStorage
  useEffect(() => {
    const loaded: Record<string, boolean[]> = {};
    allSettlements.forEach(s => {
      const stored = localStorage.getItem(`settlement-checklist-${s.propertyId}`);
      loaded[s.propertyId] = stored ? JSON.parse(stored) : new Array(CHECKLIST_ITEMS.length).fill(false);
    });
    setCheckStates(loaded);
  }, [allSettlements]);

  const toggleCheck = (propertyId: string, idx: number) => {
    setCheckStates(prev => {
      const arr = [...(prev[propertyId] || new Array(CHECKLIST_ITEMS.length).fill(false))];
      arr[idx] = !arr[idx];
      localStorage.setItem(`settlement-checklist-${propertyId}`, JSON.stringify(arr));
      return { ...prev, [propertyId]: arr };
    });
  };

  const getBorderClass = (date: Date) => {
    const days = differenceInDays(date, now);
    if (days <= 3) return 'border-red-500/60';
    if (days <= 7) return 'border-amber-500/60';
    return 'border-border';
  };

  const getCountdownBadge = (date: Date) => {
    const days = differenceInDays(date, now);
    if (days <= 0) return { label: 'Today', className: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (days <= 3) return { label: `${days}d left`, className: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (days <= 7) return { label: `${days}d left`, className: 'bg-amber-500/20 text-amber-600 border-amber-500/30' };
    return { label: `${days}d left`, className: 'bg-muted text-muted-foreground' };
  };

  const handleCongrats = (s: Settlement) => {
    toast({ title: '🎉 Email sent', description: `Congratulations email sent to ${s.buyerName}` });
  };

  const handleReviewRequest = (s: Settlement) => {
    const msg = `Hi ${s.buyerName}, it was a pleasure helping you settle on ${s.address}. If you'd be happy to leave a review, here's the link: ${window.location.origin}/agent/me`;
    navigator.clipboard.writeText(msg);
    toast({ title: '📋 Copied', description: 'Review request copied to clipboard' });
  };

  const { canAccessSettlement, loading: subLoading } = useSubscription();

  if (!subLoading && !canAccessSettlement) {
    return <UpgradeGate requiredPlan="Pro or above" message="Settlement Concierge is available on the Pro plan and above. Track every milestone from exchange to settlement so nothing slips." />;
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <SidebarTrigger className="md:hidden" />
        <PartyPopper size={24} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold">Settlement Concierge</h1>
          <p className="text-sm text-muted-foreground">Manage upcoming and completed settlements</p>
        </div>
      </div>

      {/* Upcoming Settlements */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Settlements</h2>
      {upcoming.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-muted-foreground">No upcoming settlements</CardContent>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {upcoming.map(s => {
            const expanded = expandedId === s.id;
            const badge = getCountdownBadge(s.settlementDate);
            const checks = checkStates[s.propertyId] || new Array(CHECKLIST_ITEMS.length).fill(false);
            const completedCount = checks.filter(Boolean).length;

            return (
              <Card key={s.id} className={`transition-colors ${getBorderClass(s.settlementDate)}`}>
                <CardContent className="p-4">
                  <button onClick={() => setExpandedId(expanded ? null : s.id)} className="w-full text-left flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span className="font-semibold truncate">{s.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Buyer: {s.buyerName}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {format(s.settlementDate, 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settlement Checklist ({completedCount}/{CHECKLIST_ITEMS.length})</p>
                      {CHECKLIST_ITEMS.map((item, idx) => (
                        <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                          <Checkbox checked={checks[idx]} onCheckedChange={() => toggleCheck(s.propertyId, idx)} />
                          <span className={`text-sm transition-colors ${checks[idx] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Post-Settlement */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recently Settled</h2>
      {postSettlement.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No recent settlements</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {postSettlement.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-primary" />
                  <span className="font-semibold">{s.address}</span>
                  <Badge variant="secondary" className="text-[10px]">Settled</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Buyer: {s.buyerName} · Settled {format(s.settlementDate, 'dd MMM')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCongrats(s)} className="gap-1.5 text-xs">
                    <PartyPopper size={14} /> Send Congratulations
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReviewRequest(s)} className="gap-1.5 text-xs">
                    <Star size={14} /> Request Google Review
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setUtilityModal(s)} className="gap-1.5 text-xs">
                    <Gift size={14} /> Refer Utilities
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Utility Referral Modal */}
      <Dialog open={!!utilityModal} onOpenChange={() => setUtilityModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift size={18} /> Utility Referrals</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Help {utilityModal?.buyerName} get set up at their new home. You may earn a referral fee for each signup.</p>
          <div className="space-y-3">
            {UTILITY_PARTNERS.map(u => (
              <a key={u.name} href={u.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                <span className="font-medium text-sm">{u.name}</span>
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 italic">Note: You may earn a referral fee for each signup through these links.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettlementConcierge;
