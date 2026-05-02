import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

const IDLE_BEFORE_WARNING_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_GRACE_MS = 5 * 60 * 1000;        // 5 minutes after warning -> sign out
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'keydown',
  'click',
  'touchstart',
];

/**
 * Logs the user out after 30 minutes of inactivity, with a 5-minute warning toast.
 * Resets on any mousemove / keydown / click / touchstart.
 */
export function useIdleTimeout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!user) return;

    const clearTimers = () => {
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (signoutTimer.current) clearTimeout(signoutTimer.current);
      warningTimer.current = null;
      signoutTimer.current = null;
    };

    const dismissWarning = () => {
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };

    const showWarning = () => {
      toastIdRef.current = toast.warning(
        'Your session will expire in 5 minutes due to inactivity.',
        {
          duration: WARNING_GRACE_MS,
          action: {
            label: 'Stay signed in',
            onClick: () => {
              dismissWarning();
              resetTimers();
            },
          },
        }
      );
      signoutTimer.current = setTimeout(async () => {
        dismissWarning();
        try {
          await supabase.auth.signOut();
        } catch {
          // non-fatal
        }
        toast.info('Signed out due to inactivity.');
        navigate('/login', { replace: true });
      }, WARNING_GRACE_MS);
    };

    const resetTimers = () => {
      clearTimers();
      dismissWarning();
      warningTimer.current = setTimeout(showWarning, IDLE_BEFORE_WARNING_MS);
    };

    // Start the initial idle timer
    resetTimers();

    // Listen for activity
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetTimers, { passive: true });
    }

    return () => {
      clearTimers();
      dismissWarning();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetTimers);
      }
    };
  }, [user, navigate]);
}
