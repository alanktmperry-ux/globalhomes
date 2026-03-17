import { ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoMode } from '@/features/agents/context/DemoModeContext';
import { useAuth } from '@/lib/AuthProvider';

const DemoModeBanner = () => {
  const { isDemo, switching, enterDemo, exitDemo } = useDemoMode();
  const { user } = useAuth();

  if (!user) return null;

  if (isDemo) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-amber-700 dark:text-amber-400">
          DEMO MODE: South Yarra Agency
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          onClick={exitDemo}
          disabled={switching}
        >
          {switching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
          Switch to Live Data
        </Button>
      </div>
    );
  }

  // Live mode — show real agency name
  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
        LIVE MODE: {user.user_metadata?.display_name || user.email}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
        onClick={enterDemo}
        disabled={switching}
      >
        {switching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
        Try Demo Agency
      </Button>
    </div>
  );
};

export default DemoModeBanner;
