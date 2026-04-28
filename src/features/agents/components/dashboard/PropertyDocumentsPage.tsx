import { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, Upload, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

const CATEGORIES = [
  'Lease Agreement',
  'Entry Condition Report',
  'Routine Inspection Report',
  'Exit Condition Report',
  'Bond Lodgement Receipt',
  'Rent Increase Notice',
  'Breach Notice',
  'Maintenance Invoice',
  'Other',
] as const;

type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<Category, string> = {
  'Lease Agreement': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'Entry Condition Report': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'Routine Inspection Report': 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  'Exit Condition Report': 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  'Bond Lodgement Receipt': 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  'Rent Increase Notice': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'Breach Notice': 'bg-red-500/15 text-red-700 border-red-500/30',
  'Maintenance Invoice': 'bg-slate-500/15 text-slate-700 border-slate-500/30',
  'Other': 'bg-muted text-muted-foreground',
};

interface PropertyRef {
  address?: string | null;
  suburb?: string | null;
}
interface TenancyOption {
  id: string;
  tenant_name: string | null;
  property_id: string | null;
  properties?: PropertyRef | null;
}

interface DocRow {
  id: string;
  agent_id: string;
  tenancy_id: string | null;
  property_id: string | null;
  category: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  uploaded_at: string;
  notes: string | null;
  tenancy?: { tenant_name: string | null; properties?: PropertyRef | null } | null;
  property?: PropertyRef | null;
}

const fmtSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

const PropertyDocumentsPage = () => {
  const { agent } = useCurrentAgent();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [tenancies, setTenancies] = useState<TenancyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uCategory, setUCategory] = useState<Category>('Lease Agreement');
  const [uTitle, setUTitle] = useState<string>('Lease Agreement');
  const [uTenancyId, setUTenancyId] = useState<string>('none');
  const [uFile, setUFile] = useState<File | null>(null);
  const [uNotes, setUNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Delete confirm
  const [toDelete, setToDelete] = useState<DocRow | null>(null);

  const loadData = async () => {
    if (!agent?.id) return;
    setLoading(true);
    const [docsRes, tenRes] = await Promise.all([
      supabase
        .from('pm_documents' as any)
        .select(`
          *,
          tenancy:tenancy_id ( tenant_name, properties:property_id ( address, suburb ) ),
          property:property_id ( address, suburb )
        `)
        .eq('agent_id', agent.id)
        .order('uploaded_at', { ascending: false }),
      supabase
        .from('tenancies')
        .select('id, tenant_name, property_id, properties:property_id ( address, suburb )')
        .eq('agent_id', agent.id)
        .eq('status', 'active'),
    ]);
    if (docsRes.error) console.error(docsRes.error);
    if (tenRes.error) console.error(tenRes.error);
    setDocs(((docsRes.data as any) || []) as DocRow[]);
    setTenancies(((tenRes.data as any) || []) as TenancyOption[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [agent?.id]);

  const propertyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    docs.forEach(d => {
      const addr = d.property?.address || d.tenancy?.properties?.address;
      const id = d.property_id || (d.tenancy_id || '');
      if (addr && id && !seen.has(id)) seen.set(id, addr);
    });
    return Array.from(seen.entries());
  }, [docs]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(d => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (propertyFilter !== 'all') {
        const id = d.property_id || d.tenancy_id;
        if (id !== propertyFilter) return false;
      }
      if (q) {
        const hay = `${d.title} ${d.tenancy?.tenant_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [docs, search, categoryFilter, propertyFilter]);

  const openUpload = () => {
    setUCategory('Lease Agreement');
    setUTitle('Lease Agreement');
    setUTenancyId('none');
    setUFile(null);
    setUNotes('');
    setUploadOpen(true);
  };

  const submitUpload = async () => {
    if (!agent?.id) return;
    if (!uFile) {
      toast.error('Please choose a file');
      return;
    }
    if (uFile.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setUploading(true);
    try {
      const tenancy = tenancies.find(t => t.id === uTenancyId);
      const propId = tenancy?.property_id || null;
      const folder = propId || 'general';
      const safeName = uFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${agent.id}/${folder}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('property-docs')
        .upload(path, uFile, { contentType: uFile.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('pm_documents' as any).insert({
        agent_id: agent.id,
        tenancy_id: uTenancyId === 'none' ? null : uTenancyId,
        property_id: propId,
        category: uCategory,
        title: uTitle.trim() || uCategory,
        file_name: uFile.name,
        file_path: path,
        file_size_bytes: uFile.size,
        notes: uNotes.trim() || null,
      });
      if (insErr) {
        // best-effort cleanup if DB insert fails
        await supabase.storage.from('property-docs').remove([path]);
        throw insErr;
      }
      toast.success('Document uploaded');
      setUploadOpen(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (d: DocRow) => {
    const { data, error } = await supabase.storage
      .from('property-docs')
      .createSignedUrl(d.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Could not generate download link');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const d = toDelete;
    setToDelete(null);
    const { error: stErr } = await supabase.storage.from('property-docs').remove([d.file_path]);
    if (stErr) console.warn('Storage delete warning', stErr);
    const { error: dbErr } = await supabase.from('pm_documents' as any).delete().eq('id', d.id);
    if (dbErr) {
      toast.error('Could not delete record');
      return;
    }
    toast.success('Document deleted');
    loadData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardHeader
        title="Documents"
        subtitle="Lease agreements, inspection reports, notices and more"
      />

      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or tenant…"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="All Properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {propertyOptions.map(([id, addr]) => (
              <SelectItem key={id} value={id}>{addr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openUpload} className="gap-1">
          <Upload size={14} /> Upload Document
        </Button>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Upload size={32} className="mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground">No documents yet.</div>
          <Button onClick={openUpload}>Upload your first document</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDocs.map(d => {
            const cat = (CATEGORIES as readonly string[]).includes(d.category)
              ? (d.category as Category) : 'Other';
            const addr = d.property?.address || d.tenancy?.properties?.address || null;
            return (
              <Card key={d.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className={CATEGORY_COLORS[cat]}>{d.category}</Badge>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => downloadDoc(d)} title="Download">
                      <Download size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(d)} title="Delete">
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </div>
                </div>
                <div className="font-semibold leading-tight flex items-start gap-2">
                  <FileText size={14} className="mt-1 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{d.title}</span>
                </div>
                {(d.tenancy?.tenant_name || addr) && (
                  <div className="text-xs text-muted-foreground">
                    {d.tenancy?.tenant_name && <span>{d.tenancy.tenant_name}</span>}
                    {d.tenancy?.tenant_name && addr && <span> · </span>}
                    {addr && <span>{addr}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t">
                  <span>{fmtSize(d.file_size_bytes)}</span>
                  <span>{fmtDate(d.uploaded_at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={uCategory}
                onValueChange={(v) => {
                  setUCategory(v as Category);
                  setUTitle(v);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={uTitle} onChange={(e) => setUTitle(e.target.value)} maxLength={150} />
            </div>
            <div>
              <label className="text-sm font-medium">Property / Tenancy</label>
              <Select value={uTenancyId} onValueChange={setUTenancyId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tenancy — general document</SelectItem>
                  {tenancies.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {(t.tenant_name || 'Tenant')} — {t.properties?.address || 'Property'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setUFile(e.target.files?.[0] || null)}
              />
              <div className="text-xs text-muted-foreground mt-1">PDF, Word, or image · max 10MB</div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea value={uNotes} onChange={(e) => setUNotes(e.target.value)} rows={2} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={submitUpload} disabled={uploading || !uFile}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{toDelete?.title}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PropertyDocumentsPage;
