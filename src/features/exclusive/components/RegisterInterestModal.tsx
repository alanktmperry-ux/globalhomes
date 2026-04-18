import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  agentId?: string | null;
  propertyAddress?: string;
}

export function RegisterInterestModal({ open, onOpenChange, propertyId, agentId, propertyAddress }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('leads').insert({
      property_id: propertyId,
      agent_id: agentId ?? null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      message: message.trim() || `Exclusive lead — ${propertyAddress ?? ''}`.trim(),
      source: 'exclusive_member',
    } as any);

    if (!error) {
      try {
        // Best-effort increment; will silently no-op if not allowed
        await supabase.rpc('increment_contact_clicks', { property_id: propertyId } as any);
      } catch {}
      // Increment exclusive_enquiries directly
      try {
        const { data: prop } = await supabase
          .from('properties')
          .select('exclusive_enquiries')
          .eq('id', propertyId)
          .maybeSingle();
        const current = (prop as any)?.exclusive_enquiries ?? 0;
        await supabase
          .from('properties')
          .update({ exclusive_enquiries: current + 1 } as any)
          .eq('id', propertyId);
      } catch {}
    }

    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error('Could not send enquiry — please try again');
      return;
    }
    toast.success('Interest registered — the agent will be in touch shortly.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register interest</DialogTitle>
          <DialogDescription>
            The agent will reach out with the full address and inspection details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="ri-name">Name *</Label>
            <Input id="ri-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ri-email">Email *</Label>
            <Input id="ri-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ri-phone">Phone</Label>
            <Input id="ri-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ri-msg">Message</Label>
            <Textarea id="ri-msg" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="When would you like to view it?" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
            Send enquiry
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RegisterInterestModal;
