import { Rocket, Info, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';

// Global demo context so any page can read the toggle state
export const LocalDemoContext = createContext<{
  localDemoMode: boolean;
  setLocalDemoMode: (v: boolean) => void;
}>({ localDemoMode: false, setLocalDemoMode: () => {} });

export const useLocalDemo = () => useContext(LocalDemoContext);

const DemoModeBanner = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [localDemoMode, setLocalDemoMode] = useState(false);

  if (!user) return null;

  // Permanently in demo mode (shared demo account)
  if (isDemoMode) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between gap-3 text-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              DEMO MODE
            </span>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 hidden sm:block">
              You're exploring with sample data.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          onClick={() => navigate('/dashboard/billing')}
        >
          <Rocket className="h-3 w-3 mr-1" />
          Go Live
        </Button>
      </div>
    );
  }

  // Real user — show toggle bar
  return (
    <div className="border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-sm sticky top-0 z-50 bg-background">
      <div className="flex items-center gap-2 min-w-0">
        <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <span className="font-semibold text-foreground">
            {localDemoMode ? 'DEMO MODE' : 'LIVE MODE'}
          </span>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {localDemoMode ? "Viewing sample data — changes won't be saved" : 'Your real account data'}
          </p>
        </div>
      </div>
      <button
        onClick={() => setLocalDemoMode(prev => !prev)}
        className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
          localDemoMode
            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
        }`}
      >
        {localDemoMode ? '← Back to Live Mode' : '👀 Try Demo Mode'}
      </button>
    </div>
  );
};

export default DemoModeBanner;
