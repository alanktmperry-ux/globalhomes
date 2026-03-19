import { Rocket, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthProvider';
import { useNavigate } from 'react-router-dom';

const DemoModeBanner = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  if (!user || !isDemoMode) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-sm sticky top-0 z-50">
      <div className="flex items-center gap-2 min-w-0">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            DEMO MODE
          </span>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 hidden sm:block">
            You're exploring with sample data. Subscribe to unlock full features.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
        onClick={() => navigate('/dashboard/billing')}
      >
        <Rocket className="h-3 w-3 mr-1" />
        Go Live
      </Button>
    </div>
  );
};

export default DemoModeBanner;
