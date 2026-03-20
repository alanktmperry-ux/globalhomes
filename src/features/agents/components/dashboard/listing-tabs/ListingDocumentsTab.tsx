import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Trash2, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AU_DATE = (d: string) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const CATEGORIES = [
  { value: 'contract', label: 'Contract of Sale' },
  { value: 'authority', label: 'Agency Authority' },
  { value: 'marketing', label: 'Marketing Material' },
  { value: 'vendor_statement', label: 'Vendor Statement (S32)' },
  { value: 'building_report', label: 'Building Report' },
  { value: 'pest_report', label: 'Pest Report' },
  { value: 'strata', label: 'Strata Report' },
  { value: 'general', label: 'General' },
];

const ESIGN_STATUS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  none: { icon: null, color: '', label: '' },
  pending: { icon: <Clock size={12} />, color: 'bg-yellow-500/15 text-yellow-600', label: 'Pending' },
  sent: { icon: <Send size={12} />, color: 'bg-primary/15 text-primary', label: 'Sent' },
  signed: { icon: <CheckCircle2 size={12} />, color: 'bg-success/15 text-success', label: 'Signed' },
  declined: { icon: <XCircle size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Declined' },
};

interface Props {
  listing: any;
}

const ListingDocumentsTab = ({ listing }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('general');

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listing_documents')
      .select('*')
      .eq('property_id', listing.id)
      .order('created_at', { ascending: false }) as any;
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [listing.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const filePath = `${user.id}/${listing.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-documents')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('listing-documents')
      .getPublicUrl(filePath);

    await supabase.from('listing_documents').insert({
      property_id: listing.id,
      uploaded_by: user.id,
      category: uploadCategory,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
    } as any);

    toast.success('Document uploaded');
    setUploading(false);
    fetchDocs();
  };

  const handleDelete = async (doc: any) => {
    await supabase.from('listing_documents').delete().eq('id', doc.id);
    toast.success('Document deleted');
    fetchDocs();
  };

  const handleEsign = async (doc: any) => {
    // Placeholder — would integrate with DocuSign API
    await supabase.from('listing_documents').update({
      esign_status: 'sent',
      esign_sent_at: new Date().toISOString(),
    } as any).eq('id', doc.id);
    toast.success('E-signature request sent — DocuSign integration placeholder — connect API for full functionality.');
    fetchDocs();
  };

  return (
    <div className="space-y-4">
      {/* Upload bar */}
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl p-4">
        <Select value={uploadCategory} onValueChange={setUploadCategory}>
          <SelectTrigger className="h-9 w-48 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5 text-xs">
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
      </div>

      {/* Documents list */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading documents...</p>
      ) : docs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-3">Document</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">E-Signature</th>
                <th className="text-left p-3">Uploaded</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const esign = ESIGN_STATUS[doc.esign_status] || ESIGN_STATUS.none;
                const cat = CATEGORIES.find(c => c.value === doc.category);
                return (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="p-3">
                      <a href={doc.file_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-primary hover:underline">
                        <FileText size={14} /> {doc.file_name}
                      </a>
                      {doc.file_size && <p className="text-[10px] text-muted-foreground">{(doc.file_size / 1024).toFixed(0)} KB</p>}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">{cat?.label || doc.category}</Badge>
                    </td>
                    <td className="p-3">
                      {esign.icon ? (
                        <Badge className={`${esign.color} text-[10px] gap-0.5 border-0`}>{esign.icon} {esign.label}</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{AU_DATE(doc.created_at)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.esign_status === 'none' && (
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5" onClick={() => handleEsign(doc)}>
                            <Send size={10} /> Request Signature
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 size={10} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DocuSign placeholder notice */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground">
        <p className="font-semibold mb-1">📝 E-Signature Integration</p>
        <p>The "Request Signature" button is a placeholder for DocuSign API integration. Connect your DocuSign account to enable real e-signature workflows.</p>
      </div>
    </div>
  );
};

export default ListingDocumentsTab;
