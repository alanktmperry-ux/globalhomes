import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Flame, Thermometer, Snowflake, Phone, Mail, MessageSquare, Calendar, ClipboardList, StickyNote, PhoneCall, Send } from 'lucide-react';
import type { Contact, ContactActivity } from '@/features/agents/hooks/useContacts';
import TemplatePicker from '@/features/messaging/components/TemplatePicker';

const RANKING_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  warm: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Cold' },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <PhoneCall size={14} className="text-success" />,
  email: <Mail size={14} className="text-primary" />,
  sms: <MessageSquare size={14} className="text-blue-500" />,
  inspection: <ClipboardList size={14} className="text-orange-500" />,
  note: <StickyNote size={14} className="text-muted-foreground" />,
  meeting: <Calendar size={14} className="text-purple-500" />,
  follow_up: <Phone size={14} className="text-yellow-500" />,
  status_change: <ClipboardList size={14} className="text-green-500" />,
};

const AU_DATE = (d: string) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface Props {
  contact: Contact;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Contact>) => Promise<void>;
  addActivity: (contactId: string, type: string, description: string) => Promise<void>;
  getActivities: (contactId: string) => Promise<ContactActivity[]>;
}

const ContactDetailDrawer = ({ contact, onClose, onUpdate, addActivity, getActivities }: Props) => {
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [newActivityType, setNewActivityType] = useState('note');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Next action editor state
  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [nextDue, setNextDue] = useState<string>(toLocalInput(contact.next_action_due_at));
  const [nextNote, setNextNote] = useState<string>(contact.next_action_note || '');
  const [savingNext, setSavingNext] = useState(false);

  useEffect(() => {
    setNextDue(toLocalInput(contact.next_action_due_at));
    setNextNote(contact.next_action_note || '');
  }, [contact.id, contact.next_action_due_at, contact.next_action_note]);

  useEffect(() => {
    setLoadingActivities(true);
    getActivities(contact.id).then(data => {
      setActivities(data);
      setLoadingActivities(false);
    });
  }, [contact.id, getActivities]);

  const handleAddActivity = async () => {
    if (!newActivityDesc.trim()) return;
    await addActivity(contact.id, newActivityType, newActivityDesc);
    setNewActivityDesc('');
    const updated = await getActivities(contact.id);
    setActivities(updated);
  };

  const handleSaveNextAction = async () => {
    setSavingNext(true);
    try {
      await onUpdate(contact.id, {
        next_action_due_at: nextDue ? new Date(nextDue).toISOString() : null,
        next_action_note: nextNote.trim() || null,
      });
    } finally {
      setSavingNext(false);
    }
  };

  const handleClearNextAction = async () => {
    setNextDue('');
    setNextNote('');
    setSavingNext(true);
    try {
      await onUpdate(contact.id, { next_action_due_at: null, next_action_note: null });
    } finally {
      setSavingNext(false);
    }
  };

  const r = RANKING_CONFIG[contact.ranking] || RANKING_CONFIG.cold;
  const initials = `${contact.first_name[0]}${(contact.last_name || '')[0] || ''}`.toUpperCase();

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-bold">{contact.first_name} {contact.last_name || ''}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`${r.color} text-[10px] gap-0.5 border-0`}>{r.icon} {r.label}</Badge>
                <span className="text-xs text-muted-foreground capitalize">{contact.contact_type}</span>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Next Action — inline editor */}
          {(() => {
            const dueMs = contact.next_action_due_at ? new Date(contact.next_action_due_at).getTime() : null;
            const isOverdue = dueMs != null && dueMs < Date.now();
            const isDueSoon = dueMs != null && !isOverdue && dueMs - Date.now() < 24 * 60 * 60 * 1000;
            const banner = isOverdue
              ? 'border-destructive/40 bg-destructive/10'
              : isDueSoon
              ? 'border-amber-500/40 bg-amber-500/10'
              : 'border-border bg-muted/30';
            return (
              <section className={`rounded-lg border p-3 space-y-2 ${banner}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase">
                    Next Action {contact.last_contacted_at && (
                      <span className="ml-2 normal-case text-[10px] font-normal text-muted-foreground">
                        · last contacted {new Date(contact.last_contacted_at).toLocaleDateString('en-AU')}
                      </span>
                    )}
                  </h4>
                  {(contact.next_action_due_at || contact.next_action_note) && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleClearNextAction} disabled={savingNext}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <Input
                    type="datetime-local"
                    value={nextDue}
                    onChange={(e) => setNextDue(e.target.value)}
                    className="h-8 text-xs w-auto"
                  />
                  <Input
                    placeholder="What's due? (e.g. Follow up re: 12 Smith St)"
                    value={nextNote}
                    onChange={(e) => setNextNote(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={handleSaveNextAction} className="h-8 text-xs" disabled={savingNext}>
                    Save
                  </Button>
                </div>
              </section>
            );
          })()}

          {/* Contact Info */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Contact Details</h4>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPickerOpen(true)}>
                <Send size={12} /> Send template
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Mail size={14} /> {contact.email}
                </a>
              )}
              {(contact.mobile || contact.phone) && (
                <a href={`tel:${contact.mobile || contact.phone}`} className="flex items-center gap-2 hover:underline">
                  <Phone size={14} /> {contact.mobile || contact.phone}
                </a>
              )}
            </div>
            {contact.suburb && (
              <p className="text-xs text-muted-foreground">
                📍 {[contact.suburb, contact.state, contact.postcode].filter(Boolean).join(', ')}
              </p>
            )}
          </section>

          {/* Preferences */}
          {(contact.contact_type === 'buyer' || contact.contact_type === 'both') && (
            <section className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Buyer Preferences</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(contact.budget_min != null || contact.budget_max != null) && (
                  <p>💰 {contact.budget_min != null ? AUD.format(contact.budget_min) : '—'} — {contact.budget_max != null ? AUD.format(contact.budget_max) : '—'}</p>
                )}
                {contact.preferred_beds && <p>🛏️ {contact.preferred_beds}+ beds</p>}
                {contact.preferred_baths && <p>🚿 {contact.preferred_baths}+ baths</p>}
                {contact.preferred_suburbs?.length > 0 && (
                  <p className="col-span-2">📍 {contact.preferred_suburbs.join(', ')}</p>
                )}
              </div>
            </section>
          )}

          {(contact.contact_type === 'seller' || contact.contact_type === 'both') && contact.property_address && (
            <section className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Seller Property</h4>
              <p className="text-sm">🏠 {contact.property_address}</p>
              {contact.estimated_value && <p className="text-sm font-bold text-primary">{AUD.format(contact.estimated_value)}</p>}
            </section>
          )}

          {contact.notes && (
            <section className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Notes</h4>
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </section>
          )}

          {/* Activity Timeline */}
          <section className="space-y-3 border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Activity Timeline</h4>

            {/* Add activity */}
            <div className="flex gap-2">
              <Select value={newActivityType} onValueChange={setNewActivityType}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">📞 Call</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="sms">💬 SMS</SelectItem>
                  <SelectItem value="inspection">🏠 Inspection</SelectItem>
                  <SelectItem value="meeting">📅 Meeting</SelectItem>
                  <SelectItem value="note">📝 Note</SelectItem>
                  <SelectItem value="follow_up">📞 Follow-up</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Add note..."
                value={newActivityDesc}
                onChange={e => setNewActivityDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" onClick={handleAddActivity} className="h-8 text-xs" disabled={!newActivityDesc.trim()}>
                Add
              </Button>
            </div>

            {/* Timeline */}
            {loadingActivities ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activities yet</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="mt-0.5">{ACTIVITY_ICONS[a.activity_type] || ACTIVITY_ICONS.note}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">{a.description}</p>
                      <p className="text-[10px] text-muted-foreground">{AU_DATE(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactDetailDrawer;
