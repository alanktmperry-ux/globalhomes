import { useEffect, useRef } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FaqItem } from '@/data/faq';

interface Props {
  items: FaqItem[];
  defaultOpen?: string;
  showCategory?: boolean;
}

const categoryColors: Record<string, string> = {
  general: 'bg-secondary text-secondary-foreground',
  agents: 'bg-primary/10 text-primary',
  buyers: 'bg-accent text-accent-foreground',
  renters: 'bg-secondary text-secondary-foreground',
  vendors: 'bg-primary/10 text-primary',
  auctions: 'bg-destructive/10 text-destructive',
  billing: 'bg-secondary text-secondary-foreground',
  technical: 'bg-muted text-muted-foreground',
};

export function FaqAccordion({ items, defaultOpen, showCategory = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!defaultOpen) return;
    const el = document.getElementById(`faq-${defaultOpen}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [defaultOpen]);

  return (
    <div ref={containerRef}>
      <Accordion type="single" collapsible defaultValue={defaultOpen}>
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id} id={`faq-${item.id}`}>
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline gap-3">
              <span className="flex items-center gap-2 flex-1">
                {showCategory && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize shrink-0 ${categoryColors[item.category] || 'bg-muted text-muted-foreground'}`}>
                    {item.category}
                  </span>
                )}
                {item.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {item.answer.split('\n').map((para, i) => (
                <span key={i}>
                  {para}
                  {i < item.answer.split('\n').length - 1 && <br />}
                </span>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
