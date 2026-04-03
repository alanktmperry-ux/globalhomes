import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentCategories } from '../hooks/useDocumentCategories';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  propertyId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function DocumentRequestModal({ propertyId, open, onClose, onCreated }: Props) {
  const { categories } = useDocumentCategories();
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [message, setMessage] = useState('Hi, could you please provide your ');
  const [dueDate, setDueDate] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!email) { toast.error('Enter a recipient email'); return; }
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    await (supabase.from('document_requests' as any) as any).insert({
      property_id: propertyId,
      requested_by: user.id,
      requested_email: email,
      category_slug: category || null,
      custom_label: customLabel || null,
      message: message || null,
      due_date: dueDate || null,
    });

    // Send notification email
    await supabase.functions.invoke('send-document-request', {
      body: {
        property_id: propertyId,
        requested_email: email,
        category_slug: category || null,
        custom_label: customLabel || null,
        message: message || null,
        due_date: dueDate || null,
      },
    });

    toast.success('Document requested. We\'ll notify them by email.');
    setSending(false);
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Request a Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Recipient Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="buyer@example.com"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Document Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.slug} value={c.slug}>
                    <span className="mr-1.5">{c.icon}</span> {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium">Custom Label (optional)</Label>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Proof of funds"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <Button onClick={handleSubmit} disabled={!email || sending} className="w-full gap-1.5">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
