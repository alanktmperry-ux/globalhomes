import { useState, useCallback } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays, MapPin, Clock, Users, Plus, X, Flame, Zap, Snowflake, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { format } from 'date-fns';

type InterestLevel = 'hot' | 'warm' | 'cold';

interface Visitor {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  checkedInAt: Date;
  interest: InterestLevel;
}

interface ScheduledInspection {
  propertyId: string;
  address: string;
  time: string;
  expectedVisitors: number;
}

const DEMO_INSPECTIONS: ScheduledInspection[] = [
  { propertyId: 'demo-1', address: '42 Panorama Drive, Berwick', time: '10:00 AM', expectedVisitors: 8 },
  { propertyId: 'demo-2', address: '8 Ocean View Rd, Brighton', time: '2:00 PM', expectedVisitors: 12 },
];

const INTEREST_CONFIG: Record<InterestLevel, { label: string; icon: typeof Flame; className: string }> = {
  hot: { label: 'Hot', icon: Flame, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  warm: { label: 'Warm', icon: Zap, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  cold: { label: 'Cold', icon: Snowflake, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const InspectionModePage = () => {
  const { user } = useAuth();

  const { canAccessInspections, loading: subLoading } = useSubscription();
  const [inspections] = useState<ScheduledInspection[]>(DEMO_INSPECTIONS);
  const [activeInspection, setActiveInspection] = useState<ScheduledInspection | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleStartInspection = (inspection: ScheduledInspection) => {
    setActiveInspection(inspection);
    setVisitors([]);
    setShowSummary(false);
  };

  const handleCheckIn = () => {
    if (!firstName.trim()) return;
    setVisitors(prev => [...prev, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      checkedInAt: new Date(),
      interest: 'warm',
    }]);
    setFirstName(''); setLastName(''); setPhone(''); setEmail('');
    setShowForm(false);
  };

  const setInterest = useCallback((idx: number, level: InterestLevel) => {
    setVisitors(prev => prev.map((v, i) => i === idx ? { ...v, interest: level } : v));
  }, []);

  const handleEndInspection = async () => {
    setSaving(true);
    if (activeInspection) {
      try {
        const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user?.id ?? '').maybeSingle();
        if (agent) {
          const leadsToInsert = visitors.map(v => ({
            agent_id: agent.id,
            property_id: activeInspection.propertyId,
            user_name: `${v.firstName} ${v.lastName}`.trim(),
            user_email: v.email || `${v.firstName.toLowerCase()}@inspection.local`,
            user_phone: v.phone || null,
            status: 'new' as const,
            message: `Checked in at open home. Interest: ${v.interest}`,
            urgency: v.interest === 'hot' ? 'ready_to_buy' : v.interest === 'warm' ? 'actively_looking' : 'just_browsing',
          }));
          await supabase.from('leads').insert(leadsToInsert);
        }
      } catch (e) {
        console.error('Failed to save leads', e);
      }
    }
    setSaving(false);
    setShowSummary(true);
  };

  const handleFollowUp = () => {
    const count = visitors.filter(v => v.email).length || visitors.length;
    toast({ title: '📧 Follow-ups scheduled', description: `Follow-up emails scheduled for ${count} contacts` });
  };

  const handleExitSummary = () => {
    setActiveInspection(null);
    setVisitors([]);
    setShowSummary(false);
  };

  // ── Summary Screen ──
  if (showSummary && activeInspection) {
    const hotCount = visitors.filter(v => v.interest === 'hot').length;
    const warmCount = visitors.filter(v => v.interest === 'warm').length;
    const coldCount = visitors.filter(v => v.interest === 'cold').length;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
        <CheckCircle size={64} className="text-green-400 mb-4" />
        <h1 className="text-2xl font-bold mb-1">Inspection Complete</h1>
        <p className="text-zinc-400 mb-8">{activeInspection.address}</p>

        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
          <Card className="bg-zinc-900 border-zinc-800 text-center">
            <CardContent className="pt-4 pb-3">
              <p className="text-3xl font-bold text-zinc-100">{visitors.length}</p>
              <p className="text-xs text-zinc-500">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-center">
            <CardContent className="pt-4 pb-3">
              <p className="text-3xl font-bold text-red-400">{hotCount}</p>
              <p className="text-xs text-zinc-500">Hot</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-center">
            <CardContent className="pt-4 pb-3">
              <p className="text-3xl font-bold text-amber-400">{warmCount}</p>
              <p className="text-xs text-zinc-500">Warm</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-zinc-500 text-sm mb-6">{coldCount} cold lead{coldCount !== 1 ? 's' : ''}</p>

        <div className="flex gap-3">
          <Button onClick={handleFollowUp} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Send size={16} /> Send Follow-up
          </Button>
          <Button variant="outline" onClick={handleExitSummary} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ── Live Inspection Mode ──
  if (activeInspection) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={18} className="text-green-400" />
              <h1 className="text-lg font-bold truncate">{activeInspection.address}</h1>
            </div>
            <p className="text-xs text-zinc-500">{activeInspection.time} · Live Inspection</p>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">
            <Users size={14} className="mr-1" /> {visitors.length} visitor{visitors.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Visitor list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visitors.length === 0 && !showForm && (
            <div className="text-center text-zinc-600 mt-20">
              <Users size={48} className="mx-auto mb-3 opacity-40" />
              <p>No visitors checked in yet</p>
              <p className="text-sm">Tap the button below to check in your first visitor</p>
            </div>
          )}

          {visitors.map((v, idx) => (
            <Card key={idx} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">{v.firstName} {v.lastName}</p>
                  <p className="text-xs text-zinc-500">{format(v.checkedInAt, 'h:mm a')}{v.phone && ` · ${v.phone}`}</p>
                </div>
                <div className="flex gap-1.5">
                  {(['hot', 'warm', 'cold'] as InterestLevel[]).map(level => {
                    const cfg = INTEREST_CONFIG[level];
                    const Icon = cfg.icon;
                    const active = v.interest === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setInterest(idx, level)}
                        className={`p-1.5 rounded-md border text-xs transition-all ${active ? cfg.className : 'border-zinc-700 text-zinc-600 hover:border-zinc-500'}`}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Quick check-in form */}
          {showForm && (
            <Card className="bg-zinc-900 border-green-500/30">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm text-zinc-300">Check In Visitor</CardTitle>
                <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">First Name *</Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" className="bg-zinc-800 border-zinc-700 text-zinc-100 h-9" autoFocus />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Last Name</Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" className="bg-zinc-800 border-zinc-700 text-zinc-100 h-9" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="04xx xxx xxx" className="bg-zinc-800 border-zinc-700 text-zinc-100 h-9" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="bg-zinc-800 border-zinc-700 text-zinc-100 h-9" />
                </div>
                <Button onClick={handleCheckIn} disabled={!firstName.trim()} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle size={16} className="mr-1.5" /> Check In
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-zinc-800 flex gap-3">
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-base">
              <Plus size={18} /> Check In Visitor
            </Button>
          )}
          <Button
            onClick={handleEndInspection}
            disabled={saving}
            variant="destructive"
            className={`h-12 text-base ${showForm ? 'flex-1' : ''}`}
          >
            {saving ? 'Saving…' : 'End Inspection'}
          </Button>
        </div>
      </div>
    );
  }

  // ── State 1: Scheduled Inspections ──
  if (!subLoading && !canAccessInspections) {
    return <UpgradeGate requiredPlan="Pro or above" message="Inspection Day Mode is available on the Pro plan and above. Capture visitor details with QR sign-in, track interest levels, and send follow-ups in one tap." />;
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <SidebarTrigger className="md:hidden" />
        <CalendarDays size={24} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold">Inspection Day</h1>
          <p className="text-sm text-muted-foreground">Today's scheduled open homes</p>
        </div>
      </div>

      {inspections.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays size={48} className="mx-auto mb-3 opacity-40" />
            <p>No inspections scheduled for today</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-xl">
          {inspections.map((insp, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <p className="font-semibold">{insp.address}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={14} /> {insp.time}</span>
                      <span className="flex items-center gap-1"><Users size={14} /> {insp.expectedVisitors} expected</span>
                    </div>
                  </div>
                  <Button onClick={() => handleStartInspection(insp)} className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                    Start Inspection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InspectionModePage;
