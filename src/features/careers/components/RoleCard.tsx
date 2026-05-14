import { useState } from 'react';
import { ChevronDown, MapPin, Clock, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CareersRole } from '../data/roles';

interface RoleCardProps {
  role: CareersRole;
  onApply: (roleId: CareersRole['id']) => void;
}

export function RoleCard({ role, onApply }: RoleCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-medium text-foreground">{role.title}</h3>
          <p className="text-sm text-muted-foreground font-light mt-1">{role.pitch}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{role.location}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{role.type}</span>
            <span className="inline-flex items-center gap-1"><Banknote className="w-3 h-3" />{role.compensation}</span>
          </div>
        </div>
        <ChevronDown className={cn('w-5 h-5 text-muted-foreground shrink-0 mt-1 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-6 pb-6 pt-2 border-t space-y-5">
          <Section title="What you'll work on" items={role.workOn} />
          <Section title="You're a fit if" items={role.fit} />
          {role.bonus.length > 0 && <Section title="Bonus" items={role.bonus} />}

          <button
            type="button"
            onClick={() => onApply(role.id)}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Apply for this role →
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
      <ul className="space-y-1.5 text-sm text-muted-foreground font-light">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2"><span className="text-primary shrink-0">•</span><span>{item}</span></li>
        ))}
      </ul>
    </div>
  );
}
