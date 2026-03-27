import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ConsumerSignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastQuery: string;
}

const ConsumerSignUpModal = ({ open, onOpenChange, lastQuery }: ConsumerSignUpModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [situation, setSituation] = useState('Just Looking');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    try {
      const password = crypto.randomUUID();
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('No user ID returned');

      const { error: insertError } = await supabase.from('consumer_profiles' as any).insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        buying_situation: situation,
        budget_min: budgetMin ? Number(budgetMin) : 0,
        budget_max: budgetMax ? Number(budgetMax) : 0,
        preferred_suburbs: lastQuery ? [lastQuery] : [],
        trigger_query: lastQuery || null,
        search_count: 3,
        is_purchasable: true,
        lead_score: 50,
      } as any);

      if (insertError) throw insertError;

      localStorage.setItem('listhq_consumer_signed_up', 'true');
      onOpenChange(false);
      toast({ title: "You're matched!", description: 'A specialist will be in touch shortly.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('listhq_consumer_dismissed', Date.now().toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles size={20} className="text-primary" />
            Get matched with a local specialist
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You've searched <span className="font-medium text-foreground">"{lastQuery || 'properties'}"</span> — let us connect you with an agent who knows this area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="consumer-name" className="text-xs font-medium text-foreground">Full name</Label>
            <Input id="consumer-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="consumer-email" className="text-xs font-medium text-foreground">Email</Label>
            <Input id="consumer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Buying situation</Label>
            <Select value={situation} onValueChange={setSituation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="First Home">First Home</SelectItem>
                <SelectItem value="Upgrading">Upgrading</SelectItem>
                <SelectItem value="Downsizing">Downsizing</SelectItem>
                <SelectItem value="Investing">Investing</SelectItem>
                <SelectItem value="Just Looking">Just Looking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Min budget</Label>
              <Input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="$0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Max budget</Label>
              <Input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="$2,000,000" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !email.trim()} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
            Get Matched
          </Button>

          <button onClick={handleDismiss} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsumerSignUpModal;
