import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import DashboardHeader from './DashboardHeader';

interface Credential {
  id: string;
  document_type: string;
  document_url: string;
  verified_status: string;
  uploaded_at: string;
  verified_at: string | null;
}

const DocumentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Credential[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [docType, setDocType] = useState('license');

  useEffect(() => {
    if (user) loadDocs();
  }, [user]);

  const loadDocs = async () => {
    if (!user) return;
    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
    if (!agent) { setLoading(false); return; }
    setAgentId(agent.id);
    const { data } = await supabase.from('agent_credentials').select('*').eq('agent_id', agent.id).order('uploaded_at', { ascending: false });
    setDocs((data as unknown as Credential[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agentId || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File too large', variant: 'destructive' }); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('agent-documents').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('agent-documents').getPublicUrl(path);
      await supabase.from('agent_credentials').insert({ agent_id: agentId, document_type: docType, document_url: publicUrl });
      toast({ title: 'Document uploaded successfully' });
      loadDocs();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('agent_credentials').delete().eq('id', id);
    setDocs(prev => prev.filter(d => d.id !== id));
    toast({ title: 'Document removed' });
  };

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle2 size={14} className="text-success" />;
    if (s === 'rejected') return <AlertCircle size={14} className="text-destructive" />;
    return <Clock size={14} className="text-warning" />;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div>
      <DashboardHeader title="Document Vault" subtitle="Store and manage your professional documents" />
      <div className="p-4 sm:p-6 max-w-3xl space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold">Upload New Document</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={docType} onChange={e => setDocType(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="license">Real Estate License</option>
              <option value="insurance">Insurance Certificate</option>
              <option value="id">ID Verification</option>
              <option value="tax">Tax Document</option>
              <option value="contract">Contract Template</option>
              <option value="other">Other</option>
            </select>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 size={14} className="animate-spin mr-2" /> Uploading...</> : <><Upload size={14} className="mr-2" /> Upload</>}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold">Your Documents ({docs.length})</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium capitalize">{d.document_type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 text-[10px] capitalize">{statusIcon(d.verified_status)} {d.verified_status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(d.id)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
