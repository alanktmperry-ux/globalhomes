import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handle = async () => {
      // Wait briefly for Supabase to process the OAuth callback
      await new Promise(r => setTimeout(r, 1200));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Listen for auth state in case it fires slightly later
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
          if (event === 'SIGNED_IN' && s?.user) {
            subscription.unsubscribe();
            checkOnboarding(s.user.id);
          }
        });
        setTimeout(() => {
          subscription.unsubscribe();
          toast.error(t('auth.callback.oauthTimeout'));
          navigate('/login?error=oauth_failed', { replace: true });
        }, 8000);
        return;
      }

      await checkOnboarding(session.user.id);
    };

    const checkOnboarding = async (userId: string) => {
      const loginIntent = sessionStorage.getItem('listhq_login_intent');
      if (loginIntent === 'seeker') {
        sessionStorage.setItem('post_login_redirected', '1');
        sessionStorage.removeItem('listhq_login_intent');
        navigate('/seeker/dashboard', { replace: true });
        return;
      }

      // Agents go straight to dashboard
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (agentData) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // OAuth users skip OTP (email already verified). Check for role.
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role, onboarded')
        .eq('user_id', userId)
        .maybeSingle();

      const role = (profile as { user_role?: string | null } | null)?.user_role;

      if (!role) {
        navigate('/onboarding/role', { replace: true });
      } else if (role === 'agent' || role === 'property_manager') {
        navigate('/onboarding/agency', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    };

    handle();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">{t('auth.callback.signingIn')}</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
