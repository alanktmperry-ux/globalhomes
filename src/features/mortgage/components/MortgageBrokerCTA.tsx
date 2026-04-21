import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MortgageBrokerModal } from './MortgageBrokerModal';

interface MortgageBrokerCTAProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  sourcePage: string;
  defaultPrice?: number | null;
  propertyId?: string | null;
  agentId?: string | null;
  className?: string;
}

export function MortgageBrokerCTA({
  title = 'Need finance? Speak to a broker',
  description = 'Get pre-approved with a licensed mortgage broker — free, no obligation.',
  buttonLabel = 'Get pre-approved',
  sourcePage,
  defaultPrice,
  propertyId,
  agentId,
  className = '',
}: MortgageBrokerCTAProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`p-4 rounded-2xl bg-card border border-border ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button onClick={() => setOpen(true)} size="sm">
                {buttonLabel}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/brokers">Browse all brokers</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <MortgageBrokerModal
        open={open}
        onOpenChange={setOpen}
        sourcePage={sourcePage}
        defaultPrice={defaultPrice}
        propertyId={propertyId}
        agentId={agentId}
      />
    </>
  );
}
