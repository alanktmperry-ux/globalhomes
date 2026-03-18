import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RequestDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RequestDemoModal = ({ open, onOpenChange }: RequestDemoModalProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-demo-request', {
        body: {
          action: 'submit',
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          agency_name: agencyName.trim() || null,
          message: message.trim() || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Thanks! We'll review your request and be in touch within 24 hours with your demo access.");
      onOpenChange(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setAgencyName('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Demo</DialogTitle>
          <DialogDescription>
            Tell us a bit about yourself and we'll set up a personalised demo for you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Full Name<span className="text-destructive">*</span>
            </label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Email<span className="text-destructive">*</span>
            </label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@agency.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+61 4XX XXX XXX" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Agency Name</label>
            <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Your agency or company" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Tell us about your business (optional)</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What are you looking for in a platform?" rows={3} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : 'Submit Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDemoModal;
