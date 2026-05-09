import { useState, FormEvent, ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBetaAccess, BETA_PASSWORD } from './useBetaAccess';

interface Props {
  children: ReactNode;
}

export function BetaGate({ children }: Props) {
  const { granted, grant } = useBetaAccess();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  if (granted) return <>{children}</>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim() === BETA_PASSWORD) {
      grant();
    } else {
      setError('Invalid code. Try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-body">
      <style>{`
        @keyframes betaShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .beta-shake { animation: betaShake 0.4s ease-in-out; }
      `}</style>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
              <Globe size={22} className="text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">
              ListHQ
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            ListHQ — Closed Beta
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your access code to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={shake ? 'beta-shake' : ''}>
              <Input
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Access code"
                autoFocus
                autoComplete="off"
                className="text-center"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={!code.trim()}>
              Submit
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Don't have a code?{' '}
            <a
              href="mailto:alan@listhq.com.au"
              className="text-primary font-medium underline underline-offset-2"
            >
              alan@listhq.com.au
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default BetaGate;
