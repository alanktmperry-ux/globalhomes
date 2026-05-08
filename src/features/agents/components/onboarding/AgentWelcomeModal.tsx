import { useState, useEffect } from 'react';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const STORAGE_KEY = 'listhq_welcome_seen';

export function AgentWelcomeModal() {
  const { agent } = useCurrentAgent();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!agent) return;
    const seen = localStorage.getItem(STORAGE_KEY + '_' + agent.id);
    if (!seen) setOpen(true);
  }, [agent]);

  function dismiss() {
    if (agent) localStorage.setItem(STORAGE_KEY + '_' + agent.id, '1');
    setOpen(false);
  }

  if (!open || !agent) return null;

  const firstName = agent.name?.split(' ')[0] ?? 'there';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative shadow-xl">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
            Welcome to ListHQ
          </p>
          <h2 className="text-2xl font-bold text-foreground">Hi {firstName} 👋</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          You're all set. ListHQ helps you reach buyers who speak Mandarin, Vietnamese, Korean
          and 7 other languages — without hiring a translator.
        </p>

        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-foreground mb-2">Your first 60 seconds:</p>
          <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
            <li>Complete your agent profile</li>
            <li>Add a listing</li>
            <li>Hit "Generate translations" — watch it go multilingual</li>
          </ol>
        </div>

        <Button onClick={dismiss} className="w-full">
          Let's go →
        </Button>
      </div>
    </div>
  );
}
