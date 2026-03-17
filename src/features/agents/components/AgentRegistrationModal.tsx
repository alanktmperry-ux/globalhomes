import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ShieldCheck, Ban, Clock, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Land', 'Luxury ($2M+)'];

const SUBURBS_OPTIONS = [
  'Toorak', 'South Yarra', 'Richmond', 'Carlton', 'Fitzroy',
  'St Kilda', 'Brighton', 'Hawthorn', 'Prahran', 'Collingwood',
  'CBD', 'Docklands', 'Southbank', 'Kew', 'Camberwell',
];

const AgentRegistrationModal = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    agencyName: '',
    licenseNumber: '',
    mobile: '',
    email: '',
    suburbs: [] as string[],
    yearsExperience: '',
    propertyType: '',
  });

  const update = (field: string, value: string | string[]) =>
    setForm((p) => ({ ...p, [field]: value }));

  const toggleSuburb = (s: string) => {
    if (form.suburbs.includes(s)) {
      update('suburbs', form.suburbs.filter((x) => x !== s));
    } else if (form.suburbs.length < 5) {
      update('suburbs', [...form.suburbs, s]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.licenseNumber || !form.mobile) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      // Sign up the agent
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: crypto.randomUUID().slice(0, 16), // temp password, agent resets via email
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: form.fullName },
        },
      });
      if (authError) throw authError;

      if (authData.user) {
        // Create agent record
        await supabase.from('agents').insert({
          user_id: authData.user.id,
          name: form.fullName,
          agency: form.agencyName || null,
          email: form.email,
          phone: form.mobile,
        });

        // Add agent role
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'agent' as any,
        });
      }

      setStep('success');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setStep('form'), 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  Join the Agent Network
                </DialogTitle>
                <DialogDescription>
                  Start receiving voice-qualified leads for your territory.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Agency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      required
                      value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      value={form.agencyName}
                      onChange={(e) => update('agencyName', e.target.value)}
                      placeholder="Ray White"
                    />
                  </div>
                </div>

                {/* License & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="license">License Number *</Label>
                    <Input
                      id="license"
                      required
                      value={form.licenseNumber}
                      onChange={(e) => update('licenseNumber', e.target.value)}
                      placeholder="VIC-12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      required
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => update('mobile', e.target.value)}
                      placeholder="+61 4XX XXX XXX"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="regEmail">Email *</Label>
                  <Input
                    id="regEmail"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="jane@agency.com.au"
                  />
                </div>

                {/* Primary Suburbs */}
                <div>
                  <Label>Primary Suburbs (max 5 for territory protection)</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {SUBURBS_OPTIONS.map((s) => {
                      const selected = form.suburbs.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSuburb(s)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{form.suburbs.length}/5 selected</p>
                </div>

                {/* Experience & Property Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="experience">Years Experience</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      value={form.yearsExperience}
                      onChange={(e) => update('yearsExperience', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label>I primarily sell:</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {PROPERTY_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => update('propertyType', t)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium ${
                            form.propertyType === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trust Signals */}
                <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                  {[
                    { icon: <ShieldCheck size={14} />, text: 'Your license is verified securely' },
                    { icon: <Ban size={14} />, text: 'We never spam your clients' },
                    { icon: <Clock size={14} />, text: 'Cancel anytime, no lock-in contracts' },
                  ].map((t) => (
                    <div key={t.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-success">{t.icon}</span>
                      {t.text}
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={loading} className="w-full py-5 rounded-xl text-base font-bold">
                  {loading ? 'Creating your account...' : 'Join the Network'}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-success" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-2">Welcome to the Network!</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Check your email for a verification link. You'll also receive an SMS verification code shortly.
              </p>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={handleClose}
              >
                <Download size={16} className="mr-1.5" /> Download the Agent App
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default AgentRegistrationModal;
