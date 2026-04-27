import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SupportLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data: { user: u } } = await supabase.auth.getUser();
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', u?.id || '')
        .in('role', ['support', 'admin'])
        .maybeSingle();
      if (!roleRow) {
        await supabase.auth.signOut();
        toast.error('No support access for this account.');
        return;
      }
      navigate('/support/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl border border-stone-100 p-8 shadow-sm">
        <h1 className="text-[22px] font-semibold text-stone-900 mb-1">Support login</h1>
        <p className="text-[13px] text-stone-500 mb-6">ListHQ internal support portal</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] text-stone-700 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[13px] text-stone-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-stone-900 text-white text-[14px] font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/admin/overview" className="text-[13px] text-stone-500 hover:text-stone-900">
            Admin login →
          </Link>
        </div>
      </div>
    </div>
  );
}
