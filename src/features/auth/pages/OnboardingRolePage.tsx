import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Home, Building2, UserCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ROLES = [
  {
    value: 'buyer',
    label: 'Buyer / Renter',
    description: "I'm looking for a property to buy or rent.",
    icon: Home,
  },
  {
    value: 'agent',
    label: 'Real Estate Agent',
    description: 'I list properties and manage buyer leads.',
    icon: UserCheck,
  },
  {
    value: 'property_manager',
    label: 'Property Manager',
    description: 'I manage rental properties on behalf of owners.',
    icon: Building2,
  },
] as const;

type Role = (typeof ROLES)[number]['value'];

const OnboardingRolePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setSaving(true);

    await supabase
      .from('profiles')
      .update({ onboarded: true } as any)
      .eq('user_id', user.id);

    // Fix #4: Use setup-agent edge function instead of direct client-side inserts
    if (selected === 'agent' || selected === 'property_manager') {
      const { error: setupError } = await supabase.functions.invoke('setup-agent', {
        body: {
          userId: user.id,
          email: user.email,
          fullName: user.user_metadata?.display_name || user.email,
          phone: null,
          mode: 'create-agency',
          agencyName: user.user_metadata?.display_name || 'My Agency',
          agencyEmail: user.email,
        },
      });

      if (setupError) {
        console.error('setup-agent error:', setupError);
      }

      setSaving(false);
      navigate('/dashboard', { replace: true });
    } else {
      setSaving(false);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Welcome to ListHQ
          </h1>
          <p className="text-sm text-muted-foreground">
            How will you be using ListHQ?
          </p>
        </div>

        <div className="space-y-3">
          {ROLES.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all
                ${selected === value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
                ${selected === value ? 'bg-primary/15' : 'bg-muted'}`}>
                <Icon size={20} className={selected === value ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Setting up…
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default OnboardingRolePage;
