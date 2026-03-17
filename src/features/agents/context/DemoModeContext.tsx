import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const DEMO_EMAIL = 'demo-agent@globalhomes.app';
const DEMO_PASSWORD = 'DemoAgent2024!';

interface DemoModeContextType {
  isDemo: boolean;
  switching: boolean;
  enterDemo: () => Promise<void>;
  exitDemo: () => Promise<void>;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemo: false,
  switching: false,
  enterDemo: async () => {},
  exitDemo: async () => {},
});

export const useDemoMode = () => useContext(DemoModeContext);

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();

  const isDemo = user?.email === DEMO_EMAIL;

  const enterDemo = useCallback(async () => {
    setSwitching(true);
    try {
      // Seed demo agent if needed
      await supabase.functions.invoke('seed-demo-agent');
      
      // Sign out current user first
      await supabase.auth.signOut();
      
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      toast.success('Switched to Demo Agency');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Could not enter demo mode: ' + err.message);
    } finally {
      setSwitching(false);
    }
  }, [navigate]);

  const exitDemo = useCallback(async () => {
    setSwitching(true);
    try {
      await supabase.auth.signOut();
      toast.success('Exited demo mode');
      navigate('/agents/login');
    } catch {
      // ignore
    } finally {
      setSwitching(false);
    }
  }, [navigate]);

  return (
    <DemoModeContext.Provider value={{ isDemo, switching, enterDemo, exitDemo }}>
      {children}
    </DemoModeContext.Provider>
  );
};
