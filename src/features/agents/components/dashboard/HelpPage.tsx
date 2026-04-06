import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HelpSearch } from '@/features/help/components/HelpSearch';
const QUICK_QUESTIONS = [
  'How do I create a new listing?',
  'How do I schedule an open home?',
  'How does the CRM work?',
  'How do I set up an auction?',
  'How do I add a co-agent?',
  'How do I create a CMA report?',
  'How do agent reviews work?',
  'How do I manage my billing?',
  'How do off-market listings work?',
  'How do I share documents with buyers?',
  'How does the vendor report work?',
  'How do I record a trust receipt?',
];

const HelpPage = () => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask anything about ListHQ — powered by AI
        </p>
      </div>

      <HelpSearch placeholder="Ask anything — e.g. how do I add a co-agent?" />

      {/* Quick question chips */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <HelpCircle size={12} />
          Common questions
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                const input = document.querySelector('input[placeholder="Ask anything — e.g. how do I add a co-agent?"]') as HTMLInputElement | null;
                input?.focus();
                if (!input) return;
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                setter?.call(input, q);
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground hover:bg-accent hover:border-primary/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        Can't find what you need?{' '}
        <a href="mailto:support@listhq.com.au" className="text-primary hover:underline">
          Email support@listhq.com.au
        </a>
      </p>
    </div>
  );
};

export default HelpPage;
