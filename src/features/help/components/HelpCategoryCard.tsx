import { Link } from 'react-router-dom';
import { Building2, Home, Key, BarChart3, Hammer, CreditCard, HelpCircle, Settings, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

const iconMap: Record<string, LucideIcon> = {
  Building2, Home, Key, BarChart3, Hammer, CreditCard, HelpCircle, Settings,
};

interface Props {
  title: string;
  description: string;
  icon: string;
  href: string;
  count: number;
}

export function HelpCategoryCard({ title, description, icon, href, count }: Props) {
  const Icon = iconMap[icon] || HelpCircle;

  return (
    <Link to={href}>
      <Card className="p-5 h-full hover:shadow-md transition-shadow group">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <Icon size={20} className="text-primary" />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{description}</p>
        <span className="text-xs text-primary font-medium">
          {count} article{count !== 1 ? 's' : ''} →
        </span>
      </Card>
    </Link>
  );
}
