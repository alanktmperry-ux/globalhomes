import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface PartyData {
  id: string;
  signer_name: string;
  signer_email: string;
  signed_at: string | null;
  signature_requests: {
    id: string;
    document_name: string;
    document_url: string | null;
    status: string;
  };
}

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState<PartyData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    supabase
      .from('signature_request_parties')
      .select('id, signer_name, signer_email, signed_at, signature_requests!inner(id, document_name, document_url, status)')
      .eq('signing_token', token)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setNotFound(true);
        } else {
          const d = data as unknown as PartyData;
          setParty(d);
          if (d.signed_at) {
            setSigned(true);
            setSignedAt(d.signed_at);
          }
        }
        setLoading(false);
      });
  }, [token]);

  const handleSign = async () => {
    if (!token || !signatureName.trim()) return;
    setSigning(true);
    try {
      const { data, error } = await supabase.rpc('sign_document', {
        p_token: token,
        p_signature_data: signatureName.trim(),
        p_ip_address: null,
      });
      if (error) throw error;
      const result = data as { error?: string; success?: boolean; signed_at?: string };
      if (result.error === 'already_signed') {
        setSigned(true);
        setSignedAt(result.signed_at || new Date().toISOString());
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        setSigned(true);
        setSignedAt(new Date().toISOString());
      }
    } catch {
      // Show inline error
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Helmet><title>Invalid Link | ListHQ</title></Helmet>
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle size={40} className="mx-auto text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">Invalid Signing Link</h1>
          <p className="text-sm text-muted-foreground">This signing link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Helmet><title>Document Signed | ListHQ</title></Helmet>
        <div className="max-w-md text-center space-y-3">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h1 className="text-xl font-bold text-foreground">
            Thank you{party?.signer_name ? `, ${party.signer_name}` : ''}.
          </h1>
          <p className="text-sm text-muted-foreground">
            Your signature has been recorded
            {signedAt && <> on {new Date(signedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(signedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</>}.
          </p>
        </div>
      </div>
    );
  }

  const doc = party?.signature_requests;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Helmet><title>Sign Document | ListHQ</title></Helmet>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">{doc?.document_name}</h1>
          <p className="text-sm text-muted-foreground">You have been asked to sign this document.</p>
        </div>

        {doc?.document_url && (
          <a
            href={doc.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline py-2"
          >
            <ExternalLink size={14} /> View Document
          </a>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            By signing below, you agree that your electronic signature is legally binding under the{' '}
            <em>Electronic Transactions Act 1999</em> (Cth).
          </p>

          <div>
            <Label>Type your full legal name to sign</Label>
            <Input
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder={party?.signer_name || 'Full legal name'}
              className="mt-1"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSign}
            disabled={!signatureName.trim() || signing}
          >
            {signing ? <><Loader2 size={14} className="animate-spin mr-2" /> Signing...</> : 'I Agree & Sign'}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Powered by ListHQ · Australian Electronic Signatures
        </p>
      </div>
    </div>
  );
}
