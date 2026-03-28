import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  SortAsc,
  CalendarIcon,
  Pencil,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────

type Status = 'pending' | 'in-progress' | 'done';

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  status: Status;
  dueDate: string;
  notes: string;
  updatedAt: string;
}

type FilterValue = 'all' | Status | 'overdue';
type SortValue = 'category' | 'dueDate' | 'status';

// ── Storage key ────────────────────────────────────────

const STORAGE_KEY = 'listhq-prelaunch-checklist';

// ── Seed data ──────────────────────────────────────────

const SEED: Omit<ChecklistItem, 'notes' | 'updatedAt'>[] = [
  // Platform & Core Functionality
  { id: 'plat-01', category: 'Platform & Core Functionality', task: 'Firecrawl web scraper: fix listing-type filter (rent vs sale)', status: 'pending', dueDate: '2026-04-07' },
  { id: 'plat-02', category: 'Platform & Core Functionality', task: 'Featured listings carousel: ensure it respects listing mode toggle', status: 'pending', dueDate: '2026-04-07' },
  { id: 'plat-03', category: 'Platform & Core Functionality', task: 'Consent banner: useLocation hook error (moved outside Router context)', status: 'pending', dueDate: '2026-04-04' },
  { id: 'plat-04', category: 'Platform & Core Functionality', task: 'Admin Seekers tab: add and style', status: 'pending', dueDate: '2026-04-10' },
  { id: 'plat-05', category: 'Platform & Core Functionality', task: 'Property deactivation: add tenancy safety check (block if active tenant)', status: 'pending', dueDate: '2026-04-10' },
  { id: 'plat-06', category: 'Platform & Core Functionality', task: 'Search filters: verify all property type filters work end-to-end', status: 'pending', dueDate: '2026-04-08' },
  { id: 'plat-07', category: 'Platform & Core Functionality', task: 'Mobile responsiveness: test all pages on iPhone 12 and Android', status: 'pending', dueDate: '2026-04-12' },
  { id: 'plat-08', category: 'Platform & Core Functionality', task: 'Dark mode: verify toggle works and persists across sessions', status: 'pending', dueDate: '2026-04-08' },

  // Performance & Infrastructure
  { id: 'perf-01', category: 'Performance & Infrastructure', task: 'Load test: simulate 500 concurrent users on voice search', status: 'pending', dueDate: '2026-04-14' },
  { id: 'perf-02', category: 'Performance & Infrastructure', task: 'Edge Function optimization: profile get-featured-listings for latency', status: 'pending', dueDate: '2026-04-10' },
  { id: 'perf-03', category: 'Performance & Infrastructure', task: 'Database indexing: add indexes on frequently queried columns (listing_type, created_at)', status: 'pending', dueDate: '2026-04-08' },
  { id: 'perf-04', category: 'Performance & Infrastructure', task: 'Image optimization: serve images at multiple resolutions for mobile', status: 'pending', dueDate: '2026-04-12' },
  { id: 'perf-05', category: 'Performance & Infrastructure', task: 'Caching strategy: implement Redis for featured listings (1 hour TTL)', status: 'pending', dueDate: '2026-04-14' },
  { id: 'perf-06', category: 'Performance & Infrastructure', task: 'CDN: configure Cloudflare for static assets', status: 'pending', dueDate: '2026-04-14' },

  // Security & Compliance
  { id: 'sec-01', category: 'Security & Compliance', task: 'Supabase RLS audit: no table allows unauthenticated writes', status: 'pending', dueDate: '2026-04-06' },
  { id: 'sec-02', category: 'Security & Compliance', task: 'API key rotation: ensure no dev credentials in production', status: 'pending', dueDate: '2026-04-06' },
  { id: 'sec-03', category: 'Security & Compliance', task: 'HTTPS enforcement: verify all endpoints use HTTPS only', status: 'pending', dueDate: '2026-04-05' },
  { id: 'sec-04', category: 'Security & Compliance', task: 'Rate limiting: implement on auth endpoints and API routes', status: 'pending', dueDate: '2026-04-10' },
  { id: 'sec-05', category: 'Security & Compliance', task: 'SQL injection testing: run penetration test on all user inputs', status: 'pending', dueDate: '2026-04-12' },
  { id: 'sec-06', category: 'Security & Compliance', task: 'GDPR & Privacy: review data retention policies for EU users', status: 'pending', dueDate: '2026-04-14' },
  { id: 'sec-07', category: 'Security & Compliance', task: 'Secrets management: migrate all secrets to environment variables', status: 'pending', dueDate: '2026-04-06' },

  // Payment & Billing
  { id: 'pay-01', category: 'Payment & Billing', task: 'Stripe production mode: activate and test real transaction flow', status: 'pending', dueDate: '2026-04-10' },
  { id: 'pay-02', category: 'Payment & Billing', task: 'Subscription webhooks: verify all webhook events are processed', status: 'pending', dueDate: '2026-04-10' },
  { id: 'pay-03', category: 'Payment & Billing', task: 'Refund handling: test refund flow end-to-end', status: 'pending', dueDate: '2026-04-12' },
  { id: 'pay-04', category: 'Payment & Billing', task: 'Invoice generation: ensure invoices are created and sent to email', status: 'pending', dueDate: '2026-04-12' },
  { id: 'pay-05', category: 'Payment & Billing', task: 'Payment reconciliation: daily check of Stripe vs database state', status: 'pending', dueDate: '2026-04-14' },

  // Content & Marketing
  { id: 'mkt-01', category: 'Content & Marketing', task: 'Terms of Service: legal review by solicitor', status: 'pending', dueDate: '2026-04-08' },
  { id: 'mkt-02', category: 'Content & Marketing', task: 'Privacy Policy: legal review by solicitor', status: 'pending', dueDate: '2026-04-08' },
  { id: 'mkt-03', category: 'Content & Marketing', task: 'Help documentation: complete FAQ section', status: 'pending', dueDate: '2026-04-10' },
  { id: 'mkt-04', category: 'Content & Marketing', task: 'Onboarding flow: walkthrough for first-time agents', status: 'pending', dueDate: '2026-04-10' },
  { id: 'mkt-05', category: 'Content & Marketing', task: 'Email templates: verify all transactional emails render correctly', status: 'pending', dueDate: '2026-04-12' },
  { id: 'mkt-06', category: 'Content & Marketing', task: 'Social proof: add testimonials or case studies to homepage', status: 'pending', dueDate: '2026-04-12' },

  // Operations & Onboarding
  { id: 'ops-01', category: 'Operations & Onboarding', task: 'First 20 paying agents: identify and onboard as design partners', status: 'pending', dueDate: '2026-04-14' },
  { id: 'ops-02', category: 'Operations & Onboarding', task: 'Support infrastructure: set up ticketing system (Zendesk/Intercom)', status: 'pending', dueDate: '2026-04-10' },
  { id: 'ops-03', category: 'Operations & Onboarding', task: 'Admin dashboard: test all reporting features in production', status: 'pending', dueDate: '2026-04-12' },
  { id: 'ops-04', category: 'Operations & Onboarding', task: 'Data backup: verify nightly backups run and are restorable', status: 'pending', dueDate: '2026-04-08' },
  { id: 'ops-05', category: 'Operations & Onboarding', task: 'Incident response: document process for downtime/outages', status: 'pending', dueDate: '2026-04-10' },
  { id: 'ops-06', category: 'Operations & Onboarding', task: 'Launch day runbook: create checklist for launch day operations', status: 'pending', dueDate: '2026-04-14' },
];

const CATEGORIES = [
  'Platform & Core Functionality',
  'Performance & Infrastructure',
  'Security & Compliance',
  'Payment & Billing',
  'Content & Marketing',
  'Operations & Onboarding',
];

const STATUS_ORDER: Record<Status, number> = { pending: 0, 'in-progress': 1, done: 2 };

function nextStatus(s: Status): Status {
  if (s === 'pending') return 'in-progress';
  if (s === 'in-progress') return 'done';
  return 'pending';
}

function statusBadge(s: Status) {
  const map: Record<Status, { label: string; className: string }> = {
    done: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    'in-progress': { label: 'In Progress', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
  };
  const v = map[s];
  return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-medium', v.className)}>{v.label}</Badge>;
}

function isOverdue(dueDate: string, status: Status): boolean {
  if (status === 'done') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

// ── Component ──────────────────────────────────────────

const PreLaunchChecklist = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<SortValue>('category');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));
  const [detailItem, setDetailItem] = useState<ChecklistItem | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();

  // Load / seed
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
        return;
      } catch { /* fall through to seed */ }
    }
    const now = new Date().toISOString();
    setItems(SEED.map((s) => ({ ...s, notes: '', updatedAt: now })));
  }, []);

  // Persist
  useEffect(() => {
    if (items.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const updateItem = useCallback((id: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it)),
    );
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: nextStatus(it.status), updatedAt: new Date().toISOString() } : it,
      ),
    );
  }, []);

  // Stats
  const doneCount = useMemo(() => items.filter((i) => i.status === 'done').length, [items]);
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  // Filtered + sorted
  const visible = useMemo(() => {
    let list = items;
    if (filter === 'overdue') list = list.filter((i) => isOverdue(i.dueDate, i.status));
    else if (filter !== 'all') list = list.filter((i) => i.status === filter);

    if (sort === 'dueDate') list = [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    else if (sort === 'status') list = [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    // category = default order
    return list;
  }, [items, filter, sort]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    CATEGORIES.forEach((c) => map.set(c, []));
    visible.forEach((i) => {
      const arr = map.get(i.category);
      if (arr) arr.push(i);
    });
    return map;
  }, [visible]);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const toggleAll = () => {
    setExpandedCats((prev) => (prev.size === CATEGORIES.length ? new Set() : new Set(CATEGORIES)));
  };

  const exportCsv = () => {
    const header = 'Category,Task,Status,Due Date,Notes,Updated At\n';
    const rows = items
      .map((i) => `"${i.category}","${i.task}","${i.status}","${i.dueDate}","${i.notes.replace(/"/g, '""')}","${i.updatedAt}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prelaunch-checklist-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detail modal helpers
  const openDetail = (item: ChecklistItem) => {
    setDetailItem(item);
    setEditNotes(item.notes);
    setEditDueDate(item.dueDate ? new Date(item.dueDate) : undefined);
  };

  const saveDetail = () => {
    if (!detailItem) return;
    updateItem(detailItem.id, {
      notes: editNotes,
      dueDate: editDueDate ? format(editDueDate, 'yyyy-MM-dd') : detailItem.dueDate,
    });
    setDetailItem(null);
  };

  // Filter / sort buttons
  const filters: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'done', label: 'Done' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
  ];
  const sorts: { value: SortValue; label: string }[] = [
    { value: 'category', label: 'Category' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'status', label: 'Status' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pre-Launch Checklist</h2>
          <p className="text-sm text-muted-foreground">
            {doneCount} of {items.length} tasks complete ({pct}%)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 self-start">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Progress */}
      <Progress value={pct} className="h-2.5" />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}

        <span className="mx-1 h-4 w-px bg-border" />
        <SortAsc size={14} className="text-muted-foreground" />
        {sorts.map((s) => (
          <Button
            key={s.value}
            variant={sort === s.value ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setSort(s.value)}
          >
            {s.label}
          </Button>
        ))}

        <span className="mx-1 h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" onClick={toggleAll}>
          {expandedCats.size === CATEGORIES.length ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Categories */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {CATEGORIES.map((cat) => {
            const catItems = grouped.get(cat) || [];
            if (catItems.length === 0 && filter !== 'all') return null;
            const catDone = catItems.filter((i) => i.status === 'done').length;
            const isOpen = expandedCats.has(cat);

            return (
              <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCat(cat)}>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                    <span className="text-sm font-semibold text-foreground">{cat}</span>
                    <Badge variant="outline" className="text-[10px] ml-1">{catDone}/{catItems.length}</Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="divide-y divide-border/50">
                    {catItems.map((item) => {
                      const overdue = isOverdue(item.dueDate, item.status);
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 px-4 py-2.5 pl-10 hover:bg-accent/30 transition-colors group"
                        >
                          <Checkbox
                            checked={item.status === 'done'}
                            onCheckedChange={() => toggleStatus(item.id)}
                            className="mt-0.5"
                          />
                          <button
                            className="flex-1 text-left text-sm text-foreground group-hover:text-primary transition-colors truncate"
                            onClick={() => openDetail(item)}
                          >
                            <span className={cn(item.status === 'done' && 'line-through text-muted-foreground')}>
                              {item.task}
                            </span>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            {statusBadge(item.status)}
                            <span className={cn('text-[11px] tabular-nums', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                              {format(new Date(item.dueDate), 'dd MMM')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug">{detailItem?.task}</DialogTitle>
            <DialogDescription className="text-xs">
              {detailItem?.category} · Last updated {detailItem ? format(new Date(detailItem.updatedAt), 'dd MMM yyyy HH:mm') : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Status</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => {
                  if (!detailItem) return;
                  const ns = nextStatus(detailItem.status);
                  updateItem(detailItem.id, { status: ns });
                  setDetailItem({ ...detailItem, status: ns, updatedAt: new Date().toISOString() });
                }}
              >
                {detailItem && statusBadge(detailItem.status)}
                <span className="text-muted-foreground">→ click to change</span>
              </Button>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Due</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                    <CalendarIcon size={12} />
                    {editDueDate ? format(editDueDate, 'dd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDueDate}
                    onSelect={setEditDueDate}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Notes</span>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add implementation notes…"
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDetailItem(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveDetail}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreLaunchChecklist;
