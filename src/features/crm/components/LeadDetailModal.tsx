import { useState } from 'react';
import { X, Phone, Mail, Home } from 'lucide-react';
import { useCRMActivities } from '../hooks/useCRMActivities';
import { useCRMTasks } from '../hooks/useCRMTasks';
import { useCRMLeads } from '../hooks/useCRMLeads';
import type { CRMLead, ActivityType, LeadStage, LeadPriority } from '../types';
import { HaloInviteButton } from '@/components/halo/HaloInviteButton';

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'task', label: 'Task', icon: '✅' },
];

const SMS_TEMPLATES = [
  { label: 'Follow up', text: (name: string) => `Hi ${name}, just following up on your property enquiry. Are you still looking? Happy to answer any questions.` },
  { label: 'Open home', text: (name: string) => `Hi ${name}, reminder that we have an open home this Saturday. Would love to see you there — reply for details.` },
  { label: 'Price drop', text: (name: string) => `Hi ${name}, great news — the vendor has just reduced the price on a property matching your search. Worth a look?` },
  { label: 'New listing', text: (name: string) => `Hi ${name}, a new property just hit the market that matches your brief. Want me to send the details through?` },
  { label: 'Offer update', text: (name: string) => `Hi ${name}, just wanted to keep you updated on where things stand with your offer. Do you have a few minutes to chat?` },
  { label: 'Check in', text: (name: string) => `Hi ${name}, checking in to see how the property search is going. Still actively looking?` },
];

const STAGES: LeadStage[] = [
  'new', 'contacted', 'qualified', 'offer_stage', 'under_contract', 'settled', 'lost'
];

const fmtLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ACT_ICON: Record<string, string> = {
  note: '📝', call: '📞', email: '✉️', meeting: '🤝', task: '✅'
};

interface Props { lead: CRMLead; onClose: () => void; onUpdate: () => void; }

export function LeadDetailModal({ lead, onClose, onUpdate }: Props) {
  const { activities, addActivity } = useCRMActivities(lead.id);
  const { tasks, addTask, completeTask } = useCRMTasks(lead.id);
  const { updateLead, updateStage } = useCRMLeads();

  const [actType, setActType] = useState<ActivityType>('note');
  const [actBody, setActBody] = useState('');
  const [actDue, setActDue] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [tab, setTab] = useState<'timeline' | 'tasks' | 'details'>('timeline');
  const [saving, setSaving] = useState(false);
  const [showCallLogger, setShowCallLogger] = useState(false);
  const [showSMSComposer, setShowSMSComposer] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  const handleAddActivity = async () => {
    if (!actBody.trim()) return;
    setSaving(true);
    await addActivity(actType, actBody, undefined, actType === 'task' ? actDue : undefined);
    setActBody('');
    setActDue('');
    setSaving(false);
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !taskDue) return;
    await addTask(lead.id, taskTitle, taskDue);
    setTaskTitle('');
    setTaskDue('');
  };

  const handleCallNow = () => {
    window.open(`tel:${lead.phone}`, '_self');
    setTab('timeline');
    setActType('call');
    setShowCallLogger(true);
  };

  const handleSMSNow = () => {
    setShowSMSComposer(true);
  };

  const handleSendSMS = async () => {
    if (!smsBody.trim()) return;
    const encodedBody = encodeURIComponent(smsBody);
    window.open(`sms:${lead.phone}?body=${encodedBody}`, '_self');
    await addActivity('sms' as ActivityType, smsBody);
    setSmsBody('');
    setSmsSent(true);
    setTimeout(() => { setShowSMSComposer(false); setSmsSent(false); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl border border-border mb-12 relative">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {lead.first_name} {lead.last_name ?? ''}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {lead.email && (
                <span className="flex items-center gap-1"><Mail size={10} />{lead.email}</span>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={10} />{lead.phone}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleCallNow(); }}
                    disabled={(lead as any).do_not_contact}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition
                      ${(lead as any).do_not_contact
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-40'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                  >
                    📞 Call
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (!(lead as any).do_not_contact) handleSMSNow(); }}
                    disabled={(lead as any).do_not_contact}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition
                      ${(lead as any).do_not_contact
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-40'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                  >
                    💬 SMS
                  </button>
                </div>
              )}
            </div>
            {lead.property && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Home size={10} />{lead.property.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <HaloInviteButton
              contactName={`${lead.first_name} ${lead.last_name ?? ''}`.trim()}
              contactEmail={lead.email ?? null}
            />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {(lead as any).do_not_contact && (
          <div className="mx-5 mt-3 flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <span className="text-destructive text-xs font-semibold">🚫 Do Not Contact — calling and SMS are disabled for this lead.</span>
          </div>
        )}

        {/* Stage + Priority bar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Stage</span>
            <select
              value={lead.stage}
              onChange={e => updateStage(lead.id, e.target.value as LeadStage)}
              className="text-sm border border-border rounded-lg px-2 py-1 bg-background focus:outline-none"
            >
              {STAGES.map(s => (
                <option key={s} value={s}>{fmtLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Priority</span>
            <select
              value={lead.priority}
              onChange={e => updateLead(lead.id, { priority: e.target.value as LeadPriority })}
              className="text-sm border border-border rounded-lg px-2 py-1 bg-background focus:outline-none"
            >
              {['high', 'medium', 'low'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {lead.budget_max && (
            <span className="text-xs text-muted-foreground ml-auto">
              Budget: ${(lead.budget_max / 1000).toFixed(0)}k
              {lead.pre_approved && <span className="text-primary ml-1">✓ Pre-approved</span>}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {(['timeline', 'tasks', 'details'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px transition
                ${tab === t
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'tasks' && tasks.length > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          {tab === 'timeline' && (
            <div className="space-y-4">
              {showCallLogger && (
                <div className="mb-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">📞 Calling {lead.phone} — log the outcome below</p>
                  <button
                    onClick={() => setShowCallLogger(false)}
                    className="text-xs text-muted-foreground hover:text-foreground float-right -mt-5"
                  >✕</button>
                </div>
              )}
              <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setActType(t.value)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition
                        ${actType === t.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={actBody}
                  onChange={e => setActBody(e.target.value)}
                  placeholder={
                    actType === 'call' ? 'Call summary…' :
                    actType === 'email' ? 'Email summary…' :
                    actType === 'meeting' ? 'Meeting notes…' :
                    actType === 'task' ? 'Task description…' :
                    'Add a note…'
                  }
                  rows={2}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm
                             focus:outline-none resize-none bg-background"
                />
                {actType === 'task' && (
                  <input
                    type="datetime-local"
                    value={actDue}
                    onChange={e => setActDue(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
                  />
                )}
                <button
                  onClick={handleAddActivity}
                  disabled={saving || !actBody.trim()}
                  className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg
                             hover:bg-primary/90 transition disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Log Activity'}
                </button>
              </div>

              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No activity yet — log a call, note, or email above.
                </p>
              )}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {activities.map(act => (
                    <div key={act.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-background border border-border
                                      flex items-center justify-center text-base flex-shrink-0 z-10">
                        {ACT_ICON[act.type]}
                      </div>
                      <div className="flex-1 bg-background border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-foreground capitalize">{act.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(act.created_at).toLocaleString('en-AU', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{act.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Task title…"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
                />
                <input
                  type="date"
                  value={taskDue}
                  onChange={e => setTaskDue(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!taskTitle.trim() || !taskDue}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm
                             hover:bg-primary/90 transition disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              {tasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No open tasks.</p>
              )}
              {tasks.map(task => {
                const isOverdue = new Date(task.due_at) < new Date();
                return (
                  <div key={task.id}
                    className={`flex items-center gap-3 p-3 bg-background border rounded-xl
                      ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      className="w-5 h-5 rounded border-2 border-muted-foreground/30 hover:border-primary
                                 hover:bg-primary/10 flex-shrink-0 transition"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {isOverdue ? 'Overdue · ' : 'Due '}
                        {new Date(task.due_at).toLocaleDateString('en-AU', {
                          weekday: 'short', day: 'numeric', month: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium text-foreground">Do Not Contact</p>
                  <p className="text-xs text-muted-foreground">Disables calling and SMS for this lead</p>
                </div>
                <button
                  onClick={() => updateLead(lead.id, { do_not_contact: !(lead as any).do_not_contact } as any)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    (lead as any).do_not_contact ? 'bg-destructive' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    (lead as any).do_not_contact ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Budget Min', key: 'budget_min', type: 'number' },
                  { label: 'Budget Max', key: 'budget_max', type: 'number' },
                  { label: 'Expected Close', key: 'expected_close', type: 'date' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                    <input
                      type={type}
                      defaultValue={(lead as any)[key] ?? ''}
                      onBlur={e => updateLead(lead.id, { [key]: e.target.value || null } as any)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Source</label>
                  <p className="text-sm text-foreground capitalize">{lead.source.replace('_', ' ')}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  defaultValue={lead.notes ?? ''}
                  onBlur={e => updateLead(lead.id, { notes: e.target.value })}
                  rows={4}
                  placeholder="General notes about this lead…"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm
                             focus:outline-none resize-none bg-background"
                />
              </div>
              {lead.stage === 'lost' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Lost Reason</label>
                  <input
                    defaultValue={lead.lost_reason ?? ''}
                    onBlur={e => updateLead(lead.id, { lost_reason: e.target.value })}
                    placeholder="Why was this lead lost?"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {showSMSComposer && (
          <div className="absolute inset-0 bg-black/60 rounded-2xl z-10 flex items-center justify-center p-6">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-foreground">💬 SMS to {lead.first_name}</h3>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                </div>
                <button onClick={() => { setShowSMSComposer(false); setSmsBody(''); }}
                  className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  value={smsBody}
                  onChange={e => setSmsBody(e.target.value)}
                  placeholder={`Hi ${lead.first_name}, just following up on your enquiry…`}
                  rows={5}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none resize-none bg-background"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{smsBody.length} characters · opens your SMS app</p>
                {smsSent ? (
                  <div className="text-center text-sm text-green-600 font-medium py-2">✅ SMS sent and logged!</div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendSMS}
                      disabled={!smsBody.trim()}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-xl transition disabled:opacity-40"
                    >
                      Send SMS
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(smsBody); }}
                      className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
