import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) {
      toast({ title: 'Error', description: 'Could not sign in with Google', variant: 'destructive' });
      setGoogleLoading(false);
    }
  };

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
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

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
