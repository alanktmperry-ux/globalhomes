import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Mail, MessageSquare, Search, Send, Clock, X, CheckCircle2, Inbox as InboxIcon, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  useInboxThreads, useInboxMessages, markThreadRead, setThreadStatus, sendInboxMessage,
  type InboxFilter, type InboxThreadRow, type InboxChannel,
} from '@/features/inbox/hooks/useInbox';
import TemplatePicker, { type TemplatePickerContact } from '@/features/messaging/components/TemplatePicker';

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'mine', label: 'Mine' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'closed', label: 'Closed' },
];

function contactName(t: InboxThreadRow): string {
  const c = t.contact;
  if (!c) return t.subject || 'Lead enquiry';
  return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || 'Contact';
}
function initials(t: InboxThreadRow): string {
  const c = t.contact;
  if (!c) return '?';
  return ((c.first_name?.[0] ?? '') + (c.last_name?.[0] ?? '')).toUpperCase() || (c.email?.[0] ?? '?').toUpperCase();
}

export default function InboxPage() {
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { threads, loading, agentId, counts } = useInboxThreads(filter, search);
  const { messages, loading: messagesLoading } = useInboxMessages(activeId);
  const activeThread = useMemo(() => threads.find(t => t.id === activeId) || null, [threads, activeId]);

  const [draft, setDraft] = useState('');
  const [composeChannel, setComposeChannel] = useState<InboxChannel>('email');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-select first thread on load (desktop)
  useEffect(() => {
    if (!activeId && threads.length > 0 && window.innerWidth >= 768) {
      setActiveId(threads[0].id);
    }
  }, [threads, activeId]);

  // Mark read on open
  useEffect(() => {
    if (activeId && activeThread?.is_unread) {
      markThreadRead(activeId);
    }
  }, [activeId, activeThread?.is_unread]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const handleSend = async () => {
    if (!draft.trim() || !activeThread || !agentId) return;
    setSending(true);
    try {
      await sendInboxMessage({
        threadId: activeThread.id,
        channel: composeChannel,
        body: draft.trim(),
        agentId,
        recipientEmail: activeThread.contact?.email ?? null,
        subject: activeThread.subject || `Re: ${contactName(activeThread)}`,
      });
      setDraft('');
      toast.success(composeChannel === 'email' ? 'Email sent' : 'Message sent');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleSnooze = async (hours: number) => {
    if (!activeThread) return;
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    await setThreadStatus(activeThread.id, 'snoozed', until);
    toast.success(`Snoozed for ${hours}h`);
  };
  const handleClose = async () => {
    if (!activeThread) return;
    await setThreadStatus(activeThread.id, 'closed', null);
    toast.success('Marked as closed');
    setActiveId(null);
  };
  const handleReopen = async () => {
    if (!activeThread) return;
    await setThreadStatus(activeThread.id, 'open', null);
    toast.success('Reopened');
  };

  const pickerContact: TemplatePickerContact | null = activeThread?.contact
    ? {
      id: activeThread.contact.id,
      first_name: activeThread.contact.first_name,
      last_name: activeThread.contact.last_name,
      email: activeThread.contact.email,
      phone: activeThread.contact.phone,
      mobile: activeThread.contact.mobile,
      preferred_language: activeThread.contact.preferred_language,
    }
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <Helmet><title>Inbox | ListHQ</title></Helmet>

      <div className="grid md:grid-cols-[360px_1fr] flex-1 min-h-0">
        {/* LEFT — list */}
        <aside className={`border-r border-border bg-card flex flex-col min-h-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <InboxIcon size={18} className="text-primary" />
              <h1 className="font-semibold text-base">Inbox</h1>
              {counts.unread > 0 && (
                <Badge variant="secondary" className="ml-auto bg-primary text-primary-foreground">{counts.unread}</Badge>
              )}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search threads…"
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Tabs value={filter} onValueChange={v => setFilter(v as InboxFilter)}>
              <TabsList className="grid grid-cols-5 h-8 w-full">
                {FILTERS.map(f => (
                  <TabsTrigger key={f.key} value={f.key} className="text-xs px-1">{f.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center p-8 text-sm text-muted-foreground">
                <MailOpen className="mx-auto mb-2 opacity-50" size={28} />
                No threads in this view
              </div>
            ) : (
              threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${activeId === t.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      {t.contact?.avatar_url && <AvatarImage src={t.contact.avatar_url} />}
                      <AvatarFallback className="text-xs">{initials(t)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-sm truncate ${t.is_unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'}`}>
                          {contactName(t)}
                        </span>
                        {t.is_unread && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                        <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: false })}
                        </span>
                      </div>
                      {t.subject && (
                        <div className="text-xs text-foreground/80 truncate mb-0.5">{t.subject}</div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">{t.last_message_preview || 'No messages yet'}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {t.status === 'snoozed' && <Badge variant="outline" className="text-[9px] h-4 px-1"><Clock size={9} className="mr-0.5" />Snoozed</Badge>}
                        {t.status === 'closed' && <Badge variant="outline" className="text-[9px] h-4 px-1">Closed</Badge>}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT — thread */}
        <section className={`flex flex-col min-h-0 ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a thread
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center gap-2 bg-card">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActiveId(null)}>
                  ←
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{contactName(activeThread)}</div>
                  {activeThread.subject && <div className="text-xs text-muted-foreground truncate">{activeThread.subject}</div>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Clock size={14} className="mr-1" />Snooze</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSnooze(1)}>For 1 hour</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSnooze(4)}>For 4 hours</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSnooze(24)}>For 24 hours</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {activeThread.status === 'closed' ? (
                  <Button variant="outline" size="sm" onClick={handleReopen}>Reopen</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleClose}>
                    <CheckCircle2 size={14} className="mr-1" />Close
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">No messages yet — start the conversation below.</div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${m.direction === 'outbound' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                        <div className="flex items-center gap-1.5 mb-1 opacity-80 text-[10px]">
                          {m.channel === 'email' ? <Mail size={10} /> : <MessageSquare size={10} />}
                          <span>{m.channel === 'email' ? 'Email' : 'In-app'}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })}</span>
                        </div>
                        {m.body_html ? (
                          <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m.body_html }} />
                        ) : (
                          <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="border-t border-border p-3 bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <Tabs value={composeChannel} onValueChange={v => setComposeChannel(v as InboxChannel)}>
                    <TabsList className="h-7">
                      <TabsTrigger value="email" className="text-xs h-6 px-2"><Mail size={12} className="mr-1" />Email</TabsTrigger>
                      <TabsTrigger value="in_app" className="text-xs h-6 px-2"><MessageSquare size={12} className="mr-1" />In-app</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {pickerContact && (
                    <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)} className="text-xs h-7">
                      Templates
                    </Button>
                  )}
                  {composeChannel === 'email' && !activeThread.contact?.email && (
                    <span className="text-[11px] text-amber-600 ml-auto">No email on file</span>
                  )}
                </div>
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={composeChannel === 'email' ? 'Write your email…' : 'Write a message…'}
                  className="min-h-20 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">⌘+Enter to send</span>
                  <Button onClick={handleSend} disabled={sending || !draft.trim() || (composeChannel === 'email' && !activeThread.contact?.email)} size="sm">
                    {sending ? <Loader2 className="animate-spin mr-1" size={14} /> : <Send size={14} className="mr-1" />}
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {pickerOpen && pickerContact && (
        <TemplatePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          contact={pickerContact}
          property={null}
          defaultChannel={composeChannel}
        />
      )}
    </div>
  );
}
