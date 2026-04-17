import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Copy, Mail, ExternalLink, Upload, Trash2, Loader2, FileText, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

interface Props {
  tenancyId: string;
  tenantName: string;
  tenantEmail: string | null;
  portalToken: string | null;
  agentId: string;
}

const DOC_TYPES = [
  { value: 'lease', label: 'Lease' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'entry_notice', label: 'Entry Notice' },
  { value: 'rent_receipt', label: 'Rent Receipt' },
  { value: 'other', label: 'Other' },
];

interface TenantDoc {
  id: string;
  document_type: string;
  label: string | null;
  file_url: string;
  uploaded_at: string;
  visible_to_tenant: boolean;
}

export default function TenantPortalCard({ tenancyId, tenantName, tenantEmail, portalToken, agentId }: Props) {
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [docType, setDocType] = useState('lease');
  const [docLabel, setDocLabel] = useState('');

  const portalUrl = portalToken ? `${window.location.origin}/tenant/portal?token=${portalToken}` : '';

  const loadDocs = useCallback(async () => {
    const { data } = await supabase
      .from('tenant_documents' as any)
      .select('*')
      .eq('tenancy_id', tenancyId)
      .order('uploaded_at', { ascending: false });
    if (data) setDocs(data as unknown as TenantDoc[]);
  }, [tenancyId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied');
  };

  const emailLink = async () => {
    if (!tenantEmail) { toast.error('Add a tenant email first'); return; }
    if (!portalUrl) { toast.error('No portal link available'); return; }
    setEmailing(true);
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        agent_id: agentId,
        type: 'tenant_portal',
        title: 'Your ListHQ Tenant Portal is ready',
        message: `Hi ${tenantName || 'there'}, you can access your tenancy details, submit maintenance requests, and view your documents at any time using your personal portal link: ${portalUrl} — no login required.`,
        recipient_email: tenantEmail,
        lead_name: tenantName || 'Tenant',
      },
    });
    setEmailing(false);
    if (error) { toast.error('Could not send email'); return; }
    toast.success(`Portal link emailed to ${tenantEmail}`);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${tenancyId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('tenant-documents').upload(path, file);
    if (upErr) { setUploading(false); toast.error('Upload failed'); return; }
    const { data: urlData } = supabase.storage.from('tenant-documents').getPublicUrl(path);
    const { error: insErr } = await supabase.from('tenant_documents' as any).insert({
      tenancy_id: tenancyId,
      document_type: docType,
      label: docLabel || file.name,
      file_url: urlData.publicUrl,
      visible_to_tenant: true,
    } as any);
    setUploading(false);
    if (insErr) { toast.error('Could not save document'); return; }
    toast.success('Document uploaded');
    setDocLabel('');
    e.target.value = '';
    loadDocs();
  };

  const toggleVisible = async (id: string, current: boolean) => {
    await supabase.from('tenant_documents' as any).update({ visible_to_tenant: !current } as any).eq('id', id);
    loadDocs();
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await supabase.from('tenant_documents' as any).delete().eq('id', id);
    toast.success('Document deleted');
    loadDocs();
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-1">Tenant Portal</h3>
          <p className="text-xs text-muted-foreground mb-3">
            A self-service link the tenant can use anytime — no login required.
          </p>
          {portalUrl ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <code className="text-xs flex-1 truncate">{portalUrl}</code>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><ExternalLink size={13} /></Button>
                </a>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyLink} className="flex-1">
                  <Copy size={13} className="mr-1.5" /> Copy link
                </Button>
                <Button size="sm" onClick={emailLink} disabled={emailing || !tenantEmail} className="flex-1">
                  {emailing ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Mail size={13} className="mr-1.5" />}
                  Email to tenant
                </Button>
              </div>
              {!tenantEmail && (
                <p className="text-[11px] text-muted-foreground">Add a tenant email in Edit to enable sending.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Portal link will be generated when tenancy is saved.</p>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Tenant Documents</h3>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Label (optional)"
              value={docLabel}
              onChange={e => setDocLabel(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <Label className="block">
            <span className="sr-only">Upload</span>
            <div className={`border-2 border-dashed rounded-lg px-3 py-3 text-center cursor-pointer transition-colors ${uploading ? 'opacity-50' : 'hover:border-primary hover:bg-primary/5'}`}>
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Uploading...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Upload size={14} /> Click to upload a document
                </div>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
            />
          </Label>

          <div className="mt-3 space-y-2">
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No documents shared yet</p>
            ) : docs.map(d => (
              <div key={d.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <FileText size={14} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{d.label || d.document_type}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(parseISO(d.uploaded_at), 'dd MMM yyyy')}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[9px] hidden sm:inline-flex">
                  {DOC_TYPES.find(t => t.value === d.document_type)?.label || d.document_type}
                </Badge>
                <button
                  onClick={() => toggleVisible(d.id, d.visible_to_tenant)}
                  title={d.visible_to_tenant ? 'Visible to tenant' : 'Hidden from tenant'}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {d.visible_to_tenant ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => deleteDoc(d.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
