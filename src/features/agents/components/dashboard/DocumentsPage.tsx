import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Upload, Trash2, Loader2, CheckCircle2, Clock, AlertCircle, PenLine, Plus, X, Copy, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import DashboardHeader from './DashboardHeader';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Credential {
  id: string;
  document_type: string;
  document_url: string;
  verified_status: string;
  uploaded_at: string;
  verified_at: string | null;
}

interface SignatureRequest {
  id: string;
  document_name: string;
  document_url: string | null;
  status: string;
  created_at: string;
  parties: { id: string; signer_name: string; signer_email: string; signed_at: string | null; signing_token: string; order_index: number }[];
}

interface Signatory {
  name: string;
  email: string;
}

const DocumentsPage = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Credential[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [docType, setDocType] = useState('license');

  // Signature state
  const [sigRequests, setSigRequests] = useState<SignatureRequest[]>([]);
  const [sigLoading, setSigLoading] = useState(true);
  const [showNewSig, setShowNewSig] = useState(false);
  const [sending, setSending] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [signatories, setSignatories] = useState<Signatory[]>([{ name: '', email: '' }]);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);

  useEffect(() => {
    if (user) loadDocs();
  }, [user]);

  const loadDocs = async () => {
    if (!user) return;
    const { data: agent } = await supabase.from('agents').select('id, name').eq('user_id', user.id).maybeSingle();
    if (!agent) { setLoading(false); setSigLoading(false); return; }
    setAgentId(agent.id);
    setAgentName(agent.name || '');
    const { data } = await supabase.from('agent_credentials').select('*').eq('agent_id', agent.id).order('uploaded_at', { ascending: false });
    setDocs((data as unknown as Credential[]) || []);
    setLoading(false);
    loadSigRequests(agent.id);
  };

  const loadSigRequests = async (aid: string) => {
    setSigLoading(true);
    const { data: reqs } = await supabase
      .from('signature_requests')
      .select('id, document_name, document_url, status, created_at')
      .eq('agent_id', aid)
      .order('created_at', { ascending: false });

    if (!reqs || reqs.length === 0) { setSigRequests([]); setSigLoading(false); return; }

    const reqIds = reqs.map(r => r.id);
    const { data: parties } = await supabase
      .from('signature_request_parties')
      .select('id, request_id, signer_name, signer_email, signed_at, signing_token, order_index')
      .in('request_id', reqIds)
      .order('order_index', { ascending: true });

    const mapped: SignatureRequest[] = reqs.map(r => ({
      ...r,
      parties: (parties || []).filter(p => p.request_id === r.id),
    }));
    setSigRequests(mapped);
    setSigLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agentId || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('agent-documents').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('agent-documents').getPublicUrl(path);
      await supabase.from('agent_credentials').insert({ agent_id: agentId, document_type: docType, document_url: publicUrl });
      toast.success('Document uploaded successfully');
      loadDocs();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('agent_credentials').delete().eq('id', id);
    setDocs(prev => prev.filter(d => d.id !== id));
    toast.success('Document removed');
  };

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle2 size={14} className="text-emerald-600" />;
    if (s === 'rejected') return <AlertCircle size={14} className="text-destructive" />;
    return <Clock size={14} className="text-amber-600" />;
  };

  // Signature request handlers
  const addSignatory = () => {
    if (signatories.length >= 5) return;
    setSignatories(prev => [...prev, { name: '', email: '' }]);
  };

  const removeSignatory = (idx: number) => {
    setSignatories(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSignatory = (idx: number, field: 'name' | 'email', value: string) => {
    setSignatories(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const resetNewSigForm = () => {
    setNewDocName('');
    setNewDocUrl('');
    setSignatories([{ name: '', email: '' }]);
    setShowNewSig(false);
  };

  const handleSendForSignatures = async () => {
    if (!agentId || !newDocName.trim()) return;
    const validSignatories = signatories.filter(s => s.name.trim() && s.email.trim());
    if (validSignatories.length === 0) { toast.error('Add at least one signatory'); return; }

    setSending(true);
    try {
      const { data: req, error: reqErr } = await supabase
        .from('signature_requests')
        .insert({ agent_id: agentId, document_name: newDocName.trim(), document_url: newDocUrl.trim() || null, status: 'pending' })
        .select('id')
        .single();
      if (reqErr || !req) throw reqErr || new Error('Failed to create request');

      const partyRows = validSignatories.map((s, i) => ({
        request_id: req.id,
        signer_name: s.name.trim(),
        signer_email: s.email.trim(),
        order_index: i,
      }));
      const { data: parties, error: partiesErr } = await supabase
        .from('signature_request_parties')
        .insert(partyRows)
        .select('signing_token, signer_name, signer_email');
      if (partiesErr) throw partiesErr;

      // Send email notifications
      for (const p of parties || []) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            agent_id: agentId,
            type: 'signature_request',
            recipient_email: p.signer_email,
            lead_name: p.signer_name,
            title: `Signature required: ${newDocName.trim()}`,
            message: `Hi ${p.signer_name}, ${agentName} has requested your signature on "${newDocName.trim()}". Please click the link below to review and sign: https://listhq.com.au/sign/${p.signing_token}`,
          },
        });
      }

      toast.success('Signature requests sent');
      resetNewSigForm();
      loadSigRequests(agentId);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleCancelRequest = async (reqId: string) => {
    await supabase.from('signature_requests').update({ status: 'cancelled' }).eq('id', reqId);
    if (agentId) loadSigRequests(agentId);
    setSelectedRequest(null);
    toast.success('Signature request cancelled');
  };

  const copySigningLink = (token: string) => {
    navigator.clipboard.writeText(`https://listhq.com.au/sign/${token}`);
    toast.success('Signing link copied');
  };

  const sigStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      draft: { label: 'Draft', cls: 'bg-blue-500/15 text-blue-700 border-0' },
      pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-700 border-0' },
      completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-700 border-0' },
      cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground border-0' },
    };
    const m = map[status] || map.draft;
    return <Badge variant="secondary" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div>
      <DashboardHeader title="Document Vault" subtitle="Store and manage your professional documents" />
      <div className="p-4 sm:p-6 max-w-3xl space-y-6">
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents" className="gap-1.5"><FileText size={14} /> Documents</TabsTrigger>
            <TabsTrigger value="signatures" className="gap-1.5"><PenLine size={14} /> Signatures</TabsTrigger>
          </TabsList>

          {/* ─── Documents Tab ─── */}
          <TabsContent value="documents" className="space-y-6 mt-4">
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
          </TabsContent>

          {/* ─── Signatures Tab ─── */}
          <TabsContent value="signatures" className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Signature Requests</h3>
              <Button size="sm" onClick={() => setShowNewSig(true)}>
                <Plus size={14} className="mr-1.5" /> New Request
              </Button>
            </div>

            {sigLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={20} /></div>
            ) : sigRequests.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <PenLine size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No signature requests yet. Send your first document for signing.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sigRequests.map(req => {
                  const signed = req.parties.filter(p => p.signed_at).length;
                  return (
                    <button
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="w-full text-left flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <PenLine size={18} className="text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{req.document_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {signed}/{req.parties.length} signed
                          </p>
                        </div>
                      </div>
                      {sigStatusBadge(req.status)}
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── New Signature Request Modal ─── */}
      <Dialog open={showNewSig} onOpenChange={(o) => { if (!o) resetNewSigForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Signature Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Name *</Label>
              <Input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Agency Agreement" />
            </div>
            <div>
              <Label>Link to document (Google Drive, Dropbox, etc.)</Label>
              <Input value={newDocUrl} onChange={e => setNewDocUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-3">
              <Label>Signatories</Label>
              {signatories.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Full name" value={s.name} onChange={e => updateSignatory(i, 'name', e.target.value)} className="flex-1" />
                  <Input placeholder="Email" type="email" value={s.email} onChange={e => updateSignatory(i, 'email', e.target.value)} className="flex-1" />
                  {signatories.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeSignatory(i)}>
                      <X size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSignatory} disabled={signatories.length >= 5}>
                <Plus size={14} className="mr-1" /> Add Another Signatory
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetNewSigForm}>Cancel</Button>
            <Button onClick={handleSendForSignatures} disabled={sending || !newDocName.trim()}>
              {sending ? <><Loader2 size={14} className="animate-spin mr-2" /> Sending...</> : 'Send for Signatures'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Request Detail Modal ─── */}
      <Dialog open={!!selectedRequest} onOpenChange={(o) => { if (!o) setSelectedRequest(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest?.document_name}
              {selectedRequest && sigStatusBadge(selectedRequest.status)}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {selectedRequest.document_url && (
                <a href={selectedRequest.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  View Document ↗
                </a>
              )}
              <div className="space-y-2">
                {selectedRequest.parties.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.signer_name}</p>
                      <p className="text-xs text-muted-foreground">{p.signer_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.signed_at ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 border-0 gap-1">
                          <CheckCircle2 size={10} /> Signed {new Date(p.signed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 border-0">Awaiting</Badge>
                      )}
                      {!p.signed_at && selectedRequest.status === 'pending' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copySigningLink(p.signing_token)} title="Copy signing link">
                          <Copy size={12} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedRequest.status === 'pending' && (
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => handleCancelRequest(selectedRequest.id)}>
                  <Ban size={14} className="mr-1.5" /> Cancel Request
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
