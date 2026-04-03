import { useState } from 'react';
import { Copy, Send, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useVendorToken } from '../hooks/useVendorToken';

interface Props {
  propertyId: string;
  agentId: string;
}

export function VendorSharePanel({ propertyId, agentId }: Props) {
  const { token, creating, createToken, sendVendorEmail } = useVendorToken(propertyId, agentId);
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');

  const reportUrl = token ? `${window.location.origin}/vendor-report/${token.token}` : '';

  const handleGenerate = async () => {
    const result = await createToken(vendorName || undefined, vendorEmail || undefined);
    if (result) toast.success('Vendor report link generated');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportUrl);
    toast.success('Link copied!');
  };

  const handleSendEmail = async () => {
    if (!vendorEmail) { toast.error('Enter vendor email'); return; }
    if (!token) return;
    await sendVendorEmail(token.token, vendorEmail);
    toast.success('Report link sent to vendor');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <LinkIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Share with your vendor</h3>
      </div>

      {!token ? (
        <div className="space-y-3">
          <Input placeholder="Vendor name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          <Input placeholder="Vendor email" type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} />
          <Button onClick={handleGenerate} disabled={creating} className="w-full">
            {creating ? 'Generating…' : 'Generate report link'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={reportUrl} readOnly className="text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Link valid for 90 days (expires {new Date(token.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })})
          </p>
          {vendorEmail && (
            <Button variant="outline" onClick={handleSendEmail} className="w-full">
              <Send className="h-4 w-4 mr-2" /> Send via email
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
