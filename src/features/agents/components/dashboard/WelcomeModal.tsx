import { useNavigate } from 'react-router-dom';
import { X, Globe, Users, BarChart2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  agentName: string;
  onClose: () => void;
}

const FEATURES = [
  { icon: Globe, text: 'Publish any listing in every buyer language — automatically' },
  { icon: Users, text: 'Match buyers automatically with AI — no cold calls' },
  { icon: BarChart2, text: 'Trust accounting, PM, CRM and vendor reports in one place' },
];

export function WelcomeModal({ agentName, onClose }: Props) {
  const navigate = useNavigate();
  const firstName = agentName?.split(' ')[0] || 'there';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md bg-card rounded-2xl shadow-xl p-7">
        <button
          onClick={onClose}
          aria-label="Close welcome"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>

        {/* Logo mark — matches header lockup */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center mb-3 shrink-0">
          <Globe size={26} className="text-primary-foreground" />
        </div>

        <h2 className="text-xl font-semibold text-center">
          Welcome to ListHQ, {firstName}!
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-1.5">
          You're on Australia's multilingual property platform — every listing, every buyer language. Here's what you unlock today:
        </p>

        <ul className="space-y-2.5 mt-5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 w-7 h-7 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Icon size={14} />
              </span>
              <span className="text-sm">{text}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 mt-6">
          <Button
            className="w-full gap-2"
            onClick={() => { onClose(); navigate('/dashboard/listings'); }}
          >
            Add your first listing <ArrowRight size={14} />
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Explore dashboard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Need help? Email <a href="mailto:hello@listhq.com.au" className="underline underline-offset-2">hello@listhq.com.au</a>
        </p>
      </div>
    </div>
  );
}
