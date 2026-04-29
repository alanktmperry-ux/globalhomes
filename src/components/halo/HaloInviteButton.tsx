import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  contactName: string;
  contactEmail: string | null;
}

export function HaloInviteButton({ contactName, contactEmail }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!contactEmail || !user) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('send-halo-crm-invite', {
        body: { contact_email: contactEmail, contact_name: contactName, agent_id: user.id },
      });
      if (error) throw error;
      // Pre-create referral row (credit_granted false)
      // Halo doesn't exist yet so we skip the row insert here — the source_agent_id
      // on the Halo (set when the contact submits) drives credit on first unlock.
      toast.success(`Invite sent to ${contactName}`);
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Could not send invite. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!contactEmail) return null;

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles size={14} /> Invite to post a Halo
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Halo invite?</DialogTitle>
            <DialogDescription>
              Send {contactName} an invitation to post a Halo on ListHQ?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Email preview:</p>
            <p className="text-muted-foreground">
              Hi {contactName}, your agent thought you might be interested in ListHQ's Halo feature.
              Post a free Halo — tell agents exactly what property you're looking for, and let them
              come to you. You'll be notified when agents respond.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleSend} disabled={busy}>{busy ? 'Sending…' : 'Send Invite'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HaloInviteButton;
