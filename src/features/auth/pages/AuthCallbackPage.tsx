import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();

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
          navigate('/auth?error=oauth_failed', { replace: true });
        }, 8000);
        return;
      }

      await checkOnboarding(session.user.id);
    };

    const checkOnboarding = async (userId: string) => {
      // Check for agent role first — agents go to their dashboard
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (agentData) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Non-agent users — check if onboarding is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile && !profile.onboarded) {
        navigate('/onboarding/role', { replace: true });
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
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
