import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Home, Building2, Key, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const ROLES = [
  {
    value: 'buyer' as const,
    icon: Home,
    title: 'Looking to buy or rent',
    description: 'Search listings, save properties, get alerts',
  },
  {
    value: 'agent' as const,
    icon: Building2,
    title: "I'm a real estate agent",
    description: 'List properties, manage leads, grow your rent roll',
  },
  {
    value: 'property_manager' as const,
    icon: Key,
    title: "I'm a property manager",
    description: 'Manage rentals, trust accounting, maintenance requests',
  },
];

type Role = (typeof ROLES)[number]['value'];

const OnboardingRolePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  const routeForRole = (role: Role | string) => {
    if (role === 'buyer' || role === 'renter') {
      navigate('/onboarding/buyer-prefs', { replace: true });
    } else if (role === 'agent' || role === 'property_manager') {
      navigate('/onboarding/agency', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('user_id', user.id)
        .maybeSingle();
      const existing = (data as { user_role?: string | null } | null)?.user_role;
      if (existing) routeForRole(existing);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .upsert(
          { user_id: user.id, user_role: selected, onboarded: false } as any,
          { onConflict: 'user_id' },
        );
      if (pErr) throw pErr;

      const roleToAssign = selected === 'buyer' ? 'buyer' : 'agent';
      const { error: rErr } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: user.id, role: roleToAssign as any },
          { onConflict: 'user_id,role' },
        );
      if (rErr) throw rErr;

      routeForRole(selected);
    } catch (err) {
      toast.error("Couldn't save your role", { description: getErrorMessage(err) });
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-[32px] sm:text-[38px] font-semibold tracking-[-1px] text-stone-900 leading-tight">
            How will you use ListHQ?
          </h1>
          <p className="text-[15px] text-stone-500 mt-3">
            Pick the option that best describes you. You can change this later.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map(({ value, icon: Icon, title, description }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                className={`relative group text-left bg-white rounded-3xl border-2 p-7 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-blue-600 shadow-md'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </div>
                )}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h3 className="text-[17px] font-semibold text-stone-900 leading-snug">
                  {title}
                </h3>
                <p className="text-[14px] text-stone-500 mt-2 leading-relaxed">
                  {description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selected || saving}
            className="h-[52px] px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-medium transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Setting up…
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingRolePage;
