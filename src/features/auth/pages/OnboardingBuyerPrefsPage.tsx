import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { getErrorMessage } from '@/shared/lib/errorUtils';

type SeekingType = 'buy' | 'rent';

const formatCurrency = (raw: string) => {
  const n = parseInt(raw, 10);
  if (!raw || Number.isNaN(n)) return '';
  return `$${n.toLocaleString('en-AU')}`;
};

export default function OnboardingBuyerPrefsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [seekingType, setSeekingType] = useState<SeekingType | null>(null);
  const [suburbs, setSuburbs] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading, navigate]);

  const sendWelcomeEmail = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u?.email) {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            type: 'buyer',
            user_id: u.id,
            name: (u.user_metadata as any)?.display_name || '',
            email: u.email,
          },
        });
      }
    } catch { /* non-fatal */ }
  };

  const handleContinue = async () => {
    if (!seekingType) return;
    setSaving(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        navigate('/');
        return;
      }
      const suburbList = suburbs.trim()
        ? suburbs.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const { error } = await (supabase as any).from('user_preferences').upsert(
        {
          user_id: u.id,
          seeking_type: seekingType,
          preferred_locations: suburbList,
          budget_max: seekingType === 'buy' && budget ? parseInt(budget, 10) : null,
          weekly_budget: seekingType === 'rent' && budget ? parseInt(budget, 10) : null,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;

      const searchParams = new URLSearchParams();
      if (suburbList.length > 0) searchParams.set('suburb', suburbList[0]);
      if (seekingType === 'rent') searchParams.set('type', 'rent');
      const qs = searchParams.toString();
      navigate(qs ? `/?${qs}` : '/', { replace: true });
      sendWelcomeEmail();
    } catch (err) {
      toast.error("Couldn't save your preferences", { description: getErrorMessage(err) });
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/', { replace: true });
    sendWelcomeEmail();
  };

  return (
    <div className="bg-stone-50 min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-xl mx-auto w-full"
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-stone-300" />
          <div className="w-8 h-2 rounded-full bg-blue-600" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.5px] text-stone-900 leading-tight">
            What are you looking for?
          </h1>
          <p className="text-[14px] text-stone-500 mt-2">
            We'll personalise your search — you can change this anytime.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6">
          {/* Q1 — Seeking type */}
          <div>
            <label className="block text-[13px] font-medium text-stone-700 mb-2">
              I'm looking to…
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['buy', 'rent'] as SeekingType[]).map((opt) => {
                const active = seekingType === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSeekingType(opt)}
                    className={`h-12 rounded-2xl border-2 text-[14px] font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {opt === 'buy' ? 'Buy a property' : 'Rent a property'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q2 — Suburbs */}
          <div>
            <label className="block text-[13px] font-medium text-stone-700 mb-2">
              Preferred suburb(s)
            </label>
            <input
              type="text"
              value={suburbs}
              onChange={(e) => setSuburbs(e.target.value)}
              placeholder="e.g. Fitzroy, Richmond, Collingwood"
              className="w-full h-11 px-3 rounded-xl border border-stone-200 bg-white text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[12px] text-stone-400 mt-1.5">
              Separate multiple suburbs with commas
            </p>
          </div>

          {/* Q3 — Budget (only after seekingType selected) */}
          {seekingType && (
            <div>
              <label className="block text-[13px] font-medium text-stone-700 mb-2">
                {seekingType === 'buy' ? 'Max purchase budget' : 'Max weekly rent'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-stone-400">
                  $
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={seekingType === 'buy' ? 'e.g. 750000' : 'e.g. 600'}
                  className={`w-full h-11 pl-7 ${
                    seekingType === 'rent' ? 'pr-20' : 'pr-3'
                  } rounded-xl border border-stone-200 bg-white text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {seekingType === 'rent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-stone-400">
                    / week
                  </span>
                )}
              </div>
              {budget && (
                <p className="text-[12px] text-stone-500 mt-1.5">
                  {formatCurrency(budget)}{seekingType === 'rent' ? ' / week' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!seekingType || saving}
            className="w-full h-[50px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              'Continue'
            )}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-[13px] text-stone-400 hover:text-stone-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>
  );
}
