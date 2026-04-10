import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HelpSearch } from '@/features/help/components/HelpSearch';
const QUICK_QUESTIONS = [
  'How do I create a new listing?',
  'How do I schedule an open home?',
  'How does the CRM work?',
  'How do I set up an auction?',
  'How do I add a co-agent?',
  'How do agent reviews work?',
  'How do I manage my billing?',
  'How do off-market listings work?',
  'How do I share documents with buyers?',
  'How does the vendor report work?',
  'How do I record a trust receipt?',
  'How does multilingual translation work?',
  'How do I invite a team member?',
  'What is the Strata Health Score?',
  'How do I use voice listing creation?',
  'How does the co-broke toggle work?',
];

const HelpPage = () => {
  const [externalQuery, setExternalQuery] = useState('');
  const [externalQueryToken, setExternalQueryToken] = useState(0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask anything about ListHQ — powered by AI
        </p>
      </div>

      <HelpSearch
        placeholder="Ask anything — e.g. how do I add a co-agent?"
        externalQuery={externalQuery}
        externalQueryToken={externalQueryToken}
      />

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
                setExternalQuery(q);
                setExternalQueryToken((value) => value + 1);
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
