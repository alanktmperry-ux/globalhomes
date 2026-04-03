import { useState } from 'react';
import { Copy, Send, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCmaReports } from '../hooks/useCmaReport';
import type { CmaReport } from '@/types/market';

interface Props {
  report: CmaReport;
  onUpdate: (r: CmaReport) => void;
}

export function CmaSharePanel({ report, onUpdate }: Props) {
  const { shareReport, updateReport } = useCmaReports();
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState(report.prepared_for_email ?? '');

  const shareUrl = `${window.location.origin}/cma/${report.share_token}`;

  const handleToggleSharing = async (enabled: boolean) => {
    const { data } = await updateReport(report.id, { is_shared: enabled } as any);
    if (data) onUpdate(data);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const handleSendEmail = async () => {
    if (!email) return;
    setSending(true);
    if (!report.is_shared) {
      await shareReport(report.id, email);
    }
    await supabase.functions.invoke('send-cma-email', {
      body: { cma_id: report.id, recipient_email: email },
    });
    toast.success('CMA report emailed!');
    setSending(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Share with Vendor</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sharing {report.is_shared ? 'enabled' : 'disabled'}</span>
          <Switch checked={report.is_shared} onCheckedChange={handleToggleSharing} />
        </div>
      </div>

      {report.is_shared && (
        <>
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="text-xs font-mono" />
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
              <Copy size={12} /> Copy
            </Button>
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> Preview</a>
            </Button>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">Send via email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendor@example.com" />
            </div>
            <Button size="sm" onClick={handleSendEmail} disabled={!email || sending} className="gap-1.5">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Viewed {report.view_count} time{report.view_count !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
