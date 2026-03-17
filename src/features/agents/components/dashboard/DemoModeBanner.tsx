import { ArrowUp, Loader2, Rocket, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthProvider';
import { useNavigate } from 'react-router-dom';

const DemoModeBanner = () => {
  const { user, isDemoMode, demoSwitching, switchToDemo, switchToLive } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  if (isDemoMode) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              DEMO MODE: South Yarra Agency
            </span>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 hidden sm:block">
              This is demo data. Your real agency data is safe.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          onClick={() => {
            switchToLive().then(() => navigate('/agents/login'));
          }}
          disabled={demoSwitching}
        >
          {demoSwitching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Rocket className="h-3 w-3 mr-1" />}
          Upgrade to Live
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
        LIVE MODE: {user.user_metadata?.display_name || user.email}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
        onClick={() => switchToDemo().then(() => navigate('/dashboard'))}
        disabled={demoSwitching}
      >
        {demoSwitching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
        Try Demo Agency
      </Button>
    </div>
  );
};

export default DemoModeBanner;
