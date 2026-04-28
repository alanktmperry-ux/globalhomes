import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Copy, Mail, Loader2, Save, KeyRound, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Props {
  propertyId: string;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default function OwnerPortalCard({ propertyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [form, setForm] = useState({
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_portal_token: '',
    owner_portal_token_expires_at: '' as string | null | '',
    maintenance_approval_threshold_aud: 500,
  });

  const load = async () => {
    const { data } = await supabase
      .from('properties')
      .select('owner_name, owner_email, owner_phone, owner_portal_token, owner_portal_token_expires_at, maintenance_approval_threshold_aud')
      .eq('id', propertyId)
      .maybeSingle();
    if (data) {
      setForm({
        owner_name: (data as any).owner_name || '',
        owner_email: (data as any).owner_email || '',
        owner_phone: (data as any).owner_phone || '',
        owner_portal_token: (data as any).owner_portal_token || '',
        owner_portal_token_expires_at: (data as any).owner_portal_token_expires_at || null,
        maintenance_approval_threshold_aud: Number((data as any).maintenance_approval_threshold_aud || 500),
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [propertyId]);

  const portalUrl = form.owner_portal_token
    ? `${window.location.origin}/owner/portal?token=${form.owner_portal_token}`
    : '';

  const expiresAt = form.owner_portal_token_expires_at
    ? parseISO(form.owner_portal_token_expires_at as string)
    : null;
  const now = new Date();
  const isExpired = !!(expiresAt && expiresAt < now);
  const daysUntilExpiry = expiresAt ? differenceInDays(expiresAt, now) : null;
  const expiringSoon = !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 30;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
        owner_name: form.owner_name || null,
        owner_email: form.owner_email || null,
        owner_phone: form.owner_phone || null,
        maintenance_approval_threshold_aud: form.maintenance_approval_threshold_aud,
      })
      .eq('id', propertyId);
    setSaving(false);
    if (error) { toast.error('Could not save'); return; }
    toast.success('Owner details saved');
  };

  const generate = async (regenerate = false) => {
    setGenerating(true);
    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + ONE_YEAR_MS).toISOString();
    const { error } = await supabase
      .from('properties')
      .update({
        owner_portal_token: token,
        owner_portal_token_expires_at: expiry,
      } as any)
      .eq('id', propertyId);
    setGenerating(false);
    if (error) { toast.error('Could not generate link'); return; }
    toast.success(regenerate ? 'Link regenerated' : 'Portal link generated');
    setConfirmRegen(false);
    load();
  };

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Link copied');
  };

  const emailOwner = async () => {
    if (!form.owner_email) { toast.error('Add an owner email first'); return; }
    setEmailing(true);
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: form.owner_email,
          subject: 'Your ListHQ Owner Portal',
          html: `<p>Hi ${form.owner_name || 'there'},</p><p>You can view your investment property's performance, statements, maintenance updates and approve quotes anytime via your personal owner portal:</p><p><a href="${portalUrl}">${portalUrl}</a></p><p>No login required — keep this link private.</p>`,
        },
      });
      toast.success('Portal link emailed to owner');
    } catch {
      toast.error('Could not send email');
    }
    setEmailing(false);
  };

  if (loading) {
    return <Card><CardContent className="p-6"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></CardContent></Card>;
  }

  const hasToken = !!form.owner_portal_token;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Owner & portal access</h3>
          <p className="text-xs text-muted-foreground">Owner self-service link and approval threshold.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Owner name</Label>
            <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Owner email</Label>
            <Input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Owner phone</Label>
            <Input value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Maintenance approval threshold (AUD)</Label>
            <Input
              type="number"
              value={form.maintenance_approval_threshold_aud}
              onChange={(e) => setForm({ ...form, maintenance_approval_threshold_aud: Number(e.target.value) })}
            />
            <p className="text-[10px] text-muted-foreground">Quotes above this need owner approval.</p>
          </div>
        </div>

        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>

        {/* Owner Portal Access section */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-primary" />
            <h4 className="font-semibold text-sm">Owner Portal Access</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with the property owner for read-only access to statements, maintenance updates, and inspection reports.
          </p>

          {!hasToken && (
            <Button size="sm" onClick={() => generate(false)} disabled={generating}>
              {generating ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <KeyRound size={12} className="mr-1.5" />}
              Generate Portal Link
            </Button>
          )}

          {hasToken && isExpired && (
            <div className="space-y-2">
              <Badge className="bg-red-500/15 text-red-700 border-0 text-[10px]">
                <AlertTriangle size={10} className="mr-1" /> Link expired
              </Badge>
              <div>
                <Button size="sm" onClick={() => generate(true)} disabled={generating}>
                  {generating ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <RefreshCw size={12} className="mr-1.5" />}
                  Regenerate Link
                </Button>
              </div>
            </div>
          )}

          {hasToken && !isExpired && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Input readOnly value={portalUrl} className="text-xs flex-1 min-w-[240px]" />
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <Copy size={12} className="mr-1" /> Copy Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmRegen(true)} disabled={generating}>
                  <RefreshCw size={12} className="mr-1" /> Regenerate
                </Button>
                <Button size="sm" variant="outline" onClick={emailOwner} disabled={emailing}>
                  {emailing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Mail size={12} className="mr-1" />}
                  Email
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {expiresAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Expires: {format(expiresAt, 'd MMM yyyy')}
                  </span>
                )}
                {expiringSoon && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px]">
                    Expires soon — consider regenerating
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate portal link?</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating the link will invalidate the current link. The owner will need the new link to access their portal. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => generate(true)}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
