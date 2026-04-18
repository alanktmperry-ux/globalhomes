import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: () => void;
}

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Land'];

export function JoinExclusiveModal({ open, onOpenChange, onJoined }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [suburbs, setSuburbs] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBeds, setMinBeds] = useState('2');
  const [propertyTypes, setPropertyTypes] = useState<string[]>(['House', 'Apartment']);

  const togglePropType = (type: string) => {
    setPropertyTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    const suburbsList = suburbs.split(',').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from('exclusive_members').insert({
      user_id: user?.id ?? null,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: phone.trim() || null,
      search_suburbs: suburbsList.length ? suburbsList : null,
      search_min_price: minPrice ? Number(minPrice) : null,
      search_max_price: maxPrice ? Number(maxPrice) : null,
      search_min_beds: minBeds ? Number(minBeds) : null,
      search_property_types: propertyTypes.length ? propertyTypes : null,
      status: 'active',
    });
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error('Could not complete signup — please try again');
      return;
    }
    toast.success("Welcome to ListHQ Exclusive! You'll be notified of matching properties.");
    onOpenChange(false);
    onJoined?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Join ListHQ Exclusive
          </DialogTitle>
          <DialogDescription>
            Get 14-day early access to listings before they go public. $29/month, cancel anytime.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="ex-name">Full name *</Label>
              <Input id="ex-name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ex-email">Email *</Label>
              <Input id="ex-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ex-phone">Phone</Label>
              <Input id="ex-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="ex-suburbs">Preferred suburbs</Label>
            <Input
              id="ex-suburbs"
              placeholder="e.g. Bondi, Surry Hills, Newtown"
              value={suburbs}
              onChange={e => setSuburbs(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ex-min">Min budget (AUD)</Label>
              <Input id="ex-min" type="number" min={0} value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ex-max">Max budget (AUD)</Label>
              <Input id="ex-max" type="number" min={0} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="ex-beds">Min bedrooms</Label>
            <Select value={minBeds} onValueChange={setMinBeds}>
              <SelectTrigger id="ex-beds"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1', '2', '3', '4', '5'].map(n => (
                  <SelectItem key={n} value={n}>{n === '5' ? '5+' : n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Property types</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PROPERTY_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 p-2.5 rounded-lg border border-border cursor-pointer hover:bg-accent">
                  <Checkbox
                    checked={propertyTypes.includes(type)}
                    onCheckedChange={() => togglePropType(type)}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
            Join ListHQ Exclusive — $29/month
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Payment integration coming soon. You'll receive matching alerts immediately.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default JoinExclusiveModal;
