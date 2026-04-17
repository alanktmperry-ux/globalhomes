import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Mail, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  propertyId: string;
}

export default function OwnerPortalCard({ propertyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [form, setForm] = useState({
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_portal_token: '',
    maintenance_approval_threshold_aud: 500,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('properties')
        .select('owner_name, owner_email, owner_phone, owner_portal_token, maintenance_approval_threshold_aud')
        .eq('id', propertyId)
        .maybeSingle();
      if (data) {
        setForm({
          owner_name: (data as any).owner_name || '',
          owner_email: (data as any).owner_email || '',
          owner_phone: (data as any).owner_phone || '',
          owner_portal_token: (data as any).owner_portal_token || '',
          maintenance_approval_threshold_aud: Number((data as any).maintenance_approval_threshold_aud || 500),
        });
      }
      setLoading(false);
    })();
  }, [propertyId]);

  const portalUrl = form.owner_portal_token
    ? `${window.location.origin}/owner/portal?token=${form.owner_portal_token}`
    : '';

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

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied');
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

        {portalUrl && (
          <div className="pt-3 border-t space-y-2">
            <Label className="text-xs">Owner portal link</Label>
            <div className="flex gap-2">
              <Input readOnly value={portalUrl} className="text-xs" />
              <Button size="sm" variant="outline" onClick={copyLink}><Copy size={12} className="mr-1" />Copy</Button>
              <Button size="sm" variant="outline" onClick={emailOwner} disabled={emailing}>
                {emailing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Mail size={12} className="mr-1" />}Email
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
